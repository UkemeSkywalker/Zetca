'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { captureFrames } from '@/lib/youtube/frames';
import { uploadThumbnail } from '@/lib/api/youtubeApi';
import { FieldError } from './formKit';

const MAX_BYTES = 2 * 1024 * 1024;

interface Tile {
  key: string;
  url: string;
  blob: Blob;
  /** Set once uploaded */
  mediaId?: string;
}

export function ThumbnailPicker({
  file,
  isShort,
  value,
  onChange,
  error,
}: {
  file: File;
  isShort: boolean;
  value?: string;
  onChange: (mediaId: string | undefined) => void;
  error?: string;
}) {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loadingFrames, setLoadingFrames] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const tilesRef = useRef<Tile[]>([]);
  tilesRef.current = tiles;

  // Frames from this video; a new file starts over
  useEffect(() => {
    let cancelled = false;
    setTiles([]);
    setSelectedKey(null);
    setLoadingFrames(true);
    captureFrames(file)
      .then((blobs) => {
        if (cancelled) return;
        setTiles(blobs.map((blob, i) => ({ key: `frame-${i}`, url: URL.createObjectURL(blob), blob })));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingFrames(false));
    return () => {
      cancelled = true;
    };
  }, [file]);

  useEffect(() => () => tilesRef.current.forEach((t) => URL.revokeObjectURL(t.url)), []);

  // The form forgot the thumbnail (e.g. a new video was picked)
  useEffect(() => {
    if (!value) setSelectedKey(null);
  }, [value]);

  const choose = async (tile: Tile) => {
    if (busyKey) return;
    if (selectedKey === tile.key) {
      setSelectedKey(null);
      onChange(undefined);
      return;
    }
    setProblem(null);
    if (tile.mediaId) {
      setSelectedKey(tile.key);
      onChange(tile.mediaId);
      return;
    }
    setBusyKey(tile.key);
    try {
      const ext = tile.blob.type === 'image/png' ? 'png' : 'jpg';
      const mediaId = await uploadThumbnail(tile.blob, `thumbnail.${ext}`);
      setTiles((all) => all.map((t) => (t.key === tile.key ? { ...t, mediaId } : t)));
      setSelectedKey(tile.key);
      onChange(mediaId);
    } catch (err) {
      setProblem((err as Error).message || 'Couldn’t upload the thumbnail');
    } finally {
      setBusyKey(null);
    }
  };

  const addCustom = async (image: File) => {
    if (!['image/jpeg', 'image/png'].includes(image.type)) {
      setProblem('Thumbnails must be a JPG or PNG.');
      return;
    }
    if (image.size > MAX_BYTES) {
      setProblem('Thumbnails can be up to 2 MB.');
      return;
    }
    const tile: Tile = { key: `custom-${Date.now()}`, url: URL.createObjectURL(image), blob: image };
    setTiles((all) => [tile, ...all.filter((t) => !t.key.startsWith('custom-'))]);
    await choose(tile);
  };

  if (isShort) {
    return (
      <p className="flex items-start gap-2 rounded-xl bg-surface-container-low px-4 py-3 text-sm text-outline">
        <Icon icon="solar:info-circle-linear" className="w-5 h-5 shrink-0 text-primary" />
        YouTube picks the thumbnail for Shorts from the video. You can change it later in the YouTube app.
      </p>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const image = e.target.files?.[0];
          e.target.value = '';
          if (image) addCustom(image);
        }}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="aspect-video rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/50 flex flex-col items-center justify-center gap-1.5 text-primary hover:border-primary/50 transition-colors"
        >
          <Icon icon="solar:gallery-add-linear" className="w-6 h-6" />
          <span className="text-xs font-semibold">Upload thumbnail</span>
        </button>
        {loadingFrames &&
          [0, 1, 2].map((i) => <div key={i} className="aspect-video rounded-xl bg-surface-container-low animate-pulse" />)}
        {tiles.map((tile) => {
          const selected = selectedKey === tile.key;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => choose(tile)}
              aria-pressed={selected}
              aria-label={tile.key.startsWith('custom-') ? 'Your uploaded thumbnail' : 'Frame from the video'}
              className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-colors ${
                selected ? 'border-primary' : 'border-transparent hover:border-primary/40'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tile.url} alt="" className="w-full h-full object-cover" />
              {busyKey === tile.key && (
                <span className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <Icon icon="svg-spinners:ring-resize" className="w-6 h-6 text-primary" />
                </span>
              )}
              {selected && (
                <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center">
                  <Icon icon="solar:check-read-linear" className="w-4 h-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-outline">
        1280 × 720, JPG or PNG, up to 2 MB. Custom thumbnails need a verified channel. Leave it empty and YouTube picks one.
      </p>
      <FieldError message={problem ?? error} />
    </div>
  );
}
