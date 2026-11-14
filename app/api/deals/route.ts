/**
 * Deals list/create API for Tijori escrow platform
 * Importers: None (API route)
 * Affected API: GET /api/deals, POST /api/deals
 * Data schemas: CreateDealRequest, ListDealsResponse
 * User instruction: "Build the Panchayat AI module... integration in dispute endpoint"
 */

import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { validateRequest } from '@/lib/validation';
import { createDealSchema, listDealsQuerySchema } from '@/lib/validation';
import { successResponse, errorResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { CreateDealRequest } from '@/lib/api-types';

/**
 * GET /api/deals - List all deals with optional filters
 * Query params: status, seller_name, buyer_name
 */
export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url);

  const validation = validateRequest(listDealsQuerySchema, {
    status: searchParams.get('status') || undefined,
    seller_name: searchParams.get('seller_name') || undefined,
    buyer_name: searchParams.get('buyer_name') || undefined,
  });

  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const deals = await dealsService.listDeals(validation.data);
  return successResponse({ deals });
});

/**
 * POST /api/deals - Create a new deal
 * Body: { title, description, amount, seller_name }
 */
export const POST = withErrorHandling(async (request: Request) => {
  const auth = extractAuth(request);

  // Only sellers can create deals
  if (auth.user_role !== 'SELLER') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only sellers can create deals' }, 403);
  }

  const body: CreateDealRequest = await request.json();

  const validation = validateRequest(createDealSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const deal = await dealsService.createDeal({
    ...validation.data,
    seller_name: auth.user_name, // Use authenticated user name
  });

  return successResponse({ deal }, 201);
});