'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DesignRecord } from '@/lib/design/types';
import { listDesigns } from '@/lib/api/designApi';
import { setCopyVisual } from '@/lib/api/copyClient';
import { clearPostVisual, makePostVisual, MAKEABLE } from '@/components/designer/postVisuals';
import type { CopyRecord, CopyVisual, VisualKind } from '@/types/agent';

/** Instagram and TikTok posts can't go out without an image or video */
export const VISUAL_REQUIRED = new Set(['instagram', 'tiktok']);

/** A post's visual; posts written before visuals existed get one only where it's required */
export function visualOf(c: CopyRecord): CopyVisual {
  if (c.visual) return c.visual;
  return { kind: VISUAL_REQUIRED.has(c.platform) ? (c.platform === 'tiktok' ? 'stock' : 'template') : 'none' };
}

/** A post that has a visual picked but not made yet */
export const needsVisual = (c: CopyRecord) => {
  const v = visualOf(c);
  return v.kind !== 'none' && !v.mediaId && MAKEABLE.includes(v.kind);
};

/** How many visuals are made at once ("Create all") */
const AT_ONCE = 2;

/**
 * The designs behind the posts' visuals, and making them. `onCopy` is called
 * with each post whose visual changed, so the page can show it.
 */
export function usePostVisuals(onCopy: (copy: CopyRecord) => void) {
  const [designs, setDesigns] = useState<Record<string, DesignRecord>>({});
  const [making, setMaking] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    listDesigns().then(
      (list) => setDesigns(Object.fromEntries(list.filter((d) => d.attachedTo).map((d) => [d.designId, d]))),
      () => undefined
    );
  }, []);

  const busy = (id: string, on: boolean) =>
    setMaking((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const make = useCallback(
    async (copy: CopyRecord, kind: VisualKind) => {
      busy(copy.id, true);
      setErrors((e) => {
        const next = { ...e };
        delete next[copy.id];
        return next;
      });
      try {
        const { copy: updated, design } = await makePostVisual(copy, kind);
        setDesigns((d) => ({ ...d, [design.designId]: design }));
        onCopy(updated);
      } catch (err) {
        setErrors((e) => ({ ...e, [copy.id]: err instanceof Error ? err.message : 'Couldn’t make the visual' }));
      } finally {
        busy(copy.id, false);
      }
    },
    [onCopy]
  );

  /** The user picked a different kind of visual for a post */
  const choose = useCallback(
    async (copy: CopyRecord, kind: VisualKind) => {
      if (kind === 'none') {
        try {
          onCopy(await clearPostVisual(copy));
        } catch (err) {
          setErrors((e) => ({ ...e, [copy.id]: err instanceof Error ? err.message : 'Couldn’t change the visual' }));
        }
        return;
      }
      if (MAKEABLE.includes(kind)) return make(copy, kind);
      // AI kinds are shown but can't be made yet
      onCopy(await setCopyVisual(copy.id, { kind }));
    },
    [make, onCopy]
  );

  /** Makes every visual that's picked but not made, a couple at a time */
  const makeAll = useCallback(
    (copies: CopyRecord[]) => {
      const todo = copies.filter(needsVisual);
      const lanes = Array.from({ length: AT_ONCE }, (_, lane) =>
        todo.filter((_, i) => i % AT_ONCE === lane).reduce((p, c) => p.then(() => make(c, visualOf(c).kind)), Promise.resolve())
      );
      queue.current = Promise.all(lanes).then(() => undefined);
      return queue.current;
    },
    [make]
  );

  const designFor = (copy: CopyRecord) => (copy.visual?.designId ? designs[copy.visual.designId] : undefined);

  const replaceDesign = (design: DesignRecord) => setDesigns((d) => ({ ...d, [design.designId]: design }));

  return { designFor, making, errors, make, choose, makeAll, replaceDesign };
}
