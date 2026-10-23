'use client';

/**
 * The Designer inside the Scheduler: a scheduled post's visual, with buttons
 * to create one (a text design or a stock photo with text) or to edit the
 * design behind it.
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import type { ScheduledPost } from '@/types/scheduler';
import type { DesignRecord } from '@/lib/design/types';
import type { VisualKind } from '@/types/agent';
import { getDownloadUrl } from '@/lib/api/mediaClient';
import { updatePost } from '@/lib/api/schedulerClient';
import { setCopyVisual } from '@/lib/api/copyClient';
import { EditVisualModal } from '@/components/copywriter/PostVisual';
import { designsByImage, makeVisual } from './postVisuals';

/** Instagram and TikTok posts can't go out without an image or video */
export const NEEDS_VISUAL = new Set(['instagram', 'tiktok']);

const urls = new Map<string, Promise<string | null>>();

/** A viewable link to an image or video in the user's media */
export function useMediaUrl(mediaId?: string): string | null {
  const [url, setUrl] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    if (!mediaId) return;
    let live = true;
    let p = urls.get(mediaId);
    if (!p) {
      p = getDownloadUrl(mediaId).then(
        (r) => r.downloadUrl,
        () => null
      );
      urls.set(mediaId, p);
    }
    p.then((u) => live && setUrl({ id: mediaId, url: u }));
    return () => {
      live = false;
    };
  }, [mediaId]);
  return mediaId && url?.id === mediaId ? url.url : null;
}

/** The Designer design that made this image, if any */
export function useLinkedDesign(mediaId?: string): DesignRecord | null {
  const [found, setFound] = useState<{ id: string; design: DesignRecord | null } | null>(null);
  useEffect(() => {
    if (!mediaId) return;
    let live = true;
    designsByImage().then((m) => live && setFound({ id: mediaId, design: m.get(mediaId) ?? null }));
    return () => {
      live = false;
    };
  }, [mediaId]);
  return mediaId && found?.id === mediaId ? found.design : null;
}

/** Posts whose visual can still change (not on its way out or already out) */
export const canChangeVisual = (post: ScheduledPost) => !post.youtube && (post.status === 'scheduled' || post.status === 'draft' || post.status === 'failed');

/** Makes a visual for a scheduled post and attaches it (and to its Copywriter post, if it came from one) */
export async function createScheduledVisual(post: ScheduledPost, kind: VisualKind): Promise<ScheduledPost> {
  const { design, image } = await makeVisual({ id: post.id, text: post.content, platform: post.platform }, kind, {
    postId: post.id,
    ...(post.copyId ? { copyId: post.copyId } : {}),
    platform: post.platform,
  });
  const updated = await updatePost(post.id, { mediaId: image.mediaId, mediaType: image.mediaType });
  if (post.copyId) {
    await setCopyVisual(post.copyId, { kind: design.source === 'stock' ? 'stock' : 'template', designId: design.designId, mediaId: image.mediaId, mediaType: image.mediaType }).catch(
      () => undefined
    );
  }
  return updated;
}

/**
 * "Create a visual" (text design / stock photo) for a post without one, or
 * "Edit visual" for one made in the Designer.
 */
