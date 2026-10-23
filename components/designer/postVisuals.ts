'use client';

/**
 * Makes the visual for a post (a Copywriter post, a scheduled post or a
 * YouTube video): writes the words for it, builds a design (a text design or
 * a stock photo with text), turns it into an image and attaches it.
 */

import { STYLES, styleById, variationPalettes, type DesignText } from '@/lib/design/styles';
import { designToBlob } from '@/lib/design/render';
import type { AttachedTo, DesignDoc, DesignRecord, FormatId, PhotoBackground } from '@/lib/design/types';
import { createDesign, listDesigns, rememberedHandle, saveDesign, savePhoto, searchPhotos, writeDesignText, type StockPhoto } from '@/lib/api/designApi';
import { requestUploadUrl, uploadFileToS3 } from '@/lib/api/mediaClient';
import { setCopyVisual } from '@/lib/api/copyClient';
import { updatePost } from '@/lib/api/schedulerClient';
import type { CopyRecord, VisualKind } from '@/types/agent';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { loadPhoto, photosFor, rememberSaved, tonesOf } from './photos';

/** What a visual is made for */
export interface VisualTarget {
  /** Any stable id (used to vary colours and photos between posts) */
  id: string;
  text: string;
  platform: string;
  angle?: string;
}

/** The size each platform shows best */
export function formatForPlatform(platform: string): FormatId {
  if (platform === 'youtube') return 'landscape';
  if (platform === 'tiktok') return 'story';
  if (platform === 'instagram' || platform === 'facebook') return 'portrait';
  return 'square';
}

/** Kinds that can be made today (AI images and videos come later) */
export const MAKEABLE: VisualKind[] = ['template', 'stock'];

export const VISUAL_LABELS: Record<VisualKind, string> = {
  none: 'None',
  template: 'Text design',
  stock: 'Stock photo + text',
  ai_image: 'AI image',
  ai_video: 'AI video',
};

