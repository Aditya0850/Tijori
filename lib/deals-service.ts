import { getDatabase } from './db';
import { getPanchayatVerdict, getFallbackVerdict, type AiVerdict, type DisputeInput } from './ai';
import {
  Deal,
  Event,
  DealStatus,
  AIVerdict,
  CreateDealInput,
  FundDealInput,
  DeliverDealInput,
  AcceptDealInput,
  DisputeDealInput,
  ResolveDealInput,
  DEAL_STATUS_TRANSITIONS,
  ROLE_PERMISSIONS,
} from './types';
import {
  validateStatusTransition,
  validateRoleAuthorization,
  validateResolveVerdict,
} from './validation';
import { ValidationError } from './api-types';

export class DealsService {
  private db = getDatabase();

  // Create a new deal
  async createDeal(input: CreateDealInput): Promise<Deal> {
    const deal = await this.db.createDeal({
      ...input,
      status: 'CREATED',
      buyer_name: null,
      delivery_proof: null,
      dispute_reason: null,
      ai_verdict: null,
      ai_reasoning: null,
      ai_seller_percent: null,
    });

    // Create creation event
    await this.db.createEvent({
      deal_id: deal.id,
      type: 'CREATED',
      message: `Deal created by ${deal.seller_name}`,
      actor: deal.seller_name,
    });

    return deal;
  }

  // Get deal by ID with events
  async getDeal(id: string): Promise<{ deal: Deal; events: Event[] } | null> {
    const deal = await this.db.getDeal(id);
    if (!deal) return null;

    const events = await this.db.getEvents(id);
    return { deal, events };
  }

  // List deals with optional filters
  async listDeals(filters?: { status?: DealStatus; sellerName?: string; buyerName?: string }): Promise<Deal[]> {
    return await this.db.getDeals(filters);
  }

  // Fund a deal (buyer action)
  async fundDeal(dealId: string, buyerName: string): Promise<Deal> {
    const deal = await this.db.getDeal(dealId);
    if (!deal) {
      throw new Error('NOT_FOUND: Deal not found');
    }

    // Validate status transition
    const transition = validateStatusTransition(deal.status, 'FUNDED', 'fund');
    if (!transition.valid) {
      throw new Error(`INVALID_STATE: ${transition.error?.message}`);
    }

    // Validate role
    const auth = validateRoleAuthorization('BUYER', 'fund_deal');
    if (!auth.authorized) {
      throw new Error(`FORBIDDEN: ${auth.error?.message}`);
    }

    // Check if buyer matches
    if (deal.buyer_name && deal.buyer_name !== buyerName) {
      throw new Error('FORBIDDEN: Deal already funded by another buyer');
    }

    const updated = await this.db.updateDeal(dealId, {
      status: 'FUNDED',
      buyer_name: buyerName,
    });

    if (!updated) {
      throw new Error('SERVER: Failed to update deal');
    }

    // Create funding event
    await this.db.createEvent({
      deal_id: dealId,
      type: 'FUNDED',
      message: `Funded by ${buyerName} for ₹${deal.amount}`,
      actor: buyerName,
    });

    return updated;
  }

  // Deliver work (seller action)
  async deliverDeal(dealId: string, deliveryProof: string, sellerName: string): Promise<Deal> {
    const deal = await this.db.getDeal(dealId);
    if (!deal) {
      throw new Error('NOT_FOUND: Deal not found');
    }

    // Validate status transition
    const transition = validateStatusTransition(deal.status, 'DELIVERED', 'deliver');
    if (!transition.valid) {
      throw new Error(`INVALID_STATE: ${transition.error?.message}`);
    }

    // Validate role
    const auth = validateRoleAuthorization('SELLER', 'deliver_deal');
    if (!auth.authorized) {
      throw new Error(`FORBIDDEN: ${auth.error?.message}`);
    }

    // Check if seller matches
    if (deal.seller_name !== sellerName) {
      throw new Error('FORBIDDEN: Only the seller can deliver work');
    }

    const updated = await this.db.updateDeal(dealId, {
      status: 'DELIVERED',
      delivery_proof: deliveryProof,
    });

    if (!updated) {
      throw new Error('SERVER: Failed to update deal');
    }

    // Create delivery event
    await this.db.createEvent({
      deal_id: dealId,
      type: 'DELIVERED',
      message: `Work delivered: ${deliveryProof}`,
      actor: sellerName,
    });

    return updated;
  }

  // Accept delivery (buyer action)
  async acceptDeal(dealId: string, buyerName: string): Promise<Deal> {
    const deal = await this.db.getDeal(dealId);
    if (!deal) {
      throw new Error('NOT_FOUND: Deal not found');
    }

    // Validate status transition
    const transition = validateStatusTransition(deal.status, 'COMPLETED', 'accept');
    if (!transition.valid) {
      throw new Error(`INVALID_STATE: ${transition.error?.message}`);
    }

    // Validate role
    const auth = validateRoleAuthorization('BUYER', 'accept_deal');
    if (!auth.authorized) {
      throw new Error(`FORBIDDEN: ${auth.error?.message}`);
    }

    // Check if buyer matches
    if (deal.buyer_name !== buyerName) {
      throw new Error('FORBIDDEN: Only the buyer who funded can accept');
    }

    const updated = await this.db.updateDeal(dealId, {
      status: 'COMPLETED',
    });

    if (!updated) {
      throw new Error('SERVER: Failed to update deal');
    }

    // Create acceptance event
    await this.db.createEvent({
      deal_id: dealId,
      type: 'ACCEPTED',
      message: `Work accepted by ${buyerName}`,
      actor: buyerName,
    });

    return updated;
  }

