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
  tint: string;
  iconBg: string;
  iconColor: string;
  labelColor: string;
}

const stats: Stat[] = [
  { label: 'Total Posts', value: '256k', change: '+2.5%', isPositive: true, icon: 'lucide:archive', tint: 'from-indigo-50', iconBg: 'bg-indigo-100/80', iconColor: 'text-indigo-600', labelColor: 'text-indigo-950' },
  { label: 'Scheduled Posts', value: '136k', change: '+4.10%', isPositive: true, icon: 'lucide:calendar', tint: 'from-emerald-50', iconBg: 'bg-emerald-100/80', iconColor: 'text-emerald-600', labelColor: 'text-emerald-900' },
  { label: 'Published Posts', value: '120k', change: '-5.1%', isPositive: false, icon: 'lucide:circle-check', tint: 'from-violet-50', iconBg: 'bg-purple-100/70', iconColor: 'text-purple-600', labelColor: 'text-purple-900' },
  { label: 'Engagement Rate', value: '93%', change: '+25.6%', isPositive: true, icon: 'lucide:trending-up', tint: 'from-amber-50', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', labelColor: 'text-amber-900' },
];

// Chart data — `day` is days since the start of the range (Sep 15).
interface ChartPoint {
  day: number;
  generated: number;
  published: number;
  delta: string | null;
}

const RANGE_START = new Date(2025, 8, 15);
const RANGE_DAYS = 35;

const chartData: ChartPoint[] = [
  { day: 0, generated: 378, published: 270, delta: null },
  { day: 8, generated: 661, published: 443, delta: '+12.6%' },
  { day: 16, generated: 796, published: 617, delta: '+9.8%' },
  { day: 23, generated: 1065, published: 892, delta: '+18.4%' },
  { day: 30.5, generated: 926, published: 748, delta: '-6.2%' },
  { day: 35, generated: 835, published: 661, delta: '-4.1%' },
];
const MARKER_INDICES = [1, 2, 3, 4];
const DEFAULT_INDEX = 3;

const Y_TICKS = [1200, 1000, 800, 600, 400, 200];
const Y_TOP = 1200;
const Y_BOTTOM = 130;
const TARGET = 1075; // drawn where the reference draws it, labelled "Target (1.2k)"
const PLOT_H = 246;
const PLOT_W = 1000; // viewBox width; stretched to the container
const X_LABELS = ['Sep 15', 'Sep 22', 'Sep 29', 'Oct 06', 'Oct 13', 'Oct 20'];
const HIGHLIGHT_LABEL = 'Oct 06';

const GENERATED_COLOR = '#4f46e5';
const PUBLISHED_COLOR = '#10b981';

const toX = (day: number) => (day / RANGE_DAYS) * PLOT_W;
const toY = (v: number) => ((Y_TOP - v) / (Y_TOP - Y_BOTTOM)) * PLOT_H;

// Monotone cubic (Fritsch–Carlson) path, so curves never overshoot the data.
function smoothPath(points: [number, number][]): string {
  const n = points.length;
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1][0] - points[i][0]);
    slope.push((points[i + 1][1] - points[i][1]) / dx[i]);
  }
  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const h = dx[i] / 3;
    d += ` C ${x0 + h},${y0 + tangent[i] * h} ${x1 - h},${y1 - tangent[i + 1] * h} ${x1},${y1}`;
  }
  return d;
}

