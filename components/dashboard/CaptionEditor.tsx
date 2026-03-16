'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CopyRecord } from '@/types/agent';
import { StrategyRecord } from '@/types/strategy';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@iconify/react';
import { listStrategies } from '@/lib/api/strategyClient';
import { generateCopies, listCopies, chatRefineCopy, deleteCopy } from '@/lib/api/copyClient';

interface CaptionEditorProps {
  className?: string;
}

type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

const platformConfig: Record<string, {
  name: string;
  color: string;
  tabColor: string;
  tabColorActive: string;
  icon: string;
}> = {
  instagram: {
    name: 'Instagram',
    color: 'bg-pink-100 text-pink-800',
    tabColor: 'border-pink-500 text-pink-600',
    tabColorActive: 'border-pink-500 text-pink-600 bg-pink-50',
    icon: 'solar:camera-bold',
  },
  twitter: {
    name: 'Twitter',
    color: 'bg-blue-100 text-blue-800',
    tabColor: 'border-blue-500 text-blue-600',
    tabColorActive: 'border-blue-500 text-blue-600 bg-blue-50',
    icon: 'solar:chat-round-bold',
  },
  linkedin: {
    name: 'LinkedIn',
    color: 'bg-indigo-100 text-indigo-800',
    tabColor: 'border-indigo-500 text-indigo-600',
    tabColorActive: 'border-indigo-500 text-indigo-600 bg-indigo-50',
    icon: 'solar:user-bold',
  },
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-100 text-blue-800',
    tabColor: 'border-blue-500 text-blue-600',
    tabColorActive: 'border-blue-500 text-blue-600 bg-blue-50',
    icon: 'solar:users-group-rounded-bold',
  },
};

