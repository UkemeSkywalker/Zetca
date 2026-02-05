'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAgentContext } from '@/context/AgentContext';
import { Strategy } from '@/types/agent';
import mockStrategiesData from '@/data/mockStrategies.json';

interface StrategyFormData {
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
}

interface GeneratedStrategy {
  contentPillars: string[];
  postingFrequency: string;
  keyThemes: string[];
  tone: string;
}

interface AccordionItemProps {
  icon: string;
  title: string;
  description: string;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const AccordionItem: React.FC<AccordionItemProps> = ({
  icon,
  title,
  description,
  isExpanded,
  onToggle,
  children,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Icon icon={icon} className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {!isExpanded && (
              <p className="text-sm text-gray-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <Icon
          icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
          className="w-5 h-5 text-gray-400 flex-shrink-0"
        />
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
};

export const StrategyForm: React.FC = () => {
  const { setStrategy, updateWorkflowStatus } = useAgentContext();
  const [formData, setFormData] = useState<StrategyFormData>({
    brandName: '',
    industry: '',
    targetAudience: '',
    goals: '',
  });
  const [errors, setErrors] = useState<Partial<StrategyFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<GeneratedStrategy | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('form');

  const validateForm = (): boolean => {
    const newErrors: Partial<StrategyFormData> = {};

    if (!formData.brandName.trim()) {
      newErrors.brandName = 'Brand name is required';
    }
    if (!formData.industry.trim()) {
      newErrors.industry = 'Industry is required';
    }
    if (!formData.targetAudience.trim()) {
      newErrors.targetAudience = 'Target audience is required';
    }
    if (!formData.goals.trim()) {
      newErrors.goals = 'Goals are required';
    } else if (formData.goals.trim().length < 10) {
      newErrors.goals = 'Goals must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof StrategyFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleGenerateStrategy = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Fetch mock strategy (randomly select one)
      const mockStrategies = mockStrategiesData.strategies;
      const randomStrategy = mockStrategies[Math.floor(Math.random() * mockStrategies.length)];

      const strategy: Strategy = {
        id: randomStrategy.id,
        brandName: formData.brandName,
        industry: formData.industry,
        targetAudience: formData.targetAudience,
        goals: formData.goals,
        contentPillars: randomStrategy.contentPillars,
        postingFrequency: randomStrategy.postingFrequency,
        keyThemes: randomStrategy.keyThemes,
        tone: randomStrategy.tone,
        createdAt: new Date(),
      };

      // Save to context
      setStrategy(strategy);

      // Update workflow status
      updateWorkflowStatus('strategist', 'complete');

      // Display generated strategy
      setGeneratedStrategy({
        contentPillars: strategy.contentPillars,
        postingFrequency: strategy.postingFrequency,
        keyThemes: strategy.keyThemes,
        tone: strategy.tone,
      });
    } catch (error) {
      console.error('Strategy generation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Side - Form and Sections */}
      <div className="space-y-6">
        <div>
          <div className="mb-2">
            <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">
              Brand Strategy Generator
            </span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            AI-Powered Strategy
          </h2>
          <p className="text-gray-600">
            Generate a comprehensive social media strategy tailored to your brand with real-time insights and data-driven recommendations.
          </p>
        </div>

        {/* Brand Information Form */}
        <AccordionItem
          icon="solar:document-text-bold"
          title="Brand Information"
          description="Enter your brand details to get started"
          isExpanded={expandedSection === 'form'}
          onToggle={() => setExpandedSection(expandedSection === 'form' ? '' : 'form')}
        >
          <div className="space-y-4 mt-4">
            <Input
              label="Brand Name"
              placeholder="Enter your brand name"
              value={formData.brandName}
              onChange={(e) => handleInputChange('brandName', e.target.value)}
              error={errors.brandName}
            />

            <Input
              label="Industry"
              placeholder="e.g., Technology, Fashion, Food & Beverage"
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              error={errors.industry}
            />

            <Input
              label="Target Audience"
              placeholder="Describe your target audience"
              value={formData.targetAudience}
              onChange={(e) => handleInputChange('targetAudience', e.target.value)}
              error={errors.targetAudience}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Goals
              </label>
              <textarea
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.goals ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="What are your social media goals?"
                rows={4}
                value={formData.goals}
                onChange={(e) => handleInputChange('goals', e.target.value)}
              />
              {errors.goals && (
                <p className="text-sm text-red-600 mt-1">{errors.goals}</p>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerateStrategy}
              isLoading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Generating Strategy...' : 'Generate Strategy'}
            </Button>
          </div>
        </AccordionItem>

        {/* Content Pillars Section */}
        {generatedStrategy && (
          <AccordionItem
            icon="solar:layers-bold"
            title="Content Pillars"
            description="Core themes for your content strategy"
            isExpanded={expandedSection === 'pillars'}
            onToggle={() => setExpandedSection(expandedSection === 'pillars' ? '' : 'pillars')}
          >
            <ul className="space-y-3 mt-4">
              {generatedStrategy.contentPillars.map((pillar, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-bold">{index + 1}</span>
                  </div>
                  <span className="text-gray-700">{pillar}</span>
                </li>
              ))}
            </ul>
          </AccordionItem>
        )}

        {/* Posting Strategy Section */}
        {generatedStrategy && (
          <AccordionItem
            icon="solar:calendar-mark-bold"
            title="Posting Strategy"
            description="Recommended posting frequency and timing"
            isExpanded={expandedSection === 'posting'}
            onToggle={() => setExpandedSection(expandedSection === 'posting' ? '' : 'posting')}
          >
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg">
              <p className="text-gray-700 font-medium">{generatedStrategy.postingFrequency}</p>
            </div>
          </AccordionItem>
        )}

        {/* Tone & Voice Section */}
        {generatedStrategy && (
          <AccordionItem
            icon="solar:chat-round-bold"
            title="Tone & Voice"
            description="Your brand's communication style"
            isExpanded={expandedSection === 'tone'}
            onToggle={() => setExpandedSection(expandedSection === 'tone' ? '' : 'tone')}
          >
            <div className="mt-4 p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
              <p className="text-gray-700">{generatedStrategy.tone}</p>
            </div>
          </AccordionItem>
        )}
      </div>

      {/* Right Side - Key Themes Cards */}
      <div>
        {generatedStrategy ? (
          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Key Themes</h3>
              <div className="space-y-3">
                {generatedStrategy.keyThemes.map((theme, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                          <Icon icon="solar:star-bold" className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-lg font-semibold text-gray-900">{theme}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-green-600 text-sm font-medium">+{Math.floor(Math.random() * 20 + 10)}%</span>
                        <Icon icon="solar:arrow-up-bold" className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="solar:chart-2-bold" className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">Engagement</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">High</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-green-600 text-xs font-medium">+24.5%</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="solar:users-group-rounded-bold" className="w-5 h-5 text-orange-600" />
                  <span className="text-sm text-gray-600">Reach</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">Growing</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-orange-600 text-xs font-medium">+18.2%</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="solar:target-bold" className="w-5 h-5 text-purple-600" />
                  <span className="text-sm text-gray-600">Relevance</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">Optimal</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-purple-600 text-xs font-medium">+31.0%</span>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon="solar:graph-up-bold" className="w-5 h-5 text-blue-600" />
                  <span className="text-sm text-gray-600">Growth</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">Strong</div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-blue-600 text-xs font-medium">+27.8%</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center lg:sticky lg:top-6">
            <div className="text-center p-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
              <Icon icon="solar:document-add-bold" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg font-medium">
                Generate your strategy to see insights
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Fill out the form and click generate
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
