'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useAgentContext } from '@/context/AgentContext';
import { Strategy } from '@/types/agent';
import { generateStrategy, StrategyAPIError } from '@/lib/api/strategyClient';
import { StrategyOutput } from '@/types/strategy';
import { StrategyDisplay } from '@/components/dashboard/StrategyDisplay';

interface StrategyFormData {
  brandName: string;
  industry: string;
  targetAudience: string;
  goals: string;
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
    <div className="bg-surface-container-lowest rounded-xl overflow-hidden transition-all hover:shadow-ambient">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-surface-container-low transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Icon icon={icon} className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-headline-sm font-heading text-on-surface">{title}</h3>
            {!isExpanded && (
              <p className="text-label-md text-outline mt-0.5">{description}</p>
            )}
          </div>
        </div>
        <Icon
          icon={isExpanded ? 'solar:alt-arrow-up-bold' : 'solar:alt-arrow-down-bold'}
          className="w-5 h-5 text-outline flex-shrink-0"
        />
      </button>
      
      {isExpanded && (
        <div className="px-6 pb-6 pt-2" style={{ borderTop: '1px solid var(--ghost-border)' }}>
          {children}
        </div>
      )}
    </div>
  );
};

interface StrategyFormProps {
  onStrategyGenerated?: (strategy: StrategyOutput) => void;
}

export const StrategyForm: React.FC<StrategyFormProps> = ({ onStrategyGenerated }) => {
  const { setStrategy, updateWorkflowStatus } = useAgentContext();
  const [formData, setFormData] = useState<StrategyFormData>({
    brandName: '',
    industry: '',
    targetAudience: '',
    goals: '',
  });
  const [errors, setErrors] = useState<Partial<StrategyFormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generatedStrategy, setGeneratedStrategy] = useState<StrategyOutput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
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
    // Clear error message when user starts typing
    if (errorMessage) {
      setErrorMessage('');
    }
  };

  const handleGenerateStrategy = async () => {
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Call the real API
      const strategyOutput = await generateStrategy({
        brandName: formData.brandName,
        industry: formData.industry,
        targetAudience: formData.targetAudience,
        goals: formData.goals,
      });

      // Create strategy object for context (maintaining compatibility with existing Strategy type)
      const strategy: Strategy = {
        id: `strategy-${Date.now()}`,
        brandName: formData.brandName,
        industry: formData.industry,
        targetAudience: formData.targetAudience,
        goals: formData.goals,
        contentPillars: strategyOutput.contentPillars,
        postingFrequency: strategyOutput.postingSchedule,
        keyThemes: strategyOutput.contentThemes,
        tone: strategyOutput.engagementTactics.join(', '),
        createdAt: new Date(),
      };

      // Save to context
      setStrategy(strategy);

      // Update workflow status
      updateWorkflowStatus('strategist', 'complete');

      // Display generated strategy
      setGeneratedStrategy(strategyOutput);
      
      // Call the callback if provided
      if (onStrategyGenerated) {
        onStrategyGenerated(strategyOutput);
      }
      
      // Expand the first section to show results
      setExpandedSection('pillars');
    } catch (error) {
      console.error('Strategy generation failed:', error);
      
      // Handle API errors with user-friendly messages
      if (error instanceof StrategyAPIError) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2">
          <span className="text-sm font-medium text-primary uppercase tracking-wide">
            Brand Strategy Generator
          </span>
        </div>
        <h2 className="text-3xl font-bold font-heading text-on-surface mb-3">
          AI-Powered Strategy
        </h2>
        <p className="text-outline">
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
            <label className="block text-label-md font-medium text-on-surface mb-1">
              Goals
            </label>
            <textarea
              className={`w-full px-4 py-2 rounded-lg transition-all ${
                errors.goals ? 'bg-on-error' : 'bg-surface-container-low'
              }`}
              style={{ border: errors.goals ? '2px solid var(--error)' : 'none' }}
              onFocus={(e) => { if (!errors.goals) e.currentTarget.style.boxShadow = '0 0 0 2px rgba(74, 64, 224, 0.4)'; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              placeholder="What are your social media goals?"
              rows={4}
              value={formData.goals}
              onChange={(e) => handleInputChange('goals', e.target.value)}
            />
            {errors.goals && (
              <p className="text-sm text-error mt-1">{errors.goals}</p>
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

          {errorMessage && (
            <div className="mt-4 p-4 bg-on-error rounded-lg">
              <div className="flex items-start gap-3">
                <Icon icon="solar:danger-circle-bold" className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-error mb-1">Error</h4>
                  <p className="text-sm text-error/80">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </AccordionItem>

      {/* Display Generated Strategy */}
      {generatedStrategy && (
        <div className="mt-6">
          <StrategyDisplay strategy={generatedStrategy} />
        </div>
      )}
    </div>
  );
};
