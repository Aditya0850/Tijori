/**
 * Core type definitions for Tijori escrow platform
 * Importers: lib/db.ts (DatabaseAdapter), lib/deals-service.ts, all API routes, components/AiVerdictCard.tsx
 * Affected API: All deal-related endpoints, dispute resolution flow
 * Data schemas: Deal, Event, AIVerdict, CreateDealInput, FundDealInput, etc.
 * User instruction: "Build the Panchayat AI module... types for AI verdict, dispute input, deal state machine"
 */

export type DealStatus =
  | 'CREATED'
  | 'FUNDED'
  | 'DELIVERED'
  | 'DISPUTED'
  | 'COMPLETED'
  | 'RESOLVED_RELEASED'
  | 'RESOLVED_REFUNDED'
  | 'RESOLVED_SPLIT';

export type UserRole = 'SELLER' | 'BUYER' | 'ADMIN';

export type AIVerdict = 'RELEASE' | 'REFUND' | 'SPLIT';

export interface Deal {
  id: string;
  title: string;
  description: string;
  amount: number;
  status: DealStatus;
  seller_name: string;
  buyer_name: string | null;
  delivery_proof: string | null;
  dispute_reason: string | null;
  ai_verdict: AIVerdict | null;
  ai_reasoning: string | null;
  ai_seller_percent: number | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  deal_id: string;
  type: string;
  message: string;
  actor: string;
  created_at: string;
}

export interface CreateDealInput {
  title: string;
  description: string;
  amount: number;
  seller_name: string;
}

export interface FundDealInput {
  buyer_name: string;
}

export interface DeliverDealInput {
  delivery_proof: string;
}

export interface AcceptDealInput {
  buyer_name: string;
}

export interface DisputeDealInput {
  buyer_name: string;
  dispute_reason: string;
}

export interface ResolveDealInput {
  admin_name: string;
  verdict: AIVerdict;
  seller_percent?: number;
}

export interface AIVerdictResponse {
  verdict: AIVerdict;
  seller_percent: number;
  reasoning: string;
}

export type ValidationErrorCode =
  | 'MISSING_FIELD'
  | 'INVALID_FORMAT'
  | 'INVALID_STATUS_TRANSITION'
  | 'UNAUTHORIZED_ROLE'
  | 'DEAL_NOT_FOUND'
  | 'INVALID_AMOUNT'
  | 'INVALID_VERDICT';

export interface ApiError {
  code: 'VALIDATION' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_STATE' | 'SERVER';
  message: string;
}

export interface ValidationError {
  code: ValidationErrorCode;
  message: string;
  field?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export const DEAL_STATUS_TRANSITIONS: Record<DealStatus, DealStatus[]> = {
  CREATED: ['FUNDED'],
  FUNDED: ['DELIVERED'],
  DELIVERED: ['COMPLETED', 'DISPUTED'],
  DISPUTED: ['RESOLVED_RELEASED', 'RESOLVED_REFUNDED', 'RESOLVED_SPLIT'],
  COMPLETED: [],
  RESOLVED_RELEASED: [],
  RESOLVED_REFUNDED: [],
  RESOLVED_SPLIT: [],
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  SELLER: ['create_deal', 'deliver_deal', 'view_deal'],
  BUYER: ['fund_deal', 'accept_deal', 'dispute_deal', 'view_deal'],
  ADMIN: ['resolve_deal', 'view_deal', 'view_all_deals'],
};