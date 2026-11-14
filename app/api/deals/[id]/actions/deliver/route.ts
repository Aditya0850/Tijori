import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { validateRequest } from '@/lib/validation';
import { deliverDealSchema } from '@/lib/validation';
import { successResponse, errorResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { DeliverDealRequest } from '@/lib/api-types';

/**
 * POST /api/deals/[id]/actions/deliver - Deliver work (seller action)
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const auth = extractAuth(request);

  // Only sellers can deliver
  if (auth.user_role !== 'SELLER') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only sellers can deliver work' }, 403);
  }

  const body: DeliverDealRequest = await request.json();

  const validation = validateRequest(deliverDealSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const deal = await dealsService.deliverDeal(id, validation.data.delivery_proof, auth.user_name);

  return successResponse({ deal });
});