/**
 * Transcripts of uploaded videos.
 *
 *   start():   ffmpeg pulls the audio into 5-minute pieces, each piece goes to
 *              S3 and gets its own AWS Transcribe job, all running at once.
 *   refresh(): checks the jobs; when all are done, stitches the pieces back
 *              together (shifting each piece's times by where it starts) and
 *              saves one transcript to S3.
 *
 * refresh() runs whenever the page asks for the transcript, so progress
 * doesn't depend on any one server staying up.
 */

import { readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import {
  S3Client,
  type S3ClientConfig,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  TranscribeClient,
  type TranscribeClientConfig,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
  DeleteTranscriptionJobCommand,
} from '@aws-sdk/client-transcribe';
import { getConfig } from '@/lib/config';
import { MediaRepository } from '@/lib/db/mediaRepository';
import { AUDIO_PIECE_SECONDS, NoAudioError, extractAudioPieces, type AudioPieces } from '@/lib/media/audio';
import type { MediaRecord, Transcript, TranscriptState } from '@/types/media';

/** A transcript stuck mid-way this long (server restarted) is started again */
const STALE_MS = 20 * 60 * 1000;

export class TranscriptError extends Error {
  constructor(message: string, public statusCode = 400) {
    super(message);
    this.name = 'TranscriptError';
  }
}

/** Turns one Transcribe result into sentences, shifted to where its piece starts in the video */
export function segmentsFromTranscribe(
  result: {
    results?: {
      audio_segments?: { start_time: string; end_time: string; transcript: string }[];
      items?: { type: string; start_time?: string; end_time?: string; alternatives: { content: string }[] }[];
    };
  },
  offsetSeconds: number
): Transcript['segments'] {
  const shift = (t: string | undefined) => Math.round((Number(t ?? 0) + offsetSeconds) * 100) / 100;
  const audioSegments = result.results?.audio_segments;
  if (audioSegments?.length) {
    return audioSegments
      .filter((s) => s.transcript.trim())
      .map((s) => ({ start: shift(s.start_time), end: shift(s.end_time), text: s.transcript.trim() }));
  }
  // Older output: build sentences from words, ending at . ? !
  const segments: Transcript['segments'] = [];
  let current: { start: number; end: number; words: string[] } | null = null;
  for (const item of result.results?.items ?? []) {
    const word = item.alternatives[0]?.content ?? '';
    if (item.type === 'pronunciation') {
      if (!current) current = { start: shift(item.start_time), end: shift(item.end_time), words: [] };
      current.words.push(word);
      current.end = shift(item.end_time);
    } else if (current) {
      current.words[current.words.length - 1] += word;
      if (/[.?!]/.test(word)) {
        segments.push({ start: current.start, end: current.end, text: current.words.join(' ') });
        current = null;
      }
    }
  }
  if (current) segments.push({ start: current.start, end: current.end, text: current.words.join(' ') });
  return segments;
}

export class TranscriptService {
  private s3: S3Client;
  private transcribe: TranscribeClient;
  private bucket: string;

  constructor(
    private media = new MediaRepository(),
    private extract: (url: string) => Promise<AudioPieces> = extractAudioPieces,
    clients?: { s3?: S3Client; transcribe?: TranscribeClient }
  ) {
    const cfg = getConfig();
    const base: S3ClientConfig & TranscribeClientConfig = { region: cfg.awsRegion };
    if (cfg.awsAccessKeyId && cfg.awsSecretAccessKey) {
      base.credentials = { accessKeyId: cfg.awsAccessKeyId, secretAccessKey: cfg.awsSecretAccessKey };
    }
    this.s3 = clients?.s3 ?? new S3Client(base);
    this.transcribe = clients?.transcribe ?? new TranscribeClient(base);
    this.bucket = cfg.s3MediaBucket;
  }

  private async ownedVideo(userId: string, mediaId: string): Promise<MediaRecord> {
    const record = await this.media.getMediaById(mediaId);
    if (!record || record.userId !== userId || record.mediaType !== 'video') {
      throw new TranscriptError('Video not found', 404);
    }
    if (record.status === 'uploading') throw new TranscriptError('The video is still uploading', 409);
    return record;
  }

  private stale(state: TranscriptState): boolean {
    return Date.now() - new Date(state.updatedAt).getTime() > STALE_MS;
  }

  /** Whether start() should run: no transcript yet, or one stuck mid-way or failed a while ago */
  needsStart(state: TranscriptState | undefined): boolean {
    if (!state) return true;
    return ['extracting', 'transcribing', 'failed'].includes(state.status) && this.stale(state);
  }

  /**
   * Starts a transcript if the video has none (or a stuck or failed one).
   * Safe to call more than once: only one caller wins the claim.
   */
  async start(userId: string, mediaId: string): Promise<TranscriptState> {
    const record = await this.ownedVideo(userId, mediaId);
    const existing = record.transcript;
    if (!this.needsStart(existing)) return existing!;

    const now = new Date().toISOString();
    const extracting: TranscriptState = { status: 'extracting', startedAt: now, updatedAt: now };
    const claimed = await this.media.setTranscript(
      mediaId,
      extracting,
      existing ? [existing.status] : [null]
    );
    if (!claimed) return (await this.media.getMediaById(mediaId))?.transcript ?? extracting;

    let pieces: AudioPieces | null = null;
    try {
      const videoUrl = await getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: record.s3Key }), {
        expiresIn: 3600,
      });
      pieces = await this.extract(videoUrl);
      const run = randomUUID().slice(0, 8);
      const jobs = await Promise.all(
        pieces.files.map(async (file, i) => {
          const key = `${userId}/transcripts/${mediaId}/${run}-${String(i).padStart(3, '0')}.flac`;
          await this.s3.send(
            new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: await readFile(file), ContentType: 'audio/flac' })
          );
          const name = `zetca-${mediaId}-${run}-${i}`;
          await this.transcribe.send(
            new StartTranscriptionJobCommand({
              TranscriptionJobName: name,
              Media: { MediaFileUri: `s3://${this.bucket}/${key}` },
              MediaFormat: 'flac',
              MediaSampleRateHertz: 16000,
              IdentifyLanguage: true,
            })
          );
          return { name, offsetSeconds: i * AUDIO_PIECE_SECONDS };
        })
      );
      const state: TranscriptState = { status: 'transcribing', jobs, startedAt: now, updatedAt: new Date().toISOString() };
      await this.media.setTranscript(mediaId, state);
      return state;
    } catch (error) {
      const state: TranscriptState =
        error instanceof NoAudioError
          ? { status: 'none', startedAt: now, updatedAt: new Date().toISOString() }
          : { status: 'failed', error: (error as Error).message.slice(0, 300), startedAt: now, updatedAt: new Date().toISOString() };
      if (state.status === 'failed') console.error(`Transcript for ${mediaId} failed: ${state.error}`);
      await this.media.setTranscript(mediaId, state);
      return state;
    } finally {
      await pieces?.cleanup();
    }
  }

  /** Checks the Transcribe jobs and finishes the transcript when they're all done */
  async refresh(userId: string, mediaId: string): Promise<TranscriptState | undefined> {
    const record = await this.ownedVideo(userId, mediaId);
    const state = record.transcript;
    if (!state || state.status !== 'transcribing' || !state.jobs?.length) return state;

    const results = await Promise.all(
      state.jobs.map(async (job) => {
        const { TranscriptionJob } = await this.transcribe.send(new GetTranscriptionJobCommand({ TranscriptionJobName: job.name }));
        return { job, info: TranscriptionJob };
      })
    );
    const failed = results.find((r) => r.info?.TranscriptionJobStatus === 'FAILED');
    if (failed) {
      // A piece with no speech fails with "no speech"; that's fine as long as some pieces worked
      const reason = failed.info?.FailureReason ?? 'Transcription failed';
      if (results.every((r) => r.info?.TranscriptionJobStatus === 'FAILED')) {
        const next: TranscriptState = /speech|audio/i.test(reason)
          ? { ...state, status: 'none', jobs: undefined, updatedAt: new Date().toISOString() }
          : { ...state, status: 'failed', error: reason.slice(0, 300), jobs: undefined, updatedAt: new Date().toISOString() };
        await this.media.setTranscript(mediaId, next);
        await this.cleanup(userId, mediaId, state.jobs);
        return next;
      }
    }
    if (results.some((r) => !['COMPLETED', 'FAILED'].includes(r.info?.TranscriptionJobStatus ?? ''))) return state;

    const segments: Transcript['segments'] = [];
    let language = 'en-US';
    for (const { job, info } of results) {
      if (info?.TranscriptionJobStatus !== 'COMPLETED' || !info.Transcript?.TranscriptFileUri) continue;
      if (job.offsetSeconds === 0 && info.LanguageCode) language = info.LanguageCode;
      const res = await fetch(info.Transcript.TranscriptFileUri);
      if (!res.ok) throw new TranscriptError(`Couldn't read the transcript (${res.status})`, 502);
      segments.push(...segmentsFromTranscribe(await res.json(), job.offsetSeconds));
    }
    segments.sort((a, b) => a.start - b.start);

    const transcript: Transcript = { language, segments };
    const key = `${userId}/transcripts/${mediaId}/transcript.json`;
    await this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: JSON.stringify(transcript), ContentType: 'application/json' })
    );
    const next: TranscriptState = {
      status: segments.length ? 'ready' : 'none',
      key,
      language,
      startedAt: state.startedAt,
      updatedAt: new Date().toISOString(),
    };
    await this.media.setTranscript(mediaId, next, ['transcribing']);
    await this.cleanup(userId, mediaId, state.jobs);
    return next;
  }

  /** The finished transcript, or null if it isn't ready */
  async get(userId: string, mediaId: string): Promise<Transcript | null> {
    const record = await this.ownedVideo(userId, mediaId);
    if (record.transcript?.status !== 'ready' || !record.transcript.key) return null;
    const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: record.transcript.key }));
    return JSON.parse(await res.Body!.transformToString()) as Transcript;
  }

  /** Deletes the audio pieces and Transcribe jobs (best effort) */
  private async cleanup(userId: string, mediaId: string, jobs: { name: string }[]): Promise<void> {
    await Promise.all(
      jobs.map(async (job) => {
        const run = job.name.split('-').slice(-2)[0];
        const index = job.name.split('-').pop()!;
        const key = `${userId}/transcripts/${mediaId}/${run}-${index.padStart(3, '0')}.flac`;
        await Promise.all([
          this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })).catch(() => {}),
          this.transcribe.send(new DeleteTranscriptionJobCommand({ TranscriptionJobName: job.name })).catch(() => {}),
        ]);
      })
    );
  }
}
