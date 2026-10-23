/**
 * Puts a design's words on a video with ffmpeg: the video is fitted to the
 * design's size (cropped to fill), then the see-through overlay image (the
 * text, and the dark wash behind it) is laid on top.
 */

import { spawn } from 'child_process';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import path from 'path';

const TIMEOUT_MS = 3 * 60 * 1000;

export async function overlayVideo(
  videoUrl: string,
  overlayUrl: string,
  width: number,
  height: number,
  ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg'
): Promise<Buffer> {
  const dir = await mkdtemp(path.join(tmpdir(), 'zetca-overlay-'));
  const out = path.join(dir, 'out.mp4');
  // Even sizes, as H.264 needs
  const w = Math.round(width / 2) * 2;
  const h = Math.round(height / 2) * 2;
  const args = [
    '-nostdin',
    '-v', 'error',
    '-i', videoUrl,
    '-i', overlayUrl,
    '-filter_complex', `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},setsar=1[v];[1:v]scale=${w}:${h}[o];[v][o]overlay=0:0:format=auto[outv]`,
    '-map', '[outv]',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '21',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    '-y', out,
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
        if (code === 0) resolve();
        else reject(new Error(`ffmpeg failed (${code}): ${stderr.trim().split('\n').slice(-2).join(' ')}`));
      });
    });
    return await readFile(out);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
