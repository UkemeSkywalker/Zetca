'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import { FAMILY_NAMES, RECIPES, recipeById, type RecipeFamily } from '@/lib/design/recipes';
import { chooseResearchStyle, type PublicBrandResearch } from '@/lib/api/researchClient';
import { listStrategies, setStrategyStyle } from '@/lib/api/strategyClient';
import type { StrategyRecord } from '@/types/strategy';
import { DesignCanvas } from '@/components/designer/DesignCanvas';
import { useRecipeExample } from '@/components/designer/StyleLibrary';

/** White cards with dark text, like the rest of the results */
const CARD = 'rounded-3xl border border-white bg-white text-[#0b1c30]';

/**
 * "Pick your campaign's look": the 3 styles the research suggests for the
 * brand, or any style from the library. The pick is saved on the research,
 * and can be put on a campaign now.
 */
export function SuggestedStyles({ research, onResearch }: { research: PublicBrandResearch; onResearch: (r: PublicBrandResearch) => void }) {
  const suggestions = (research.profile?.styles ?? []).filter((s) => recipeById(s.id));
  const chosen = research.chosenStyle;
  const [strategies, setStrategies] = useState<StrategyRecord[] | null>(null);
  const [campaign, setCampaign] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'applied' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [family, setFamily] = useState<RecipeFamily | 'all'>('all');

  useEffect(() => {
    listStrategies().then(
      (list) => {
        setStrategies(list);
        if (list[0]) setCampaign((c) => c || list[0].id);
      },
      () => setStrategies([])
    );
  }, []);

  /** A pick from the library that isn't one of the suggestions */
  const ownPick = chosen && !suggestions.some((s) => s.id === chosen) && recipeById(chosen) ? chosen : null;
  const families = [...new Set(RECIPES.map((r) => r.family))];
  const library = RECIPES.filter((r) => family === 'all' || r.family === family);

  const pick = async (id: string) => {
    setState('idle');
    const next = chosen === id ? null : id;
    onResearch({ ...research, chosenStyle: next ?? undefined });
    try {
      onResearch(await chooseResearchStyle(research.researchId, next));
    } catch {
      onResearch(research);
    }
  };

  const apply = async () => {
    if (!chosen || !campaign) return;
    setState('saving');
    try {
      await setStrategyStyle(campaign, { recipeId: chosen, onNewPosts: true });
      setState('applied');
      setMessage(strategies?.find((s) => s.id === campaign)?.brandName ?? 'your campaign');
    } catch (e) {
      setState('error');
      setMessage(e instanceof Error ? e.message : 'Couldn’t apply the style');
    }
  };

  return (
    <section className="talk-in space-y-4" aria-label="Pick your campaign's look">
      <div>
        <h2 className="talk-dot text-[clamp(18px,2.2vw,26px)] leading-none">Pick your campaign’s look</h2>
        <p className="mt-2 text-sm text-white/60">
          {suggestions.length ? `Zetca recommends these for ${research.profile?.brandName}.` : 'Pick a look from the library.'} Every post follows the one you pick.
        </p>
      </div>
      {(suggestions.length > 0 || ownPick) && (
        <div className={`grid gap-4 ${suggestions.length + (ownPick ? 1 : 0) > 3 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-3'}`}>
          {suggestions.map((s) => (
            <Suggestion key={s.id} id={s.id} why={s.why} selected={chosen === s.id} onPick={() => void pick(s.id)} />
          ))}
          {ownPick && <Suggestion key={ownPick} id={ownPick} why="Your pick" selected onPick={() => void pick(ownPick)} />}
        </div>
      )}
      <button
        type="button"
        onClick={() => setBrowsing((b) => !b)}
        aria-expanded={browsing}
        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-sm font-semibold hover:bg-white/10"
      >
        <Icon icon={browsing ? 'lucide:chevron-up' : 'lucide:library'} className="h-4 w-4" aria-hidden />
        {browsing ? 'Hide the library' : 'Not feeling these? Browse the whole library'}
      </button>
      {browsing && (
        <div className="space-y-3" aria-label="Style library">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by family">
            {(['all', ...families] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={family === f}
                onClick={() => setFamily(f)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${family === f ? 'border-white bg-white text-[#0b0b0f]' : 'border-white/15 bg-white/[0.06] hover:bg-white/10'}`}
              >
                {f === 'all' ? `All (${RECIPES.length})` : FAMILY_NAMES[f]}
              </button>
            ))}
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
            {library.map((r) => (
              <Suggestion key={r.id} id={r.id} why={FAMILY_NAMES[r.family]} selected={chosen === r.id} onPick={() => void pick(r.id)} />
            ))}
          </div>
        </div>
      )}
      <div className={`${CARD} flex flex-wrap items-center gap-3 p-4`}>
        {chosen ? (
          <>
            <span className="text-sm text-[#464555]">
              Use <strong className="text-[#0b1c30]">{recipeById(chosen)?.name}</strong> for
            </span>
            {strategies && strategies.length > 0 ? (
              <>
                <label htmlFor="apply-campaign" className="sr-only">
                  Campaign
                </label>
                <select
                  id="apply-campaign"
                  value={campaign}
                  onChange={(e) => {
                    setCampaign(e.target.value);
                    setState('idle');
                  }}
                  className="h-10 rounded-full border border-[#0b1c30]/15 bg-white px-3 text-sm text-[#0b1c30]"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id} className="text-[#0b1c30]">
                      {s.brandName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void apply()}
                  disabled={state === 'saving'}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0b1c30] px-4 text-sm font-semibold text-white hover:bg-[#0b1c30]/90 disabled:opacity-60"
                >
                  {state === 'saving' ? <Icon icon="lucide:loader-circle" className="h-4 w-4 animate-spin" aria-hidden /> : <Icon icon="lucide:check" className="h-4 w-4" aria-hidden />}
                  Use for this campaign
                </button>
              </>
            ) : (
              <span className="text-sm text-[#464555]">your next campaign. Build one step by step to use it.</span>
            )}
            <Link href={`/dashboard/designer/new?source=ai_image&format=portrait&recipe=${chosen}`} className="ml-auto text-sm font-semibold text-[#4f46e5] hover:text-[#4338ca]">
              Try it in the Designer →
            </Link>
            {state === 'applied' && (
              <p role="status" className="w-full text-sm text-emerald-700">
                Done. New posts in {message} will follow this look.{' '}
                <Link href={`/dashboard/copywriter?strategy=${encodeURIComponent(campaign)}`} className="font-semibold underline">
                  Open the Copywriter
                </Link>
              </p>
            )}
            {state === 'error' && (
              <p role="alert" className="w-full text-sm text-red-700">
                {message}
              </p>
            )}
          </>
        ) : (
          <span className="text-sm text-[#464555]">Pick a look above, or one from the library.</span>
        )}
      </div>
    </section>
  );
}

function Suggestion({ id, why, selected, onPick }: { id: string; why: string; selected: boolean; onPick: () => void }) {
  const recipe = recipeById(id)!;
  const doc = useRecipeExample(recipe);
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`${CARD} group relative overflow-hidden p-2.5 text-left transition hover:-translate-y-0.5 ${selected ? 'ring-2 ring-white' : ''}`}
    >
      <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-[#0b1c30]/5">{doc && <DesignCanvas doc={doc} resolution={0.35} className="h-full w-full" />}</div>
      {selected && (
        <span className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white text-[#0b0b0f] shadow" aria-hidden>
          <Icon icon="lucide:check" className="h-4 w-4" />
        </span>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-3">
        <span className="font-semibold">{recipe.name}</span>
        <span className="rounded-full border border-[#0b1c30]/10 bg-[#f1f5f9] px-2.5 py-0.5 text-[11px]">{why}</span>
      </div>
    </button>
  );
}
