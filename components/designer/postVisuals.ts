'use client';

/**
 * Makes the visual for a post (a Copywriter post, a scheduled post or a
 * YouTube video): writes the words for it, builds a design (a text design or
 * a stock photo with text), turns it into an image and attaches it.
 */

import { paletteById, STYLES, styleById, variationPalettes, type DesignText } from '@/lib/design/styles';
import { designToBlob, overlayToBlob } from '@/lib/design/render';
import { aiPhotoBackground, makeAi, type AiProgress } from './ai';
import type { AttachedTo, DesignDoc, DesignRecord, FormatId, PhotoBackground } from '@/lib/design/types';
import { createDesign, listDesigns, rememberedHandle, renderDesignVideo, saveDesign, savePhoto, searchPhotos, writeDesignText, type StockPhoto } from '@/lib/api/designApi';
import { requestUploadUrl, uploadFileToS3 } from '@/lib/api/mediaClient';
import { setCopyVisual } from '@/lib/api/copyClient';
import { updatePost } from '@/lib/api/schedulerClient';
import type { CopyRecord, VisualKind } from '@/types/agent';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { loadPhoto, photosFor, rememberSaved, tonesOf } from './photos';
import { buildPost, NO_PHOTO, pickLayout, recipeById, recipeColors } from '@/lib/design/recipes';
import { carouselSlides, type CarouselText } from '@/lib/design/carousel';

/** A campaign's design style: the style library recipe, and the AI image model */
export interface VisualStyle {
  recipeId: string;
  model?: string;
  /** The campaign's brand colours (otherwise the style's own) */
  colors?: { main: string; ink: string; accent: string };
  /** 'mix' the style's layouts post by post, or always one layout */
  layout?: string;
  /** The campaign's brand: its people and products go in the pictures, not the style's examples */
  brand?: { name?: string; industry?: string; audience?: string };
}

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

/** Kinds that can be made */
export const MAKEABLE: VisualKind[] = ['template', 'stock', 'ai_image', 'ai_video', 'carousel'];

/** AI credits each kind costs (the others are free) */
/** Credits each kind costs: the words for text and stock visuals, plus the AI image or video */
export const AI_CREDIT_COST: Partial<Record<VisualKind, number>> = { template: 1, stock: 1, ai_image: 2, ai_video: 27, carousel: 1 };

