/**
 * POST /api/youtube/captions
 * Stores a captions file (.srt or .vtt, up to 1 MB) for a video. Body: { filename, content }
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { S3Client, type S3ClientConfig, PutObjectCommand } from '@aws-sdk/client-s3';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { youtubeErrorResponse } from '@/lib/youtube/routeErrors';

export const MAX_CAPTIONS_BYTES = 1024 * 1024;

const Body = z.object({
  filename: z
    .string()
    .max(200)
    .regex(/\.(srt|vtt)$/i, 'Captions must be an .srt or .vtt file'),
  content: z
    .string()
    .min(1, 'This captions file is empty')
    .refine((c) => Buffer.byteLength(c, 'utf8') <= MAX_CAPTIONS_BYTES, 'Captions files can be up to 1 MB'),
});

export async function POST(req: NextRequest) {
  const handler = await withAuth(async (request: NextRequest, userId: string) => {
    try {
      const { filename, content } = Body.parse(await request.json().catch(() => ({})));
      const ext = filename.toLowerCase().endsWith('.vtt') ? 'vtt' : 'srt';
      if (ext === 'vtt' && !content.trimStart().startsWith('WEBVTT')) {
        return NextResponse.json({ error: 'This doesn’t look like a WebVTT file', code: 'INVALID_CAPTIONS' }, { status: 400 });
      }
      const cfg = getConfig();
      const s3Config: S3ClientConfig = { region: cfg.awsRegion };
      if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
        s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
      }
      const key = `${userId}/captions/${randomUUID()}.${ext}`;
      await new S3Client(s3Config).send(
        new PutObjectCommand({
          Bucket: cfg.s3MediaBucket,
          Key: key,
          Body: content,
          ContentType: ext === 'vtt' ? 'text/vtt' : 'application/x-subrip',
        })
      );
      return NextResponse.json({ key, filename }, { status: 201 });
    } catch (error) {
      return youtubeErrorResponse(error, { endpoint: '/api/youtube/captions', userId });
    }
  });
  return handler(req);
}
