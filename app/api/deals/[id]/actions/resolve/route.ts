import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { validateRequest } from '@/lib/validation';
import { resolveDealSchema } from '@/lib/validation';
import { successResponse, errorResponse, withErrorHandling, extractAuth } from '@/lib/api-response';
import { ResolveDealRequest, AIVerdict } from '@/lib/api-types';

/**
 * POST /api/deals/[id]/actions/resolve - Resolve dispute (admin action)
 */
export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const auth = extractAuth(request);

  // Only admins can resolve
  if (auth.user_role !== 'ADMIN') {
    return errorResponse({ code: 'FORBIDDEN', message: 'Only admins can resolve disputes' }, 403);
  }

  const body: ResolveDealRequest = await request.json();

  const validation = validateRequest(resolveDealSchema, body);
  if (!validation.success) {
    return errorResponse(validation.error, 400);
  }

  const deal = await dealsService.resolveDeal(
    id,
    auth.user_name,
    validation.data.verdict,
    validation.data.seller_percent
  );

  return successResponse({ deal });
});