export const VISUAL_LABELS: Record<VisualKind, string> = {
  none: 'None',
  template: 'Text design',
  stock: 'Stock photo + text',
  ai_image: 'AI image',
  ai_video: 'AI video',
  carousel: 'Carousel',
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
  format: FormatId = formatForPlatform(target.platform),
  /** AI images and videos take a while: how far along it is */
  onProgress?: (p: AiProgress) => void,
  /** A campaign style: AI images follow its recipe */
  campaignStyle?: VisualStyle
): Promise<{ docs: DesignDoc[]; name: string }> {
  // Thumbnails are seen small next to other videos: a few huge words work best
  const recipe = kind === 'ai_image' && campaignStyle ? recipeById(campaignStyle.recipeId) : undefined;
  const base = format === 'landscape' ? `A YouTube thumbnail, at most 5 big punchy words (not the full title). ${brief(target)}` : brief(target);
  // A style can ask for its words a certain way (accent words, a crossed-out word, a short giant word)
  const b = campaignStyle?.brand;
  const brandLine = b && (b.industry || b.audience) ? `The brand: ${[b.name, b.industry && `a ${b.industry} brand`, b.audience && `for ${b.audience}`].filter(Boolean).join(', ')}.\n` : '';
  const prompt = recipe ? `${brandLine}${recipe.wordsHint ? `How to write the words: ${recipe.wordsHint}\n` : ''}The post: ${base}` : base;
  const written = await writeDesignText({ prompt: prompt.slice(0, 1000), ...(recipe ? { styleId: 'headline-body' as const } : {}) });
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

  if (recipe) {
    // The post's own idea, in the campaign's look: one of the style's layouts, in the campaign's colours
    const layout = pickLayout(recipe, campaignStyle?.layout, n);
    const colors = recipeColors(recipe, campaignStyle?.colors, layout.id);
    if (layout.noImage) return { docs: [buildPost(recipe, layout.id, { text, format, photo: NO_PHOTO, colors })], name };
    const idea = (target.angle ? `${target.angle}: ${written.headline}` : written.headline).replace(/[*~]/g, '').replace(/\n/g, ' ');
    // Who and what are in the picture come from this brand and post, not the style's examples
    const cast = { people: written.people, object: written.object };
    const job = await makeAi('image', layout.imagePrompt(idea, colors, cast), format, onProgress, campaignStyle?.model, undefined, { rawPrompt: true, cutout: layout.cutout });
    const photo = await aiPhotoBackground(job);
    const cut = job.cutoutPhotoId ? await loadPhoto({ photoId: job.cutoutPhotoId }) : null;
    const doc = buildPost(recipe, layout.id, {
      text,
      format,
      photo,
      colors,
      cutout: cut && job.cutoutPhotoId ? { photoId: job.cutoutPhotoId, width: cut.width, height: cut.height } : undefined,
    });
    return { docs: [doc], name };
  }

  if (kind === 'ai_image' || kind === 'ai_video') {
    const job = await makeAi(kind === 'ai_video' ? 'video' : 'image', written.imagePrompt || brief(target), format, onProgress);
    const bg = await aiPhotoBackground(job);
    const style = styleById('photo-text')!;
    const doc = style.build(text, format, variationPalettes(style)[0], bg);
    return { docs: [job.mediaId ? { ...doc, video: { mediaId: job.mediaId, durationSeconds: 5 } } : doc], name };
  }

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

/** Platforms that take a carousel (LinkedIn posts it as a swipeable document) */
export const CAROUSEL_PLATFORMS = new Set(['linkedin', 'instagram', 'facebook', 'tiktok']);

/** Slides in a new carousel: the cover, 3 content slides and the closing slide */
export const DEFAULT_SLIDES = 5;

/**
 * A carousel for a post: the cover in the campaign's style (its AI image and
 * layout), then content slides and a closing slide in the same colours. With
 * no campaign style, the cover is a text design and the slides follow its colours.
 */
export async function carouselFor(
  target: VisualTarget,
  campaignStyle?: VisualStyle,
  onProgress?: (p: AiProgress) => void,
  total = DEFAULT_SLIDES,
  format: FormatId = formatForPlatform(target.platform)
): Promise<{ slides: DesignDoc[]; name: string }> {
  const recipe = campaignStyle ? recipeById(campaignStyle.recipeId) : undefined;
  const b = campaignStyle?.brand;
  const brandLine = b && (b.industry || b.audience) ? `The brand: ${[b.name, b.industry && `a ${b.industry} brand`, b.audience && `for ${b.audience}`].filter(Boolean).join(', ')}.\n` : '';
  const prompt = `${brandLine}${recipe?.wordsHint ? `How to write the words: ${recipe.wordsHint}\n` : ''}The post: ${brief(target)}`;
  const written = await writeDesignText({ prompt: prompt.slice(0, 1000), styleId: 'headline-body', slides: Math.max(1, total - 2) });
  const handle = rememberedHandle() || undefined;
  const text: DesignText = { headline: written.headline, kicker: written.kicker, body: written.body, footer: handle };
  const words: CarouselText = {
    slides: written.slides?.length ? written.slides : [{ headline: written.body ?? written.headline }],
    closing: { headline: written.closing ?? 'Want more like this?', cta: written.cta },
    footer: handle,
  };
  const name = written.headline.replace(/[*~]/g, '').replace(/\n/g, ' ').slice(0, 60);
  const n = seed(target.id);

  if (recipe) {
    const layout = pickLayout(recipe, campaignStyle?.layout, n);
    const colors = recipeColors(recipe, campaignStyle?.colors, layout.id);
    let cover: DesignDoc;
    let photo: PhotoBackground | undefined;
    if (layout.noImage) cover = buildPost(recipe, layout.id, { text, format, photo: NO_PHOTO, colors });
    else {
      const idea = (target.angle ? `${target.angle}: ${written.headline}` : written.headline).replace(/[*~]/g, '').replace(/\n/g, ' ');
      const cast = { people: written.people, object: written.object };
      const job = await makeAi('image', layout.imagePrompt(idea, colors, cast), format, onProgress, campaignStyle?.model, undefined, { rawPrompt: true, cutout: layout.cutout });
      photo = await aiPhotoBackground(job);
      const cut = job.cutoutPhotoId ? await loadPhoto({ photoId: job.cutoutPhotoId }) : null;
      cover = buildPost(recipe, layout.id, { text, format, photo, colors, cutout: cut && job.cutoutPhotoId ? { photoId: job.cutoutPhotoId, width: cut.width, height: cut.height } : undefined });
    }
    return { slides: [cover, ...carouselSlides(cover, trimTo(words, total), colors, photo)], name };
  }

  // No campaign style: a text-design cover, and slides in its colours
  const style = styleById(written.styleId) ?? STYLES[0];
  const palette = variationPalettes(style)[n % variationPalettes(style).length] ?? paletteById(style.palette);
  const cover = style.build(text, format, palette);
  const colors = { main: palette.background, ink: palette.text, accent: palette.accent };
  return { slides: [cover, ...carouselSlides(cover, trimTo(words, total), colors)], name };
}

/** The writer's slides, cut to make `total` slides in all with the cover and the closing slide */
function trimTo(words: CarouselText, total: number): CarouselText {
  return { ...words, slides: words.slides.slice(0, Math.max(1, total - 2)) };
}

/** Saves a carousel and makes an image of every slide */
export async function saveAndExportCarousel(slides: DesignDoc[], name: string, attachedTo?: AttachedTo) {
  const ready = await Promise.all(slides.map((d) => savePreviewPhoto(d)));
  const images: { mediaId: string; blob: Blob }[] = [];
  // One at a time, so a long carousel doesn't flood the uploads
  for (const [i, doc] of ready.entries()) images.push(await exportDesign(doc, `${name}-${i + 1}`));
  const mediaIds = images.map((i) => i.mediaId);
  const design = await createDesign({ name, source: sourceOf(ready[0]), doc: ready[0], slides: ready, mediaId: mediaIds[0], mediaIds, attachedTo });
  rememberDesign(design);
  return { design, mediaIds, cover: images[0] };
}

/** Turns a design into an image (or, over an AI video, a video) in the user's media */
export async function exportDesign(doc: DesignDoc, name: string): Promise<{ mediaId: string; mediaType: 'image' | 'video'; blob: Blob }> {
  await loadDesignFonts();
  if (doc.video) {
    // The words go on a see-through image, which the server lays over the video
    const overlay = await overlayToBlob(doc, FONT_FAMILIES);
    const file = new File([overlay], 'overlay.png', { type: 'image/png' });
    const { uploadUrl, mediaId: overlayId } = await requestUploadUrl(file.type, file.name, file.size);
    await uploadFileToS3(uploadUrl, file);
    const { mediaId } = await renderDesignVideo(doc.video.mediaId, overlayId, doc.format);
    // The first frame with the words stands in for the video in previews
    const poster = await designToBlob(doc, FONT_FAMILIES, await photosFor(doc));
    return { mediaId, mediaType: 'video', blob: poster };
  }
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
    source: sourceOf(ready),
    doc: ready,
    attachedTo,
    mediaId: image.mediaId,
  });
  rememberDesign(design);
  return { design, image };
}

