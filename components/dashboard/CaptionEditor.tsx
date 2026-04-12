'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CopyRecord } from '@/types/agent';
import { StrategyRecord } from '@/types/strategy';
import { Icon } from '@iconify/react';
import { listStrategies } from '@/lib/api/strategyClient';
import { generateCopies, generateCopiesStream, listCopies, chatRefineCopy, deleteCopy } from '@/lib/api/copyClient';
import type { CopyStreamEvent } from '@/lib/api/copyClient';
import { manualSchedule } from '@/lib/api/schedulerClient';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MediaUploader from '@/components/dashboard/MediaUploader';

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
  const [generationPhase, setGenerationPhase] = useState<string>('');
  const [thinkingText, setThinkingText] = useState<string>('');
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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
  const [attachedMediaId, setAttachedMediaId] = useState<string | null>(null);
  const [attachedMediaType, setAttachedMediaType] = useState<'image' | 'video' | null>(null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [showStrategyPicker, setShowStrategyPicker] = useState(false);
  const [strategyFilter, setStrategyFilter] = useState('all');
  const [strategySortBy, setStrategySortBy] = useState<'recent' | 'name'>('recent');
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

  // Elapsed time counter during generation
  useEffect(() => {
    if (!generationStartTime) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - generationStartTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [generationStartTime]);

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
      setGenerationStartTime(Date.now());
      setGenerationPhase('Connecting to agent...');
      setThinkingText('');
      setError(null);

      const newCopies = await generateCopiesStream(selectedStrategyId, (event: CopyStreamEvent) => {
        if (event.event === 'lifecycle' && event.phase) {
          setGenerationPhase(event.phase);
        } else if (event.event === 'thinking' && event.text) {
          setThinkingText(prev => prev + event.text);
        } else if (event.event === 'error' && event.message) {
          setError(event.message);
        }
      });

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
      setGenerationPhase('');
      setThinkingText('');
      setGenerationStartTime(null);
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
    if (deletingCopyId) return; // Prevent concurrent deletes
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
        ...(attachedMediaId ? { mediaId: attachedMediaId } : {}),
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
    // Only hide the platform tab from view — do NOT delete copies from the database
    setCopies(prev => prev.filter(c => normalizePlatform(c.platform) !== platform));
    if (activeTab === platform && availablePlatforms.length > 1) {
      const nextPlatform = availablePlatforms.find(p => p !== platform);
      if (nextPlatform) setActiveTab(nextPlatform);
    }
  };

  const getDisplayText = (copy: CopyRecord) => {
    return editedTexts[copy.id] !== undefined ? editedTexts[copy.id] : copy.text;
  };

  const handleQuickSelect = (strategyId: string) => {
    setSelectedStrategyId(strategyId);
    setAiMessages({});
    setChatInputs({});
    setEditedTexts({});
    loadCopiesForStrategy(strategyId);
  };

  // Industry icon mapping
  const industryIcons: Record<string, { icon: string; bg: string; color: string }> = {
    marketing: { icon: 'solar:bolt-bold', bg: '#F3E8FF', color: '#7C3AED' },
    fashion: { icon: 'solar:hanger-bold', bg: '#FFF1F2', color: '#E11D48' },
    'tech saas': { icon: 'solar:programming-bold', bg: '#EFF6FF', color: '#2563EB' },
    technology: { icon: 'solar:programming-bold', bg: '#EFF6FF', color: '#2563EB' },
    wellness: { icon: 'solar:heart-pulse-bold', bg: '#FFF7ED', color: '#EA580C' },
    health: { icon: 'solar:heart-pulse-bold', bg: '#FFF7ED', color: '#EA580C' },
    finance: { icon: 'solar:chart-bold', bg: '#ECFDF5', color: '#059669' },
    education: { icon: 'solar:book-bold', bg: '#FEF9C3', color: '#CA8A04' },
    food: { icon: 'solar:cup-hot-bold', bg: '#FFF7ED', color: '#EA580C' },
    default: { icon: 'solar:star-bold', bg: '#F3E8FF', color: '#7C3AED' },
  };

  const getIndustryIcon = (industry: string) => {
    const key = industry.toLowerCase().trim();
    return industryIcons[key] || industryIcons.default;
  };

  // --- EMPTY STATES ---
  if (loadingStrategies) {
    return (
      <div className={`${className}`}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--on-surface)] tracking-tight mb-2">Copywriter Agent</h1>
          <p className="text-[var(--outline)] text-base leading-relaxed max-w-xl">
            Transform your brand strategy into high-converting social copy. Select a curated strategy to begin the generation process.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Icon icon="svg-spinners:ring-resize" className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading strategies...</p>
        </div>
      </div>
    );
  }

  if (!selectedStrategyId && !loadingStrategies) {
    return (
      <div className={`${className}`}>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--on-surface)] tracking-tight mb-2">Copywriter Agent</h1>
          <p className="text-[var(--outline)] text-base leading-relaxed max-w-xl">
            Transform your brand strategy into high-converting social copy. Select a curated strategy to begin the generation process.
          </p>
        </div>

        {/* Quick Select Strategy Strip */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold tracking-widest text-[var(--outline)] uppercase">Quick Select Strategy</p>
            {strategies.length > 0 && (
              <button
                onClick={() => setShowStrategyPicker(true)}
                className="text-xs font-semibold tracking-wide text-[var(--primary)] hover:text-[var(--primary-container)] transition-colors flex items-center gap-1 uppercase"
              >
                View All Strategies ({strategies.length})
                <Icon icon="solar:arrow-right-linear" className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {strategies.slice(0, 4).map((s) => {
              const iconInfo = getIndustryIcon(s.industry);
              return (
                <button
                  key={s.id}
                  onClick={() => handleQuickSelect(s.id)}
                  className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-white border border-[var(--ghost-border)] hover:border-[var(--ghost-border-focus)] hover:shadow-md transition-all min-w-[180px] text-left"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconInfo.bg }}>
                    <Icon icon={iconInfo.icon} className="w-5 h-5" style={{ color: iconInfo.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--on-surface)] truncate">{s.brandName}</p>
                    <p className="text-[10px] font-semibold tracking-wider text-[var(--outline)] uppercase truncate">{s.industry}</p>
                  </div>
                </button>
              );
            })}
            {/* Add strategy button */}
            <button
              onClick={() => window.location.href = '/dashboard/strategist'}
              className="flex items-center justify-center w-14 h-14 rounded-2xl border-2 border-dashed border-[var(--outline-variant)] hover:border-[var(--primary)] text-[var(--outline-variant)] hover:text-[var(--primary)] transition-all flex-shrink-0"
              aria-label="Create new strategy"
            >
              <Icon icon="solar:add-circle-linear" className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Empty State Card - Clickable */}
        <button
          onClick={() => setShowStrategyPicker(true)}
          className="w-full rounded-3xl overflow-hidden text-left cursor-pointer hover:shadow-lg transition-shadow"
          style={{ background: 'linear-gradient(180deg, rgba(238, 240, 255, 0.6) 0%, rgba(209, 220, 255, 0.4) 100%)' }}
        >
          <div className="flex flex-col items-center justify-center py-16 px-8">
            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
              <Icon icon="solar:document-text-bold" className="w-8 h-8 text-[var(--primary)]" />
            </div>

            <h2 className="text-xl font-bold text-[var(--on-surface)] mb-2">Select a Strategy</h2>
            <p className="text-sm text-[var(--outline)] text-center max-w-sm leading-relaxed mb-10">
              Choose a strategy above to generate or view copies. Your curated workspace is waiting for direction.
            </p>

            {/* Workflow stages */}
            <div className="flex items-center gap-10">
              <div className="flex flex-col items-center gap-2">
                <Icon icon="solar:pen-new-round-bold" className="w-6 h-6 text-[var(--outline-variant)]" />
                <span className="text-[10px] font-semibold tracking-widest text-[var(--outline-variant)] uppercase">Drafting</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icon icon="solar:magic-stick-3-bold" className="w-6 h-6 text-[var(--outline-variant)]" />
                <span className="text-[10px] font-semibold tracking-widest text-[var(--outline-variant)] uppercase">Refining</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Icon icon="solar:plain-bold" className="w-6 h-6 text-[var(--outline-variant)]" />
                <span className="text-[10px] font-semibold tracking-widest text-[var(--outline-variant)] uppercase">Finalizing</span>
              </div>
            </div>
          </div>
        </button>

        {/* Strategy Picker Modal */}
        {showStrategyPicker && (
          <StrategyPickerModal
            strategies={strategies}
            filter={strategyFilter}
            onFilterChange={setStrategyFilter}
            sortBy={strategySortBy}
            onSortChange={setStrategySortBy}
            onSelect={(id) => { setShowStrategyPicker(false); handleQuickSelect(id); }}
            onClose={() => setShowStrategyPicker(false)}
            getIndustryIcon={getIndustryIcon}
          />
        )}
      </div>
    );
  }

  if (loadingCopies || generatingCopies) {
    const formatTime = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
    };

    return (
      <div className={`space-y-4 ${className}`}>
        <CopywriterHeader />
        <StrategySelector strategies={strategies} selectedStrategyId={selectedStrategyId} onChange={handleStrategyChange} loading={loadingStrategies} />

        {generatingCopies ? (
          <div className="bg-white rounded-2xl border border-[var(--ghost-border)] overflow-hidden shadow-sm">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--ghost-border)] bg-gradient-to-r from-indigo-50/60 to-purple-50/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                    <Icon icon="svg-spinners:blocks-shuffle-3" className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--on-surface)]">Agent Thinking</h3>
                    <p className="text-xs text-[var(--outline)]">Streaming real-time output from the Copywriter Agent</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[var(--ghost-border)] text-sm font-mono">
                  <Icon icon="solar:clock-circle-linear" className="w-4 h-4 text-[var(--outline)]" />
                  <span className="text-[var(--on-surface)] font-semibold">{formatTime(elapsedSeconds)}</span>
                </div>
              </div>
            </div>

            {/* Current Phase */}
            {generationPhase && (
              <div className="px-6 py-3 border-b border-[var(--ghost-border)] bg-indigo-50/40">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
                  </span>
                  <span className="text-sm font-semibold text-[var(--primary)]">{generationPhase}</span>
                </div>
              </div>
            )}

            {/* Streamed Thinking Text */}
            <div className="px-6 py-5">
              {thinkingText ? (
                <div className="bg-[var(--surface-container-lowest)] rounded-xl border border-[var(--ghost-border)] p-4 max-h-[320px] overflow-y-auto">
                  <div className="flex items-start gap-2 mb-2">
                    <Icon icon="solar:magic-stick-3-bold" className="w-4 h-4 text-[var(--primary)] mt-0.5 flex-shrink-0" />
                    <span className="text-xs font-semibold tracking-wider uppercase text-[var(--outline)]">Agent Output Stream</span>
                  </div>
                  <p className="text-sm text-[var(--on-surface)] leading-relaxed whitespace-pre-wrap font-mono">
                    {thinkingText}
                    <span className="inline-block w-2 h-4 bg-[var(--primary)] animate-pulse ml-0.5 align-middle" />
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Icon icon="svg-spinners:ring-resize" className="w-8 h-8 text-[var(--primary)] mb-3" />
                  <p className="text-sm text-[var(--outline)]">Waiting for agent to start generating...</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--ghost-border)] bg-[var(--surface-container-lowest)]">
              <p className="text-xs text-[var(--outline-variant)] flex items-center gap-2">
                <Icon icon="solar:info-circle-linear" className="w-3.5 h-3.5" />
                Streaming live from the Strands Agent via Bedrock. Generating 28 structured copies across 4 platforms.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Icon icon="svg-spinners:ring-resize" className="w-10 h-10 text-indigo-500 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold text-lg mb-1">Loading Copies...</p>
            <p className="text-gray-500 text-sm">Fetching your existing copies.</p>
          </div>
        )}
      </div>
    );
  }

  if (selectedStrategyId && copies.length === 0) {
    return (
      <div className={`space-y-4 ${className}`}>
        <CopywriterHeader />
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
  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  const formatRelTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      {/* Header: Title + Strategy pill + Platform tabs */}
      <div>
        <h1 className="text-3xl font-bold text-[var(--on-surface)] tracking-tight mb-4">Copywriter Agent</h1>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--outline)]">Strategy:</span>
            <select value={selectedStrategyId} onChange={handleStrategyChange} className="px-4 py-2 rounded-full text-sm font-semibold border-2 border-[var(--primary)] text-[var(--primary)] bg-white focus:ring-2 focus:ring-[var(--primary)] focus:outline-none cursor-pointer appearance-none pr-8" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%234a40e0' d='m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }} aria-label="Select strategy">
              <option value="">Choose...</option>
              {strategies.map(s => <option key={s.id} value={s.id}>{s.brandName}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {availablePlatforms.map((platform) => {
              const config = getPlatformConfig(platform);
              const isActive = activeTab === platform;
              return (
                <button key={platform} onClick={() => setActiveTab(platform)} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${isActive ? 'bg-white border-2 border-[var(--primary)] text-[var(--primary)] shadow-sm' : 'text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-low)]'}`} role="tab" aria-selected={isActive}>
                  <Icon icon={config.icon} className="w-4 h-4" style={{ color: isActive ? config.color : undefined }} />
                  {config.name}
                </button>
              );
            })}
            {activeTab && (
              <button onClick={() => handleRemoveTab(activeTab)} className="p-1.5 rounded-full text-[var(--outline-variant)] hover:text-red-500 transition-colors" aria-label="Remove current platform">
                <Icon icon="solar:close-circle-linear" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor Card */}
      <div className="bg-white rounded-2xl border border-[var(--ghost-border)] overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-6 py-3 border-b border-[var(--ghost-border)] bg-[var(--surface-container-lowest)]">
          <ToolbarButton icon="solar:undo-left-round-linear" label="Undo" />
          <ToolbarButton icon="solar:undo-right-round-linear" label="Redo" />
          <div className="w-px h-5 bg-[var(--ghost-border)] mx-1" />
          <ToolbarButton icon="solar:text-bold-bold" label="Bold" />
          <ToolbarButton icon="solar:text-italic-bold" label="Italic" />
          <ToolbarButton icon="solar:link-round-bold" label="Link" />
          <ToolbarButton icon="solar:emoji-funny-circle-linear" label="Emoji" />
          <div className="flex-1" />
          {activeCopy && (
            <button onClick={() => handleCopyToClipboard(currentText + '\n\n' + activeCopy.hashtags.map(h => h.startsWith('#') ? h : `#${h}`).join(' '), activeCopy.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors">
              <Icon icon={copySuccess === activeCopy.id ? 'solar:check-circle-bold' : 'solar:copy-linear'} className="w-4 h-4" />
              Copy
            </button>
          )}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors">
            <Icon icon="solar:eye-linear" className="w-4 h-4" />
            Preview
          </button>
        </div>
        {activeCopy && (
          <div role="tabpanel" id={`${activeTab}-panel`}>
            <div className="p-6">
              <textarea value={currentText} onChange={(e) => setEditedTexts(prev => ({ ...prev, [activeCopy.id]: e.target.value }))} className="w-full min-h-[200px] text-lg leading-relaxed text-[var(--on-surface)] bg-transparent resize-y focus:outline-none" placeholder="Write your copy here..." aria-label="Edit copy text" />
            </div>
            <div className="px-6 pb-4">
              <MediaUploader onMediaAttached={(id, type) => { setAttachedMediaId(id); setAttachedMediaType(type); setIsMediaUploading(false); }} onMediaRemoved={() => { setAttachedMediaId(null); setAttachedMediaType(null); setIsMediaUploading(false); }} disabled={isScheduling} />
            </div>
            <div className="flex items-center gap-6 px-6 py-3 border-t border-[var(--ghost-border)] text-sm text-[var(--outline)]">
              <span className="flex items-center gap-1.5"><Icon icon="solar:text-field-linear" className="w-4 h-4" />{charCount} Characters</span>
              {activeCopy.hashtags.length > 0 && (<span className="flex items-center gap-1.5"><Icon icon="solar:hashtag-linear" className="w-4 h-4" />{activeCopy.hashtags.length} Hashtags</span>)}
              <div className="flex-1" />
              <span className="uppercase tracking-wider text-xs font-semibold text-[var(--outline-variant)]">Tone: Professional</span>
            </div>
          </div>
        )}
      </div>

      {/* AI Refine Bar */}
      {activeCopy && (
        <div className="flex items-center gap-3 bg-white rounded-2xl border border-[var(--ghost-border)] px-5 py-3 shadow-sm">
          <Icon icon="solar:magic-stick-3-bold" className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
          <label htmlFor={`chat-${activeCopy.id}`} className="sr-only">Refine this copy with AI</label>
          <input id={`chat-${activeCopy.id}`} type="text" value={chatInputs[activeCopy.id] || ''} onChange={(e) => setChatInputs(prev => ({ ...prev, [activeCopy.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(activeCopy.id); } }} placeholder="Refine with AI: 'Make it more punchy' or 'Add a call to action'..." className="flex-1 text-base bg-transparent focus:outline-none placeholder-[var(--outline-variant)]" disabled={chattingCopyId === activeCopy.id} />
          <button onClick={() => handleChatSubmit(activeCopy.id)} disabled={chattingCopyId === activeCopy.id || !chatInputs[activeCopy.id]?.trim()} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }} aria-label="Generate refined copy">
            {chattingCopyId === activeCopy.id && <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" />}
            Generate
          </button>
        </div>
      )}

      {/* AI Message */}
      {activeCopy && aiMessages[activeCopy.id] && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <div className="flex items-start gap-3">
            <Icon icon="solar:magic-stick-3-bold" className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-base text-blue-700">{aiMessages[activeCopy.id]}</p>
          </div>
        </div>
      )}

      {/* Thread Library */}
      {copies.length > 0 && (
        <div className="mt-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)] tracking-tight">Thread Library</h2>
              <p className="text-sm text-[var(--outline)] mt-1">Manage and refine your cross-platform storytelling.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-[var(--outline)] bg-white border border-[var(--ghost-border)] hover:bg-[var(--surface-container-low)] transition-colors">
                <Icon icon="solar:filter-linear" className="w-4 h-4" />Filter
              </button>
              <button onClick={handleGenerateCopies} disabled={generatingCopies || !selectedStrategyId} className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}>
                <Icon icon="solar:add-circle-bold" className="w-4 h-4" />New Thread
              </button>
            </div>
          </div>
          <div className="grid grid-cols-12 gap-4 px-5 py-3 text-xs font-semibold tracking-wider uppercase text-[var(--outline-variant)]">
            <div className="col-span-5">Topic & Content</div>
            <div className="col-span-2 text-center">Platforms</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-2 text-center">Modified</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
          <div className="space-y-2">
            {copies.map((copy) => {
              const platform = normalizePlatform(copy.platform);
              const config = getPlatformConfig(platform);
              const copyText = getDisplayText(copy);
              const firstLine = copyText.split('\n')[0] || copyText;
              const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
              const subtitle = copyText.length > 60 ? copyText.substring(0, 60) + '...' : copyText;
              const isActiveCopy = activeCopy?.id === copy.id;
              const relTime = formatRelTime(copy.updatedAt || copy.createdAt);
              return (
                <button key={copy.id} onClick={() => setActiveTab(platform)} className={`w-full grid grid-cols-12 gap-4 items-center px-5 py-4 rounded-2xl text-left transition-all ${isActiveCopy ? 'bg-white border-2 border-[var(--primary)]/20 shadow-sm' : 'bg-white border border-[var(--ghost-border)] hover:shadow-sm hover:border-[var(--ghost-border-focus)]'}`}>
                  <div className="col-span-5 min-w-0">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-[var(--primary)] mb-1">{selectedStrategy?.industry || platform.toUpperCase()}</p>
                    <p className="text-sm font-bold text-[var(--on-surface)] truncate">{title}</p>
                    <p className="text-xs text-[var(--outline)] truncate mt-0.5">{subtitle}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${config.color}15` }}>
                      <Icon icon={config.icon} className="w-4 h-4" style={{ color: config.color }} />
                    </div>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-green-50 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />Draft
                    </span>
                  </div>
                  <div className="col-span-2 text-center text-xs text-[var(--outline)]">{relTime}</div>
                  <div className="col-span-1 flex items-center justify-center">
                    <span onClick={(e) => { e.stopPropagation(); handleDeleteCopy(copy.id); }} className="p-1.5 rounded-lg text-[var(--outline-variant)] hover:text-red-500 transition-colors cursor-pointer" role="button" tabIndex={0} aria-label="Delete copy">
                      {deletingCopyId === copy.id ? <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" /> : <Icon icon="solar:trash-bin-minimalistic-linear" className="w-4 h-4" />}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Success banner */}
      {scheduleSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-4" role="status">
          <Icon icon="solar:check-circle-bold" className="w-6 h-6 text-green-500 flex-shrink-0" />
          <p className="text-base text-green-700 flex-1">Post scheduled successfully.</p>
          <button onClick={() => setScheduleSuccess(null)} className="text-green-400 hover:text-green-600" aria-label="Dismiss success message"><Icon icon="solar:close-circle-bold" className="w-6 h-6" /></button>
        </div>
      )}

      {/* Publish Scheduling Modal */}
      <Modal isOpen={publishModalOpen} onClose={() => { if (!isScheduling) setPublishModalOpen(false); }} title="Schedule Post" size="md" footer={<><Button variant="outline" onClick={() => setPublishModalOpen(false)} disabled={isScheduling}>Cancel</Button><Button type="submit" form="publish-schedule-form" isLoading={isScheduling} disabled={isScheduling}>Schedule</Button></>}>
        {activeCopy && (
          <form id="publish-schedule-form" onSubmit={handlePublishConfirm} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">{getDisplayText(activeCopy)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <p className="text-sm text-gray-600 flex items-center gap-2"><Icon icon={getPlatformConfig(activeCopy.platform).icon} className="w-4 h-4" style={{ color: getPlatformConfig(activeCopy.platform).color }} />{getPlatformConfig(activeCopy.platform).name}</p>
            </div>
            {activeCopy.hashtags.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
                <div className="flex flex-wrap gap-1.5">{activeCopy.hashtags.map((h, i) => (<span key={i} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700">{h.startsWith('#') ? h : `#${h}`}</span>))}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input label="Date" type="date" value={publishDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPublishDate(e.target.value); setPublishErrors(prev => ({ ...prev, date: undefined })); }} error={publishErrors.date} id="publish-date-input" />
              <Input label="Time" type="time" value={publishTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setPublishTime(e.target.value); setPublishErrors(prev => ({ ...prev, time: undefined })); }} error={publishErrors.time} id="publish-time-input" />
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
    <button onClick={onClick} className="p-2 rounded-lg text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-low)] transition-colors" aria-label={label} title={label}>
      <Icon icon={icon} className="w-5 h-5" />
    </button>
  );
}

function StrategySelector({ strategies, selectedStrategyId, onChange, loading }: { strategies: StrategyRecord[]; selectedStrategyId: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; loading: boolean; }) {
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

function CopywriterHeader() {
  return (
    <div className="mb-2">
      <h1 className="text-3xl font-bold text-[var(--on-surface)] tracking-tight mb-2">Copywriter Agent</h1>
      <p className="text-[var(--outline)] text-base leading-relaxed max-w-xl">Transform your brand strategy into high-converting social copy. Select a curated strategy to begin the generation process.</p>
    </div>
  );
}

function StrategyPickerModal({ strategies, filter, onFilterChange, sortBy, onSortChange, onSelect, onClose, getIndustryIcon }: { strategies: StrategyRecord[]; filter: string; onFilterChange: (f: string) => void; sortBy: 'recent' | 'name'; onSortChange: (s: 'recent' | 'name') => void; onSelect: (id: string) => void; onClose: () => void; getIndustryIcon: (industry: string) => { icon: string; bg: string; color: string }; }) {
  const industries = Array.from(new Set(strategies.map(s => s.industry)));
  const filtered = filter === 'all' ? strategies : strategies.filter(s => s.industry.toLowerCase() === filter.toLowerCase());
  const sorted = [...filtered].sort((a, b) => sortBy === 'name' ? a.brandName.localeCompare(b.brandName) : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `Updated ${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Updated ${days}d ago`;
    return `Updated ${Math.floor(days / 7)}w ago`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Select a strategy">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--surface)] rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col mx-4 overflow-hidden">
        <div className="px-8 pt-8 pb-4 flex-shrink-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-3xl font-bold text-[var(--on-surface)] tracking-tight">My Strategies</h2>
              <p className="text-base text-[var(--outline)] mt-1">Curate and manage your high-performance copywriting frameworks.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.location.href = '/dashboard/strategist'} className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-base font-semibold text-white transition-colors" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-container))' }}>
                <Icon icon="solar:add-circle-bold" className="w-4 h-4" />Create New Strategy
              </button>
              <button onClick={onClose} className="p-2 rounded-xl text-[var(--outline)] hover:text-[var(--on-surface)] hover:bg-[var(--surface-container-high)] transition-colors" aria-label="Close"><Icon icon="solar:close-circle-bold" className="w-6 h-6" /></button>
            </div>
          </div>
          <div className="flex items-center justify-between mt-5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={() => onFilterChange('all')} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-container-low)] text-[var(--outline)] hover:bg-[var(--surface-container-high)]'}`}>All</button>
              {industries.map(ind => (<button key={ind} onClick={() => onFilterChange(ind)} className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${filter.toLowerCase() === ind.toLowerCase() ? 'bg-[var(--primary)] text-white' : 'bg-[var(--surface-container-low)] text-[var(--outline)] hover:bg-[var(--surface-container-high)]'}`}>{ind}</button>))}
            </div>
            <div className="flex items-center gap-1.5 text-sm text-[var(--outline)] flex-shrink-0 ml-4">
              <span className="uppercase tracking-wider font-semibold">Sort by:</span>
              <button onClick={() => onSortChange(sortBy === 'recent' ? 'name' : 'recent')} className="font-semibold text-[var(--primary)] hover:underline flex items-center gap-0.5">{sortBy === 'recent' ? 'Recent' : 'Name'}<Icon icon="solar:alt-arrow-down-linear" className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
        <div className="px-8 pb-8 pt-2 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map(s => {
              const iconInfo = getIndustryIcon(s.industry);
              const desc = s.strategyOutput?.contentPillars?.[0] || s.goals || '';
              return (
                <div key={s.id} className="bg-white rounded-2xl p-5 border border-[var(--ghost-border)] hover:shadow-md transition-all flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: iconInfo.bg }}><Icon icon={iconInfo.icon} className="w-6 h-6" style={{ color: iconInfo.color }} /></div>
                    <span className="text-xs font-semibold tracking-wider uppercase text-[var(--outline)] bg-[var(--surface-container-low)] px-3 py-1 rounded-full">{s.industry}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--on-surface)] mb-1">{s.brandName}</h3>
                  <p className="text-sm text-[var(--outline)] leading-relaxed mb-4 line-clamp-2 flex-1">{desc.length > 80 ? desc.substring(0, 80) + '...' : desc}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-[var(--outline-variant)]">{formatRelativeTime(s.createdAt)}</span>
                    <div className="flex items-center gap-2">
                      <Icon icon="solar:document-text-linear" className="w-5 h-5 text-[var(--outline-variant)]" />
                      <button onClick={() => onSelect(s.id)} className="px-4 py-2 rounded-lg text-sm font-semibold text-[var(--primary)] bg-[var(--surface-container-low)] hover:bg-[var(--primary)] hover:text-white transition-colors">Use</button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button onClick={() => { onClose(); window.location.href = '/dashboard/strategist'; }} className="rounded-2xl p-5 border-2 border-dashed border-[var(--outline-variant)] hover:border-[var(--primary)] flex flex-col items-center justify-center gap-2 min-h-[180px] transition-colors">
              <Icon icon="solar:add-circle-linear" className="w-9 h-9 text-[var(--outline-variant)]" />
              <span className="text-base font-semibold text-[var(--on-surface)]">New Framework</span>
              <span className="text-xs text-[var(--outline)]">Start from scratch</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBanner({ error, onDismiss }: { error: string; onDismiss: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-4" role="alert">
      <Icon icon="solar:danger-triangle-bold" className="w-6 h-6 text-red-500 flex-shrink-0" />
      <p className="text-base text-red-700 flex-1">{error}</p>
      <button onClick={onDismiss} className="text-red-400 hover:text-red-600" aria-label="Dismiss error"><Icon icon="solar:close-circle-bold" className="w-6 h-6" /></button>
    </div>
  );
}
