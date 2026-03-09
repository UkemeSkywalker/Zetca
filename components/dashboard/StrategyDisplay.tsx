'use client';

import React from 'react';
import { Icon } from '@iconify/react';
import { Card } from '@/components/ui/Card';
import { StrategyOutput } from '@/types/strategy';

interface StrategyDisplayProps {
  strategy: StrategyOutput;
}

const PriorityBadge: React.FC<{ priority: 'high' | 'medium' | 'low' }> = ({ priority }) => {
  const colorMap = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const labelMap = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colorMap[priority]}`}>
      {labelMap[priority]}
    </span>
  );
};

export const StrategyDisplay: React.FC<StrategyDisplayProps> = ({ strategy }) => {
  return (
    <div className="space-y-6">
      {/* Content Pillars Section */}
      <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <Icon icon="solar:layers-bold" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Content Pillars</h3>
            <p className="text-sm text-gray-600">Core themes for your content strategy</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {strategy.contentPillars.map((pillar, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105"
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                </div>
                <span className="text-gray-700 font-medium">{pillar}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Posting Schedule Section */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Icon icon="solar:calendar-mark-bold" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Posting Schedule</h3>
            <p className="text-sm text-gray-600">Recommended posting frequency</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <p className="text-gray-700 text-lg font-medium">{strategy.postingSchedule}</p>
        </div>
      </div>

      {/* Platform Recommendations Section */}
      <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-2xl p-6 border border-pink-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
            <Icon icon="solar:devices-bold" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Platform Recommendations</h3>
            <p className="text-sm text-gray-600">Best platforms for your brand</p>
          </div>
        </div>
        <div className="space-y-3">
          {strategy.platformRecommendations.map((platform, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                    <Icon icon="solar:star-bold" className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900">{platform.platform}</h4>
                </div>
                <PriorityBadge priority={platform.priority} />
              </div>
              <p className="text-gray-600 ml-13">{platform.rationale}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Content Themes Section */}
      <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
            <Icon icon="solar:palette-bold" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Content Themes</h3>
            <p className="text-sm text-gray-600">Topics and themes to explore</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {strategy.contentThemes.map((theme, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105"
            >
              <div className="flex items-center gap-3">
                <Icon icon="solar:hashtag-bold" className="w-5 h-5 text-orange-600" />
                <span className="text-gray-700 font-medium">{theme}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Tactics Section */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
            <Icon icon="solar:users-group-rounded-bold" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Engagement Tactics</h3>
            <p className="text-sm text-gray-600">Strategies to boost audience interaction</p>
          </div>
        </div>
        <ul className="space-y-3">
          {strategy.engagementTactics.map((tactic, index) => (
            <li
              key={index}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Icon icon="solar:check-circle-bold" className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700">{tactic}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Visual Prompts Section */}
      <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
            <Icon icon="solar:camera-bold" className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Visual Prompts</h3>
            <p className="text-sm text-gray-600">Image ideas for content creation</p>
          </div>
        </div>
        <div className="space-y-3">
          {strategy.visualPrompts.map((prompt, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-5 shadow-sm border border-teal-100 hover:shadow-md transition-all hover:border-teal-300"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                  <Icon icon="solar:gallery-bold" className="w-5 h-5 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-700 font-medium mb-1">{prompt}</p>
                  <div className="flex items-center gap-2 text-xs text-teal-600">
                    <Icon icon="solar:magic-stick-bold" className="w-4 h-4" />
                    <span>Ready for image generation</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