/** What made a design: a text design, a stock photo, or AI */
export function sourceOf(doc: DesignDoc): 'template' | 'stock' | 'ai_image' | 'ai_video' {
  if (doc.video) return 'ai_video';
  // Cut-out styles draw their own page under the AI image's subject
  if (doc.background.kind !== 'photo') return doc.photo?.credit.source === 'ai' || doc.images?.length ? 'ai_image' : 'template';
  return doc.background.credit.source === 'ai' ? 'ai_image' : 'stock';
}

/** Makes a visual of `kind` for a post and returns its design and image (not attached to anything yet) */
export async function makeVisual(target: VisualTarget, kind: VisualKind, attachedTo?: AttachedTo, onProgress?: (p: AiProgress) => void, style?: VisualStyle) {
  const { docs, name } = await designOptions(target, kind, 1, formatForPlatform(target.platform), onProgress, style);
  return saveAndExport(docs[0], name, attachedTo);
}

/** Makes a visual of `kind` for a Copywriter post and attaches it */
export async function makePostVisual(copy: CopyRecord, kind: VisualKind, style?: VisualStyle): Promise<{ copy: CopyRecord; design: DesignRecord }> {
  if (kind === 'carousel') {
    const { slides, name } = await carouselFor(copy, style);
    const { design, mediaIds } = await saveAndExportCarousel(slides, name, { copyId: copy.id, platform: copy.platform });
    const updated = await setCopyVisual(copy.id, { kind: 'carousel', designId: design.designId, mediaId: mediaIds[0], mediaType: 'image', mediaIds });
    return { copy: updated, design };
  }
  const { design, image } = await makeVisual(copy, kind, { copyId: copy.id, platform: copy.platform }, undefined, style);
  const updated = await setCopyVisual(copy.id, { kind: design.source === 'template' ? 'template' : design.source, designId: design.designId, mediaId: image.mediaId, mediaType: image.mediaType });
  return { copy: updated, design };
}

