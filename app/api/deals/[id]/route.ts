import { NextRequest, NextResponse } from 'next/server';
import { dealsService } from '@/lib/deals-service';
import { successResponse, notFoundResponse, withErrorHandling } from '@/lib/api-response';

/**
 * GET /api/deals/[id] - Get a single deal with its events
 */
export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) => {
  const { id } = await context.params;
  const result = await dealsService.getDeal(id);

  if (!result) {
    return notFoundResponse('Deal');
  }

  return successResponse(result);
});