export const CaptionEditor: React.FC<CaptionEditorProps> = ({ className = '' }) => {
  // State for strategies
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [loadingStrategies, setLoadingStrategies] = useState(true);

  // State for copies
  const [copies, setCopies] = useState<CopyRecord[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [generatingCopies, setGeneratingCopies] = useState(false);

  // State for chat refinement
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [chattingCopyId, setChattingCopyId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<Record<string, string>>({});

  // State for deletion
  const [deletingCopyId, setDeletingCopyId] = useState<string | null>(null);

  // UI state
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('instagram');
  const [error, setError] = useState<string | null>(null);

  // Fetch strategies on mount
  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        setLoadingStrategies(true);
        const data = await listStrategies();
        setStrategies(data);
      } catch (err) {
        console.error('Failed to fetch strategies:', err);
        setError('Failed to load strategies. Please try again.');
      } finally {
        setLoadingStrategies(false);
      }
    };
    fetchStrategies();
  }, []);

  // Load copies when strategy is selected
  const loadCopiesForStrategy = useCallback(async (strategyId: string) => {
    if (!strategyId) {
      setCopies([]);
      return;
    }
    try {
      setLoadingCopies(true);
      setError(null);
      const data = await listCopies(strategyId);
      setCopies(data);
    } catch (err) {
      console.error('Failed to load copies:', err);
      setError('Failed to load copies. Please try again.');
      setCopies([]);
    } finally {
      setLoadingCopies(false);
    }
  }, []);

  // Handle strategy selection change
  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const strategyId = e.target.value;
    setSelectedStrategyId(strategyId);
    setAiMessages({});
    setChatInputs({});
    if (strategyId) {
      loadCopiesForStrategy(strategyId);
    } else {
      setCopies([]);
    }
  };

  // Generate copies from selected strategy
  const handleGenerateCopies = async () => {
    if (!selectedStrategyId) return;
    try {
      setGeneratingCopies(true);
      setError(null);
      const newCopies = await generateCopies(selectedStrategyId);
      setCopies(newCopies);
      setAiMessages({});
    } catch (err: any) {
      console.error('Failed to generate copies:', err);
      setError(err.message || 'Failed to generate copies. Please try again.');
    } finally {
      setGeneratingCopies(false);
    }
  };

  // Handle chat refinement
  const handleChatSubmit = async (copyId: string) => {
    const message = chatInputs[copyId]?.trim();
    if (!message) return;

    try {
      setChattingCopyId(copyId);
      setError(null);
      const response = await chatRefineCopy(copyId, message);
      
      // Update the copy in local state with the refined text and hashtags
      setCopies(prev => prev.map(copy => 
        copy.id === copyId 
          ? { ...copy, text: response.updatedText, hashtags: response.updatedHashtags }
          : copy
      ));
      
      // Store AI message and clear input
      setAiMessages(prev => ({ ...prev, [copyId]: response.aiMessage }));
      setChatInputs(prev => ({ ...prev, [copyId]: '' }));
    } catch (err: any) {
      console.error('Failed to refine copy:', err);
      setError(err.message || 'Failed to refine copy. Please try again.');
    } finally {
      setChattingCopyId(null);
    }
  };

  // Handle copy deletion
  const handleDeleteCopy = async (copyId: string) => {
    try {
      setDeletingCopyId(copyId);
      setError(null);
      await deleteCopy(copyId);
      setCopies(prev => prev.filter(copy => copy.id !== copyId));
      // Clean up related state
      setAiMessages(prev => {
        const { [copyId]: _, ...rest } = prev;
        return rest;
      });
      setChatInputs(prev => {
        const { [copyId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err: any) {
      console.error('Failed to delete copy:', err);
      setError(err.message || 'Failed to delete copy. Please try again.');
    } finally {
      setDeletingCopyId(null);
    }
  };

  // Copy to clipboard
  const handleCopyToClipboard = async (text: string, copyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(copyId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Group copies by platform
  const copiesByPlatform = copies.reduce((acc, copy) => {
    const platform = copy.platform.toLowerCase();
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(copy);
    return acc;
  }, {} as Record<string, CopyRecord[]>);

  const availablePlatforms = Object.keys(copiesByPlatform);

  // Adjust active tab if current tab has no copies
  useEffect(() => {
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(activeTab)) {
      setActiveTab(availablePlatforms[0]);
    }
  }, [availablePlatforms, activeTab]);

  const getPlatformConfig = (platform: string) => {
    return platformConfig[platform.toLowerCase()] || {
      name: platform,
      color: 'bg-gray-100 text-gray-800',
      tabColor: 'border-gray-500 text-gray-600',
      tabColorActive: 'border-gray-500 text-gray-600 bg-gray-50',
      icon: 'solar:hashtag-bold',
    };
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Strategy Selection */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex-1 w-full">
            <label htmlFor="strategy-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Strategy
            </label>
            {loadingStrategies ? (
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
            ) : (
              <select
                id="strategy-select"
                value={selectedStrategyId}
                onChange={handleStrategyChange}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                aria-label="Select a strategy to generate copies from"
              >
                <option value="">Choose a strategy...</option>
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.brandName} — {s.industry}
                  </option>
                ))}
              </select>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleGenerateCopies}
            disabled={!selectedStrategyId || generatingCopies}
            className="flex items-center gap-2 whitespace-nowrap"
            aria-label="Generate copies from selected strategy"
          >
            {generatingCopies ? (
              <>
                <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" aria-hidden="true" />
                Generating...
              </>
            ) : (
              <>
                <Icon icon="solar:magic-stick-3-bold" className="w-4 h-4" aria-hidden="true" />
                Generate Copies
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
          <Icon icon="solar:danger-triangle-bold" className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600" aria-label="Dismiss error">
            <Icon icon="solar:close-circle-bold" className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {(loadingCopies || generatingCopies) && (
        <Card className="text-center py-12">
          <Icon icon="solar:refresh-bold" className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-spin" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {generatingCopies ? 'Generating Copies...' : 'Loading Copies...'}
          </h3>
          <p className="text-gray-600">
            {generatingCopies
              ? 'The AI is crafting platform-specific copies from your strategy.'
              : 'Fetching your existing copies.'}
          </p>
        </Card>
      )}

      {/* Platform Tabs */}
      {!loadingCopies && !generatingCopies && availablePlatforms.length > 0 && (
        <>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" role="tablist" aria-label="Platform tabs">
              {availablePlatforms.map((platform) => {
                const config = getPlatformConfig(platform);
                const isActive = activeTab === platform;
                const copyCount = copiesByPlatform[platform]?.length || 0;

                return (
                  <button
                    key={platform}
                    onClick={() => setActiveTab(platform)}
                    className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                      isActive
                        ? `${config.tabColorActive} border-current`
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                    role="tab"
                    aria-selected={isActive}
                    aria-controls={`${platform}-panel`}
                    id={`${platform}-tab`}
                  >
                    <Icon icon={config.icon} className="w-4 h-4" aria-hidden="true" />
                    {config.name}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      isActive ? 'bg-white text-gray-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {copyCount}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Active Tab Content */}
          <div
            className="space-y-4"
            role="tabpanel"
            id={`${activeTab}-panel`}
            aria-labelledby={`${activeTab}-tab`}
          >
            {copiesByPlatform[activeTab]?.map((copy, index) => {
              const config = getPlatformConfig(copy.platform);
              const isDeleting = deletingCopyId === copy.id;
              const isChatting = chattingCopyId === copy.id;

              return (
                <Card key={copy.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500">Copy {index + 1}</span>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${config.color}`}>
                        <Icon icon={config.icon} className="w-4 h-4" />
                        {config.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToClipboard(copy.text, copy.id)}
                        className="flex items-center gap-2"
                        aria-label={`Copy caption ${index + 1} to clipboard`}
                      >
                        <Icon
                          icon={copySuccess === copy.id ? 'solar:check-circle-bold' : 'solar:copy-bold'}
                          className="w-4 h-4"
                          aria-hidden="true"
                        />
                        {copySuccess === copy.id ? 'Copied!' : 'Copy'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCopy(copy.id)}
                        disabled={isDeleting}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:border-red-300"
                        aria-label={`Delete caption ${index + 1}`}
                      >
                        {isDeleting ? (
                          <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Icon icon="solar:trash-bin-trash-bold" className="w-4 h-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Copy Text Display */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-800 whitespace-pre-wrap">{copy.text}</p>
                  </div>

                  {/* Hashtags */}
                  {copy.hashtags && copy.hashtags.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Hashtags</h4>
                      <div className="flex flex-wrap gap-2">
                        {copy.hashtags.map((hashtag, hashtagIndex) => (
                          <span
                            key={hashtagIndex}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md font-medium"
                          >
                            {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Message */}
                  {aiMessages[copy.id] && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Icon icon="solar:magic-stick-3-bold" className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                        <p className="text-sm text-blue-700">{aiMessages[copy.id]}</p>
                      </div>
                    </div>
                  )}

                  {/* Chat Refinement Input */}
                  <div className="flex items-start gap-2">
                    <label htmlFor={`chat-${copy.id}`} className="sr-only">
                      Refine this copy with AI
                    </label>
                    <input
                      id={`chat-${copy.id}`}
                      type="text"
                      value={chatInputs[copy.id] || ''}
                      onChange={(e) => setChatInputs(prev => ({ ...prev, [copy.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChatSubmit(copy.id);
                        }
                      }}
                      placeholder="Ask AI to refine this copy..."
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isChatting}
                      aria-label={`Chat to refine copy ${index + 1}`}
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleChatSubmit(copy.id)}
                      disabled={isChatting || !chatInputs[copy.id]?.trim()}
                      className="flex items-center gap-1"
                      aria-label={`Send refinement message for copy ${index + 1}`}
                    >
                      {isChatting ? (
                        <Icon icon="solar:refresh-bold" className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Icon icon="solar:plain-bold" className="w-4 h-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Empty State - no strategy selected */}
      {!selectedStrategyId && !loadingStrategies && (
        <Card className="text-center py-12">
          <Icon icon="solar:document-text-bold" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Strategy</h3>
          <p className="text-gray-600 mb-4">
            Choose a strategy above to generate or view copies.
          </p>
          {strategies.length === 0 && (
            <Button
              variant="primary"
              onClick={() => window.location.href = '/dashboard/strategist'}
            >
              Go to Strategist
            </Button>
          )}
        </Card>
      )}

      {/* Empty State - strategy selected but no copies */}
      {selectedStrategyId && !loadingCopies && !generatingCopies && copies.length === 0 && (
        <Card className="text-center py-12">
          <Icon icon="solar:pen-bold" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Copies Yet</h3>
          <p className="text-gray-600">
            Click &quot;Generate Copies&quot; to create platform-specific content from your strategy.
          </p>
        </Card>
      )}
    </div>
  );
};