/**
 * Saves changes to a design and refreshes the image on the posts it's
 * attached to (its Copywriter post and its scheduled post).
 */
export async function updatePostVisual(design: DesignRecord, doc: DesignDoc, name = design.name) {
  const ready = await savePreviewPhoto(doc);
  const image = await exportDesign(ready, name);
  const source = sourceOf(ready);
  const saved = await saveDesign(design.designId, { name, source, doc: ready, attachedTo: design.attachedTo, mediaId: image.mediaId });
  rememberDesign(saved);
  const to = design.attachedTo;
  const copy = to?.copyId
    ? await setCopyVisual(to.copyId, { kind: source, designId: design.designId, mediaId: image.mediaId, mediaType: image.mediaType }).catch(() => null)
    : null;
  if (to?.postId) await updatePost(to.postId, { mediaId: image.mediaId, mediaType: image.mediaType });
  return { copy, design: saved, image };
}

/**
 * Saves an edited carousel, makes a new image of every slide and gives them
 * to its Copywriter post and its scheduled post
 */
export async function updateCarouselVisual(design: DesignRecord, slides: DesignDoc[], name = design.name) {
  const ready = await Promise.all(slides.map((d) => savePreviewPhoto(d)));
  const images: { mediaId: string; blob: Blob }[] = [];
  for (const [i, doc] of ready.entries()) images.push(await exportDesign(doc, `${name}-${i + 1}`));
  const mediaIds = images.map((i) => i.mediaId);
  const saved = await saveDesign(design.designId, {
    name,
    source: sourceOf(ready[0]),
    doc: ready[0],
    slides: ready,
    mediaId: mediaIds[0],
    mediaIds,
    attachedTo: design.attachedTo,
  });
  rememberDesign(saved);
  const to = design.attachedTo;
  const copy = to?.copyId
    ? await setCopyVisual(to.copyId, { kind: 'carousel', designId: design.designId, mediaId: mediaIds[0], mediaType: 'image', mediaIds }).catch(() => null)
    : null;
  if (to?.postId) await updatePost(to.postId, { mediaId: mediaIds[0], mediaType: 'image', mediaIds });
  return { copy, design: saved, mediaIds };
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
