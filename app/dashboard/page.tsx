'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Stat {
  label: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
  accent: string;
  labelColored: boolean;
}

const stats: Stat[] = [
  { label: 'Total Posts', value: '256k', change: '+2.5%', isPositive: true, icon: 'solar:document-text-bold', accent: 'primary', labelColored: false },
  { label: 'Scheduled Posts', value: '136k', change: '+4.10%', isPositive: true, icon: 'solar:calendar-bold', accent: 'mint', labelColored: false },
  { label: 'Published Posts', value: '120k', change: '-5.1%', isPositive: false, icon: 'solar:check-circle-bold', accent: 'tertiary', labelColored: true },
  { label: 'Engagement Rate', value: '93%', change: '+25.6%', isPositive: true, icon: 'solar:graph-up-bold', accent: 'amber', labelColored: true },
];

const accentClasses: Record<string, { bg: string; icon: string; text: string }> = {
  primary: { bg: 'bg-primary/10', icon: 'text-primary', text: 'text-primary' },
  mint: { bg: 'bg-emerald-500/10', icon: 'text-emerald-600', text: 'text-on-surface' },
  tertiary: { bg: 'bg-tertiary/10', icon: 'text-tertiary', text: 'text-tertiary' },
  amber: { bg: 'bg-amber-500/10', icon: 'text-amber-600', text: 'text-amber-600' },
};

interface ChartPoint {
  date: string;
  generated: number;
  published: number;
}

const chartData: ChartPoint[] = [
  { date: 'Sep 15', generated: 420, published: 280 },
  { date: 'Sep 18', generated: 480, published: 320 },
  { date: 'Sep 22', generated: 560, published: 410 },
  { date: 'Sep 25', generated: 640, published: 470 },
  { date: 'Sep 29', generated: 720, published: 560 },
  { date: 'Oct 03', generated: 860, published: 640 },
  { date: 'Oct 08', generated: 1065, published: 892 },
  { date: 'Oct 10', generated: 980, published: 820 },
  { date: 'Oct 13', generated: 900, published: 760 },
  { date: 'Oct 16', generated: 830, published: 700 },
  { date: 'Oct 20', generated: 780, published: 650 },
];

const TARGET = 1200; // ghost target line
const Y_TICKS = [1200, 1000, 800, 600, 400, 200];
const X_LABELS = ['Sep 15', 'Sep 22', 'Sep 29', 'Oct 06', 'Oct 13', 'Oct 20'];

const CHART_LINE_COLOR = '#6b63f1'; // primary.400 — reads better than the darkest primary on light bg
const CHART_PUBLISHED_COLOR = '#10b981'; // emerald-500

const recentActivity = [
  { icon: 'solar:check-circle-bold', color: 'text-emerald-600 bg-emerald-500/10', title: 'New strategy approved', subtitle: 'Q4 Product Launch • LinkedIn', time: '2h ago' },
  { icon: 'solar:bell-bold', color: 'text-primary bg-primary/10', title: 'Post #PO-1048 published', subtitle: 'Global SaaS Insights Feed', time: '4h ago' },
  { icon: 'solar:pen-bold', color: 'text-secondary bg-secondary/10', title: 'AI Copywriter updated copy', subtitle: 'Viral Hooks Thread Variant B', time: '6h ago' },
  { icon: 'solar:danger-triangle-bold', color: 'text-amber-600 bg-amber-500/10', title: 'Campaign flagged for review', subtitle: 'Token threshold alert reached', time: '8h ago' },
];

const upcomingPipeline = [
  { title: 'Review carousel asset rendering', meta: 'Today, 10:00 AM • Figma & AI Designer' },
  { title: 'Approve Twitter / X Thread #1052', meta: 'Today, 2:00 PM • Growth Team' },
];

