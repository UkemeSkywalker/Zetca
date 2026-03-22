'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CopyRecord } from '@/types/agent';
import { StrategyRecord } from '@/types/strategy';
import { Icon } from '@iconify/react';
import { listStrategies } from '@/lib/api/strategyClient';
import { generateCopies, listCopies, chatRefineCopy, deleteCopy } from '@/lib/api/copyClient';
import { manualSchedule } from '@/lib/api/schedulerClient';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface CaptionEditorProps {
  className?: string;
}

const platformConfig: Record<string, {
  name: string;
  icon: string;
  color: string;
}> = {
  x: { name: 'X', icon: 'ri:twitter-x-fill', color: '#000000' },
  twitter: { name: 'X', icon: 'ri:twitter-x-fill', color: '#000000' },
  pinterest: { name: 'Pinterest', icon: 'mdi:pinterest', color: '#E60023' },
  instagram: { name: 'Instagram', icon: 'mdi:instagram', color: '#E4405F' },
  linkedin: { name: 'LinkedIn', icon: 'mdi:linkedin', color: '#0A66C2' },
  facebook: { name: 'Facebook', icon: 'mdi:facebook', color: '#1877F2' },
  youtube: { name: 'YouTube', icon: 'mdi:youtube', color: '#FF0000' },
  other: { name: 'Other', icon: 'mdi:web', color: '#6B7280' },
};

const allPlatformKeys = ['x', 'instagram', 'linkedin', 'facebook'];

// Normalize platform key: map twitter variants and tiktok to "x"
function normalizePlatform(p: string): string {
  const lower = p.toLowerCase().trim();
  if (lower === 'twitter' || lower === 'tiktok' || lower === 'twitter/x' || lower === 'x (twitter)' || lower === 'x/twitter') return 'x';
  return lower;
}

