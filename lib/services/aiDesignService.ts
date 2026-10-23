/**
 * AI images and videos for designs, made with Higgsfield.
 *
 * A job goes: image → (for a video) the image animated into a 5-second clip
 * → done. Each step is a Higgsfield request; the page checks the job every few
 * seconds and each check moves it on. Finished files are copied into Zetca's
 * storage (Higgsfield keeps them only for about a week). A job that fails or
 * is blocked by the safety check gives its credits back.
 *
 * Jobs are small JSON files next to the user's design photos.
 */

import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getConfig } from '../config';
import type { FormatId } from '../design/types';
import { MediaRepository } from '../db/mediaRepository';
import { generateS3Key } from '../media/validation';
import { photoKey } from './stockPhotoService';
import { HiggsfieldClient, HiggsfieldError, type HiggsfieldRequest } from './higgsfieldClient';
import { Credits, type CreditSource } from '../billing/credits';
import { Ledger } from '../billing/ledger';
import { requireAiMedia } from '../billing/charge';
import { FRAME_MODEL, imageCredits, imageModel, videoCostUsd, videoCredits, videoModel } from '../billing/aiModels';

export type AiKind = 'image' | 'video';

export interface AiJob {
  jobId: string;
  userId: string;
  kind: AiKind;
  format: FormatId;
  prompt: string;
  stage: 'image' | 'video' | 'done' | 'failed';
  /** The model picked (an image model, or a video model; videos' first frame uses the frame model) */
  model: string;
  imageRequestId: string;
  videoRequestId?: string;
  /** Credits taken, where from, and the month (refunds go back to the same place) */
  cost: number;
  source: CreditSource;
  month: string;
  /** What the job costs Zetca at Higgsfield */
  costUsd: number;
  createdAt: string;
  updatedAt: string;
  error?: string;
  /** The image (a saved design photo); for a video, its first frame */
  photoId?: string;
  /** The finished video, in the user's media */
  mediaId?: string;
}

/** What the page sees */
export type PublicAiJob = Pick<AiJob, 'jobId' | 'kind' | 'format' | 'model' | 'stage' | 'error' | 'photoId' | 'mediaId' | 'createdAt' | 'cost'>;

export const toPublicJob = ({ jobId, kind, format, model, stage, error, photoId, mediaId, createdAt, cost }: AiJob): PublicAiJob => ({
  jobId,
  kind,
  format,
  model,
  stage,
  error,
  photoId,
  mediaId,
  createdAt,
  cost,
});

const jobKey = (userId: string, jobId: string) => `designs/${userId}/ai/${jobId}.json`;
const JOB_ID = /^[0-9a-f-]{36}$/;

export class AiJobNotFoundError extends Error {
  statusCode = 404;
  constructor() {
    super('That AI request doesn’t exist');
  }
}

const BLOCKED = 'The AI’s safety check blocked that description. Try different words.';

export class AiDesignService {
  private s3: S3Client;
  private bucket: string;

  constructor(
    private hf = new HiggsfieldClient(),
    private credits = new Credits(),
    s3?: S3Client,
    private media = new MediaRepository(),
    private ledger = new Ledger(),
    private checkPlan: (userId: string, what: string, tier: number) => Promise<void> = requireAiMedia
  ) {
    const cfg = getConfig();
    const s3Config: S3ClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      s3Config.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.s3 = s3 ?? new S3Client(s3Config);
    this.bucket = cfg.s3MediaBucket;
  }

