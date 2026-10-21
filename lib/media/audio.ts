/**
 * Pulls the audio out of a video with ffmpeg, as 16 kHz mono FLAC pieces of
 * a few minutes each, so the pieces can be transcribed at the same time.
 *
 * ffmpeg reads the video straight from a presigned S3 URL (it fetches only
 * what it needs), so the server never stores the whole video. Works the same
 * for MP4, MOV and WebM.
 */

import { spawn } from 'child_process';
import { mkdtemp, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

export const AUDIO_PIECE_SECONDS = 300;
const TIMEOUT_MS = 15 * 60 * 1000;

export class NoAudioError extends Error {
  constructor() {
    super('This video has no audio track');
    this.name = 'NoAudioError';
  }
}

export interface AudioPieces {
  dir: string;
  files: string[];
  cleanup: () => Promise<void>;
}

export async function extractAudioPieces(videoUrl: string, ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'): Promise<AudioPieces> {
  const dir = await mkdtemp(path.join(tmpdir(), 'zetca-audio-'));
  const cleanup = () => rm(dir, { recursive: true, force: true });
  const args = [
    '-nostdin',
    '-v', 'error',
    '-i', videoUrl,
    '-vn', // audio only
    '-map', '0:a:0',
    '-ac', '1',
    '-ar', '16000',
    '-c:a', 'flac',
    '-f', 'segment',
    '-segment_time', String(AUDIO_PIECE_SECONDS),
    '-reset_timestamps', '1',
    path.join(dir, 'part%03d.flac'),
  ];
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', (d) => {
        if (stderr.length < 4000) stderr += String(d);
      });
      const timer = setTimeout(() => proc.kill('SIGKILL'), TIMEOUT_MS);
      proc.on('error', (e) => {
        clearTimeout(timer);
        reject(e);
      });
      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code === 0) return resolve();
        // "-map 0:a:0" fails like this when there's no audio stream
        if (/matches no streams|does not contain any stream|Stream map .* matches no/i.test(stderr)) return reject(new NoAudioError());
        reject(new Error(`ffmpeg failed (${code}): ${stderr.trim().split('\n').slice(-2).join(' ')}`));
      });
    });
    const files = (await readdir(dir)).filter((f) => f.endsWith('.flac')).sort().map((f) => path.join(dir, f));
    if (files.length === 0) throw new NoAudioError();
    return { dir, files, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
