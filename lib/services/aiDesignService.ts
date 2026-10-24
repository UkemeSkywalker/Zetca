/**
 * AI images and videos for designs, made with Higgsfield.
 *
 * A job goes: image → (for a video) the image animated into a 5-second clip
 * → done. Each step is a Higgsfield request; the page checks the job every few
 * seconds and each check moves it on. Finished files are copied into Zetca's
 * storage (Higgsfield keeps them only for about a week). A job that fails or
 * is blocked by the safety check gives its credits back.
 *
 * Everyone has a few free AI images and videos on the default models; those
 * use no credits. Models with draft quality make a cheap 480p video first;
 * `makeHd` then makes an HD version from the same frame, prompt and seed.
 *
 * Jobs are small JSON files next to the user's design photos.
 */

import { randomUUID } from 'crypto';
import { GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../config';
import { ApiError } from '../errors';
import type { FormatId } from '../design/types';
import { MediaRepository } from '../db/mediaRepository';
import { generateS3Key } from '../media/validation';
import { photoKey } from './stockPhotoService';
import { HiggsfieldClient, HiggsfieldError, type HiggsfieldRequest } from './higgsfieldClient';
import { Credits, type CreditSource } from '../billing/credits';
import { Ledger } from '../billing/ledger';
import { requireAiMedia } from '../billing/charge';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_VIDEO_MODEL,
  FRAME_MODEL,
  QUALITY_LABEL,
  hdCredits,
  imageCredits,
  imageModel,
  videoCostUsd,
  videoCredits,
  videoModel,
  videoStepUsd,
  videoTier,
  type VideoQuality,
} from '../billing/aiModels';

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
  /** For video models with drafts: the quality made */
  quality?: VideoQuality;
  /** Kept so an HD version follows its draft */
  seed?: number;
  /** For an HD version: the draft it was made from */
  draftOf?: string;
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
export type PublicAiJob = Pick<AiJob, 'jobId' | 'kind' | 'format' | 'model' | 'quality' | 'draftOf' | 'source' | 'stage' | 'error' | 'photoId' | 'mediaId' | 'createdAt' | 'cost'>;

