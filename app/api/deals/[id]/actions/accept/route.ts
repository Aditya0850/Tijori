import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { validateRequest } from '@/lib/validation';
import { acceptDealSchema } from '@/lib/validation';
import { successResponse, errorResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { AcceptDealRequest } from '@/lib/api-types';

/**
 * POST /api/deals/[id]/actions/accept - Accept delivery (buyer action)
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const auth = extractAuth(request);

  // Only buyers can accept
  if (auth.user_role !== 'BUYER') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only buyers can accept delivery' }, 403);
  }

  const body: AcceptDealRequest = await request.json();

  const validation = validateRequest(acceptDealSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  // Use authenticated user name
  const deal = await dealsService.acceptDeal(id, auth.user_name);

  return successResponse({ deal });
});