import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { validateRequest } from '@/lib/validation';
import { fundDealSchema } from '@/lib/validation';
import { successResponse, errorResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { FundDealRequest } from '@/lib/api-types';

/**
 * POST /api/deals/[id]/actions/fund - Fund a deal (buyer action)
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const auth = extractAuth(request);

  // Only buyers can fund deals
  if (auth.user_role !== 'BUYER') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only buyers can fund deals' }, 403);
  }

  const body: FundDealRequest = await request.json();

  const validation = validateRequest(fundDealSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  // Use authenticated user name
  const deal = await dealsService.fundDeal(id, auth.user_name);

  return successResponse({ deal });
});