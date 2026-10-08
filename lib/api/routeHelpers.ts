/**
 * Shared helpers for the strategy/copy/scheduler/publisher API routes.
 *
 * Mirrors the error-handling conventions each FastAPI route module used
 * to repeat: a `{ detail: message }` JSON envelope (matching what the
 * existing API clients in lib/api/*.ts already parse), timeouts mapped to
 * 504, and Zod validation errors mapped to 400.
 */

import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { ApiError } from '../errors';
import { StructuredOutputException } from '../agents/errors';

export function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ detail: message }, { status });
}

/**
 * Reject with an ApiError(504) if `promise` does not settle within `seconds`.
 * `onTimeout` runs when the limit is hit, so callers can stop work that would
 * otherwise carry on in the background (e.g. saving a result nobody receives).
 */
export function withTimeout<T>(
  promise: Promise<T>,
  seconds: number,
  timeoutMessage: string,
  onTimeout?: () => void
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      onTimeout?.();
      reject(new ApiError(timeoutMessage, 504));
    }, seconds * 1000);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/** Map a thrown error from a route handler to a NextResponse, logging unexpected ones. */
export function handleRouteError(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.message, error.statusCode);
  }
  if (error instanceof StructuredOutputException) {
    console.error('Structured output error:', error.message);
    return jsonError('Failed to generate structured output. Please try again.', 500);
  }
  if (error instanceof ZodError) {
    return jsonError(`Invalid input: ${error.issues.map((i) => i.message).join(', ')}`, 400);
  }
  console.error(fallbackMessage, error);
  return jsonError(fallbackMessage, 500);
}
