import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { YouTubeVideoError } from '@/lib/services/youtubeVideoService';
import { YouTubeApiError, YouTubeAuthError } from '@/lib/services/youtubeClient';
import { forgetYouTubeAccess } from '@/lib/services/youtubeAccess';
import { fieldErrors } from '@/lib/models/youtubeVideo';
import { StructuredOutputException } from '@/lib/agents/errors';
import { ApiError, logError } from '@/lib/errors';

/** Turns an error from a /api/youtube route into a JSON response the page can show */
export function youtubeErrorResponse(error: unknown, context: { endpoint: string; userId: string }): Response {
  if (error instanceof YouTubeVideoError) {
    return NextResponse.json({ error: error.message, code: error.code, fields: error.fields }, { status: error.statusCode });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'Some details need fixing', code: 'INVALID_INPUT', fields: fieldErrors(error) }, { status: 400 });
  }
  if (error instanceof YouTubeAuthError) {
    forgetYouTubeAccess(context.userId);
    const message =
      error.code === 'not_connected' ? 'Connect a YouTube channel first' : 'Your YouTube sign-in has expired. Reconnect your channel in Profile.';
    return NextResponse.json({ error: message, code: error.code }, { status: 409 });
  }
  if (error instanceof YouTubeApiError) {
    logError(error, { ...context, status: error.status, reason: error.reason });
    if (error.reason === 'quotaExceeded') {
      return NextResponse.json({ error: 'YouTube’s daily limit was reached. Try again tomorrow.', code: 'QUOTA' }, { status: 429 });
    }
    return NextResponse.json({ error: 'YouTube couldn’t do that right now. Please try again.', code: 'YOUTUBE_ERROR' }, { status: 502 });
  }
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message, code: 'API_ERROR' }, { status: error.statusCode });
  }
  if (error instanceof StructuredOutputException) {
    return NextResponse.json({ error: 'The Copywriter couldn’t write that. Please try again.', code: 'AI_FAILED' }, { status: 502 });
  }
  logError(error as Error, context);
  return NextResponse.json({ error: 'Something went wrong, please try again', code: 'INTERNAL_ERROR' }, { status: 500 });
}
