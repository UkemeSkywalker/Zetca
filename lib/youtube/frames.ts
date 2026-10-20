/**
 * Grabs still frames from a local video file, as 1280×720 JPEG thumbnails.
 */

const WIDTH = 1280;
const HEIGHT = 720;

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => {
      video.removeEventListener('seeked', done);
      resolve();
    };
    video.addEventListener('seeked', done);
    video.onerror = () => reject(new Error('Could not read the video'));
    video.currentTime = time;
  });
}

/** Frames at the given fractions of the video (default 25%, 50%, 75%) */
export async function captureFrames(file: File, fractions = [0.25, 0.5, 0.75]): Promise<Blob[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.preload = 'auto';
  video.playsInline = true;
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error('Could not read the video'));
      video.src = url;
    });
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const frames: Blob[] = [];
    for (const f of fractions) {
      if (duration) await seek(video, Math.min(duration - 0.1, duration * f));
      // Fit the frame inside 16:9 on black, like YouTube shows it
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const scale = Math.min(WIDTH / video.videoWidth, HEIGHT / video.videoHeight);
      const w = video.videoWidth * scale;
      const h = video.videoHeight * scale;
      ctx.drawImage(video, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
      if (blob) frames.push(blob);
      if (!duration) break;
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}