function formatTooltipDate(day: number): string {
  const date = new Date(RANGE_START);
  date.setDate(date.getDate() + Math.round(day));
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${weekday}, ${month} ${String(date.getDate()).padStart(2, '0')}`.toUpperCase();
}

const recentActivity = [
  { icon: 'lucide:check', color: 'text-emerald-600 bg-emerald-100', title: 'New strategy approved', subtitle: 'Q4 Product Launch • LinkedIn', time: '2h ago' },
  { icon: 'lucide:navigation-2', color: 'text-blue-600 bg-blue-100', title: 'Post #PO-1048 published', subtitle: 'Global SaaS Insights Feed', time: '4h ago' },
  { icon: 'lucide:square-pen', color: 'text-purple-500 bg-purple-100', title: 'AI Copywriter updated copy', subtitle: 'Viral Hooks Thread Variant B', time: '6h ago' },
  { icon: 'lucide:triangle-alert', color: 'text-amber-600 bg-amber-100', title: 'Campaign flagged for review', subtitle: 'Token threshold alert reached', time: '8h ago' },
];

const upcomingPipeline = [
  { title: 'Review carousel asset rendering', meta: 'Today, 10:00 AM • Figma & AI Designer' },
  { title: 'Approve Twitter / X Thread #1052', meta: 'Today, 2:00 PM • Alex & Growth Team' },
];

const quickActions = [
  {
    href: '/dashboard/strategist',
    icon: 'lucide:lightbulb',
    iconStyle: 'bg-indigo-50 text-indigo-600',
    title: 'AI Strategist',
    desc: 'Generate quarterly multi-platform campaign hooks.',
    badge: '8 Prompts Ready',
    badgeStyle: 'bg-emerald-50 text-emerald-600',
    cta: 'Open',
  },
  {
    href: '/dashboard/copywriter',
    icon: 'lucide:pencil',
    iconStyle: 'bg-purple-50 text-purple-500',
    title: 'AI Copywriter',
    desc: 'Edit AI-generated captions, threads, and newsletters.',
    badge: '14 Drafts',
    badgeStyle: 'bg-purple-50 text-purple-700',
    cta: 'Compose',
  },
  {
    href: '/dashboard/analysis',
    icon: 'lucide:chart-column',
    iconStyle: 'bg-sky-50 text-sky-600',
    title: 'Analytics',
    desc: 'Track multi-network performance metrics & ROI.',
    badge: 'Live Sync',
    badgeStyle: 'bg-sky-50 text-sky-700',
    cta: 'Explore',
  },
];

const TIME_RANGES = ['1D', '5D', '1M', 'ALL'];

const CARD = 'bg-white rounded-[14px] border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.03)]';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState('1M');
  const [activeIndex, setActiveIndex] = useState(DEFAULT_INDEX);

  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = useMemo(
    () => new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
    []
  );

  const { generatedPath, publishedPath, generatedArea, publishedArea } = useMemo(() => {
    const gen = smoothPath(chartData.map((d) => [toX(d.day), toY(d.generated)]));
    const pub = smoothPath(chartData.map((d) => [toX(d.day), toY(d.published)]));
    const close = ` L ${PLOT_W},${PLOT_H} L 0,${PLOT_H} Z`;
    return { generatedPath: gen, publishedPath: pub, generatedArea: gen + close, publishedArea: pub + close };
  }, []);

  const active = chartData[activeIndex];
  const activeLeftPct = (toX(active.day) / PLOT_W) * 100;

  return (
    <div className="w-full font-heading">
      {/* Greeting row */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[24px] leading-[32px] font-bold tracking-[-0.02em] text-slate-900">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1">Here&apos;s what&apos;s happening with your content strategy today.</p>
        </div>
        <button className="inline-flex items-center gap-2 h-[30px] px-[14px] mt-2 rounded-lg bg-white border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] text-[12px] font-medium text-slate-700 hover:border-slate-300 transition-colors self-start sm:self-auto">
          <Icon icon="lucide:calendar" width={13} height={13} className="text-slate-400" />
          <span className="text-inherit">{today}</span>
          <Icon icon="lucide:chevron-down" width={13} height={13} className="text-slate-400 ml-1" />
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-7">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-[14px] border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.03)] bg-gradient-to-br ${stat.tint} via-white via-45% to-white px-[19px] pt-[19px] pb-[20px]`}
          >
            <div className="flex items-center justify-between h-[30px]">
              <p className={`text-[11.5px] font-semibold ${stat.labelColor}`}>{stat.label}</p>
              <div className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center ${stat.iconBg}`}>
                <Icon icon={stat.icon} width={14} height={14} className={stat.iconColor} />
              </div>
            </div>
            <h3 className="mt-[10px] text-[30px] leading-[36px] font-bold tracking-[-0.02em] text-slate-900">{stat.value}</h3>
            <div className="flex items-center gap-1 mt-[8px]">
              <Icon
                icon={stat.isPositive ? 'lucide:arrow-up' : 'lucide:arrow-down'}
                width={13}
                height={13}
                className={stat.isPositive ? 'text-emerald-600' : 'text-rose-500'}
              />
              <span className={`text-[11.5px] font-semibold ${stat.isPositive ? 'text-emerald-600' : 'text-rose-500'}`}>{stat.change}</span>
              <span className="text-[11px] text-slate-400 ml-1">vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2.05fr)_minmax(0,1fr)] gap-7">
        {/* Left column: chart + AI Suite */}
        <div className="min-w-0">
          {/* Content Management Card with Chart */}
          <div className={`${CARD} px-6 pt-[22px] pb-[20px]`}>
            <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5 whitespace-nowrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" aria-hidden="true" />
                  <h2 className="text-[15.5px] font-bold text-slate-900">Content Management</h2>
                  <span className="px-2 py-[3px] rounded-md text-[9.5px] font-semibold bg-indigo-50 text-indigo-500">
                    Realtime Analytics
                  </span>
                </div>
                <p className="text-[11.5px] text-slate-400 mt-1">Post generation velocity, scheduling cadence &amp; publishing output</p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="flex items-center gap-3 text-[12px] whitespace-nowrap">
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: GENERATED_COLOR }} />
                    <span className="text-inherit">Generated</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-600">
                    <span className="w-[9px] h-[9px] rounded-full" style={{ backgroundColor: PUBLISHED_COLOR }} />
                    <span className="text-inherit">Published</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2 border-t border-slate-300" />
                    <span className="text-inherit">Target (1.2k)</span>
                  </span>
                </div>
                <div className="flex gap-0.5 bg-slate-100 rounded-lg p-[3px]">
                  {TIME_RANGES.map((label) => (
                    <button
                      key={label}
                      onClick={() => setTimeRange(label)}
                      className={`px-[11px] h-6 text-[11.5px] font-semibold rounded-md transition-colors ${
                        label === timeRange ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex mt-[46px]">
              {/* Y-axis labels */}
              <div className="relative shrink-0 w-9" style={{ height: PLOT_H }}>
                {Y_TICKS.map((t) => (
                  <span
                    key={t}
                    className="absolute right-[14px] -translate-y-1/2 text-[11px] text-slate-400"
                    style={{ top: toY(t) }}
                  >
                    {t >= 1000 ? `${(t / 1000).toFixed(1)}k` : t}
                  </span>
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <div
                  className="relative"
                  style={{ height: PLOT_H }}
                  onMouseLeave={() => setActiveIndex(DEFAULT_INDEX)}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const day = ((e.clientX - rect.left) / rect.width) * RANGE_DAYS;
                    let nearest = 0;
                    chartData.forEach((d, i) => {
                      if (Math.abs(d.day - day) < Math.abs(chartData[nearest].day - day)) nearest = i;
                    });
                    setActiveIndex(nearest);
                  }}
                >
                  <svg className="absolute inset-0 w-full h-full overflow-visible" viewBox={`0 0 ${PLOT_W} ${PLOT_H}`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="generatedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="publishedFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PUBLISHED_COLOR} stopOpacity="0.10" />
                        <stop offset="100%" stopColor={PUBLISHED_COLOR} stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {Y_TICKS.map((t) => (
                      <line key={t} x1="0" y1={toY(t)} x2={PLOT_W} y2={toY(t)} stroke="#f1f5f9" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    ))}

                    <line
                      x1="0" y1={toY(TARGET)} x2={PLOT_W} y2={toY(TARGET)}
                      stroke="#cbd5e1" strokeWidth="1.2" strokeDasharray="6 6" vectorEffect="non-scaling-stroke"
                    />

                    <path d={generatedArea} fill="url(#generatedFill)" />
                    <path d={publishedArea} fill="url(#publishedFill)" />
                    <path d={generatedPath} fill="none" stroke={GENERATED_COLOR} strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                    <path d={publishedPath} fill="none" stroke={PUBLISHED_COLOR} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

                    <line
                      x1={toX(active.day)} y1="0" x2={toX(active.day)} y2={PLOT_H}
                      stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Markers are HTML so they stay round on the stretched SVG */}
                  {MARKER_INDICES.map((i) => {
                    const d = chartData[i];
                    const left = `${(toX(d.day) / PLOT_W) * 100}%`;
                    return (
                      <div key={d.day}>
                        <span
                          className="absolute w-[9px] h-[9px] rounded-full ring-2 ring-white -translate-x-1/2 -translate-y-1/2"
                          style={{ left, top: toY(d.generated), backgroundColor: GENERATED_COLOR }}
                        />
                        <span
                          className="absolute w-[9px] h-[9px] rounded-full ring-2 ring-white -translate-x-1/2 -translate-y-1/2"
                          style={{ left, top: toY(d.published), backgroundColor: PUBLISHED_COLOR }}
                        />
                      </div>
                    );
                  })}

                  {/* Tooltip */}
                  <div
                    className="absolute pointer-events-none w-[158px] rounded-lg bg-[#1b2537] shadow-[0_10px_30px_rgba(15,23,42,0.25)] px-3 pt-[10px] pb-[9px] z-10"
                    style={{ left: `calc(${activeLeftPct}% - 41px)`, top: 7 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9.5px] font-semibold tracking-[0.06em] text-slate-400">{formatTooltipDate(active.day)}</span>
                      {active.delta && (
                        <span
                          className={`px-1.5 py-[1px] rounded text-[9.5px] font-semibold border ${
                            active.delta.startsWith('-')
                              ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                              : 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30'
                          }`}
                        >
                          {active.delta}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-[7px] h-[7px] rounded-full bg-indigo-400" />
                        <span className="text-inherit">Generated:</span>
                      </span>
                      <span className="font-bold text-white">{active.generated.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <span className="w-[7px] h-[7px] rounded-full bg-emerald-400" />
                        <span className="text-inherit">Published:</span>
                      </span>
                      <span className="font-bold text-white">{active.published.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-[11.5px] mt-[7px]">
                  {X_LABELS.map((label) => (
                    <span
                      key={label}
                      className={label === HIGHLIGHT_LABEL ? 'font-semibold text-indigo-600' : 'text-slate-400'}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-[18px] pt-[16px] border-t border-slate-100 text-[11.5px]">
              <div className="flex flex-wrap items-center gap-5">
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="w-2.5 h-[3px] rounded-full bg-indigo-600" aria-hidden="true" />
                  <span className="text-inherit">Automated Schedules: <span className="font-bold text-slate-900">84%</span></span>
                </span>
                <span className="flex items-center gap-2 text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                  <span className="text-inherit">Publish Success Rate: <span className="font-bold text-slate-900">99.4%</span></span>
                </span>
                <span className="text-slate-400">
                  Avg Daily Yield: <span className="font-bold text-slate-900">852 posts</span>
                </span>
              </div>
              <Link href="/dashboard/analysis" className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                <span className="text-inherit">View Full Analytics</span>
                <Icon icon="lucide:chevron-right" width={14} height={14} />
              </Link>
            </div>
          </div>

          {/* AI Suite & Quick Actions */}
          <div className="mt-7">
            <div className="flex items-center justify-between mb-[18px]">
              <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
                <Icon icon="lucide:zap" width={17} height={17} className="text-indigo-500" />
                AI Suite &amp; Quick Actions
              </h2>
              <span className="text-[11px] text-slate-400">GPT-4o Enterprise Active</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <div key={action.href} className={`${CARD} px-5 pt-5 pb-[18px] hover:shadow-ambient transition-shadow`}>
                  <div className="flex items-start gap-3.5 min-h-[66px]">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${action.iconStyle}`}>
                      <Icon icon={action.icon} width={17} height={17} />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold text-slate-900 mb-1">{action.title}</h3>
                      <p className="text-[11.5px] text-slate-400 leading-[1.45]">{action.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className={`px-[7px] py-[3px] rounded-md text-[10.5px] font-semibold ${action.badgeStyle}`}>{action.badge}</span>
                    <Link href={action.href} className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
                      <span className="text-inherit">{action.cta}</span>
                      <Icon icon="lucide:arrow-right" width={14} height={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="min-w-0 space-y-7">
          {/* Realtime Dispatch */}
          <div className={`${CARD} px-[23px] pt-[22px] pb-[23px]`}>
            <div className="flex items-center justify-between pb-[18px] border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
                <h2 className="text-[14.5px] font-bold text-slate-900">Realtime Dispatch</h2>
              </div>
              <span className="px-2 py-[3px] rounded-md bg-slate-50 border border-slate-100 text-[10px] text-slate-400">Server US-East</span>
            </div>

            <div className="space-y-2.5 mt-[14px] pb-5 border-b border-slate-100">
              <div className="flex items-center justify-between h-[46px] px-3 rounded-lg bg-emerald-50/70 border border-emerald-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-[7px] h-[7px] bg-emerald-500 rounded-full" />
                  <span className="text-[12.5px] font-semibold text-emerald-950">Active Runners</span>
                </div>
                <span className="text-[16px] font-bold text-emerald-700">40</span>
              </div>
              <div className="flex items-center justify-between h-[46px] px-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                <div className="flex items-center gap-2.5">
                  <span className="w-[7px] h-[7px] bg-indigo-600 rounded-full" />
                  <span className="text-[12.5px] font-semibold text-indigo-950">Scheduled Queue</span>
                </div>
                <span className="text-[16px] font-bold text-indigo-600">40</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[13px] mt-[14px]">
              <div className="rounded-lg bg-slate-50/80 border border-slate-100 px-3 pt-[12px] pb-[10px]">
                <div className="text-[24px] leading-[30px] font-bold text-slate-900">0:02</div>
                <div className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600">
                  <Icon icon="lucide:check" width={11} height={11} />
                  <span className="text-inherit">Good!</span>
                </div>
                <div className="text-[10.5px] text-slate-400 mt-1.5">Waiting Time</div>
              </div>
              <div className="rounded-lg bg-slate-50/80 border border-slate-100 px-3 pt-[12px] pb-[10px]">
                <div className="text-[24px] leading-[30px] font-bold text-slate-900">0:45</div>
                <div className="text-[10.5px] font-semibold text-rose-500">! Not Good!</div>
                <div className="text-[10.5px] text-slate-400 mt-1.5">Avg Duration</div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className={`${CARD} px-[23px] pt-[22px] pb-[24px]`}>
            <div className="flex items-center justify-between mb-[14px]">
              <h3 className="text-[14.5px] font-bold text-slate-900 flex items-center gap-2">
                <Icon icon="lucide:clock" width={15} height={15} className="text-indigo-600" />
                Recent Activity
              </h3>
              <Link href="/dashboard/analysis" className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-0.5">
                <span className="text-inherit">View All</span>
                <Icon icon="lucide:chevron-right" width={13} height={13} />
              </Link>
            </div>
            <ul className="space-y-[17px]">
              {recentActivity.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 ${item.color}`}>
                    <Icon icon={item.icon} width={14} height={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-semibold text-slate-900 truncate">{item.title}</p>
                    <p className="text-[10.5px] text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                  <span className="text-[10.5px] text-slate-400 shrink-0">{item.time}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Pipeline */}
          <div className={`${CARD} px-[23px] pt-[22px] pb-[22px]`}>
            <div className="flex items-center justify-between mb-[18px]">
              <h3 className="text-[14.5px] font-bold text-slate-900 flex items-center gap-2">
                <Icon icon="lucide:clipboard-check" width={15} height={15} className="text-indigo-600" />
                Upcoming Pipeline
              </h3>
              <Link href="/dashboard/scheduler" className="text-[11.5px] font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-0.5">
                <span className="text-inherit">View All</span>
                <Icon icon="lucide:chevron-right" width={13} height={13} />
              </Link>
            </div>
            <ul className="space-y-[26px] pl-2.5">
              {upcomingPipeline.map((item) => (
                <li key={item.title} className="flex items-start gap-3">
                  <span className="mt-[3px] w-[15px] h-[15px] rounded-[4px] border border-slate-300 bg-white shrink-0" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-semibold text-slate-900">{item.title}</p>
                    <p className="text-[10.5px] text-slate-400">{item.meta}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
