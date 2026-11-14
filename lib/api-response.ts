/**
 * API response helpers for Tijori escrow platform
 * Importers: All API routes in app/api/deals/ and app/api/ai/
 * Affected API: All endpoints for consistent response formatting
 * Data schemas: ApiResponse, ApiError, ValidationError
 * User instruction: "Build the Panchayat AI module... integration in dispute endpoint"
 */

import { NextResponse } from 'next/server';
import { ApiResponse, ApiError, ValidationError } from './api-types';

// Standardized API response helpers
export function successResponse<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ data }, { status });
}

export function errorResponse(error: ApiError, status: number = 400): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ error }, { status });
}

export function validationErrorResponse(error: ValidationError): NextResponse<ApiResponse<never>> {
  // Convert ValidationError to ApiError format for consistent response
  const apiError: ApiError = {
    code: 'VALIDATION',
    message: error.message,
  };
  return NextResponse.json({ error: apiError }, { status: 400 });
}

export function notFoundResponse(resource: string = 'Resource'): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: `${resource} not found` } },
    { status: 404 }
  );
}

export function serverErrorResponse(message: string = 'Internal server error'): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { error: { code: 'SERVER', message } },
    { status: 500 }
  );
}

export function forbiddenResponse(message: string = 'Forbidden'): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  );
}

export function invalidStateResponse(message: string): NextResponse<ApiResponse<never>> {
  return NextResponse.json(
    { error: { code: 'INVALID_STATE', message } },
    { status: 409 }
  );
}

// Async handler wrapper for consistent error handling
export type ApiHandler<T> = (
  request: Request,
  context?: { params: Promise<Record<string, string>> }
) => Promise<NextResponse<ApiResponse<T>>>;

export function withErrorHandling<T>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      console.error('API Error:', error);

      if (error instanceof Error) {
        // Handle known error types
        if (error.message.includes('NOT_FOUND') || error.message.includes('not found')) {
          return notFoundResponse();
        }
        if (error.message.includes('FORBIDDEN') || error.message.includes('unauthorized')) {
          return forbiddenResponse(error.message);
        }
        if (error.message.includes('INVALID_STATE') || error.message.includes('invalid state')) {
          return invalidStateResponse(error.message);
        }
        if (error.message.includes('VALIDATION') || error.message.includes('validation')) {
          return validationErrorResponse({
            code: 'INVALID_FORMAT',
            message: error.message,
          });
        }
      }

      return serverErrorResponse(error instanceof Error ? error.message : 'Unknown error');
    }
  };
}

// Simple auth extraction (in production, use proper auth)
export function extractAuth(request: Request): { user_role: 'SELLER' | 'BUYER' | 'ADMIN'; user_name: string } {
  // In a real app, this would validate JWT/session
  // For now, we'll use headers for demo purposes
  const userRole = (request.headers.get('x-user-role') as 'SELLER' | 'BUYER' | 'ADMIN') || 'SELLER';
  const userName = request.headers.get('x-user-name') || 'Anonymous';

  return { user_role: userRole, user_name: userName };
}