export const toPublicJob = ({ jobId, kind, format, model, quality, draftOf, source, stage, error, photoId, mediaId, createdAt, cost }: AiJob): PublicAiJob => ({
  jobId,
  kind,
  format,
  model,
  quality,
  draftOf,
  source,
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
    private checkPlan: (userId: string, what: string, tier: number) => Promise<void> = requireAiMedia,
    private frameUrl?: (key: string) => Promise<string>
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

  /**
   * Starts the image (a video's first frame): uses a free AI use when the
   * default model is picked and one is left, otherwise checks the plan and
   * takes the credits.
   */
  async start(userId: string, input: { kind: AiKind; prompt: string; format: FormatId; model?: string; quality?: VideoQuality }): Promise<AiJob> {
    const video = input.kind === 'video' ? videoModel(input.model) : null;
    const image = video ? imageModel(FRAME_MODEL) : imageModel(input.model);
    const model = video ?? image;
    // Only models with qualities make drafts; their default is HD 720p
    const quality = video?.qualities ? (input.quality && video.qualities[input.quality] ? input.quality : 'hd') : undefined;
    const isDefault = model.id === (video ? DEFAULT_VIDEO_MODEL : DEFAULT_IMAGE_MODEL);
    const free = isDefault && (await this.credits.takeFree(userId, input.kind));
    let cost = 0;
    let taken: { source: CreditSource; month: string } = { source: 'free', month: '' };
    if (!free) {
      const what = video ? `${video.name}${quality ? ` ${QUALITY_LABEL[quality]}` : ''} videos` : `${image.name} images`;
      await this.checkPlan(userId, what, video ? videoTier(video, quality) : image.tier);
      cost = video ? videoCredits(video, quality) : imageCredits(image);
      taken = await this.credits.take(userId, cost);
    }
    const costUsd = video ? videoCostUsd(video, quality) : image.costUsd;
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
        ...(quality ? { quality, seed: Math.floor(Math.random() * 2 ** 31) } : {}),
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
      await this.giveBack(userId, input.kind, cost, taken.source, taken.month);
      throw error;
    }
  }

  /** An HD version of a finished draft: the same frame, prompt and seed, at a higher resolution */
  async makeHd(userId: string, draftJobId: string, quality: VideoQuality): Promise<AiJob> {
    const draft = await this.get(userId, draftJobId);
    if (draft.kind !== 'video' || draft.quality !== 'draft' || draft.stage !== 'done' || !draft.photoId) {
      throw new ApiError('Only a finished draft video can be made in HD', 400);
    }
    const vm = videoModel(draft.model);
    const q = vm.qualities?.[quality];
    if (!q || quality === 'draft') throw new ApiError('That model doesn’t make that quality', 400);
    await this.checkPlan(userId, `${vm.name} ${QUALITY_LABEL[quality]} videos`, videoTier(vm, quality));
    const cost = hdCredits(vm, quality);
    const taken = await this.credits.take(userId, cost);
    const jobId = randomUUID();
    try {
      const frame = await this.signedFrame(photoKey(userId, draft.photoId));
      const req = await this.hf.submit(vm.endpoint, vm.body(videoPrompt(draft.prompt), frame, { resolution: q.resolution, seed: draft.seed }), `${jobId}-video`);
      const now = new Date().toISOString();
      return await this.save({
        jobId,
        userId,
        kind: 'video',
        format: draft.format,
        model: vm.id,
        quality,
        seed: draft.seed,
        draftOf: draft.jobId,
        prompt: draft.prompt,
        stage: 'video',
        imageRequestId: draft.imageRequestId,
        videoRequestId: req.request_id,
        photoId: draft.photoId,
        cost,
        source: taken.source,
        month: taken.month,
        costUsd: videoStepUsd(vm, quality),
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      await this.credits.refund(userId, cost, taken.source, taken.month);
      throw error;
    }
  }

  /** A short-lived link Higgsfield can fetch the saved first frame from */
  private signedFrame(key: string): Promise<string> {
    if (this.frameUrl) return this.frameUrl(key);
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), { expiresIn: 3600 });
  }

  private async giveBack(userId: string, kind: AiKind, cost: number, source: CreditSource, month: string): Promise<void> {
    if (source === 'free') await this.credits.refundFree(userId, kind);
    else await this.credits.refund(userId, cost, source, month);
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
        const resolution = job.quality ? vm.qualities?.[job.quality]?.resolution : undefined;
        const video = await this.hf.submit(vm.endpoint, vm.body(videoPrompt(job.prompt), url, { resolution, seed: job.seed }), `${job.jobId}-video`);
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
      .add({ userId: job.userId, action: job.kind === 'video' ? 'ai_video' : 'ai_image', credits: job.cost, source: job.source, detail: [job.model, job.quality, job.source === 'free' ? 'free' : ''].filter(Boolean).join(' · '), costUsd: job.costUsd, status: 'charged' })
      .catch((e) => console.error('Credit ledger: couldn’t record an AI job:', (e as Error).message));
    return saved;
  }

  private async fail(job: AiJob, req: HiggsfieldRequest): Promise<AiJob> {
    await this.giveBack(job.userId, job.kind, job.cost, job.source, job.month);
    await this.ledger
      .add({ userId: job.userId, action: job.kind === 'video' ? 'ai_video' : 'ai_image', credits: 0, source: job.source, detail: job.model, status: 'refunded' })
      .catch(() => undefined);
    const back = job.source === 'free' ? 'Your free use was given back.' : 'Your credits were given back.';
    const error = req.status === 'nsfw' ? BLOCKED : req.status === 'canceled' ? 'The AI request was cancelled.' : `The AI couldn’t make that. ${back}`;
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
