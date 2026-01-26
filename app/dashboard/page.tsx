'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';

export default function DashboardPage() {
  // Mock quick stats data
  const stats = [
    {
      label: 'Total Posts',
      value: '256k',
      change: '+2.5%',
      isPositive: true,
      icon: 'solar:document-text-bold',
      bgColor: 'bg-orange-50',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Scheduled Posts',
      value: '136k',
      change: '+4.10%',
      isPositive: true,
      icon: 'solar:calendar-bold',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Published Posts',
      value: '120k',
      change: '-5.1%',
      isPositive: false,
      icon: 'solar:check-circle-bold',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Engagement Rate',
      value: '93',
      change: '+25.6%',
      isPositive: true,
      icon: 'solar:chart-2-bold',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
  ];

  // Mock chart data
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
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                <Icon icon={stat.icon} width={28} height={28} className={stat.iconColor} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-4xl font-bold text-gray-900">{stat.value}</h3>
                <span className={`text-base font-bold ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
              <p className="text-base text-gray-600 font-medium">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content Management Card with Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Content Management</h2>
            <div className="flex gap-2">
              <button className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                1D
              </button>
              <button className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                5D
              </button>
              <button className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg">
                1M
              </button>
              <button className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                ALL
              </button>
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-80 relative">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-sm text-gray-500 font-medium">
              <span>{maxValue}</span>
              <span>{Math.round((maxValue + minValue) / 2)}</span>
              <span>{minValue}</span>
            </div>

            {/* Chart area */}
            <div className="ml-12 h-full pb-8 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className="border-t border-gray-200"></div>
                <div className="border-t border-gray-200"></div>
                <div className="border-t border-gray-200"></div>
              </div>

              {/* Line chart */}
              <svg className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0.05" />
                  </linearGradient>
                </defs>
                
                {/* Area under the line */}
                <path
                  d={`
                    M 0,${((maxValue - chartData[0].value) / range) * 100}%
                    ${chartData.map((point, i) => 
                      `L ${(i / (chartData.length - 1)) * 100}%,${((maxValue - point.value) / range) * 100}%`
                    ).join(' ')}
                    L 100%,100%
                    L 0,100%
                    Z
                  `}
                  fill="url(#chartGradient)"
                />
                
                {/* Line */}
                <polyline
                  points={chartData.map((point, i) => 
                    `${(i / (chartData.length - 1)) * 100}%,${((maxValue - point.value) / range) * 100}%`
                  ).join(' ')}
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Data points */}
                {chartData.map((point, i) => (
                  <circle
                    key={i}
                    cx={`${(i / (chartData.length - 1)) * 100}%`}
                    cy={`${((maxValue - point.value) / range) * 100}%`}
                    r="4"
                    fill="white"
                    stroke="rgb(59, 130, 246)"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              {/* X-axis labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between text-sm text-gray-500 font-medium">
                <span>{chartData[0].date}</span>
                <span>{chartData[Math.floor(chartData.length / 2)].date}</span>
                <span>{chartData[chartData.length - 1].date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Realtime Status Card */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Realtime</h2>
          
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-base font-bold text-gray-900">Active</span>
              </div>
              <span className="text-lg font-bold text-gray-900">40</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-base font-bold text-gray-900">Queue</span>
              </div>
              <span className="text-lg font-bold text-gray-900">40</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">0:02</div>
              <div className="text-sm text-green-600 font-bold mb-1">-Good!</div>
              <div className="text-sm text-gray-600 font-medium">Waiting Time</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">0:45</div>
              <div className="text-sm text-red-600 font-bold mb-1">-Not Good!</div>
              <div className="text-sm text-gray-600 font-medium">Avg Duration</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/strategist" className="group">
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <Icon icon="solar:lightbulb-bolt-bold" width={28} height={28} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">AI Strategist</h3>
                <p className="text-base text-gray-600 font-medium">
                  Generate content strategies
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/copywriter" className="group">
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-green-200 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-green-50 group-hover:bg-green-100 transition-colors">
                <Icon icon="solar:pen-bold" width={28} height={28} className="text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">AI Copywriter</h3>
                <p className="text-base text-gray-600 font-medium">
                  Edit AI-generated captions
                </p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/dashboard/analysis" className="group">
          <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-purple-100 transition-colors">
                <Icon icon="solar:chart-bold" width={28} height={28} className="text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Analytics</h3>
                <p className="text-base text-gray-600 font-medium">
                  Track performance metrics
                </p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
