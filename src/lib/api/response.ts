import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from '../errors';
import { AuthError } from '../auth/tenant';

export interface ApiResponseMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  requestId?: string;
  [key: string]: unknown;
}

export function apiSuccess<T extends Record<string, unknown> | Array<unknown>>(
  data: T,
  meta?: ApiResponseMeta,
  status = 200
): NextResponse {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return NextResponse.json(
      {
        success: true,
        ...data,
        ...(meta ? { meta } : {}),
      },
      { status }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { status }
  );
}

export function apiError(error: unknown, _req?: Request): NextResponse {
  const requestId = Math.random().toString(36).substring(2, 10);

  if (error instanceof AppError) {
    if (process.env.NODE_ENV !== 'production' || !error.isOperational) {
      console.error(`[API_ERROR] [${requestId}] ${error.code}:`, error.message);
    }
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.code,
        ...(error.details ? { details: error.details } : {}),
        requestId,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        code: error.statusCode === 401 ? 'AUTHENTICATION_REQUIRED' : 'AUTHORIZATION_DENIED',
        requestId,
      },
      { status: error.statusCode }
    );
  }

  if (error instanceof ZodError) {
    const issues = error.issues || [];
    const formatted = issues.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    return NextResponse.json(
      {
        success: false,
        error: issues[0]?.message || 'Input validation failed',
        code: 'VALIDATION_ERROR',
        details: formatted,
        requestId,
      },
      { status: 400 }
    );
  }

  console.error(`[API_UNHANDLED_EXCEPTION] [${requestId}]:`, error);
  return NextResponse.json(
    {
      success: false,
      error: 'An internal server error occurred. Please try again.',
      code: 'INTERNAL_SERVER_ERROR',
      requestId,
    },
    { status: 500 }
  );
}