  // Dispute delivery (buyer action)
  async disputeDeal(dealId: string, buyerName: string, disputeReason: string): Promise<{
    deal: Deal;
    aiVerdict: AiVerdict | null;
  }> {
    const deal = await this.db.getDeal(dealId);
    if (!deal) {
      throw new Error('NOT_FOUND: Deal not found');
    }

    // Validate status transition
    const transition = validateStatusTransition(deal.status, 'DISPUTED', 'dispute');
    if (!transition.valid) {
      throw new Error(`INVALID_STATE: ${transition.error?.message}`);
    }

    // Validate role
    const auth = validateRoleAuthorization('BUYER', 'dispute_deal');
    if (!auth.authorized) {
      throw new Error(`FORBIDDEN: ${auth.error?.message}`);
    }

    // Check if buyer matches
    if (deal.buyer_name !== buyerName) {
      throw new Error('FORBIDDEN: Only the buyer who funded can dispute');
    }

    const updated = await this.db.updateDeal(dealId, {
      status: 'DISPUTED',
      dispute_reason: disputeReason,
    });

    if (!updated) {
      throw new Error('SERVER: Failed to update deal');
    }

    // Create dispute event
    await this.db.createEvent({
      deal_id: dealId,
      type: 'DISPUTED',
      message: `Disputed by ${buyerName}: ${disputeReason}`,
      actor: buyerName,
    });

    // Get AI verdict using new Panchayat AI module
    const disputeInput: DisputeInput = {
      title: updated.title,
      description: updated.description,
      amount: updated.amount,
      deliveryProof: updated.delivery_proof,
      disputeReason,
    };

    let aiVerdict = await getPanchayatVerdict(disputeInput);

    // Fallback if AI fails
    if (!aiVerdict) {
      aiVerdict = getFallbackVerdict(disputeInput);
    }

    // Update deal with AI verdict
    const finalDeal = await this.db.updateDeal(dealId, {
      ai_verdict: aiVerdict.verdict,
      ai_reasoning: aiVerdict.reasoning,
      ai_seller_percent: aiVerdict.sellerPercent,
    });

    // Create AI verdict event
    await this.db.createEvent({
      deal_id: dealId,
      type: 'AI_VERDICT',
      message: `Panchayat AI recommends ${aiVerdict.verdict} (${aiVerdict.sellerPercent}% to seller): ${aiVerdict.reasoning}`,
      actor: 'Panchayat AI',
    });

    return {
      deal: finalDeal!,
      aiVerdict,
    };
  }

  // Resolve dispute (admin action)
  async resolveDeal(dealId: string, adminName: string, verdict: AIVerdict, sellerPercent?: number): Promise<Deal> {
    const deal = await this.db.getDeal(dealId);
    if (!deal) {
      throw new Error('NOT_FOUND: Deal not found');
    }

    // Validate status - must be DISPUTED
    if (deal.status !== 'DISPUTED') {
      throw new Error('INVALID_STATE: Can only resolve disputed deals');
    }

    // Validate role
    const auth = validateRoleAuthorization('ADMIN', 'resolve_deal');
    if (!auth.authorized) {
      throw new Error(`FORBIDDEN: ${auth.error?.message}`);
    }

    // Validate verdict
    const verdictValidation = validateResolveVerdict(verdict, sellerPercent);
    if (!verdictValidation.valid) {
      throw new Error(`INVALID_VERDICT: ${verdictValidation.error?.message}`);
    }

    // Determine final status and seller percent
    const statusMap: Record<AIVerdict, DealStatus> = {
      RELEASE: 'RESOLVED_RELEASED',
      REFUND: 'RESOLVED_REFUNDED',
      SPLIT: 'RESOLVED_SPLIT',
    };

    const finalSellerPercent = sellerPercent ?? (verdict === 'RELEASE' ? 100 : verdict === 'REFUND' ? 0 : 50);
    const finalStatus = statusMap[verdict];

    const updated = await this.db.updateDeal(dealId, {
      status: finalStatus,
      ai_verdict: verdict,
      ai_seller_percent: finalSellerPercent,
    });

    if (!updated) {
      throw new Error('SERVER: Failed to update deal');
    }

    // Create resolution event
    const verdictMessages: Record<AIVerdict, string> = {
      RELEASE: 'released to seller',
      REFUND: 'refunded to buyer',
      SPLIT: `split (${finalSellerPercent}% to seller)`,
    };

    await this.db.createEvent({
      deal_id: dealId,
      type: 'RESOLVED',
      message: `Dispute resolved by ${adminName}: Amount ${verdictMessages[verdict]}`,
      actor: adminName,
    });

    return updated;
  }
}

// Export singleton instance
export const dealsService = new DealsService();