  private async save(job: AiJob): Promise<AiJob> {
    const next = { ...job, updatedAt: new Date().toISOString() };
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: jobKey(job.userId, job.jobId), Body: JSON.stringify(next), ContentType: 'application/json' })
    );
    return next;
  }

  async get(userId: string, jobId: string): Promise<AiJob> {
    if (!JOB_ID.test(jobId)) throw new AiJobNotFoundError();
    try {
      const out = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: jobKey(userId, jobId) }));
      return JSON.parse(await out.Body!.transformToString()) as AiJob;
    } catch (error) {
      if ((error as { name?: string }).name === 'NoSuchKey') throw new AiJobNotFoundError();
      throw error;
    }
  }

  /** Checks the plan, takes the credits and starts the image (a video's first frame) */
  async start(userId: string, input: { kind: AiKind; prompt: string; format: FormatId; model?: string }): Promise<AiJob> {
    const video = input.kind === 'video' ? videoModel(input.model) : null;
    const image = video ? imageModel(FRAME_MODEL) : imageModel(input.model);
    const model = video ?? image;
    await this.checkPlan(userId, video ? `${video.name} videos` : `${image.name} images`, model.tier);
    const cost = video ? videoCredits(video) : imageCredits(image);
    const costUsd = video ? videoCostUsd(video) : image.costUsd;
    const taken = await this.credits.take(userId, cost);
    const jobId = randomUUID();
    try {
      const req = await this.hf.submit(image.endpoint, image.body(imagePrompt(input.prompt), input.format), `${jobId}-image`);
      const now = new Date().toISOString();
      return await this.save({
        jobId,
        userId,
        kind: input.kind,
        format: input.format,
        model: model.id,
        prompt: input.prompt,
        stage: 'image',
        imageRequestId: req.request_id,
        cost,
        source: taken.source,
        month: taken.month,
        costUsd,
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      await this.credits.refund(userId, cost, taken.source, taken.month);
      throw error;
    }
  }

  /** Checks on a job and moves it on; returns it as it is now */
  async advance(userId: string, jobId: string): Promise<AiJob> {
    let job = await this.get(userId, jobId);
    if (job.stage === 'done' || job.stage === 'failed') return job;
    try {
      if (job.stage === 'image') {
        const req = await this.hf.status(job.imageRequestId);
        if (isFinished(req) && req.status !== 'completed') return this.fail(job, req);
        if (req.status !== 'completed') return job;
        const url = req.images?.[0]?.url;
        if (!url) return this.fail(job, { ...req, status: 'failed', error: 'No image came back' });
        const photoId = randomUUID();
        await this.s3.send(
          new PutObjectCommand({ Bucket: this.bucket, Key: photoKey(userId, photoId), Body: await this.hf.download(url), ContentType: contentTypeOf(url) })
        );
        if (job.kind === 'image') return this.finish({ ...job, photoId, stage: 'done' });
        const vm = videoModel(job.model);
        const video = await this.hf.submit(vm.endpoint, vm.body(videoPrompt(job.prompt), url), `${job.jobId}-video`);
        job = await this.save({ ...job, photoId, stage: 'video', videoRequestId: video.request_id });
        return job;
      }
      // The video step
      const req = await this.hf.status(job.videoRequestId!);
      if (isFinished(req) && req.status !== 'completed') return this.fail(job, req);
      if (req.status !== 'completed') return job;
      const url = req.video?.url;
      if (!url) return this.fail(job, { ...req, status: 'failed', error: 'No video came back' });
      const bytes = await this.hf.download(url);
      const mediaId = randomUUID();
      const filename = 'ai-video.mp4';
      const s3Key = generateS3Key(userId, mediaId, filename);
      await this.s3.send(new PutObjectCommand({ Bucket: this.bucket, Key: s3Key, Body: bytes, ContentType: 'video/mp4' }));
      await this.media.createMedia({
        mediaId,
        userId,
        s3Key,
        contentType: 'video/mp4',
        fileSize: bytes.length,
        mediaType: 'video',
        originalFilename: filename,
        createdAt: new Date().toISOString(),
        durationSeconds: 5,
      });
      return this.finish({ ...job, mediaId, stage: 'done' });
    } catch (error) {
      // A busy or briefly unreachable service: keep the job and check again later
      if (error instanceof HiggsfieldError && (error.statusCode === 429 || error.statusCode === 502)) return job;
      throw error;
    }
  }

  /** Records the finished job in the credit ledger */
  private async finish(job: AiJob): Promise<AiJob> {
    const saved = await this.save(job);
    await this.ledger
      .add({ userId: job.userId, action: job.kind === 'video' ? 'ai_video' : 'ai_image', credits: job.cost, source: job.source, detail: job.model, costUsd: job.costUsd, status: 'charged' })
      .catch((e) => console.error('Credit ledger: couldn’t record an AI job:', (e as Error).message));
    return saved;
  }

  private async fail(job: AiJob, req: HiggsfieldRequest): Promise<AiJob> {
    await this.credits.refund(job.userId, job.cost, job.source, job.month);
    await this.ledger
      .add({ userId: job.userId, action: job.kind === 'video' ? 'ai_video' : 'ai_image', credits: 0, source: job.source, detail: job.model, status: 'refunded' })
      .catch(() => undefined);
    const error = req.status === 'nsfw' ? BLOCKED : req.status === 'canceled' ? 'The AI request was cancelled.' : 'The AI couldn’t make that. Your credits were given back.';
    return this.save({ ...job, stage: 'failed', error });
  }
}

const isFinished = (r: HiggsfieldRequest) => ['completed', 'failed', 'nsfw', 'canceled'].includes(r.status);

const contentTypeOf = (url: string) => (/\.png(\?|$)/i.test(url) ? 'image/png' : /\.webp(\?|$)/i.test(url) ? 'image/webp' : 'image/jpeg');

/** Words go on top in the Designer, so the image itself should have none */
export function imagePrompt(prompt: string): string {
  return `${prompt.trim()}. High quality, vivid, professional social media photo. No text, no letters, no logos, no watermarks.`;
}

export function videoPrompt(prompt: string): string {
  return `${prompt.trim()}. Smooth, subtle cinematic camera movement and natural motion. No text, no logos.`;
}
