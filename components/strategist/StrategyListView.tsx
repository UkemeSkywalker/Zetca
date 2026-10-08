'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import type { StrategyRecord } from '@/types/strategy';
import { deleteStrategy, StrategyAPIError } from '@/lib/api/strategyClient';
import type { PlatformId } from '@/lib/models/strategyConstants';
import { summariseAges } from './StrategyRail';

const PLATFORM_ICONS: Record<PlatformId, { icon: string; style: string; label: string }> = {
  youtube: { icon: 'simple-icons:youtube', style: 'bg-red-50 text-red-600', label: 'YouTube' },
  instagram: { icon: 'simple-icons:instagram', style: 'bg-pink-50 text-pink-600', label: 'Instagram' },
  tiktok: { icon: 'simple-icons:tiktok', style: 'bg-slate-100 text-slate-900', label: 'TikTok' },
  linkedin: { icon: 'simple-icons:linkedin', style: 'bg-blue-50 text-[#0A66C2]', label: 'LinkedIn' },
  x: { icon: 'simple-icons:x', style: 'bg-slate-100 text-black', label: 'X' },
  facebook: { icon: 'simple-icons:facebook', style: 'bg-blue-50 text-[#1877F2]', label: 'Facebook' },
};

const SKILL_LABELS = { beginner: '🌱 Beginners', intermediate: '🌿 Intermediate', pro: '🌳 Pros' } as const;

