'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { StrategyOutput } from '@/types/strategy';

interface StrategyDisplayProps {
  strategy: StrategyOutput;
  brandName?: string;
  industry?: string;
  targetAudience?: string;
  goals?: string;
  createdAt?: string;
  onEdit?: () => void;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

const parseScheduleDays = (schedule: string) => {
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const lower = schedule.toLowerCase();
  const timeMatches = lower.match(/\d{1,2}(?::\d{2})?\s*(?:am|pm)/gi) || [];
  const timeLabels = timeMatches.map((t) => {
    const cleaned = t.replace(/\s/g, '').toUpperCase();
    const m = cleaned.match(/^(\d{1,2})(?::00)?([AP])M?$/i);
    return m ? `${m[1]}${m[2]}` : cleaned;
  });
  let activeDays: boolean[];
  if (/daily/i.test(lower) || /every\s*day/i.test(lower)) {
    activeDays = [true, true, true, true, true, true, true];
  } else if (/weekday/i.test(lower) || /monday.*friday/i.test(lower)) {
    activeDays = [true, true, true, true, true, false, false];
  } else {
    const count = parseInt(lower.match(/(\d)/)?.[1] || '3', 10);
    if (count >= 5) activeDays = [true, true, true, true, true, false, false];
    else if (count >= 4) activeDays = [true, true, false, true, true, false, false];
    else activeDays = [true, false, true, false, true, false, false];
  }
  return { days, activeDays, timeLabels };
};

const getPlatformSummary = (platforms: { platform: string }[]) =>
  platforms.map((p) => p.platform).join(', ');

const getToneKeywords = (tactics: string[]) => {
  const keywords = ['Professional', 'Witty', 'Transparent', 'Aspirational', 'Authentic', 'Friendly', 'Bold', 'Informative', 'Casual', 'Engaging'];
  const found: string[] = [];
  const joined = tactics.join(' ').toLowerCase();
  for (const kw of keywords) {
    if (joined.includes(kw.toLowerCase())) found.push(kw);
  }
  return found.length > 0 ? found.slice(0, 4) : ['Professional', 'Engaging', 'Authentic'];
};

const getFrequencyLabel = (index: number) => {
  const labels = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'];
  return labels[index % labels.length];
};

const frequencyColor = (label: string) => {
  switch (label) {
    case 'Daily': return 'bg-violet-100 text-violet-700';
    case 'Weekly': return 'bg-blue-100 text-blue-700';
    case 'Bi-Weekly': return 'bg-amber-100 text-amber-700';
    case 'Monthly': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

/* ── Accordion Card wrapper ── */
interface AccordionCardProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const AccordionCard: React.FC<AccordionCardProps> = ({
  icon, iconBg, iconColor, title, isOpen, onToggle, children,
}) => (
  <div className="bg-white rounded-2xl ghost-border overflow-hidden transition-shadow hover:shadow-md">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer select-none"
    >
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon icon={icon} className={`w-[18px] h-[18px] ${iconColor}`} />
      </div>
      <h3 className="flex-1 text-lg font-bold tracking-tight text-on-surface">{title}</h3>
      <Icon
        icon={isOpen ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
        className="w-5 h-5 text-gray-400 flex-shrink-0 transition-transform"
      />
    </button>
    {isOpen && (
      <div className="px-5 pb-5 animate-fade-in">{children}</div>
    )}
  </div>
);

export const StrategyDisplay: React.FC<StrategyDisplayProps> = ({
  strategy, brandName, industry, targetAudience, goals, createdAt, onEdit,
}) => {
  // All sections closed by default
  const [open, setOpen] = useState<Record<string, boolean>>({
    pillars: false, themes: false, tactics: false,
    schedule: false, platforms: false, visuals: false,
  });
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const schedule = parseScheduleDays(strategy.postingSchedule);
  const platformSummary = getPlatformSummary(strategy.platformRecommendations);
  const toneKeywords = getToneKeywords(strategy.engagementTactics);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header Card ── */}
      <div className="bg-white rounded-2xl p-6 ghost-border">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center flex-shrink-0">
            <Icon icon="solar:stars-bold" className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-violet-100 text-violet-700">
                Strategy Active
              </span>
              {industry && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gray-100 text-gray-600">
                  {industry} Industry
                </span>
              )}
            </div>
            <h2 className="text-3xl font-bold text-on-surface mb-3">
              Brand: {brandName || 'Your Brand'}
            </h2>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-gray-500">
              {targetAudience && (
                <div className="flex items-center gap-2">
                  <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-xs uppercase tracking-wider text-gray-400 block leading-tight">Target Audience</span>
                    <span className="text-base text-gray-700">{targetAudience}</span>
                  </div>
                </div>
              )}
              {goals && (
                <div className="flex items-center gap-2">
                  <Icon icon="solar:target-bold" className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-xs uppercase tracking-wider text-gray-400 block leading-tight">Primary Goals</span>
                    <span className="text-base text-gray-700">{goals}</span>
                  </div>
                </div>
              )}
              {createdAt && (
                <div className="flex items-center gap-2">
                  <Icon icon="solar:calendar-bold" className="w-5 h-5 text-gray-400" />
                  <div>
                    <span className="text-xs uppercase tracking-wider text-gray-400 block leading-tight">Created Date</span>
                    <span className="text-base text-gray-700">{formatDate(createdAt)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          {onEdit && (
            <button onClick={onEdit} className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
              <Icon icon="solar:pen-bold" className="w-4 h-4" />
              Edit Strategy
            </button>
          )}
        </div>
      </div>

      {/* ── Middle Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-5">
        {/* Content Pillars */}
        <AccordionCard
          icon="solar:home-angle-bold" iconBg="bg-violet-100" iconColor="text-violet-600"
          title="Content Pillars" isOpen={open.pillars} onToggle={() => toggle('pillars')}
        >
          <div className="space-y-2.5">
            {strategy.contentPillars.map((pillar, i) => (
              <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 px-4 py-3">
                <span className="text-sm font-bold text-violet-500 mt-0.5 w-5 text-center flex-shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div>
                  <span className="text-base font-medium text-gray-900 block leading-snug">{pillar.split(' ').slice(0, 3).join(' ')}</span>
                  {pillar.split(' ').length > 3 && (
                    <span className="text-sm text-gray-500 leading-snug">{pillar.split(' ').slice(3).join(' ')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </AccordionCard>

        {/* Content Themes */}
        <AccordionCard
          icon="solar:palette-bold" iconBg="bg-fuchsia-100" iconColor="text-fuchsia-600"
          title="Content Themes" isOpen={open.themes} onToggle={() => toggle('themes')}
        >
          <div className="space-y-2.5 mb-5">
            {strategy.contentThemes.map((theme, i) => (
              <div key={i} className="rounded-xl bg-green-50 border border-green-200 px-4 py-3">
                <span className="text-base text-green-800 leading-relaxed">{theme}</span>
              </div>
            ))}
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 block">Monthly Focus</span>
            <div className="pl-3" style={{ borderLeftWidth: '3px', borderLeftStyle: 'solid', borderLeftColor: '#7c3aed' }}>
              <p className="text-base font-medium text-gray-900">{strategy.contentThemes[0] || 'Content Strategy'}</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {strategy.contentPillars[0] ? `Focus on ${strategy.contentPillars[0].toLowerCase()}` : 'Driving engagement through focused content'}
              </p>
            </div>
          </div>
        </AccordionCard>

        {/* Engagement Tactics */}
        <AccordionCard
          icon="solar:flag-bold" iconBg="bg-rose-100" iconColor="text-rose-600"
          title="Engagement Tactics" isOpen={open.tactics} onToggle={() => toggle('tactics')}
        >
          <div className="space-y-0 divide-y divide-gray-100">
            {strategy.engagementTactics.map((tactic, i) => {
              const freq = getFrequencyLabel(i);
              return (
                <div key={i} className="flex items-start justify-between py-3 first:pt-0 last:pb-0 gap-3">
                  <span className="text-base text-gray-700 leading-relaxed">{tactic}</span>
                  <span className={`text-sm font-semibold px-2.5 py-1 rounded-full flex-shrink-0 ${frequencyColor(freq)}`}>
                    {freq}
                  </span>
                </div>
              );
            })}
          </div>
        </AccordionCard>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-start gap-5">
        {/* Posting Schedule */}
        <AccordionCard
          icon="solar:clock-circle-bold" iconBg="bg-blue-100" iconColor="text-blue-600"
          title="Posting Schedule" isOpen={open.schedule} onToggle={() => toggle('schedule')}
        >
          <div className="grid grid-cols-7 gap-1.5 mb-4">
            {schedule.days.map((day, i) => (
              <div key={i} className="text-center">
                <span className="text-xs font-semibold text-gray-400 uppercase block mb-1.5">{day}</span>
                <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm font-bold ${
                  schedule.activeDays[i] ? 'gradient-primary text-white' : 'bg-gray-50 text-gray-300'
                }`}>
                  {schedule.activeDays[i] && schedule.timeLabels[i % schedule.timeLabels.length]
                    ? schedule.timeLabels[i % schedule.timeLabels.length]
                    : schedule.activeDays[i] ? '✓' : ''}
                </div>
              </div>
            ))}
          </div>
          <ul className="list-disc list-outside pl-5 space-y-2">
            {strategy.postingSchedule.split('.').filter((s) => s.trim()).map((sentence, i) => (
              <li key={i} className="text-base text-gray-700 leading-relaxed">{sentence.trim()}.</li>
            ))}
          </ul>
        </AccordionCard>

        {/* Platforms & Brand Voice */}
        <AccordionCard
          icon="solar:share-bold" iconBg="bg-indigo-100" iconColor="text-indigo-600"
          title="Platforms & Brand Voice" isOpen={open.platforms} onToggle={() => toggle('platforms')}
        >
          <div className="flex items-center gap-3 mb-4">
            <Icon icon="solar:share-circle-bold" className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-base font-medium text-gray-900">{platformSummary}</p>
              <p className="text-sm text-gray-500">Primary channels for growth</p>
            </div>
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 block">Tone of Voice</span>
            <div className="flex flex-wrap gap-2">
              {toneKeywords.map((kw, i) => (
                <span key={i} className="px-3.5 py-1.5 rounded-lg bg-gray-50 text-sm font-medium text-gray-600 border border-gray-100">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </AccordionCard>

        {/* Visual Prompts */}
        <AccordionCard
          icon="solar:gallery-bold" iconBg="bg-cyan-100" iconColor="text-cyan-600"
          title="Visual Prompts" isOpen={open.visuals} onToggle={() => toggle('visuals')}
        >
          <div className="space-y-2">
            {strategy.visualPrompts.map((prompt, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-xl bg-cyan-50/60 px-4 py-3">
                <Icon icon="solar:camera-bold" className="w-5 h-5 text-cyan-500 flex-shrink-0 mt-0.5" />
                <span className="text-base text-gray-700 leading-relaxed">{prompt}</span>
              </div>
            ))}
          </div>
        </AccordionCard>
      </div>

      {/* ── Footer Actions ── */}
      <div className="flex items-center justify-end gap-3">
        <button className="w-10 h-10 rounded-full bg-white ghost-border flex items-center justify-center hover:bg-gray-50 transition-colors">
          <Icon icon="solar:download-minimalistic-bold" className="w-5 h-5 text-gray-500" />
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          <Icon icon="solar:plain-bold" className="w-4 h-4" />
          Share Strategy
        </button>
      </div>
    </div>
  );
};
