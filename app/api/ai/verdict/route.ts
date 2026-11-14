/**
 * AI verdict API for Tijori escrow platform
 * Importers: None (API route)
 * Affected API: POST /api/ai/verdict, GET /api/ai/verdict
 * Data schemas: DisputeInput, AiVerdict from lib/ai
 * User instruction: "Build the Panchayat AI module... integration in dispute endpoint"
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { getPanchayatVerdict, getFallbackVerdict, DisputeInput } from '@/lib/ai';
import { successResponse, errorResponse, notFoundResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { DealStatus, AIVerdict } from '@/lib/types';

/**
 * POST /api/ai/verdict - Get AI verdict for a dispute (manual trigger)
 * Body: { deal_id, dispute_reason }
 * This can be used to get a preview of AI verdict before disputing
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  const auth = extractAuth(request);

  // Only buyers and admins can request AI verdicts
  if (auth.user_role !== 'BUYER' && auth.user_role !== 'ADMIN') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only buyers and admins can request AI verdicts' }, 403);
  }

  const body = await request.json();
  const { deal_id, dispute_reason } = body;

  if (!deal_id || !dispute_reason) {
    return errorResponse({ code: 'VALIDATION', message: 'deal_id and dispute_reason are required' }, 400);
  }

  const db = getDatabase();
  const deal = await db.getDeal(deal_id);

  if (!deal) {
    return notFoundResponse('Deal');
  }

  // Verify deal is in a state where dispute makes sense
  if (deal.status !== 'DELIVERED' && deal.status !== 'DISPUTED') {
    return errorResponse(
      { code: 'INVALID_STATE', message: `Cannot get AI verdict for deal in ${deal.status} status` },
      409
    );
  }

  // Verify buyer owns the deal (if buyer)
  if (auth.user_role === 'BUYER' && deal.buyer_name !== auth.user_name) {
    return errorResponse({ code: 'FORBIDDEN', message: 'Not authorized for this deal' }, 403);
  }

  // Build DisputeInput for AI
  const disputeInput: DisputeInput = {
    title: deal.title,
    description: deal.description,
    amount: deal.amount,
    deliveryProof: deal.delivery_proof,
    disputeReason: dispute_reason,
  };

  // Get AI verdict
  let aiVerdict = await getPanchayatVerdict(disputeInput);

  // Fallback if AI fails
  if (!aiVerdict) {
    aiVerdict = getFallbackVerdict(disputeInput);
  }

  return successResponse({
    verdict: aiVerdict.verdict,
    seller_percent: aiVerdict.sellerPercent,
    reasoning: aiVerdict.reasoning,
  });
});

/**
 * GET /api/ai/verdict?deal_id=xxx - Get existing AI verdict for a deal
 */
export const GET = withErrorHandling(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const dealId = searchParams.get('deal_id');

  if (!dealId) {
    return errorResponse({ code: 'VALIDATION', message: 'deal_id query parameter required' }, 400);
  }

  const db = getDatabase();
  const deal = await db.getDeal(dealId);

  if (!deal) {
    return notFoundResponse('Deal');
  }

  if (!deal.ai_verdict) {
    return notFoundResponse('AI verdict');
  }

  return successResponse({
    verdict: deal.ai_verdict,
    seller_percent: deal.ai_seller_percent,
    reasoning: deal.ai_reasoning,
  });
});