const LABEL_MD = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold';
const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function StrategyCard({ strategy, onDeleted }: { strategy: StrategyRecord; onDeleted: (id: string) => void }) {
  const quiz = strategy.quiz;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteStrategy(strategy.id);
      onDeleted(strategy.id);
    } catch (err) {
      setDeleteError(err instanceof StrategyAPIError ? err.message : 'Couldn’t delete this strategy. Please try again.');
      setDeleting(false);
    }
  };
  const firstNiche = quiz?.niches[0];
  const ageSummary = quiz ? summariseAges(quiz.age_ranges) : null;
  const audience = quiz?.skill_level ? `${SKILL_LABELS[quiz.skill_level]}${ageSummary ? ` ${ageSummary}` : ''}` : ageSummary;
  const descriptionCount = strategy.strategyOutput.channelDescriptions?.length ?? 0;

  return (
    <div className="group relative bg-white rounded-2xl p-6 shadow-sm border border-[#c7c4d8]/20 flex flex-col gap-4 hover:shadow-md hover:border-[#4f46e5]/30 transition-all has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-[#4f46e5]">
      {/* The whole card opens the strategy; the bin button sits above this link */}
      <Link
        href={`/dashboard/strategist/result?id=${encodeURIComponent(strategy.id)}`}
        aria-label={`View strategy for ${strategy.brandName}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-none"
      />

      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-xl bg-[#e2dfff] flex items-center justify-center text-[22px] shrink-0" aria-hidden="true">
          {firstNiche?.emoji ?? '✨'}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] leading-[24px] font-bold text-[#0b1c30] truncate">{strategy.brandName}</h2>
          <p className={`${LABEL_SM} text-[#777587] mt-0.5`}>{formatDate(strategy.createdAt)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {!quiz && <span className={`px-2 py-0.5 rounded-full bg-[#e5eeff] text-[#464555] ${LABEL_SM}`}>Classic</span>}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete strategy for ${strategy.brandName}`}
            title="Delete strategy"
            className="relative z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[#777587] hover:text-[#ba1a1a] hover:bg-[#ffdad6]/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ba1a1a]"
          >
            <Icon icon="material-symbols:delete-outline" width={18} height={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {quiz ? (
          quiz.niches.map((n) => (
            <span key={n.label} className={`px-3 py-1 rounded-full bg-[#e2dfff] text-[#3525cd] ${LABEL_MD}`}>
              {n.emoji} {n.label}
            </span>
          ))
        ) : (
          <span className={`px-3 py-1 rounded-full bg-[#e2dfff] text-[#3525cd] ${LABEL_MD} max-w-full truncate`}>{strategy.industry}</span>
        )}
        {audience && <span className={`px-3 py-1 rounded-full bg-[#eff4ff] text-[#006693] ${LABEL_MD}`}>{audience}</span>}
      </div>

      {quiz && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#4f46e5] text-white ${LABEL_MD} max-w-full`}>
            <Icon icon="material-symbols:star" width={12} height={12} className="shrink-0" />
            <span className="text-inherit truncate">{quiz.primary_keyword}</span>
          </span>
          {quiz.secondary_keywords.length > 0 && (
            <span className={`px-2.5 py-1 rounded-full bg-[#e5eeff] text-[#464555] ${LABEL_SM}`}>+{quiz.secondary_keywords.length} more</span>
          )}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-[#e5eeff] flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {(quiz?.platforms ?? []).map((p) => (
            <span key={p} className={`w-7 h-7 rounded-lg flex items-center justify-center ${PLATFORM_ICONS[p].style}`} title={PLATFORM_ICONS[p].label}>
              <Icon icon={PLATFORM_ICONS[p].icon} width={14} height={14} />
            </span>
          ))}
          {descriptionCount > 0 && (
            <span className={`ml-1 text-[#777587] whitespace-nowrap ${LABEL_SM}`}>
              {descriptionCount} {descriptionCount === 1 ? 'description' : 'descriptions'}
            </span>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 text-[#3525cd] whitespace-nowrap shrink-0 group-hover:gap-1.5 transition-all ${LABEL_MD}`}>
          <span className="text-inherit">View strategy</span>
          <Icon icon="material-symbols:arrow-forward" width={16} height={16} />
        </span>
      </div>

      {confirming && (
        <div
          className="absolute inset-0 z-20 rounded-2xl bg-white/95 backdrop-blur-sm flex flex-col items-center justify-center gap-3 p-6 text-center"
          role="alertdialog"
          aria-label={`Delete strategy for ${strategy.brandName}?`}
        >
          <span className="w-10 h-10 rounded-full bg-[#ffdad6] flex items-center justify-center">
            <Icon icon="material-symbols:delete-outline" width={20} height={20} className="text-[#ba1a1a]" />
          </span>
          <p className="text-[15px] font-bold text-[#0b1c30]">Delete this strategy?</p>
          <p className="text-[13px] leading-[20px] text-[#464555]">
            “{strategy.brandName}” and its channel descriptions will be removed for good.
          </p>
          {deleteError && (
            <p className={`${LABEL_MD} text-[#ba1a1a]`} role="alert">
              {deleteError}
            </p>
          )}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              autoFocus
              onClick={() => {
                setConfirming(false);
                setDeleteError(null);
              }}
              disabled={deleting}
              className={`px-4 py-2 rounded-xl bg-white border border-[#c7c4d8]/60 text-[#0b1c30] hover:bg-[#eff4ff] transition-colors disabled:opacity-50 ${LABEL_MD}`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={deleting}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#ba1a1a] text-white hover:bg-[#93000a] transition-colors disabled:opacity-70 ${LABEL_MD}`}
            >
              {deleting && <Icon icon="material-symbols:progress-activity" width={16} height={16} className="animate-spin" />}
              <span className="text-inherit">{deleting ? 'Deleting…' : 'Delete'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function StrategyListView({ strategies: initialStrategies }: { strategies: StrategyRecord[] }) {
  const [strategies, setStrategies] = useState(initialStrategies);
  const removeStrategy = (id: string) => setStrategies((current) => current.filter((s) => s.id !== id));

  return (
    <div className="flex flex-col w-full max-w-[1280px] mx-auto gap-6 font-heading">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] leading-[36px] tracking-[-0.025em] font-bold text-[#0b1c30]">Your strategies</h1>
          {strategies.length > 0 && (
            <p className="text-[14px] leading-[22px] text-[#464555] mt-1">
              {strategies.length} {strategies.length === 1 ? 'strategy' : 'strategies'} · open one to see its channel descriptions and plan
            </p>
          )}
        </div>
        <Link
          href="/dashboard/strategist/new"
          className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#4f46e5] text-white rounded-xl shadow-sm hover:opacity-95 transition-all active:scale-[0.98] self-start sm:self-auto ${LABEL_MD}`}
        >
          <Icon icon="material-symbols:add" width={18} height={18} />
          <span className="text-inherit">Create new strategy</span>
        </Link>
      </div>

      {strategies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((s) => (
            <StrategyCard key={s.id} strategy={s} onDeleted={removeStrategy} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-10 shadow-sm text-center flex flex-col items-center gap-3">
          <span className="w-12 h-12 rounded-full bg-[#e2dfff] flex items-center justify-center">
            <Icon icon="material-symbols:auto-awesome" width={22} height={22} className="text-[#4f46e5]" />
          </span>
          <p className="text-[16px] font-bold text-[#0b1c30]">No strategies yet</p>
          <p className="text-[14px] text-[#464555]">Answer a few quick questions and we’ll build your first one.</p>
          <Link
            href="/dashboard/strategist/new"
            className={`inline-flex items-center gap-1.5 px-5 py-2.5 mt-1 bg-[#4f46e5] text-white rounded-xl shadow-sm hover:opacity-95 ${LABEL_MD}`}
          >
            <Icon icon="material-symbols:add" width={18} height={18} />
            <span className="text-inherit">Create new strategy</span>
          </Link>
        </div>
      )}
    </div>
  );
}
