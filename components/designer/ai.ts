'use client';

/**
 * AI images and videos in the browser: start one, wait for it, and turn the
 * result into a photo background for a design.
 */

import type { PhotoBackground } from '@/lib/design/types';
import { getAiJob, startAiJob, type PublicAiJob } from '@/lib/api/designApi';
import { loadPhoto, tonesOf } from './photos';

export type AiProgress = 'starting' | 'image' | 'video' | 'done';

const POLL_MS = 3000;
/** Videos take a couple of minutes; give up waiting after this (the job keeps going) */
const WAIT_MS = 8 * 60 * 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Starts an AI image or video and resolves when it's finished */
export async function makeAi(
  kind: 'image' | 'video',
  prompt: string,
  format: PublicAiJob['format'],
  onProgress?: (p: AiProgress) => void,
  /** The model picked; the default when left out */
  model?: string
): Promise<PublicAiJob> {
  onProgress?.('starting');
  let { job } = await startAiJob(kind, prompt, format, model);
  const until = Date.now() + WAIT_MS;
  while (job.stage === 'image' || job.stage === 'video') {
    onProgress?.(job.stage);
    if (Date.now() > until) throw new Error('This is taking longer than usual. It will keep going; check My designs in a few minutes.');
    await sleep(POLL_MS);
    job = await getAiJob(job.jobId);
  }
  if (job.stage === 'failed') throw new Error(job.error || 'The AI couldn’t make that');
  onProgress?.('done');
  return job;
}

/** The AI image as a design background */
export async function aiPhotoBackground(job: PublicAiJob): Promise<PhotoBackground> {
  if (!job.photoId) throw new Error('No image came back');
  const img = await loadPhoto({ photoId: job.photoId });
  return {
    kind: 'photo',
    photoId: job.photoId,
    width: img.width,
    height: img.height,
    focusX: 0.5,
    focusY: 0.5,
    fit: 'fill',
    tones: tonesOf(img),
    credit: { name: 'Higgsfield AI', url: 'https://higgsfield.ai/', source: 'ai' },
  };
}
