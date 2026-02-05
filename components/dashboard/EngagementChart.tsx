'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';

interface EngagementData {
  date: string;
  engagement: number;
  reach: number;
  clicks: number;
}

interface EngagementChartProps {
  data: EngagementData[];
  className?: string;
}

export const EngagementChart: React.FC<EngagementChartProps> = ({
  data,
  className = '',
}) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Calculate dimensions
    const width = 800;
    const height = 300;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min and max values
    const maxEngagement = Math.max(...data.map(d => d.engagement));
    const minEngagement = Math.min(...data.map(d => d.engagement));
    const yRange = maxEngagement - minEngagement;
    const yPadding = yRange * 0.1;

    // Scale functions
    const xScale = (index: number) => 
      padding.left + (index / (data.length - 1)) * chartWidth;
    
    const yScale = (value: number) => 
      padding.top + chartHeight - 
      ((value - minEngagement + yPadding) / (yRange + 2 * yPadding)) * chartHeight;

    // Generate path
    const pathData = data
      .map((d, i) => {
        const x = xScale(i);
        const y = yScale(d.engagement);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');

    // Generate area path (for fill)
    const areaPath = 
      pathData + 
      ` L ${xScale(data.length - 1)} ${padding.top + chartHeight}` +
      ` L ${padding.left} ${padding.top + chartHeight} Z`;

    // Generate points for hover
    const points = data.map((d, i) => ({
      x: xScale(i),
      y: yScale(d.engagement),
      value: d.engagement,
      date: d.date,
    }));

    // Generate Y-axis labels
    const yAxisLabels = [
      { value: maxEngagement, y: yScale(maxEngagement) },
      { value: Math.round((maxEngagement + minEngagement) / 2), y: yScale((maxEngagement + minEngagement) / 2) },
      { value: minEngagement, y: yScale(minEngagement) },
    ];

    return {
      width,
      height,
      padding,
      pathData,
      areaPath,
      points,
      yAxisLabels,
      xAxisLabels: data.filter((_, i) => i % Math.ceil(data.length / 6) === 0),
      xScale,
    };
  }, [data]);

  if (!chartData) {
    return (
      <Card className={className}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Engagement Trends
          </h3>
          <p className="text-gray-500">No data available</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Engagement Trends
        </h3>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${chartData.width} ${chartData.height}`}
            className="w-full h-auto"
            style={{ minHeight: '300px' }}
          >
            {/* Grid lines */}
            {chartData.yAxisLabels.map((label, i) => (
              <line
                key={i}
                x1={chartData.padding.left}
                y1={label.y}
                x2={chartData.width - chartData.padding.right}
                y2={label.y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            ))}

            {/* Area fill */}
            <path
              d={chartData.areaPath}
              fill="url(#gradient)"
              opacity="0.2"
            />

            {/* Line */}
            <path
              d={chartData.pathData}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data points */}
            {chartData.points.map((point, i) => (
              <g key={i}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="2"
                />
                <title>{`${point.date}: ${point.value}`}</title>
              </g>
            ))}

            {/* Y-axis labels */}
            {chartData.yAxisLabels.map((label, i) => (
              <text
                key={i}
                x={chartData.padding.left - 10}
                y={label.y}
                textAnchor="end"
                alignmentBaseline="middle"
                className="text-xs fill-gray-600"
              >
                {label.value}
              </text>
            ))}

            {/* X-axis labels */}
            {chartData.xAxisLabels.map((d, i) => {
              const index = data.indexOf(d);
              const x = chartData.xScale(index);
              const date = new Date(d.date);
              const label = `${date.getMonth() + 1}/${date.getDate()}`;
              
              return (
                <text
                  key={i}
                  x={x}
                  y={chartData.height - chartData.padding.bottom + 20}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                >
                  {label}
                </text>
              );
            })}

            {/* Gradient definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>
    </Card>
  );
};