export function ScheduledVisualActions({
  post,
  onChanged,
  size = 'md',
}: {
  post: ScheduledPost;
  onChanged: (post: ScheduledPost) => void;
  size?: 'sm' | 'md';
}) {
  const design = useLinkedDesign(post.mediaId);
  const [busy, setBusy] = useState<VisualKind | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  if (!canChangeVisual(post)) return null;

  const create = async (kind: VisualKind) => {
    setBusy(kind);
    setError('');
    try {
      onChanged(await createScheduledVisual(post, kind));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t make the visual');
    } finally {
      setBusy(null);
    }
  };

  const text = size === 'sm' ? 'text-xs' : 'text-sm';

  if (post.mediaId) {
    if (!design) return null;
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
          }}
          className={`inline-flex items-center gap-1.5 ${text} font-semibold text-primary hover:text-primary/80`}
        >
          <Icon icon="lucide:palette" className="w-4 h-4" aria-hidden />
          Edit visual
        </button>
        {editing &&
          createPortal(
            <div onClick={(e) => e.stopPropagation()}>
              <EditVisualModal
                caption={post.content}
                platform={post.platform}
                design={{ ...design, attachedTo: { ...design.attachedTo, postId: post.id, platform: post.platform } }}
                onClose={() => setEditing(false)}
                onSaved={({ image }) => {
                  setEditing(false);
                  onChanged({ ...post, mediaId: image.mediaId, mediaType: image.mediaType });
                }}
              />
            </div>,
            document.body
          )}
      </>
    );
  }

  return (
    <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-2">
        {NEEDS_VISUAL.has(post.platform) && (
          <span className={`inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 ${size === 'sm' ? 'text-[11px]' : 'text-xs'} font-semibold text-amber-700`}>
            <Icon icon="lucide:triangle-alert" className="w-3.5 h-3.5" aria-hidden />
            Needs a visual
          </span>
        )}
        <span className={`${text} text-outline`}>Create a visual:</span>
        {(['template', 'stock'] as VisualKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => create(k)}
            disabled={!!busy}
            className={`inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary-50 px-2.5 py-1 ${text} font-semibold text-primary hover:bg-primary-100 disabled:opacity-60`}
          >
            {busy === k ? (
              <Icon icon="lucide:loader-circle" className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <Icon icon={k === 'template' ? 'lucide:type' : 'lucide:image'} className="w-3.5 h-3.5" aria-hidden />
            )}
            {k === 'template' ? 'Text design' : 'Stock photo'}
            <span className="font-bold text-[#64748B]">1 credit</span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Under a media uploader: "Create with Designer" when nothing is attached,
 * or "Edit visual" when the attached image was made in the Designer.
 * `onMedia` gets the new image (and a link to show it straight away).
 */
export function DesignerMediaPanel({
  content,
  platform,
  mediaId,
  postId,
  onMedia,
  disabled,
}: {
  content: string;
  platform: string;
  mediaId: string | null;
  /** The scheduled post being edited, if it exists yet */
  postId?: string;
  onMedia: (media: { mediaId: string; mediaType: 'image' | 'video'; previewUrl: string }) => void;
  disabled?: boolean;
}) {
  const design = useLinkedDesign(mediaId ?? undefined);
  const [busy, setBusy] = useState<VisualKind | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const create = async (kind: VisualKind) => {
    if (!content.trim()) {
      setError('Write the post first, so the visual can match it.');
      return;
    }
    setBusy(kind);
    setError('');
    try {
      const { image } = await makeVisual({ id: postId ?? content.slice(0, 40), text: content, platform }, kind, {
        ...(postId ? { postId } : {}),
        platform,
      });
      onMedia({ mediaId: image.mediaId, mediaType: image.mediaType, previewUrl: URL.createObjectURL(image.blob) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t make the visual');
    } finally {
      setBusy(null);
    }
  };

  if (mediaId) {
    if (!design) return null;
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl bg-primary-50 px-3 py-2">
        <Icon icon="lucide:palette" className="w-4 h-4 text-primary" aria-hidden />
        <span className="text-sm text-on-surface flex-1">Made in the Designer</span>
        <button type="button" onClick={() => setEditing(true)} disabled={disabled} className="text-sm font-semibold text-primary hover:underline">
          Edit visual
        </button>
        {editing &&
          createPortal(
            <EditVisualModal
              caption={content}
              platform={platform}
              design={postId ? { ...design, attachedTo: { ...design.attachedTo, postId, platform } } : design}
              onClose={() => setEditing(false)}
              onSaved={({ image }) => {
                setEditing(false);
                onMedia({ mediaId: image.mediaId, mediaType: image.mediaType, previewUrl: URL.createObjectURL(image.blob) });
              }}
            />,
            document.body
          )}
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-outline">Or create with the Designer</p>
      <div className="grid grid-cols-2 gap-2">
        {(['template', 'stock'] as VisualKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => create(k)}
            disabled={!!busy || disabled}
            className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary-50/60 px-3 py-2.5 text-left hover:bg-primary-50 disabled:opacity-60"
          >
            {busy === k ? (
              <Icon icon="lucide:loader-circle" className="w-5 h-5 text-primary animate-spin" aria-hidden />
            ) : (
              <Icon icon={k === 'template' ? 'lucide:type' : 'lucide:image'} className="w-5 h-5 text-primary" aria-hidden />
            )}
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-on-surface">{k === 'template' ? 'Text design' : 'Stock photo + text'}</span>
              <span className="block text-xs font-bold text-[#64748B]">1 credit</span>
            </span>
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
