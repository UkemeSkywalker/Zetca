'use client';

import React, { useState, useEffect } from 'react';
import { useAgentContext } from '@/context/AgentContext';
import { Caption } from '@/types/agent';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Icon } from '@iconify/react';
import mockCaptionsData from '@/data/mockCaptions.json';

interface CaptionEditorProps {
  className?: string;
}

type Platform = 'instagram' | 'twitter' | 'linkedin' | 'facebook';

const platformConfig = {
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
  const { strategy, captions, setCaptions, updateWorkflowStatus } = useAgentContext();
  const [localCaptions, setLocalCaptions] = useState<Caption[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Platform>('instagram');

  // Load captions when strategy is available
  useEffect(() => {
    if (strategy && captions.length === 0) {
      // Generate captions from mock data when strategy exists
      const generatedCaptions: Caption[] = mockCaptionsData.captions.map((caption, index) => ({
        ...caption,
        platform: caption.platform as Platform,
        strategyId: strategy.id,
        createdAt: new Date(),
      }));
      setCaptions(generatedCaptions);
      setLocalCaptions(generatedCaptions);
      updateWorkflowStatus('copywriter', 'complete');
    } else if (captions.length > 0) {
      setLocalCaptions(captions);
    }
  }, [strategy, captions, setCaptions, updateWorkflowStatus]);

  const handleCaptionEdit = (captionId: string, newText: string) => {
    const updatedCaptions = localCaptions.map(caption =>
      caption.id === captionId ? { ...caption, text: newText } : caption
    );
    setLocalCaptions(updatedCaptions);
    setCaptions(updatedCaptions);
  };

  const handleCopyToClipboard = async (captionText: string, captionId: string) => {
    try {
      await navigator.clipboard.writeText(captionText);
      setCopySuccess(captionId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Group captions by platform
  const captionsByPlatform = localCaptions.reduce((acc, caption) => {
    if (!acc[caption.platform]) {
      acc[caption.platform] = [];
    }
    acc[caption.platform].push(caption);
    return acc;
  }, {} as Record<Platform, Caption[]>);

  // Get platforms that have captions
  const availablePlatforms = Object.keys(captionsByPlatform) as Platform[];

  // Set first available platform as active tab if current tab has no captions
  useEffect(() => {
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(activeTab)) {
      setActiveTab(availablePlatforms[0]);
    }
  }, [availablePlatforms, activeTab]);

  // Show message if no strategy exists
  if (!strategy) {
    return (
      <div className={`${className}`}>
        <Card className="text-center py-12">
          <Icon icon="solar:document-text-bold" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Strategy Found</h3>
          <p className="text-gray-600 mb-4">
            You need to create a strategy first before generating captions.
          </p>
          <Button
            variant="primary"
            onClick={() => window.location.href = '/dashboard/strategist'}
          >
            Go to Strategist
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Captions</h2>
        <p className="text-gray-600">
          Edit and customize your AI-generated captions for each platform.
        </p>
      </div>

      {/* Platform Tabs */}
      {availablePlatforms.length > 0 && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {availablePlatforms.map((platform) => {
              const config = platformConfig[platform];
              const isActive = activeTab === platform;
              const captionCount = captionsByPlatform[platform]?.length || 0;
              
              return (
                <button
                  key={platform}
                  onClick={() => setActiveTab(platform)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    isActive
                      ? `${config.tabColorActive} border-current`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon icon={config.icon} className="w-4 h-4" />
                  {config.name}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isActive ? 'bg-white text-gray-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {captionCount}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Active Tab Content */}
      {availablePlatforms.length > 0 && captionsByPlatform[activeTab] && (
        <div className="space-y-4">
          {captionsByPlatform[activeTab].map((caption, index) => (
            <Card key={caption.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                {/* Caption Number and Platform Badge */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-500">
                    Caption {index + 1}
                  </span>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${platformConfig[caption.platform].color}`}>
                    <Icon icon={platformConfig[caption.platform].icon} className="w-4 h-4" />
                    {platformConfig[caption.platform].name}
                  </div>
                </div>

                {/* Copy Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyToClipboard(caption.text, caption.id)}
                  className="flex items-center gap-2"
                >
                  <Icon 
                    icon={copySuccess === caption.id ? "solar:check-circle-bold" : "solar:copy-bold"} 
                    className="w-4 h-4" 
                  />
                  {copySuccess === caption.id ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* Caption Text Area */}
              <div className="mb-4">
                <textarea
                  value={caption.text}
                  onChange={(e) => handleCaptionEdit(caption.id, e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Enter your caption text..."
                />
              </div>

              {/* Hashtags */}
              {caption.hashtags && caption.hashtags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Hashtags</h4>
                  <div className="flex flex-wrap gap-2">
                    {caption.hashtags.map((hashtag, hashtagIndex) => (
                      <span
                        key={hashtagIndex}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-md font-medium"
                      >
                        {hashtag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {localCaptions.length === 0 && strategy && (
        <Card className="text-center py-12">
          <Icon icon="solar:pen-bold" className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Captions Generated</h3>
          <p className="text-gray-600">
            Captions will be automatically generated based on your strategy.
          </p>
        </Card>
      )}
    </div>
  );
};