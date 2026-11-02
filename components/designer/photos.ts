'use client';

/**
 * Loads the photos designs use, once each, for drawing on a canvas.
 */

import { useEffect, useState } from 'react';
import type { PhotoImages } from '@/lib/design/render';
import type { DesignDoc, PhotoBackground } from '@/lib/design/types';
import { isUnsavedPhoto } from '@/lib/design/types';
import { samplePhotoUrl } from '@/lib/design/styles';
import { photoTones } from '@/lib/design/photo';

type Img = PhotoImages[string];

const loaded = new Map<string, Promise<Img>>();

/** The example images that ship with the style library: "style:<id>" (photo) and "style:<id>-cut" (its cut-out) */
export const styleExampleUrl = (photoId: string) => {
  const name = photoId.replace(/^style:/, '');
  return `/designer/styles/${name}${name.endsWith('-cut') ? '.png' : '.jpg'}`;
};

function imageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Couldn’t load the photo'));
    img.src = url;
  });
}

async function fetchSaved(photoId: string): Promise<Img> {
  const token = localStorage.getItem('token');
  const res = await fetch(`/api/designs/photos/${encodeURIComponent(photoId)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Couldn’t load the photo');
  return createImageBitmap(await res.blob());
}

/** The photo for a photo background, loaded once and shared */
export function loadPhoto(bg: Pick<PhotoBackground, 'photoId' | 'previewUrl'>): Promise<Img> {
  let p = loaded.get(bg.photoId);
  if (!p) {
    p = bg.photoId.startsWith('sample:')
      ? imageFromUrl(samplePhotoUrl(bg.photoId))
      : bg.photoId.startsWith('style:')
        ? imageFromUrl(styleExampleUrl(bg.photoId))
      : isUnsavedPhoto(bg.photoId)
        ? imageFromUrl(bg.previewUrl ?? '')
        : fetchSaved(bg.photoId);
    p.catch(() => loaded.delete(bg.photoId));
    loaded.set(bg.photoId, p);
  }
  return p;
}

/** Lets a saved copy reuse the preview that's already loaded */
export function aliasPhoto(fromId: string, toId: string) {
  const p = loaded.get(fromId);
  if (p) loaded.set(toId, p);
}

/** The photo's average and lightest tones, from a small copy of it */
export function tonesOf(img: Img): [string, string] {
  const c = document.createElement('canvas');
  c.width = 24;
  c.height = 24;
  const ctx = c.getContext('2d');
  if (!ctx) return ['#000000', '#000000'];
  ctx.drawImage(img, 0, 0, 24, 24);
  return photoTones(ctx.getImageData(0, 0, 24, 24).data);
}

/** Every picture a design uses: its photo background and its picture layers */
const picturesOf = (doc: DesignDoc): Pick<PhotoBackground, 'photoId' | 'previewUrl'>[] => [
  ...(doc.background.kind === 'photo' ? [doc.background] : []),
  ...(doc.images ?? []).map((i) => ({ photoId: i.photoId })),
];

/** The loaded photos a design needs (empty until they arrive) */
export function usePhotoImages(doc: DesignDoc): PhotoImages {
  const pictures = picturesOf(doc);
  const key = pictures.map((p) => `${p.photoId}|${p.previewUrl ?? ''}`).join(',');
  const [images, setImages] = useState<PhotoImages>({});
  useEffect(() => {
    let live = true;
    for (const part of key ? key.split(',') : []) {
      const [photoId, previewUrl] = part.split('|');
      loadPhoto({ photoId, previewUrl: previewUrl || undefined }).then(
        (img) => live && setImages((m) => (m[photoId] === img ? m : { ...m, [photoId]: img })),
        () => undefined
      );
    }
    return () => {
      live = false;
    };
  }, [key]);
  return images;
}

/** Every photo a design needs, loaded, for making the final image */
export async function photosFor(doc: DesignDoc): Promise<PhotoImages> {
  const out: PhotoImages = {};
  for (const p of picturesOf(doc)) out[p.photoId] = await loadPhoto(p);
  return out;
}

/** Pixabay results that have been copied to the user's storage, by their preview id */
const savedAs = new Map<string, PhotoBackground>();

export function rememberSaved(previewId: string, saved: PhotoBackground) {
  savedAs.set(previewId, saved);
  aliasPhoto(previewId, saved.photoId);
}

/** Swaps any preview photo for its saved copy, so the design can be saved */
export function withSavedPhoto(doc: DesignDoc): DesignDoc {
  const bg = doc.background;
  if (bg.kind !== 'photo' || !isUnsavedPhoto(bg.photoId)) return doc;
  const saved = savedAs.get(bg.photoId);
  return saved ? { ...doc, background: { ...bg, photoId: saved.photoId, previewUrl: undefined, width: saved.width, height: saved.height } } : doc;
}