export const CaptionEditor: React.FC<CaptionEditorProps> = ({ className = '' }) => {
  const [strategies, setStrategies] = useState<StrategyRecord[]>([]);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [loadingStrategies, setLoadingStrategies] = useState(true);
  const [copies, setCopies] = useState<CopyRecord[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [generatingCopies, setGeneratingCopies] = useState(false);
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [chattingCopyId, setChattingCopyId] = useState<string | null>(null);
  const [aiMessages, setAiMessages] = useState<Record<string, string>>({});
  const [deletingCopyId, setDeletingCopyId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('09:00');
  const [publishErrors, setPublishErrors] = useState<{ date?: string; time?: string }>({});
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const platformMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (platformMenuRef.current && !platformMenuRef.current.contains(e.target as Node)) {
        setShowPlatformMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const loadCopiesForStrategy = useCallback(async (strategyId: string) => {
    if (!strategyId) { setCopies([]); return; }
    try {
      setLoadingCopies(true);
      setError(null);
      const data = await listCopies(strategyId);
      setCopies(data);
      if (data.length > 0) {
        const allowed = ['x', 'instagram', 'linkedin', 'facebook'];
        const firstAllowed = data.find(c => allowed.includes(normalizePlatform(c.platform)));
        setActiveTab(firstAllowed ? normalizePlatform(firstAllowed.platform) : normalizePlatform(data[0].platform));
      }
    } catch (err) {
      console.error('Failed to load copies:', err);
      setError('Failed to load copies. Please try again.');
      setCopies([]);
    } finally {
      setLoadingCopies(false);
    }
  }, []);

  const handleStrategyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const strategyId = e.target.value;
    setSelectedStrategyId(strategyId);
    setAiMessages({});
    setChatInputs({});
    setEditedTexts({});
    if (strategyId) { loadCopiesForStrategy(strategyId); }
    else { setCopies([]); setActiveTab(''); }
  };

  const handleGenerateCopies = async () => {
    if (!selectedStrategyId) return;
    try {
      setGeneratingCopies(true);
      setError(null);
      const newCopies = await generateCopies(selectedStrategyId);
      setCopies(newCopies);
      setAiMessages({});
      setEditedTexts({});
      if (newCopies.length > 0) {
        const allowed = ['x', 'instagram', 'linkedin', 'facebook'];
        const firstAllowed = newCopies.find(c => allowed.includes(normalizePlatform(c.platform)));
        setActiveTab(firstAllowed ? normalizePlatform(firstAllowed.platform) : normalizePlatform(newCopies[0].platform));
      }
    } catch (err: any) {
      console.error('Failed to generate copies:', err);
      setError(err.message || 'Failed to generate copies. Please try again.');
    } finally {
      setGeneratingCopies(false);
    }
  };

  const handleChatSubmit = async (copyId: string) => {
    const message = chatInputs[copyId]?.trim();
    if (!message) return;
    try {
      setChattingCopyId(copyId);
      setError(null);
      const response = await chatRefineCopy(copyId, message);
      setCopies(prev => prev.map(copy =>
        copy.id === copyId
          ? { ...copy, text: response.updatedText, hashtags: response.updatedHashtags }
          : copy
      ));
      setEditedTexts(prev => { const { [copyId]: _, ...rest } = prev; return rest; });
      setAiMessages(prev => ({ ...prev, [copyId]: response.aiMessage }));
      setChatInputs(prev => ({ ...prev, [copyId]: '' }));
    } catch (err: any) {
      console.error('Failed to refine copy:', err);
      setError(err.message || 'Failed to refine copy. Please try again.');
    } finally {
      setChattingCopyId(null);
    }
  };

  const handleDeleteCopy = async (copyId: string) => {
    try {
      setDeletingCopyId(copyId);
      setError(null);
      await deleteCopy(copyId);
      setCopies(prev => prev.filter(copy => copy.id !== copyId));
      setAiMessages(prev => { const { [copyId]: _, ...rest } = prev; return rest; });
      setChatInputs(prev => { const { [copyId]: _, ...rest } = prev; return rest; });
      setEditedTexts(prev => { const { [copyId]: _, ...rest } = prev; return rest; });
    } catch (err: any) {
      console.error('Failed to delete copy:', err);
      setError(err.message || 'Failed to delete copy. Please try again.');
    } finally {
      setDeletingCopyId(null);
    }
  };

  const handleCopyToClipboard = async (text: string, copyId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(copyId);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const toggleAccordion = (copyId: string) => {
    setExpandedAccordions(prev => ({ ...prev, [copyId]: !prev[copyId] }));
  };

  const handlePublishClick = () => {
    if (!activeCopy) return;
    setPublishDate('');
    setPublishTime('09:00');
    setPublishErrors({});
    setPublishModalOpen(true);
  };

  const handlePublishConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCopy) return;

    const newErrors: { date?: string; time?: string } = {};
    if (!publishDate) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDateTime = new Date(`${publishDate}T${publishTime}`);
      if (selectedDateTime <= new Date()) {
        newErrors.date = 'Scheduled date must be in the future';
      }
    }
    if (!publishTime) {
      newErrors.time = 'Time is required';
    }
    if (Object.keys(newErrors).length > 0) {
      setPublishErrors(newErrors);
      return;
    }

    try {
      setIsScheduling(true);
      setError(null);
      await manualSchedule({
        copyId: activeCopy.id,
        scheduledDate: publishDate,
        scheduledTime: publishTime,
        platform: normalizePlatform(activeCopy.platform),
      });
      setPublishModalOpen(false);
      setScheduleSuccess(activeCopy.id);
      setTimeout(() => setScheduleSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to schedule post:', err);
      setError(err.message || 'Failed to schedule post. Please try again.');
    } finally {
      setIsScheduling(false);
    }
  };

  // Group copies by normalized platform, filtering to only allowed platforms
  const allowedPlatforms = new Set(['x', 'instagram', 'linkedin', 'facebook']);
  const copiesByPlatform = copies.reduce((acc, copy) => {
    const platform = normalizePlatform(copy.platform);
    if (!allowedPlatforms.has(platform)) return acc;
    if (!acc[platform]) acc[platform] = [];
    acc[platform].push(copy);
    return acc;
  }, {} as Record<string, CopyRecord[]>);

  const availablePlatforms = Object.keys(copiesByPlatform);
  const activePlatformCopies = activeTab ? (copiesByPlatform[activeTab] || []) : [];
  const activeCopy = activePlatformCopies[0] || null;
  const additionalCopies = activePlatformCopies.slice(1);

  const getPlatformConfig = (platform: string) => {
    return platformConfig[normalizePlatform(platform)] || platformConfig.other;
  };

  const handleRemoveTab = (platform: string) => {
    const platformCopies = copiesByPlatform[platform] || [];
    platformCopies.forEach(copy => handleDeleteCopy(copy.id));
    if (activeTab === platform && availablePlatforms.length > 1) {
      const nextPlatform = availablePlatforms.find(p => p !== platform);
      if (nextPlatform) setActiveTab(nextPlatform);
    }
  };

  const getDisplayText = (copy: CopyRecord) => {
    return editedTexts[copy.id] !== undefined ? editedTexts[copy.id] : copy.text;
  };

  // --- EMPTY STATES ---
  if (loadingStrategies) {
    return (
      <div className={`${className}`}>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="svg-spinners:ring-resize" className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading strategies...</p>
        </div>
      </div>
    );
  }

  if (!selectedStrategyId && !loadingStrategies) {
    return (
      <div className={`space-y-4 ${className}`}>
        <StrategySelector strategies={strategies} selectedStrategyId={selectedStrategyId} onChange={handleStrategyChange} loading={loadingStrategies} />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="solar:document-text-bold" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-semibold text-lg mb-1">Select a Strategy</p>
          <p className="text-gray-500 text-sm">Choose a strategy above to generate or view copies.</p>
          {strategies.length === 0 && (
            <button onClick={() => window.location.href = '/dashboard/strategist'} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: 'linear-gradient(45deg, #3139FB, #8B5CF6)' }}>
              Go to Strategist
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loadingCopies || generatingCopies) {
    return (
      <div className={`space-y-4 ${className}`}>
        <StrategySelector strategies={strategies} selectedStrategyId={selectedStrategyId} onChange={handleStrategyChange} loading={loadingStrategies} />
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="svg-spinners:ring-resize" className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-900 font-semibold text-lg mb-1">{generatingCopies ? 'Generating Copies...' : 'Loading Copies...'}</p>
          <p className="text-gray-500 text-sm">{generatingCopies ? 'The AI is crafting platform-specific copies from your strategy.' : 'Fetching your existing copies.'}</p>
        </div>
      </div>
    );
  }

  if (selectedStrategyId && copies.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <StrategySelector strategies={strategies} selectedStrategyId={selectedStrategyId} onChange={handleStrategyChange} loading={loadingStrategies} />
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="solar:pen-bold" className="w-14 h-14 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-900 font-semibold text-lg mb-1">No Copies Yet</p>
          <p className="text-gray-500 text-sm mb-4">Click &quot;Generate&quot; to create platform-specific content.</p>
          <button onClick={handleGenerateCopies} disabled={generatingCopies} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50">
            <Icon icon="solar:refresh-bold" className="w-4 h-4" />
            Generate
          </button>
        </div>
      </div>
    );
  }

  // --- MAIN EDITOR UI ---
  const currentText = activeCopy ? getDisplayText(activeCopy) : '';
  const charCount = currentText.length;

  return (
    <div className={`space-y-4 ${className}`}>
      <StrategySelector strategies={strategies} selectedStrategyId={selectedStrategyId} onChange={handleStrategyChange} loading={loadingStrategies} />
      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {/* Platform Tabs */}
        <div className="flex items-center border-b border-gray-200 bg-gray-50 overflow-x-auto">
          {availablePlatforms.map((platform) => {
            const config = getPlatformConfig(platform);
            const isActive = activeTab === platform;
            return (
              <button
                key={platform}
                onClick={() => setActiveTab(platform)}
                className={`flex items-center gap-3 px-6 py-4 text-base font-medium border-r border-gray-200 whitespace-nowrap transition-all ${
                  isActive ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 bg-transparent'
                }`}
                style={isActive ? { backgroundColor: config.color, color: 'white' } : undefined}
                role="tab"
                aria-selected={isActive}
              >
                <Icon icon={config.icon} className="w-5 h-5" style={{ color: isActive ? 'white' : config.color }} />
                {config.name}
                <span
                  onClick={(e) => { e.stopPropagation(); handleRemoveTab(platform); }}
                  className={`ml-1 rounded-sm p-1 leading-none text-lg transition-colors ${isActive ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'}`}
                  role="button"
                  aria-label={`Remove ${config.name} tab`}
                  tabIndex={0}
                >×</span>
              </button>
            );
          })}
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-200 bg-white">
          <button onClick={handleGenerateCopies} disabled={generatingCopies || !selectedStrategyId} className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-base font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors disabled:opacity-50" aria-label="Generate copies">
            {generatingCopies ? <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" /> : <Icon icon="solar:refresh-bold" className="w-5 h-5" />}
            Generate
          </button>
          <div className="w-px h-8 bg-gray-200 mx-1" />
          <ToolbarButton icon="solar:undo-left-round-linear" label="Undo" />
          <ToolbarButton icon="solar:undo-right-round-linear" label="Redo" />
          <div className="w-px h-8 bg-gray-200 mx-1" />
          {activeCopy && (
            <ToolbarButton
              icon={copySuccess === activeCopy.id ? 'solar:check-circle-bold' : 'solar:copy-linear'}
              label="Copy to clipboard"
              onClick={() => handleCopyToClipboard(currentText + '\n\n' + activeCopy.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '), activeCopy.id)}
            />
          )}
          <ToolbarButton icon="solar:eye-linear" label="Preview" />
          <div className="relative" ref={platformMenuRef}>
            <ToolbarButton icon="solar:add-square-linear" label="Copy to Platform" onClick={() => setShowPlatformMenu(!showPlatformMenu)} />
            {showPlatformMenu && (
              <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-xl border border-gray-200 shadow-xl py-2 z-50">
                <p className="px-5 py-2 text-sm font-medium text-gray-400 uppercase tracking-wide">Copy to Platform</p>
                {allPlatformKeys.map((key) => {
                  const config = platformConfig[key];
                  const isActive = activeTab === key;
                  return (
                    <button key={key} onClick={() => { if (activeCopy) { navigator.clipboard.writeText(currentText); setCopySuccess(activeCopy.id); setTimeout(() => setCopySuccess(null), 2000); } setShowPlatformMenu(false); }}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-base transition-colors ${isActive ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}>
                      <Icon icon={config.icon} className="w-6 h-6" style={{ color: config.color }} />
                      {config.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex-1" />
          {/* Copy counter */}
          {activePlatformCopies.length > 1 && (
            <span className="text-sm text-gray-400 font-medium">1/{activePlatformCopies.length}</span>
          )}
          <button
            onClick={handlePublishClick}
            disabled={!activeCopy || isScheduling}
            className="inline-flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-base font-semibold transition-colors disabled:opacity-50"
            style={{ background: 'linear-gradient(45deg, #3139FB, #8B5CF6)', color: 'white' }}
          >
            {isScheduling ? <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" /> : <Icon icon="solar:plain-bold" className="w-5 h-5" />}
            Publish
          </button>
        </div>

        {/* Editor Content Area */}
        {activeCopy && (
          <div role="tabpanel" id={`${activeTab}-panel`}>
            {/* Editable text area */}
            <div className="p-8">
              <textarea
                value={currentText}
                onChange={(e) => setEditedTexts(prev => ({ ...prev, [activeCopy.id]: e.target.value }))}
                className="w-full min-h-[320px] text-lg leading-relaxed text-gray-800 bg-white border border-gray-200 rounded-xl p-6 resize-y focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                placeholder="Write your copy here..."
                aria-label="Edit copy text"
              />
              <p className="mt-2 text-sm text-gray-400">{charCount} characters</p>
            </div>

            {/* Hashtags */}
            {activeCopy.hashtags && activeCopy.hashtags.length > 0 && (
              <div className="px-8 pb-6">
                <div className="flex flex-wrap gap-2.5">
                  {activeCopy.hashtags.map((hashtag, i) => (
                    <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-indigo-50 text-indigo-700">
                      {hashtag.startsWith('#') ? hashtag : `#${hashtag}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* AI Message */}
            {aiMessages[activeCopy.id] && (
              <div className="mx-8 mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-start gap-3">
                  <Icon icon="solar:magic-stick-3-bold" className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                  <p className="text-base text-blue-700">{aiMessages[activeCopy.id]}</p>
                </div>
              </div>
            )}

            {/* Chat refinement */}
            <div className="px-8 pb-6">
              <div className="flex items-center gap-3">
                <label htmlFor={`chat-${activeCopy.id}`} className="sr-only">Refine this copy with AI</label>
                <input
                  id={`chat-${activeCopy.id}`}
                  type="text"
                  value={chatInputs[activeCopy.id] || ''}
                  onChange={(e) => setChatInputs(prev => ({ ...prev, [activeCopy.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(activeCopy.id); } }}
                  placeholder="Ask AI to refine this copy..."
                  className="flex-1 px-5 py-3.5 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 placeholder-gray-400"
                  disabled={chattingCopyId === activeCopy.id}
                />
                <button
                  onClick={() => handleChatSubmit(activeCopy.id)}
                  disabled={chattingCopyId === activeCopy.id || !chatInputs[activeCopy.id]?.trim()}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl text-base font-medium text-white transition-colors disabled:opacity-50"
                  style={{ background: 'linear-gradient(45deg, #3139FB, #8B5CF6)' }}
                  aria-label="Send refinement message"
                >
                  {chattingCopyId === activeCopy.id ? <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" /> : <Icon icon="solar:plain-bold" className="w-5 h-5" />}
                  Refine
                </button>
              </div>
            </div>

            {/* Accordion copies */}
            {additionalCopies.length > 0 && (
              <div className="px-8 pb-8 space-y-3">
                {additionalCopies.map((copy, i) => {
                  const isExpanded = expandedAccordions[copy.id] || false;
                  const copyText = getDisplayText(copy);
                  return (
                    <div key={copy.id} className="rounded-xl overflow-hidden border border-gray-200 bg-white">
                      {/* Accordion header */}
                      <div
                        className="flex items-center justify-between px-5 py-4 cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => toggleAccordion(copy.id)}
                        role="button"
                        aria-expanded={isExpanded}
                        tabIndex={0}
                      >
                        <p className="text-base text-gray-700 truncate flex-1 pr-4">
                          {copyText.substring(0, 100)}{copyText.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteCopy(copy.id); }}
                            disabled={deletingCopyId === copy.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`Delete copy ${i + 2}`}
                          >
                            {deletingCopyId === copy.id ? <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" /> : <Icon icon="solar:close-circle-bold" className="w-5 h-5" />}
                          </button>
                          <Icon icon={isExpanded ? 'solar:alt-arrow-up-linear' : 'solar:alt-arrow-down-linear'} className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                      {/* Accordion body */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-gray-200">
                          <textarea
                            value={copyText}
                            onChange={(e) => setEditedTexts(prev => ({ ...prev, [copy.id]: e.target.value }))}
                            className="w-full min-h-[150px] mt-4 text-base leading-relaxed text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 resize-y focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                            aria-label={`Edit copy ${i + 2}`}
                          />
                          <p className="mt-1 text-sm text-gray-400">{copyText.length} characters</p>
                          {copy.hashtags && copy.hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {copy.hashtags.map((h, hi) => (
                                <span key={hi} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                                  {h.startsWith('#') ? h : `#${h}`}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Add to Thread button */}
                <button className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-xl text-base font-medium text-indigo-600 border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                  <Icon icon="solar:add-circle-linear" className="w-5 h-5" />
                  Add to Thread
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Success banner */}
      {scheduleSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-4" role="status">
          <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-green-500 flex-shrink-0" />
          <p className="text-base text-green-700 flex-1">Post scheduled successfully.</p>
          <button onClick={() => setScheduleSuccess(null)} className="text-green-400 hover:text-green-600" aria-label="Dismiss success message">
            <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Publish Scheduling Modal */}
      <Modal
        isOpen={publishModalOpen}
        onClose={() => { if (!isScheduling) setPublishModalOpen(false); }}
        title="Schedule Post"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setPublishModalOpen(false)} disabled={isScheduling}>
              Cancel
            </Button>
            <Button type="submit" form="publish-schedule-form" isLoading={isScheduling} disabled={isScheduling}>
              Schedule
            </Button>
          </>
        }
      >
        {activeCopy && (
          <form id="publish-schedule-form" onSubmit={handlePublishConfirm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                {getDisplayText(activeCopy)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Icon icon={getPlatformConfig(activeCopy.platform).icon} className="w-4 h-4" style={{ color: getPlatformConfig(activeCopy.platform).color }} />
                {getPlatformConfig(activeCopy.platform).name}
              </p>
            </div>
            {activeCopy.hashtags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                <div className="flex flex-wrap gap-1.5">
                  {activeCopy.hashtags.map((h, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">
                      {h.startsWith('#') ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={publishDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPublishDate(e.target.value); setPublishErrors(prev => ({ ...prev, date: undefined })); }}
                error={publishErrors.date}
                id="publish-date-input"
              />
              <Input
                label="Time"
                type="time"
                value={publishTime}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPublishTime(e.target.value); setPublishErrors(prev => ({ ...prev, time: undefined })); }}
                error={publishErrors.time}
                id="publish-time-input"
              />
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};


// --- Helper Components ---

function ToolbarButton({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="p-2.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors" aria-label={label} title={label}>
      <Icon icon={icon} className="w-6 h-6" />
    </button>
  );
}

function StrategySelector({ strategies, selectedStrategyId, onChange, loading }: {
  strategies: StrategyRecord[];
  selectedStrategyId: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loading: boolean;
}) {
  if (loading) return <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />;
  return (
    <div className="flex items-center gap-4">
      <label htmlFor="strategy-select" className="text-base font-medium text-gray-600 whitespace-nowrap">Strategy</label>
      <select id="strategy-select" value={selectedStrategyId} onChange={onChange} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-base bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent" aria-label="Select a strategy to generate copies from">
        <option value="">Choose a strategy...</option>
        {strategies.map(s => <option key={s.id} value={s.id}>{s.brandName} — {s.industry}</option>)}
      </select>
    </div>
  );
}

function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-4" role="alert">
      <Icon icon="solar:danger-triangle-bold" className="w-6 h-6 text-red-500 flex-shrink-0" />
      <p className="text-base text-red-700 flex-1">{error}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600" aria-label="Dismiss error">
        <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
      </button>
    </div>
  );
}
