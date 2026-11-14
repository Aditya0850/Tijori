import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { validateRequest } from '@/lib/validation';
import { disputeDealSchema } from '@/lib/validation';
import { successResponse, errorResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { DisputeDealRequest } from '@/lib/api-types';

/**
 * POST /api/deals/[id]/actions/dispute - Dispute delivery (buyer action)
 * Triggers AI verdict automatically
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const auth = extractAuth(request);

  // Only buyers can dispute
  if (auth.user_role !== 'BUYER') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only buyers can dispute delivery' }, 403);
  }

  const body: DisputeDealRequest = await request.json();

  const validation = validateRequest(disputeDealSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  // Use authenticated user name
  const result = await dealsService.disputeDeal(id, auth.user_name, validation.data.dispute_reason);

  return successResponse(result);
});