const quickActions = [
  {
    href: '/dashboard/strategist',
    icon: 'solar:lightbulb-bolt-bold',
    title: 'AI Strategist',
    desc: 'Generate quarterly multi-platform campaign hooks.',
    badge: '8 Prompts Ready',
    cta: 'Open',
  },
  {
    href: '/dashboard/copywriter',
    icon: 'solar:pen-bold',
    title: 'AI Copywriter',
    desc: 'Edit AI-generated captions, threads, and newsletters.',
    badge: '14 Drafts',
    cta: 'Compose',
  },
  {
    href: '/dashboard/analysis',
    icon: 'solar:chart-2-bold',
    title: 'Analytics',
    desc: 'Track multi-network performance metrics & ROI.',
    badge: 'Live Sync',
    cta: 'Explore',
  },
];

const TIME_RANGES = ['1D', '5D', '1M', 'ALL'];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('1M');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

  const maxValue = Y_TICKS[0];
  const minValue = 0;
  const range = maxValue - minValue || 1;

  const toX = (i: number) => (i / (chartData.length - 1)) * 100;
  const toY = (v: number) => 100 - ((v - minValue) / range) * 100;

  const generatedPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(d.generated)}`).join(' ');
  const publishedPath = chartData.map((d, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)},${toY(d.published)}`).join(' ');
  const areaPath = `${generatedPath} L 100,100 L 0,100 Z`;
  const targetY = toY(TARGET);

  const hovered = hoverIndex !== null ? chartData[hoverIndex] : null;
  const hoveredChange =
    hoverIndex !== null && hoverIndex > 0
      ? (((chartData[hoverIndex].generated - chartData[hoverIndex - 1].generated) / chartData[hoverIndex - 1].generated) * 100).toFixed(1)
      : null;

  return (
    <div className="w-full">
      {/* Greeting row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading text-on-surface">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-outline mt-1">Here&apos;s what&apos;s happening with your content strategy today.</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest shadow-ambient-sm text-sm font-medium text-on-surface hover:shadow-ambient transition-shadow self-start sm:self-auto">
          <Icon icon="solar:calendar-linear" width={18} height={18} className="text-outline" />
          {today}
          <Icon icon="solar:alt-arrow-down-linear" width={14} height={14} className="text-outline" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {stats.map((stat) => {
          const accent = accentClasses[stat.accent];
          return (
            <div key={stat.label} className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient-sm hover:shadow-ambient transition-shadow">
              <div className="flex items-start justify-between mb-5">
                <p className={`text-xs font-semibold ${stat.labelColored ? accent.text : 'text-outline'}`}>{stat.label}</p>
                <div className={`p-2.5 rounded-xl ${accent.bg}`}>
                  <Icon icon={stat.icon} width={20} height={20} className={accent.icon} />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold font-heading text-on-surface">{stat.value}</h3>
              </div>
              <div className="flex items-center gap-1.5 mt-2">
                <Icon
                  icon={stat.isPositive ? 'solar:arrow-up-linear' : 'solar:arrow-down-linear'}
                  width={14}
                  height={14}
                  className={stat.isPositive ? 'text-emerald-600' : 'text-error'}
                />
                <span className={`text-sm font-semibold ${stat.isPositive ? 'text-emerald-600' : 'text-error'}`}>{stat.change}</span>
                <span className="text-xs text-outline">vs last month</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Content Management Card with Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-ambient-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
              <h2 className="text-base font-bold font-heading text-on-surface">Content Management</h2>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
                Realtime Analytics
              </span>
            </div>
            <div className="flex gap-1 bg-surface-container-low rounded-lg p-1">
              {TIME_RANGES.map((label) => (
                <button
                  key={label}
                  onClick={() => setTimeRange(label)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${
                    label === timeRange ? 'text-on-primary gradient-primary' : 'text-outline hover:text-on-surface'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-outline mb-5">Post generation velocity, scheduling cadence &amp; publishing output</p>

          {/* Legend */}
          <div className="flex items-center gap-5 mb-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-on-surface/80">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_LINE_COLOR }} /> Generated
            </span>
            <span className="flex items-center gap-1.5 text-on-surface/80">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_PUBLISHED_COLOR }} /> Published
            </span>
            <span className="flex items-center gap-1.5 text-outline">
              <span className="w-3 border-t border-dashed border-outline-variant" /> Target ({(TARGET / 1000).toFixed(1)}k)
            </span>
          </div>

          {/* Chart */}
          <div className="h-72 flex gap-3">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-[11px] text-outline py-0.5 shrink-0 w-9 text-right">
              {Y_TICKS.map((t) => (
                <span key={t}>{t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}</span>
              ))}
            </div>

            <div
              className="relative flex-1"
              onMouseLeave={() => setHoverIndex(null)}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                const idx = Math.round(pct * (chartData.length - 1));
                setHoverIndex(Math.max(0, Math.min(chartData.length - 1, idx)));
              }}
            >
              <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={CHART_LINE_COLOR} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={CHART_LINE_COLOR} stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Gridlines at each Y tick */}
                {Y_TICKS.map((t) => (
                  <line
                    key={t}
                    x1="0" y1={toY(t)} x2="100" y2={toY(t)}
                    stroke="rgba(39,46,66,0.07)" strokeWidth="0.5"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}

                {/* Target ghost line */}
                <line
                  x1="0" y1={targetY} x2="100" y2={targetY}
                  stroke="rgba(111,118,142,0.5)" strokeWidth="0.6" strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />

                <path d={areaPath} fill="url(#chartGradient)" />
                <path d={generatedPath} fill="none" stroke={CHART_LINE_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <path d={publishedPath} fill="none" stroke={CHART_PUBLISHED_COLOR} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />

                {hoverIndex !== null && (
                  <line
                    x1={toX(hoverIndex)} y1="0" x2={toX(hoverIndex)} y2="100"
                    stroke="rgba(111,118,142,0.4)" strokeWidth="0.5" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke"
                  />
                )}

                {chartData.map((d, i) => (
                  <g key={d.date}>
                    <circle cx={toX(i)} cy={toY(d.generated)} r={hoverIndex === i ? 2.2 : 1.4} fill={CHART_LINE_COLOR} stroke="white" strokeWidth={hoverIndex === i ? 0.8 : 0} vectorEffect="non-scaling-stroke" />
                    <circle cx={toX(i)} cy={toY(d.published)} r={hoverIndex === i ? 2.2 : 1.4} fill={CHART_PUBLISHED_COLOR} stroke="white" strokeWidth={hoverIndex === i ? 0.8 : 0} vectorEffect="non-scaling-stroke" />
                  </g>
                ))}
              </svg>

              {/* Tooltip — stays dark even on the light chart, matching the reference */}
              {hovered && hoverIndex !== null && (
                <div
                  className="absolute pointer-events-none bg-on-surface rounded-lg shadow-ambient-lg px-3 py-2.5 text-xs -translate-x-1/2 -translate-y-full z-10"
                  style={{
                    left: `${toX(hoverIndex)}%`,
                    top: `${Math.min(toY(hovered.generated), toY(hovered.published)) - 6}%`,
                  }}
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="font-semibold text-white uppercase tracking-wide text-[10px]">{hovered.date}</span>
                    {hoveredChange !== null && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${Number(hoveredChange) >= 0 ? 'bg-emerald-500/30 text-emerald-300' : 'bg-error/30 text-red-300'}`}>
                        {Number(hoveredChange) >= 0 ? '+' : ''}{hoveredChange}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHART_LINE_COLOR }} />
                    Generated: <span className="font-semibold text-white">{hovered.generated.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white/70">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CHART_PUBLISHED_COLOR }} />
                    Published: <span className="font-semibold text-white">{hovered.published.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between text-[11px] text-outline mt-2 mb-6 pl-[3rem]">
            {X_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 text-xs" style={{ borderTop: '1px solid var(--ghost-border)' }}>
            <div className="flex flex-wrap gap-5">
              <span className="text-outline">Automated Schedules: <span className="font-bold text-on-surface">84%</span></span>
              <span className="text-outline">Publish Success Rate: <span className="font-bold text-on-surface">99.4%</span></span>
              <span className="text-outline">Avg Daily Yield: <span className="font-bold text-on-surface">852 posts</span></span>
            </div>
            <Link href="/dashboard/analysis" className="flex items-center gap-1 font-semibold text-primary hover:text-primary/80 transition-colors">
              View Full Analytics
              <Icon icon="solar:alt-arrow-right-linear" width={14} height={14} />
            </Link>
          </div>
        </div>

        {/* Realtime Dispatch */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-ambient-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
              <h2 className="text-base font-bold font-heading text-on-surface">Realtime Dispatch</h2>
            </div>
            <span className="text-[11px] text-outline">Server US-East</span>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 rounded-xl">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                <span className="text-sm font-semibold text-on-surface">Active Runners</span>
              </div>
              <span className="text-base font-bold text-on-surface">40</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-primary/10 rounded-xl">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 bg-primary rounded-full" />
                <span className="text-sm font-semibold text-on-surface">Scheduled Queue</span>
              </div>
              <span className="text-base font-bold text-on-surface">40</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 mb-6" style={{ borderTop: '1px solid var(--ghost-border)' }}>
            <div>
              <div className="text-2xl font-bold font-heading text-on-surface mb-1">0:02</div>
              <div className="text-xs text-emerald-600 font-semibold mb-1">✓ Good!</div>
              <div className="text-[11px] text-outline">Waiting Time</div>
            </div>
            <div>
              <div className="text-2xl font-bold font-heading text-on-surface mb-1">0:45</div>
              <div className="text-xs text-error font-semibold mb-1">! Not Good!</div>
              <div className="text-[11px] text-outline">Avg Duration</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <Icon icon="solar:clock-circle-linear" width={16} height={16} className="text-outline" />
              Recent Activity
            </h3>
            <Link href="/dashboard/analysis" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-0.5">
              View All
              <Icon icon="solar:alt-arrow-right-linear" width={12} height={12} />
            </Link>
          </div>
          <ul className="space-y-3 mb-6">
            {recentActivity.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <div className={`p-1.5 rounded-full shrink-0 ${item.color}`}>
                  <Icon icon={item.icon} width={14} height={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-on-surface truncate">{item.title}</p>
                  <p className="text-[11px] text-outline truncate">{item.subtitle}</p>
                </div>
                <span className="text-[11px] text-outline shrink-0">{item.time}</span>
              </li>
            ))}
          </ul>

          {/* Upcoming Pipeline */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-1.5">
              <Icon icon="solar:checklist-minimalistic-linear" width={16} height={16} className="text-outline" />
              Upcoming Pipeline
            </h3>
            <Link href="/dashboard/scheduler" className="text-[11px] font-semibold text-primary hover:text-primary/80 flex items-center gap-0.5">
              View All
              <Icon icon="solar:alt-arrow-right-linear" width={12} height={12} />
            </Link>
          </div>
          <ul className="space-y-3">
            {upcomingPipeline.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="mt-0.5 w-4 h-4 rounded border-2 border-outline-variant shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-on-surface">{item.title}</p>
                  <p className="text-[11px] text-outline">{item.meta}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* AI Suite & Quick Actions */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold font-heading text-on-surface flex items-center gap-2">
            <Icon icon="solar:bolt-bold" width={18} height={18} className="text-primary" />
            AI Suite &amp; Quick Actions
          </h2>
          <span className="text-[11px] font-semibold text-outline px-2.5 py-1 rounded-full bg-surface-container-low">
            GPT-4o Enterprise Active
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {quickActions.map((action) => (
            <div key={action.href} className="bg-surface-container-lowest rounded-2xl p-5 shadow-ambient-sm hover:shadow-ambient transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                  <Icon icon={action.icon} width={22} height={22} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface mb-1">{action.title}</h3>
                  <p className="text-xs text-outline leading-relaxed">{action.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--ghost-border)' }}>
                <span className="text-[11px] font-semibold text-outline">{action.badge}</span>
                <Link href={action.href} className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors">
                  {action.cta}
                  <Icon icon="solar:arrow-right-linear" width={14} height={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
