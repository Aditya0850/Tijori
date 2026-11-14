import { z } from 'zod';
import {
  CreateDealRequest,
  FundDealRequest,
  DeliverDealRequest,
  AcceptDealRequest,
  DisputeDealRequest,
  ResolveDealRequest,
  ValidationError,
  AIVerdict,
  DealStatus,
} from './api-types';
import { ROLE_PERMISSIONS } from './types';

// Deal creation validation
export const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description too long'),
  amount: z.number().int().positive('Amount must be a positive integer'),
  seller_name: z.string().min(1, 'Seller name is required').max(100, 'Seller name too long'),
}) satisfies z.ZodType<CreateDealRequest>;

// Fund deal validation
export const fundDealSchema = z.object({
  buyer_name: z.string().max(100, 'Buyer name too long').optional(),
}) satisfies z.ZodType<FundDealRequest>;

// Deliver deal validation
export const deliverDealSchema = z.object({
  delivery_proof: z.string().url('Delivery proof must be a valid URL').min(1, 'Delivery proof is required'),
}) satisfies z.ZodType<DeliverDealRequest>;

// Accept deal validation
export const acceptDealSchema = z.object({
  buyer_name: z.string().min(1, 'Buyer name is required').max(100, 'Buyer name too long'),
}) satisfies z.ZodType<AcceptDealRequest>;

// Dispute deal validation
export const disputeDealSchema = z.object({
  buyer_name: z.string().min(1, 'Buyer name is required').max(100, 'Buyer name too long'),
  dispute_reason: z.string().min(10, 'Dispute reason must be at least 10 characters').max(2000, 'Dispute reason too long'),
}) satisfies z.ZodType<DisputeDealRequest>;

// Resolve deal validation
export const resolveDealSchema = z.object({
  admin_name: z.string().min(1, 'Admin name is required').max(100, 'Admin name too long'),
  verdict: z.enum(['RELEASE', 'REFUND', 'SPLIT']),
  seller_percent: z.number().int().min(0).max(100).optional(),
}) satisfies z.ZodType<ResolveDealRequest>;

// List deals query validation
export const listDealsQuerySchema = z.object({
  status: z.enum(['CREATED', 'FUNDED', 'DELIVERED', 'DISPUTED', 'COMPLETED', 'RESOLVED_RELEASED', 'RESOLVED_REFUNDED', 'RESOLVED_SPLIT']).optional(),
  seller_name: z.string().optional(),
  buyer_name: z.string().optional(),
});

// Validation helper
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const firstError = result.error.errors[0];
    return {
      success: false,
      error: {
        code: 'INVALID_FORMAT',
        message: firstError.message,
        field: firstError.path.join('.'),
      },
    };
  }

  return { success: true, data: result.data };
}

// Status transition validation
export function validateStatusTransition(
  currentStatus: DealStatus,
  nextStatus: DealStatus,
  action: string
): { valid: boolean; error?: ValidationError } {
  const validTransitions: Record<DealStatus, DealStatus[]> = {
    CREATED: ['FUNDED'],
    FUNDED: ['DELIVERED'],
    DELIVERED: ['COMPLETED', 'DISPUTED'],
    DISPUTED: ['RESOLVED_RELEASED', 'RESOLVED_REFUNDED', 'RESOLVED_SPLIT'],
    COMPLETED: [],
    RESOLVED_RELEASED: [],
    RESOLVED_REFUNDED: [],
    RESOLVED_SPLIT: [],
  };

  const allowed = validTransitions[currentStatus] || [];

  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_STATUS_TRANSITION',
        message: `Cannot ${action}: deal is in ${currentStatus} status, expected one of ${allowed.join(', ')}`,
      },
    };
  }

  return { valid: true };
}

// Role authorization validation - checks if user's role has required permission
export function validateRoleAuthorization(
  userRole: 'SELLER' | 'BUYER' | 'ADMIN',
  requiredPermission: string
): { authorized: boolean; error?: ValidationError } {
  const userPermissions = ROLE_PERMISSIONS[userRole] || [];

  if (!userPermissions.includes(requiredPermission)) {
    return {
      authorized: false,
      error: {
        code: 'UNAUTHORIZED_ROLE',
        message: `Action requires permission: ${requiredPermission}, but ${userRole} does not have it`,
      },
    };
  }
  return { authorized: true };
}

// Resolve verdict validation
export function validateResolveVerdict(
  verdict: AIVerdict,
  sellerPercent?: number
): { valid: boolean; error?: ValidationError } {
  if (verdict === 'RELEASE' && sellerPercent !== undefined && sellerPercent !== 100) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VERDICT',
        message: 'RELEASE verdict must have seller_percent = 100',
      },
    };
  }

  if (verdict === 'REFUND' && sellerPercent !== undefined && sellerPercent !== 0) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VERDICT',
        message: 'REFUND verdict must have seller_percent = 0',
      },
    };
  }

  if (verdict === 'SPLIT' && (sellerPercent === undefined || sellerPercent <= 0 || sellerPercent >= 100)) {
    return {
      valid: false,
      error: {
        code: 'INVALID_VERDICT',
        message: 'SPLIT verdict must have seller_percent between 1 and 99',
      },
    };
  }

  return { valid: true };
}