/** A number from an id, so neighbouring posts get different colours and photos */
function seed(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

const brief = (t: VisualTarget) => `${t.angle ? `${t.angle}: ` : ''}${t.text}`.slice(0, 900);

async function photoBackground(photo: StockPhoto, save: boolean): Promise<PhotoBackground> {
  const previewId = `pixabay:${photo.id}`;
  const img = await loadPhoto({ photoId: previewId, previewUrl: photo.previewUrl });
  const bg: PhotoBackground = {
    kind: 'photo',
    photoId: previewId,
    previewUrl: photo.previewUrl,
    width: img.width,
    height: img.height,
    focusX: 0.5,
    focusY: 0.5,
    fit: 'fill',
    tones: tonesOf(img),
    credit: { ...photo.credit, source: 'pixabay' },
  };
  if (!save) return bg;
  const saved = await savePhoto(photo.id);
  const stored = { ...bg, photoId: saved.photoId, previewUrl: undefined, credit: saved.credit };
  rememberSaved(previewId, stored);
  return stored;
}

/** Copies a design's preview photo into storage, so the design can be saved */
export async function savePreviewPhoto(doc: DesignDoc): Promise<DesignDoc> {
  const bg = doc.background;
  if (bg.kind !== 'photo' || !bg.photoId.startsWith('pixabay:')) return doc;
  const saved = await savePhoto(Number(bg.photoId.split(':')[1]));
  const stored = { ...bg, photoId: saved.photoId, previewUrl: undefined, credit: saved.credit };
  rememberSaved(bg.photoId, stored);
  return { ...doc, background: stored };
}

/**
 * Designs for a post: `count` options (different colours, or different
 * photos), in the platform's best size. Photos stay as previews until saved.
 */
export async function designOptions(
  target: VisualTarget,
  kind: VisualKind,
  count = 1,
  format: FormatId = formatForPlatform(target.platform)
): Promise<{ docs: DesignDoc[]; name: string }> {
  // Thumbnails are seen small next to other videos: a few huge words work best
  const prompt = format === 'landscape' ? `A YouTube thumbnail, at most 5 big punchy words (not the full title). ${brief(target)}` : brief(target);
  const written = await writeDesignText({ prompt: prompt.slice(0, 1000) });
  const handle = rememberedHandle();
  const text: DesignText = {
    headline: written.headline,
    kicker: written.kicker,
    body: written.body,
    // Thumbnails are small on screen; a handle would only add clutter
    footer: format === 'landscape' ? undefined : handle || undefined,
  };
  const n = seed(target.id);
  const name = written.headline.replace(/\n/g, ' ').slice(0, 60);

  if (kind === 'stock') {
    const photos = await searchPhotos(written.photoQuery || target.angle || 'lifestyle', format === 'square' || format === 'landscape' ? 'horizontal' : 'vertical');
    if (photos.length) {
      const style = styleById('photo-text')!;
      const start = n % Math.max(1, Math.min(photos.length, 12) - count + 1);
      const picks = photos.slice(start, start + count);
      const docs = await Promise.all(picks.map(async (p) => style.build(text, format, variationPalettes(style)[0], await photoBackground(p, false))));
      return { docs, name };
    }
    // No photos for that search: a text design still gives the post a visual
  }

  const style = styleById(written.styleId) ?? STYLES[0];
  const palettes = variationPalettes(style);
  const docs = Array.from({ length: count }, (_, i) => style.build(text, format, palettes[(n + i) % palettes.length]));
  return { docs, name };
}

/** Turns a design into an image in the user's media */
export async function exportDesign(doc: DesignDoc, name: string): Promise<{ mediaId: string; mediaType: 'image'; blob: Blob }> {
  await loadDesignFonts();
  const blob = await designToBlob(doc, FONT_FAMILIES, await photosFor(doc));
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const file = new File([blob], `${name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'design'}.${ext}`, { type: blob.type });
  const { uploadUrl, mediaId } = await requestUploadUrl(file.type, file.name, file.size);
  await uploadFileToS3(uploadUrl, file);
  return { mediaId, mediaType: 'image', blob };
}

/** Saves a design (copying its photo first) and makes its image */
export async function saveAndExport(doc: DesignDoc, name: string, attachedTo?: AttachedTo) {
  const ready = await savePreviewPhoto(doc);
  const image = await exportDesign(ready, name);
  const design = await createDesign({
    name,
    source: ready.background.kind === 'photo' ? 'stock' : 'template',
    doc: ready,
    attachedTo,
    mediaId: image.mediaId,
  });
  rememberDesign(design);
  return { design, image };
}

/** Makes a visual of `kind` for a post and returns its design and image (not attached to anything yet) */
export async function makeVisual(target: VisualTarget, kind: VisualKind, attachedTo?: AttachedTo) {
  const { docs, name } = await designOptions(target, kind, 1);
  return saveAndExport(docs[0], name, attachedTo);
}

/** Makes a visual of `kind` for a Copywriter post and attaches it */
export async function makePostVisual(copy: CopyRecord, kind: VisualKind): Promise<{ copy: CopyRecord; design: DesignRecord }> {
  const { design, image } = await makeVisual(copy, kind, { copyId: copy.id, platform: copy.platform });
  const updated = await setCopyVisual(copy.id, { kind: design.source === 'stock' ? 'stock' : 'template', designId: design.designId, mediaId: image.mediaId, mediaType: image.mediaType });
  return { copy: updated, design };
}

/**
 * Saves changes to a design and refreshes the image on the posts it's
 * attached to (its Copywriter post and its scheduled post).
 */
export async function updatePostVisual(design: DesignRecord, doc: DesignDoc, name = design.name) {
  const ready = await savePreviewPhoto(doc);
  const image = await exportDesign(ready, name);
  const source = ready.background.kind === 'photo' ? 'stock' : 'template';
  const saved = await saveDesign(design.designId, { name, source, doc: ready, attachedTo: design.attachedTo, mediaId: image.mediaId });
  rememberDesign(saved);
  const to = design.attachedTo;
  const copy = to?.copyId
    ? await setCopyVisual(to.copyId, { kind: source, designId: design.designId, mediaId: image.mediaId, mediaType: image.mediaType }).catch(() => null)
    : null;
  if (to?.postId) await updatePost(to.postId, { mediaId: image.mediaId, mediaType: image.mediaType });
  return { copy, design: saved, image };
}

/** Changes a post's visual to "None" (only where the platform allows it) */
export function clearPostVisual(copy: CopyRecord): Promise<CopyRecord> {
  return setCopyVisual(copy.id, { kind: 'none' });
}

// ---------------------------------------------------------------------------
// Finding the design behind an image (scheduled posts only keep the image)
// ---------------------------------------------------------------------------

let designList: Promise<Map<string, DesignRecord>> | null = null;
const byId = new Map<string, DesignRecord>();

function rememberDesign(d: DesignRecord) {
  byId.set(d.designId, d);
  designList?.then((m) => d.mediaId && m.set(d.mediaId, d));
}

/** The user's designs by the id of their current image */
export function designsByImage(): Promise<Map<string, DesignRecord>> {
  designList ??= listDesigns().then(
    (list) => {
      list.forEach((d) => byId.set(d.designId, d));
      return new Map(list.filter((d) => d.mediaId).map((d) => [d.mediaId!, d]));
    },
    () => {
      designList = null;
      return new Map();
    }
  );
  return designList;
}
