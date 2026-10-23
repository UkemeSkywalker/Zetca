/**
 * The Higgsfield image and video models users can pick, with what each costs
 * Zetca (Higgsfield's estimate for our account, 23 Oct 2026) and its price in
 * credits. `tier` is the lowest plan that can use it: 1 Starter, 2 Pro, 3 Agency.
 *
 * Videos animate a first frame made with the frame model, so a video's cost is
 * the frame plus the video step.
 */

import type { FormatId } from '../design/types';
import { creditsFor } from './prices';

export interface AiImageModel {
  id: string;
  name: string;
  maker: string;
  bestFor: string;
  endpoint: string;
  costUsd: number;
  tier: number;
  /** The request body for a prompt in a design shape */
  body: (prompt: string, format: FormatId) => Record<string, unknown>;
}

export interface AiVideoModel {
  id: string;
  name: string;
  maker: string;
  bestFor: string;
  endpoint: string;
  seconds: number;
  /** The video step alone; add the first frame for the full cost */
  costUsd: number;
  tier: number;
  body: (prompt: string, imageUrl: string) => Record<string, unknown>;
}

/** Shapes every image model accepts; 4:5 where the model has it */
const ASPECT: Record<FormatId, string> = { square: '1:1', portrait: '3:4', story: '9:16', landscape: '16:9' };
const aspect = (format: FormatId, has45 = false) => (format === 'portrait' && has45 ? '4:5' : ASPECT[format]);

const soul = (prompt: string, format: FormatId) => ({ prompt, aspect_ratio: aspect(format), resolution: '1080p' });

export const AI_IMAGE_MODELS: AiImageModel[] = [
  { id: 'soul-v2', name: 'Soul V2', maker: 'Higgsfield', bestFor: 'Portraits, fashion and editorial', endpoint: 'higgsfield-ai/soul/v2/standard', costUsd: 0.006, tier: 1, body: soul },
  { id: 'soul-cinema', name: 'Soul Cinema', maker: 'Higgsfield', bestFor: 'Cinema-style stills', endpoint: 'higgsfield-ai/soul/cinema', costUsd: 0.006, tier: 1, body: soul },
  { id: 'z-image-turbo', name: 'Z-Image Turbo', maker: 'Alibaba', bestFor: 'Fast, low-cost images', endpoint: 'z-image/turbo', costUsd: 0.015, tier: 1, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f), resolution: '1k' }) },
  { id: 'recraft-v4-1', name: 'Recraft V4.1', maker: 'Recraft', bestFor: 'Design and illustration', endpoint: 'recraft/v4.1/text-to-image', costUsd: 0.035, tier: 1, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f, true), resolution: '1k' }) },
  { id: 'qwen-image-3', name: 'Qwen Image 3', maker: 'Alibaba', bestFor: 'Clean, detailed images', endpoint: 'alibaba/qwen-image-3/text-to-image', costUsd: 0.04, tier: 1, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f), resolution: '1k' }) },
  { id: 'ideogram-4', name: 'Ideogram 4.0', maker: 'Ideogram', bestFor: 'Graphic, poster-like images', endpoint: 'ideogram/v4.0', costUsd: 0.06, tier: 1, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f, true) }) },
  { id: 'grok-image-2', name: 'Grok Image 2.0', maker: 'xAI', bestFor: 'Bold, imaginative images', endpoint: 'xai/grok-imagine-image-2.0', costUsd: 0.06, tier: 1, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f), resolution: '1k', quality: 'medium' }) },
  { id: 'soul-standard', name: 'Soul (standard)', maker: 'Higgsfield', bestFor: 'Soul styles with style strength', endpoint: 'higgsfield-ai/soul/standard', costUsd: 0.188, tier: 2, body: soul },
  { id: 'recraft-v4-1-pro', name: 'Recraft V4.1 Pro', maker: 'Recraft', bestFor: '2K design and illustration', endpoint: 'recraft/v4.1/pro/text-to-image', costUsd: 0.21, tier: 2, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f, true), resolution: '2k' }) },
  { id: 'marketing-studio-2', name: 'Marketing Studio 2.0', maker: 'Higgsfield', bestFor: 'Campaign and ad images', endpoint: 'marketing-studio/image', costUsd: 0.373, tier: 2, body: (prompt, f) => ({ prompt, aspect_ratio: aspect(f), resolution: '2k', quality: 'high' }) },
];

const i2v = (seconds: number) => (prompt: string, imageUrl: string) => ({ prompt, image_url: imageUrl, duration: seconds });

