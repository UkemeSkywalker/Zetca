'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { StrategyOutput } from '@/types/strategy';

interface StrategyDisplayProps {
  strategy: StrategyOutput;
}

const PriorityDot: React.FC<{ priority: 'high' | 'medium' | 'low' }> = ({ priority }) => {
  const colorMap = {
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-green-500',
  };
  const labelMap = {
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return (
    <span className="flex items-center gap-1.5 text-xs text-gray-500">
      <span className={`w-2 h-2 rounded-full ${colorMap[priority]}`} />
      {labelMap[priority]}
    </span>
  );
};

type CardTheme = 'blue' | 'violet' | 'rose' | 'amber' | 'emerald' | 'cyan';

const themeStyles: Record<CardTheme, { iconBg: string; iconText: string; rowBg: string; accent: string; border: string }> = {
  blue:    { iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    rowBg: 'bg-blue-50/60',    accent: 'text-blue-500',    border: 'border-t-blue-500' },
  violet:  { iconBg: 'bg-violet-100',  iconText: 'text-violet-600',  rowBg: 'bg-violet-50/60',  accent: 'text-violet-500',  border: 'border-t-violet-500' },
  rose:    { iconBg: 'bg-rose-100',    iconText: 'text-rose-600',    rowBg: 'bg-rose-50/60',    accent: 'text-rose-500',    border: 'border-t-rose-500' },
  amber:   { iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   rowBg: 'bg-amber-50/60',   accent: 'text-amber-500',   border: 'border-t-amber-500' },
  emerald: { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', rowBg: 'bg-emerald-50/60', accent: 'text-emerald-500', border: 'border-t-emerald-500' },
  cyan:    { iconBg: 'bg-cyan-100',    iconText: 'text-cyan-600',    rowBg: 'bg-cyan-50/60',    accent: 'text-cyan-500',    border: 'border-t-cyan-500' },
};

const SectionCard: React.FC<{
  icon: string;
  title: string;
  subtitle: string;
  theme: CardTheme;
  children: React.ReactNode;
}> = ({ icon, title, subtitle, theme, children }) => {
  const t = themeStyles[theme];
  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-t-2 ${t.border} overflow-hidden break-inside-avoid mb-4`}>
      <div className="px-5 pt-5 pb-3 flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg ${t.iconBg} flex items-center justify-center flex-shrink-0`}>
          <Icon icon={icon} className={`w-4 h-4 ${t.iconText}`} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="px-5 pb-5 flex-1">{children}</div>
    </div>
  );
};

export const StrategyDisplay: React.FC<StrategyDisplayProps> = ({ strategy }) => {
  return (
    <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
      {/* Content Pillars */}
      <SectionCard icon="solar:layers-bold" title="Content Pillars" subtitle="Core themes for your strategy" theme="blue">
        <div className="space-y-2">
          {strategy.contentPillars.map((pillar, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-blue-50/60 px-3 py-2.5">
              <span className="text-xs font-bold text-blue-500 w-4 text-center">{i + 1}</span>
              <span className="text-sm text-gray-700">{pillar}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Posting Schedule */}
      <SectionCard icon="solar:calendar-mark-bold" title="Posting Schedule" subtitle="Recommended frequency" theme="violet">
        <div className="rounded-lg bg-violet-50/60 px-4 py-4 flex items-center h-full">
          <p className="text-sm text-gray-700 leading-relaxed">{strategy.postingSchedule}</p>
        </div>
      </SectionCard>

      {/* Platform Recommendations */}
      <SectionCard icon="solar:devices-bold" title="Platforms" subtitle="Best for your brand" theme="rose">
        <div className="space-y-2">
          {strategy.platformRecommendations.map((p, i) => (
            <div key={i} className="rounded-lg bg-rose-50/60 px-3 py-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-900">{p.platform}</span>
                <PriorityDot priority={p.priority} />
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{p.rationale}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Content Themes */}
      <SectionCard icon="solar:palette-bold" title="Content Themes" subtitle="Topics to explore" theme="amber">
        <div className="space-y-2">
          {strategy.contentThemes.map((theme, i) => (
            <div key={i} className="flex items-center gap-2.5 rounded-lg bg-amber-50/60 px-3 py-2.5">
              <span className="text-amber-500 text-xs font-bold">#</span>
              <span className="text-sm text-gray-700">{theme}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Engagement Tactics */}
      <SectionCard icon="solar:users-group-rounded-bold" title="Engagement Tactics" subtitle="Boost audience interaction" theme="emerald">
        <div className="space-y-2">
          {strategy.engagementTactics.map((tactic, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-emerald-50/60 px-3 py-2.5">
              <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{tactic}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Visual Prompts */}
      <SectionCard icon="solar:camera-bold" title="Visual Prompts" subtitle="Image ideas for content" theme="cyan">
        <div className="space-y-2">
          {strategy.visualPrompts.map((prompt, i) => (
            <div key={i} className="flex items-start gap-2.5 rounded-lg bg-cyan-50/60 px-3 py-2.5">
              <Icon icon="solar:gallery-bold" className="w-4 h-4 text-cyan-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700">{prompt}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
