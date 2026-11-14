/**
 * Database adapter for Tijori escrow platform
 * Importers: lib/deals-service.ts, all API routes, scripts/test-backend.ts
 * Affected API: All deal and event operations
 * Data schemas: Deal, Event, DealStatus
 * User instruction: "Build the Panchayat AI module... in-memory database adapter"
 */

import { createClient } from '@supabase/supabase-js';
import { Deal, Event, DealStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

// Database interface for both SQLite and Supabase
export interface DatabaseAdapter {
  // Deals
  getDeal(id: string): Promise<Deal | null>;
  getDeals(filters?: { status?: DealStatus; sellerName?: string; buyerName?: string }): Promise<Deal[]>;
  createDeal(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal>;
  updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null>;

  // Events
  getEvents(dealId: string): Promise<Event[]>;
  createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event>;

  // Demo seed
  seedDemoData(): void;
  resetDatabase(): void;
}

// In-Memory implementation (for development without native dependencies)
class MemoryAdapter implements DatabaseAdapter {
  private deals: Map<string, Deal> = new Map();
  private events: Map<string, Event[]> = new Map();

  constructor() {
    this.seedDemoData();
  }

  private rowToDeal(row: Deal): Deal {
    return { ...row };
  }

  private rowToEvent(row: Event): Event {
    return { ...row };
  }

  async getDeal(id: string): Promise<Deal | null> {
    const deal = this.deals.get(id);
    return deal ? this.rowToDeal(deal) : null;
  }

  async getDeals(filters?: { status?: DealStatus; sellerName?: string; buyerName?: string }): Promise<Deal[]> {
    let deals = Array.from(this.deals.values());

    if (filters?.status) {
      deals = deals.filter(d => d.status === filters.status);
    }
    if (filters?.sellerName) {
      deals = deals.filter(d => d.seller_name === filters.sellerName);
    }
    if (filters?.buyerName) {
      deals = deals.filter(d => d.buyer_name === filters.buyerName);
    }

    return deals
      .map(this.rowToDeal)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async createDeal(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const newDeal: Deal = { ...deal, id, created_at: now, updated_at: now };
    this.deals.set(id, newDeal);
    this.events.set(id, []);

    return newDeal;
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    const existing = this.deals.get(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const updated = { ...existing, ...updates, updated_at: now };
    this.deals.set(id, updated);

    return updated;
  }

  async getEvents(dealId: string): Promise<Event[]> {
    const events = this.events.get(dealId) || [];
    return events.map(this.rowToEvent);
  }

  async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const newEvent: Event = { ...event, id, created_at: now };
    const dealEvents = this.events.get(event.deal_id) || [];
    dealEvents.push(newEvent);
    this.events.set(event.deal_id, dealEvents);

    return newEvent;
  }

  seedDemoData(): void {
    // Check if already seeded
    if (this.deals.size > 0) return;

    const now = new Date().toISOString();
    const demoDeals: Deal[] = [
      {
        id: uuidv4(),
        title: 'Logo Design for Coffee Shop',
        description: 'Create a modern logo for a new coffee shop in Bangalore. Need 3 concepts with revisions.',
        amount: 15000,
        status: 'COMPLETED' as DealStatus,
        seller_name: 'Priya Sharma',
        buyer_name: 'Rajesh Kumar',
        delivery_proof: 'https://figma.com/file/abc123',
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'React Dashboard Development',
        description: 'Build an admin dashboard with charts, tables, and user management. 2-week timeline.',
        amount: 45000,
        status: 'DELIVERED' as DealStatus,
        seller_name: 'Amit Patel',
        buyer_name: 'Sneha Reddy',
        delivery_proof: 'https://github.com/amit/dashboard',
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'E-commerce Product Photography',
        description: 'Professional product photos for 50 SKUs. White background, multiple angles.',
        amount: 25000,
        status: 'DISPUTED' as DealStatus,
        seller_name: 'Kavya Nair',
        buyer_name: 'Vikram Singh',
        delivery_proof: 'https://drive.google.com/folder/xyz789',
        dispute_reason: 'Images are blurry and don\'t match the style guide',
        ai_verdict: 'SPLIT',
        ai_reasoning: 'Delivery proof shows partial completion. Some images meet quality standards but others are blurry. Recommend 60% to seller for completed work.',
        ai_seller_percent: 60,
        created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Content Writing - Blog Series',
        description: '10 SEO-optimized blog posts about fintech trends in India. 1500 words each.',
        amount: 20000,
        status: 'FUNDED' as DealStatus,
        seller_name: 'Rohit Verma',
        buyer_name: 'Anjali Mehta',
        delivery_proof: null,
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
      {
        id: uuidv4(),
        title: 'Mobile App UI Design',
        description: 'Design 15 screens for a food delivery app. Figma prototype with design system.',
        amount: 35000,
        status: 'CREATED' as DealStatus,
        seller_name: 'Deepak Joshi',
        buyer_name: null,
        delivery_proof: null,
        dispute_reason: null,
        ai_verdict: null,
        ai_reasoning: null,
        ai_seller_percent: null,
        created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
        updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      },
    ];

    for (const deal of demoDeals) {
      this.deals.set(deal.id, deal);
      this.events.set(deal.id, []);

      // Add creation event
      this.createEvent({
        deal_id: deal.id,
        type: 'CREATED',
        message: `Deal created by ${deal.seller_name}`,
        actor: deal.seller_name,
      });

      if (deal.buyer_name) {
        this.createEvent({
          deal_id: deal.id,
          type: 'FUNDED',
          message: `Funded by ${deal.buyer_name} for ₹${deal.amount}`,
          actor: deal.buyer_name,
        });
      }

      if (deal.status === 'DELIVERED' || deal.status === 'COMPLETED' || deal.status === 'DISPUTED') {
        this.createEvent({
          deal_id: deal.id,
          type: 'DELIVERED',
          message: `Work delivered: ${deal.delivery_proof}`,
          actor: deal.seller_name,
        });
      }

      if (deal.status === 'COMPLETED') {
        this.createEvent({
          deal_id: deal.id,
          type: 'ACCEPTED',
          message: `Work accepted by ${deal.buyer_name}`,
          actor: deal.buyer_name!,
        });
      }

      if (deal.status === 'DISPUTED') {
        this.createEvent({
          deal_id: deal.id,
          type: 'DISPUTED',
          message: `Disputed by ${deal.buyer_name}: ${deal.dispute_reason}`,
          actor: deal.buyer_name!,
        });
        if (deal.ai_verdict) {
          this.createEvent({
            deal_id: deal.id,
            type: 'AI_VERDICT',
            message: `Panchayat AI recommends ${deal.ai_verdict} (${deal.ai_seller_percent}% to seller): ${deal.ai_reasoning}`,
            actor: 'Panchayat AI',
          });
        }
      }
    }
  }

  resetDatabase(): void {
    this.deals.clear();
    this.events.clear();
    this.seedDemoData();
  }
}

// Supabase implementation (for production)
class SupabaseAdapter implements DatabaseAdapter {
  private supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  private rowToDeal(row: any): Deal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      amount: row.amount,
      status: row.status as DealStatus,
      seller_name: row.seller_name,
      buyer_name: row.buyer_name,
      delivery_proof: row.delivery_proof,
      dispute_reason: row.dispute_reason,
      ai_verdict: row.ai_verdict,
      ai_reasoning: row.ai_reasoning,
      ai_seller_percent: row.ai_seller_percent,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private rowToEvent(row: any): Event {
    return {
      id: row.id,
      deal_id: row.deal_id,
      type: row.type,
      message: row.message,
      actor: row.actor,
      created_at: row.created_at,
    };
  }

  async getDeal(id: string): Promise<Deal | null> {
    const { data, error } = await this.supabase
      .from('deals')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.rowToDeal(data);
  }

  async getDeals(filters?: { status?: DealStatus; sellerName?: string; buyerName?: string }): Promise<Deal[]> {
    let query = this.supabase.from('deals').select('*').order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.sellerName) {
      query = query.eq('seller_name', filters.sellerName);
    }
    if (filters?.buyerName) {
      query = query.eq('buyer_name', filters.buyerName);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(this.rowToDeal);
  }

  async createDeal(deal: Omit<Deal, 'id' | 'created_at' | 'updated_at'>): Promise<Deal> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const { data, error } = await this.supabase
      .from('deals')
      .insert({ ...deal, id, created_at: now, updated_at: now })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create deal');
    return this.rowToDeal(data);
  }

  async updateDeal(id: string, updates: Partial<Deal>): Promise<Deal | null> {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase
      .from('deals')
      .update({ ...updates, updated_at: now })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return null;
    return this.rowToDeal(data);
  }

  async getEvents(dealId: string): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];
    return data.map(this.rowToEvent);
  }

  async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event> {
    const now = new Date().toISOString();
    const id = uuidv4();

    const { data, error } = await this.supabase
      .from('events')
      .insert({ ...event, id, created_at: now })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to create event');
    return this.rowToEvent(data);
  }

  seedDemoData(): void {
    // Supabase seeding would be done via SQL migrations
    console.log('Supabase seeding should be done via SQL migrations');
  }

  resetDatabase(): void {
    console.log('Supabase reset should be done via SQL truncation');
  }
}

// Factory function to get the appropriate adapter
let adapterInstance: DatabaseAdapter | null = null;

export function getDatabase(): DatabaseAdapter {
  if (adapterInstance) return adapterInstance;

  // Use Supabase for production if configured, otherwise use in-memory for development
  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    adapterInstance = new SupabaseAdapter();
  } else {
    adapterInstance = new MemoryAdapter();
  }

  return adapterInstance;
}

// Export types for use in API routes
export type { Deal, Event, DealStatus } from './types';