export const AI_VIDEO_MODELS: AiVideoModel[] = [
  { id: 'kling-2-5-turbo', name: 'Kling 2.5 Turbo', maker: 'Kling', bestFor: 'Low-cost clips', endpoint: 'kling-video/v2.5-turbo/standard/image-to-video', seconds: 5, costUsd: 0.179, tier: 1, body: i2v(5) },
  { id: 'hailuo-2-3', name: 'Hailuo 2.3', maker: 'MiniMax', bestFor: 'Natural motion, 6 seconds', endpoint: 'minimax/hailuo-2.3/standard/image-to-video', seconds: 6, costUsd: 0.238, tier: 1, body: i2v(6) },
  { id: 'pixverse-v6', name: 'PixVerse V6', maker: 'PixVerse', bestFor: 'Clips with sound', endpoint: 'pixverse/v6/image-to-video', seconds: 5, costUsd: 0.255, tier: 1, body: i2v(5) },
  { id: 'kling-2-5-turbo-pro', name: 'Kling 2.5 Turbo Pro', maker: 'Kling', bestFor: 'Sharper Kling 2.5', endpoint: 'kling-video/v2.5-turbo/pro/image-to-video', seconds: 5, costUsd: 0.298, tier: 1, body: i2v(5) },
  { id: 'wan-2-6', name: 'Wan 2.6', maker: 'Alibaba', bestFor: 'Smooth everyday scenes', endpoint: 'wan/v2.6/image-to-video', seconds: 5, costUsd: 0.425, tier: 2, body: i2v(5) },
  { id: 'kling-3-turbo', name: 'Kling 3.0 Turbo', maker: 'Kling', bestFor: 'Fast Kling 3.0', endpoint: 'kling-video/v3.0-turbo/image-to-video', seconds: 5, costUsd: 0.476, tier: 2, body: i2v(5) },
  { id: 'kling-3', name: 'Kling 3.0', maker: 'Kling', bestFor: 'High-quality motion, with sound', endpoint: 'kling-video/v3.0/std/image-to-video', seconds: 5, costUsd: 0.536, tier: 2, body: i2v(5) },
  { id: 'minimax-h3', name: 'MiniMax H3', maker: 'MiniMax', bestFor: 'Detailed, cinematic clips', endpoint: 'minimax/h3/image-to-video', seconds: 5, costUsd: 0.553, tier: 2, body: i2v(5) },
  { id: 'kling-2-6-pro', name: 'Kling 2.6 Pro', maker: 'Kling', bestFor: 'Clips with sound', endpoint: 'kling-video/v2.6/pro/image-to-video', seconds: 5, costUsd: 0.595, tier: 2, body: i2v(5) },
  { id: 'kling-3-pro', name: 'Kling 3.0 Pro', maker: 'Kling', bestFor: 'Top-quality Kling', endpoint: 'kling-video/v3.0/pro/image-to-video', seconds: 5, costUsd: 0.714, tier: 3, body: i2v(5) },
  { id: 'kling-3-4k', name: 'Kling 3.0 4K', maker: 'Kling', bestFor: '4K output', endpoint: 'kling-video/v3.0/4k/image-to-video', seconds: 5, costUsd: 1.785, tier: 3, body: i2v(5) },
];

export const DEFAULT_IMAGE_MODEL = 'soul-v2';
export const DEFAULT_VIDEO_MODEL = 'kling-2-5-turbo';
/** The model that makes a video's first frame */
export const FRAME_MODEL = 'soul-v2';

export const imageModel = (id?: string) => AI_IMAGE_MODELS.find((m) => m.id === id) ?? AI_IMAGE_MODELS.find((m) => m.id === DEFAULT_IMAGE_MODEL)!;
export const videoModel = (id?: string) => AI_VIDEO_MODELS.find((m) => m.id === id) ?? AI_VIDEO_MODELS.find((m) => m.id === DEFAULT_VIDEO_MODEL)!;

export const imageCredits = (m: AiImageModel) => creditsFor(m.costUsd);
export const videoCostUsd = (m: AiVideoModel) => m.costUsd + imageModel(FRAME_MODEL).costUsd;
export const videoCredits = (m: AiVideoModel) => creditsFor(videoCostUsd(m));

/** What the page shows in a model picker */
export interface ModelOption {
  id: string;
  name: string;
  maker: string;
  bestFor: string;
  credits: number;
  tier: number;
  seconds?: number;
}

export const imageOptions = (): ModelOption[] =>
  AI_IMAGE_MODELS.map(({ id, name, maker, bestFor, tier }) => ({ id, name, maker, bestFor, tier, credits: imageCredits(imageModel(id)) }));
export const videoOptions = (): ModelOption[] =>
  AI_VIDEO_MODELS.map((m) => ({ id: m.id, name: m.name, maker: m.maker, bestFor: m.bestFor, tier: m.tier, seconds: m.seconds, credits: videoCredits(m) }));
