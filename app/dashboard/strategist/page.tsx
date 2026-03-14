'use client';

import { useState } from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { StrategyForm } from '@/components/dashboard/StrategyForm';
import { StrategyList } from '@/components/dashboard/StrategyList';
import { StrategyDisplay } from '@/components/dashboard/StrategyDisplay';
import { StrategyRecord, StrategyOutput } from '@/types/strategy';
import { Icon } from '@iconify/react';

type TabType = 'generate' | 'saved';

export default function StrategistPage() {
  const [activeTab, setActiveTab] = useState<TabType>('generate');
  const [generatedStrategy, setGeneratedStrategy] = useState<StrategyOutput | null>(null);
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyRecord | null>(null);

  const handleStrategyGenerated = (strategy: StrategyOutput) => {
    setGeneratedStrategy(strategy);
  };

  const handleStrategyClick = (strategy: StrategyRecord) => {
    setSelectedStrategy(strategy);
  };

  const handleBackToList = () => {
    setSelectedStrategy(null);
  };

  const handleBackToForm = () => {
    setGeneratedStrategy(null);
  };

  return (
    <PageWrapper
      title="AI Strategy Generator"
      description="Generate a comprehensive social media strategy tailored to your brand"
      showWorkflow={true}
    >
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('generate');
              setSelectedStrategy(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'generate'
                ? 'border-[#3139FB] text-[#3139FB]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon icon="solar:magic-stick-3-bold" width={20} />
            Generate New
          </button>
          <button
            onClick={() => {
              setActiveTab('saved');
              setGeneratedStrategy(null);
            }}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === 'saved'
                ? 'border-[#3139FB] text-[#3139FB]'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon icon="solar:document-text-bold" width={20} />
            Saved Strategies
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'generate' && (
        <div>
          {!generatedStrategy ? (
            <StrategyForm onStrategyGenerated={handleStrategyGenerated} />
          ) : (
            <div>
              <button
                onClick={handleBackToForm}
                className="flex items-center gap-2 text-[#3139FB] hover:text-[#2129CB] mb-4 font-medium"
              >
                <Icon icon="solar:alt-arrow-left-bold" width={20} />
                Generate Another Strategy
              </button>
              <StrategyDisplay strategy={generatedStrategy} />
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div>
          {!selectedStrategy ? (
            <StrategyList onStrategyClick={handleStrategyClick} />
          ) : (
            <div>
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 text-[#3139FB] hover:text-[#2129CB] mb-4 font-medium"
              >
                <Icon icon="solar:alt-arrow-left-bold" width={20} />
                Back to Saved Strategies
              </button>
              <div className="mb-5 bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { label: 'Brand', value: selectedStrategy.brandName },
                    { label: 'Industry', value: selectedStrategy.industry },
                    { label: 'Audience', value: selectedStrategy.targetAudience },
                    { label: 'Goals', value: selectedStrategy.goals },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-xs text-gray-400 uppercase tracking-wide">{item.label}</span>
                      <span className="text-sm text-gray-900 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <StrategyDisplay strategy={selectedStrategy.strategyOutput} />
            </div>
          )}
        </div>
      )}
    </PageWrapper>
  );
}
