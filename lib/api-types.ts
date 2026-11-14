/**
 * API-specific type definitions for Tijori escrow platform
 * Importers: All API routes in app/api/deals/ and app/api/ai/
 * Affected API: All deal and AI endpoints
 * Data schemas: Request/Response interfaces for each endpoint
 * User instruction: "Build the Panchayat AI module... integration in dispute endpoint, admin frontend with AI card"
 */

import { Deal, DealStatus, Event, AIVerdict, CreateDealInput, FundDealInput, DeliverDealInput, AcceptDealInput, DisputeDealInput, ResolveDealInput, ApiError, ApiResponse, ValidationError, ValidationErrorCode, DEAL_STATUS_TRANSITIONS, ROLE_PERMISSIONS } from './types';

// Re-export all types for API use
export type {
  Deal,
  DealStatus,
  Event,
  AIVerdict,
  CreateDealInput,
  FundDealInput,
  DeliverDealInput,
  AcceptDealInput,
  DisputeDealInput,
  ResolveDealInput,
  ApiError,
  ApiResponse,
  ValidationError,
  ValidationErrorCode,
};

// Request/Response types for API routes
export interface CreateDealRequest {
  title: string;
  description: string;
  amount: number;
  seller_name: string;
}

export interface CreateDealResponse {
  deal: Deal;
}

export interface GetDealResponse {
  deal: Deal;
  events: Event[];
}

export interface ListDealsResponse {
  deals: Deal[];
}

export interface FundDealRequest {
  buyer_name: string;
}

export interface FundDealResponse {
  deal: Deal;
}

export interface DeliverDealRequest {
  delivery_proof: string;
}

export interface DeliverDealResponse {
  deal: Deal;
}

export interface AcceptDealRequest {
  buyer_name: string;
}

export interface AcceptDealResponse {
  deal: Deal;
}

export interface DisputeDealRequest {
  buyer_name: string;
  dispute_reason: string;
}

export interface DisputeDealResponse {
  deal: Deal;
  ai_verdict?: {
    verdict: AIVerdict;
    seller_percent: number;
    reasoning: string;
  } | null;
}

export interface ResolveDealRequest {
  admin_name: string;
  verdict: AIVerdict;
  seller_percent?: number;
}

export interface ResolveDealResponse {
  deal: Deal;
}

export interface ErrorResponse {
  error: ApiError;
}

// Role-based access control
export type DealActionRole = 'SELLER' | 'BUYER' | 'ADMIN';

export interface AuthenticatedRequest {
  user_role: DealActionRole;
  user_name: string;
}

// Helper type for validating state transitions
export type ValidNextStatuses<T extends DealStatus> = typeof DEAL_STATUS_TRANSITIONS[T];

// Action to status mapping
export const ACTION_TO_STATUS: Record<string, DealStatus> = {
  fund: 'FUNDED',
  deliver: 'DELIVERED',
  accept: 'COMPLETED',
  dispute: 'DISPUTED',
  resolve_release: 'RESOLVED_RELEASED',
  resolve_refund: 'RESOLVED_REFUNDED',
  resolve_split: 'RESOLVED_SPLIT',
};

export const ACTION_REQUIRED_ROLE: Record<string, DealActionRole[]> = {
  create: ['SELLER'],
  fund: ['BUYER'],
  deliver: ['SELLER'],
  accept: ['BUYER'],
  dispute: ['BUYER'],
  resolve: ['ADMIN'],
};