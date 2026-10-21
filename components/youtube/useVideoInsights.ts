'use client';

import { useCallback, useState } from 'react';
import {
  browserRegion,
  researchVideo,
  writeSuggestions,
  type Check,
  type KeywordInsight,
  type ResearchInput,
  type TagInsight,
} from '@/lib/api/youtubeApi';

export type InsightsPhase = 'idle' | 'researching' | 'writing' | 'ready' | 'error';

export interface Insights {
  phase: InsightsPhase;
  keywords: KeywordInsight[];
  tags: TagInsight[];
  basedOn?: 'transcript' | 'title' | 'both';
  titles: { text: string; score: number; checks: Check[] }[];
  description: { text: string; score: number; checks: Check[] } | null;
  error: string | null;
  /** The writing step failed but research worked; keywords and tags still show */
  writeError: string | null;
}

const EMPTY: Insights = { phase: 'idle', keywords: [], tags: [], titles: [], description: null, error: null, writeError: null };

/**
 * Runs YouTube research for the video (keywords and tags from real search
 * results), then has the AI write titles and a description around them.
 */
export function useVideoInsights() {
  const [insights, setInsights] = useState<Insights>(EMPTY);

  const run = useCallback(async (input: Omit<ResearchInput, 'region'> & { chaptersOk: boolean | null }) => {
    const base = { ...input, region: browserRegion() };
    setInsights({ ...EMPTY, phase: 'researching' });
    let research;
    try {
      research = await researchVideo(base);
    } catch (err) {
      setInsights({ ...EMPTY, phase: 'error', error: (err as Error).message });
      return;
    }
    if (!research.keywords.length) {
      setInsights({ ...EMPTY, phase: 'error', error: 'YouTube returned no results for this video’s topics.' });
      return;
    }
    setInsights({ ...EMPTY, phase: 'writing', keywords: research.keywords, tags: research.tags, basedOn: research.basedOn });
    await write(base, research.keywords);
  }, []);

  const write = async (input: ResearchInput & { chaptersOk: boolean | null }, keywords: KeywordInsight[]) => {
    try {
      const written = await writeSuggestions({ ...input, keywords });
      setInsights((s) => ({ ...s, phase: 'ready', titles: written.titles, description: written.description, writeError: null }));
    } catch (err) {
      setInsights((s) => ({ ...s, phase: 'ready', writeError: (err as Error).message }));
    }
  };

  /** New titles and description from the same research (no YouTube quota used) */
  const rewrite = useCallback(
    async (input: Omit<ResearchInput, 'region'> & { chaptersOk: boolean | null }) => {
      const keywords = insights.keywords;
      if (!keywords.length) return;
      setInsights((s) => ({ ...s, phase: 'writing' }));
      await write({ ...input, region: browserRegion() }, keywords);
    },
    [insights.keywords]
  );

  return { insights, run, rewrite };
}
