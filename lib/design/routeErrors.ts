import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { DesignNotFoundError } from '@/lib/services/designService';
import { StockPhotoError } from '@/lib/services/stockPhotoService';
import { StructuredOutputException } from '@/lib/agents/errors';
import { ApiError, logError } from '@/lib/errors';

/** Turns an error from a /api/designs route into a JSON response the page can show */
export function designErrorResponse(error: unknown, context: { endpoint: string; userId: string }): Response {
  if (error instanceof DesignNotFoundError) {
    return NextResponse.json({ error: error.message, code: 'NOT_FOUND' }, { status: 404 });
  }
  if (error instanceof StockPhotoError) {
    return NextResponse.json({ error: error.message, code: 'STOCK_PHOTOS' }, { status: error.statusCode });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? 'Some details need fixing', code: 'INVALID_INPUT' }, { status: 400 });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: 'API_ERROR' }, { status: error.statusCode });
  }
  if (error instanceof StructuredOutputException) {
    return NextResponse.json({ error: 'Couldn’t write that. Please try again.', code: 'AI_FAILED' }, { status: 502 });
  }
  logError(error as Error, context);
  return NextResponse.json({ error: 'Something went wrong, please try again', code: 'INTERNAL_ERROR' }, { status: 500 });
}
