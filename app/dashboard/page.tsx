'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function DashboardPage() {
  const stats = [
    {
      label: 'Total Posts',
      value: '256k',
      change: '+2.5%',
      isPositive: true,
      icon: 'solar:document-text-bold',
      bgColor: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Scheduled Posts',
      value: '136k',
      change: '+4.10%',
      isPositive: true,
      icon: 'solar:calendar-bold',
      bgColor: 'bg-secondary/10',
      iconColor: 'text-secondary',
    },
    {
      label: 'Published Posts',
      value: '120k',
      change: '-5.1%',
      isPositive: false,
      icon: 'solar:check-circle-bold',
      bgColor: 'bg-primary-container/15',
      iconColor: 'text-primary-container',
    },
    {
      label: 'Engagement Rate',
      value: '93',
      change: '+25.6%',
      isPositive: true,
      icon: 'solar:chart-2-bold',
      bgColor: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
  ];

  const chartData = [
    { date: 'Sep 15', value: 1000 },
    { date: 'Sep 18', value: 1020 },
    { date: 'Sep 21', value: 1040 },
    { date: 'Sep 24', value: 1055 },
    { date: 'Sep 27', value: 1050 },
    { date: 'Sep 28', value: 1065 },
    { date: 'Oct 1', value: 1060 },
    { date: 'Oct 4', value: 1058 },
    { date: 'Oct 7', value: 1062 },
    { date: 'Oct 10', value: 1055 },
    { date: 'Oct 13', value: 1050 },
    { date: 'Oct 15', value: 1048 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));
  const minValue = Math.min(...chartData.map(d => d.value));
  const range = maxValue - minValue;

  return (
    <div className="w-full">
      {/* Stats Grid - surface-container-lowest cards, no borders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-surface-container-lowest rounded-xl p-6 hover:shadow-ambient transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <Icon icon={stat.icon} width={28} height={28} className={stat.iconColor} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-4xl font-bold font-heading text-on-surface">{stat.value}</h3>
                <span className={`text-base font-bold ${stat.isPositive ? 'text-emerald-600' : 'text-error'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-label-md text-outline font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Management Card with Chart */}
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-sm font-heading text-on-surface">Content Management</h2>
            <div className="flex gap-2">
              {['1D', '5D', '1M', 'ALL'].map((label) => (
                <button
                  key={label}
                  className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                    label === '1M'
                      ? 'text-on-primary gradient-primary'
                      : 'text-outline hover:text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-80 relative">
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-sm text-outline font-medium">
              <span>{maxValue}</span>
              <span>{Math.round((maxValue + minValue) / 2)}</span>
              <span>{minValue}</span>
            </div>

            <div className="ml-12 h-full pb-8 relative">
              {/* Ghost grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ borderTop: '1px solid var(--ghost-border)' }}></div>
                ))}
              </div>

              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                
                <path
                  d={`
                    M 0,${((maxValue - chartData[0].value) / range) * 100}
                    ${chartData.map((point, i) => 
                      `L ${(i / (chartData.length - 1)) * 100},${((maxValue - point.value) / range) * 100}`
                    ).join(' ')}
                    L 100,100 L 0,100 Z
                  `}
                  fill="url(#chartGradient)"
                />
                
                <polyline
                  points={chartData.map((point, i) => 
                    `${(i / (chartData.length - 1)) * 100},${((maxValue - point.value) / range) * 100}`
                  ).join(' ')}
                  fill="none"
                  stroke="var(--primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
                
                {chartData.map((point, i) => (
                  <circle
                    key={i}
                    cx={(i / (chartData.length - 1)) * 100}
                    cy={((maxValue - point.value) / range) * 100}
                    r="4"
                    fill="white"
                    stroke="var(--primary)"
                    strokeWidth="2"
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
              </svg>

              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-outline font-medium">
                <span>{chartData[0].date}</span>
                <span>{chartData[Math.floor(chartData.length / 2)].date}</span>
                <span>{chartData[chartData.length - 1].date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Status Card */}
        <div className="bg-surface-container-lowest rounded-xl p-6">
          <h2 className="text-headline-sm font-heading text-on-surface mb-6">Realtime</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-emerald-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span className="text-base font-bold text-on-surface">Active</span>
              </div>
              <span className="text-lg font-bold text-on-surface">40</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-base font-bold text-on-surface">Queue</span>
              </div>
              <span className="text-lg font-bold text-on-surface">40</span>
            </div>
          </div>

          {/* No divider - use spacing */}
          <div className="grid grid-cols-2 gap-4 pt-4">
            <div>
              <div className="text-3xl font-bold font-heading text-on-surface mb-2">0:02</div>
              <div className="text-sm text-emerald-600 font-bold mb-1">-Good!</div>
              <div className="text-label-sm text-outline font-medium">Waiting Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold font-heading text-on-surface mb-2">0:45</div>
              <div className="text-sm text-tertiary font-bold mb-1">-Not Good!</div>
              <div className="text-label-sm text-outline font-medium">Avg Duration</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { href: '/dashboard/strategist', icon: 'solar:lightbulb-bolt-bold', title: 'AI Strategist', desc: 'Generate content strategies', color: 'primary' },
          { href: '/dashboard/copywriter', icon: 'solar:pen-bold', title: 'AI Copywriter', desc: 'Edit AI-generated captions', color: 'secondary' },
          { href: '/dashboard/analysis', icon: 'solar:chart-bold', title: 'Analytics', desc: 'Track performance metrics', color: 'primary-container' },
        ].map((action) => (
          <Link key={action.href} href={action.href} className="group">
            <div className="bg-surface-container-lowest rounded-xl p-6 hover:shadow-ambient transition-all">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-${action.color}/10 group-hover:bg-${action.color}/15 transition-colors`}>
                  <Icon icon={action.icon} width={28} height={28} className={`text-${action.color}`} />
                </div>
                <div>
                  <h3 className="text-headline-sm font-heading text-on-surface mb-1">{action.title}</h3>
                  <p className="text-label-md text-outline font-medium">{action.desc}</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
