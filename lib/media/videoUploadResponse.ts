import { NextResponse } from 'next/server';
import { VideoUploadError } from '@/lib/services/videoUploadService';
import { logError } from '@/lib/errors';

/** Turns an error from a video upload route into a JSON response */
export function videoUploadErrorResponse(
  error: unknown,
  context: { endpoint: string; method: string; userId: string }
): Response {
  if (error instanceof VideoUploadError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.statusCode });
  }
  logError(error as Error, context);
  return NextResponse.json({ error: 'Something went wrong with the upload, please try again', code: 'INTERNAL_ERROR' }, { status: 500 });
}

/** Reads a JSON body, treating a malformed one as empty */
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? body : {};
  } catch {
    return {};
  }
}
