'use client';

/**
 * Makes the visual for a Copywriter post: writes the words for it, builds a
 * design (a text design or a stock photo with text), turns it into an image
 * and attaches that image to the post, ready to schedule.
 */

import { STYLES, styleById, variationPalettes, type DesignText } from '@/lib/design/styles';
import { designToBlob } from '@/lib/design/render';
import type { DesignDoc, DesignRecord, FormatId, PhotoBackground } from '@/lib/design/types';
import { createDesign, getDesign, rememberedHandle, saveDesign, savePhoto, searchPhotos, writeDesignText } from '@/lib/api/designApi';
import { requestUploadUrl, uploadFileToS3 } from '@/lib/api/mediaClient';
import { setCopyVisual } from '@/lib/api/copyClient';
import type { CopyRecord, VisualKind } from '@/types/agent';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { loadPhoto, photosFor, rememberSaved, tonesOf } from './photos';

/** The size each platform shows best */
export function formatForPlatform(platform: string): FormatId {
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

/** A number from the copy's id, so neighbouring posts get different colours and photos */
function seed(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function brief(copy: CopyRecord): string {
  return `${copy.angle ? `${copy.angle}: ` : ''}${copy.text}`.slice(0, 900);
}

/** Builds the design for a post */
async function buildDesign(copy: CopyRecord, kind: VisualKind): Promise<{ doc: DesignDoc; name: string }> {
  const written = await writeDesignText({ prompt: brief(copy) });
  const handle = rememberedHandle();
  const text: DesignText = {
    headline: written.headline,
    kicker: written.kicker,
    body: written.body,
    footer: handle || undefined,
  };
  const format = formatForPlatform(copy.platform);
  const n = seed(copy.id);
  const name = written.headline.replace(/\n/g, ' ').slice(0, 60);

  if (kind === 'stock') {
    const query = written.photoQuery || copy.angle || 'lifestyle';
    const photos = await searchPhotos(query, format === 'square' ? 'all' : 'vertical');
    if (photos.length) {
      const photo = photos[n % Math.min(photos.length, 12)];
      const saved = await savePhoto(photo.id);
      const previewId = `pixabay:${photo.id}`;
      const img = await loadPhoto({ photoId: previewId, previewUrl: photo.previewUrl });
      const bg: PhotoBackground = {
        kind: 'photo',
        photoId: saved.photoId,
        width: img.width,
        height: img.height,
        focusX: 0.5,
        focusY: 0.5,
        fit: 'fill',
        tones: tonesOf(img),
        credit: saved.credit,
      };
      rememberSaved(previewId, bg);
      const style = styleById('photo-text')!;
      return { doc: style.build(text, format, variationPalettes(style)[0], bg), name };
    }
    // No photos for that search: a text design still gives the post a visual
  }

  const style = styleById(written.styleId) ?? STYLES[0];
  const palettes = variationPalettes(style);
  return { doc: style.build(text, format, palettes[n % palettes.length]), name };
}

/** Turns a design into an image in the user's media, returning its id */
export async function exportDesign(doc: DesignDoc, name: string): Promise<{ mediaId: string; mediaType: 'image' }> {
  await loadDesignFonts();
  const blob = await designToBlob(doc, FONT_FAMILIES, await photosFor(doc));
  const ext = blob.type === 'image/jpeg' ? 'jpg' : 'png';
  const file = new File([blob], `${name.replace(/[^\w-]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'design'}.${ext}`, { type: blob.type });
  const { uploadUrl, mediaId } = await requestUploadUrl(file.type, file.name, file.size);
  await uploadFileToS3(uploadUrl, file);
  return { mediaId, mediaType: 'image' };
}

/** Makes a visual of `kind` for a post and attaches it */
export async function makePostVisual(copy: CopyRecord, kind: VisualKind): Promise<{ copy: CopyRecord; design: DesignRecord }> {
  const { doc, name } = await buildDesign(copy, kind);
  const image = await exportDesign(doc, name);
  const design = await createDesign({
    name,
    source: doc.background.kind === 'photo' ? 'stock' : 'template',
    doc,
    attachedTo: { copyId: copy.id, platform: copy.platform },
    mediaId: image.mediaId,
  });
  const updated = await setCopyVisual(copy.id, { kind: design.source === 'stock' ? 'stock' : 'template', designId: design.designId, ...image });
  return { copy: updated, design };
}

/**
 * Saves changes to a post's design and refreshes the post's image.
 * Used by the "Edit visual" pop-up and the Designer's "Update post" button.
 */
export async function updatePostVisual(design: DesignRecord, doc: DesignDoc, name = design.name): Promise<{ copy: CopyRecord | null; design: DesignRecord }> {
  const image = await exportDesign(doc, name);
  const source = doc.background.kind === 'photo' ? 'stock' : 'template';
  const saved = await saveDesign(design.designId, { name, source, doc, attachedTo: design.attachedTo, mediaId: image.mediaId });
  const copy = design.attachedTo
    ? await setCopyVisual(design.attachedTo.copyId, { kind: source, designId: design.designId, ...image })
    : null;
  return { copy, design: saved };
}

/** Changes a post's visual to "None" (only where the platform allows it) */
export function clearPostVisual(copy: CopyRecord): Promise<CopyRecord> {
  return setCopyVisual(copy.id, { kind: 'none' });
}

export { getDesign };
