'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CopyChatMessage, CopyJob, CopyRecord } from '@/types/agent';
import type { StrategyRecord } from '@/types/strategy';
import { listStrategies } from '@/lib/api/strategyClient';
import { deleteCopy, followCopyJob, getCopyWorkspace, sendCopyChat, startCopyJob, type CopyJobLane } from '@/lib/api/copyClient';
import { COPY_PLATFORMS, COPY_PLATFORM_IDS, normalizePlatform } from '@/lib/models/copyConstants';
import { CopyCard, CopyCardSkeleton } from './CopyCard';
import { CopyEditor } from './CopyEditor';
import { CopyChatPanel } from './CopyChatPanel';
import { PLATFORM_STYLE, platformInfo } from './platforms';

const LABEL_MD = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold';
const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

/** How often to check on a running job */
const POLL_MS = 2000;
/** How long a newly arrived copy keeps its "New" badge */
const FRESH_MS = 8000;
/** Copies per platform in a full set (matches COPIES_PER_PLATFORM on the server) */
const COPIES_PER_PLATFORM = 7;
const LAST_STRATEGY_KEY = 'copywriter:lastStrategy';

interface Workspace {
  strategyId: string;
  copies: CopyRecord[];
  job: CopyJob | null;
  chat: CopyChatMessage[];
}

function strategyLabel(s: StrategyRecord): string {
  const niche = s.quiz?.niches[0];
  return niche ? `${niche.emoji} ${niche.label}` : s.industry;
}

/**
 * Newest first, but a full set stays together in the order it was written,
 * so a running set fills in like a grid instead of shuffling.
 */
function sortCopies(copies: CopyRecord[]): CopyRecord[] {
  const setStart = new Map<string, string>();
  for (const c of copies) {
    if (c.jobId && (!setStart.has(c.jobId) || c.createdAt < setStart.get(c.jobId)!)) setStart.set(c.jobId, c.createdAt);
  }
  const groupTime = (c: CopyRecord) => (c.jobId ? setStart.get(c.jobId)! : c.createdAt);
  return [...copies].sort((a, b) => groupTime(b).localeCompare(groupTime(a)) || a.createdAt.localeCompare(b.createdAt));
}

export function CopywriterWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const strategyId = searchParams.get('strategy');

  const [strategies, setStrategies] = useState<StrategyRecord[] | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>('all');
  const [openCopyId, setOpenCopyId] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  // What each platform of the running set is writing right now
  const [live, setLive] = useState<{ jobId: string; lanes: Record<string, CopyJobLane> } | null>(null);
  // While a chat message is in flight, polling leaves the chat alone so it doesn't flicker
  const sendingRef = useRef(false);

  useEffect(() => {
    listStrategies()
      .then(setStrategies)
      .catch(() => {
        setStrategies([]);
        setLoadError('Couldn’t load your strategies. Please refresh the page.');
      });
  }, []);

  const selectStrategy = useCallback(
    (id: string) => {
      setOpenCopyId(null);
      setPlatform('all');
      setFresh(new Set());
      setActionError(null);
      router.replace(`/dashboard/copywriter?strategy=${encodeURIComponent(id)}`);
    },
    [router]
  );

  // With no strategy in the URL, reopen the last one used
  useEffect(() => {
    if (strategyId || !strategies?.length) return;
    let last: string | null = null;
    try {
      last = localStorage.getItem(LAST_STRATEGY_KEY);
    } catch {}
    if (last && strategies.some((s) => s.id === last)) selectStrategy(last);
  }, [strategyId, strategies, selectStrategy]);

  const markFresh = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setFresh((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setFresh((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }, FRESH_MS);
  }, []);

  const refresh = useCallback(
    (id: string) =>
      getCopyWorkspace(id).then((data) => {
        setWorkspace((prev) => {
          if (prev?.strategyId === id) {
            const known = new Set(prev.copies.map((c) => c.id));
            markFresh(data.copies.filter((c) => !known.has(c.id)).map((c) => c.id));
          }
          return {
            strategyId: id,
            copies: data.copies,
            job: data.job,
            chat: sendingRef.current && prev?.strategyId === id ? prev.chat : data.chat,
          };
        });
        setLoadError(null);
      }),
    [markFresh]
  );

  // Load the selected strategy's workspace
  useEffect(() => {
    if (!strategyId) return;
    refresh(strategyId)
      .then(() => {
        // Remember it, however it was opened, so the page comes back to it
        try {
          localStorage.setItem(LAST_STRATEGY_KEY, strategyId);
        } catch {}
      })
      .catch((err) =>
      setLoadError(err instanceof Error ? err.message : 'Couldn’t load your copies. Please try again.')
    );
  }, [strategyId, refresh]);

  // While a full set is being written, check for new copies every couple of seconds
  const running = workspace?.strategyId === strategyId && workspace?.job?.status === 'running';
  useEffect(() => {
    if (!running || !strategyId) return;
    const timer = setInterval(() => {
      refresh(strategyId).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [running, strategyId, refresh]);

  // Follow the running set's live text; each finished copy also refreshes the cards straight away
  const runningJobId = running ? workspace!.job!.id : null;
  useEffect(() => {
    if (!runningJobId || !strategyId) return;
    const controller = new AbortController();
    followCopyJob(
      strategyId,
      runningJobId,
      (event) => {
        if (event.type === 'update') setLive({ jobId: runningJobId, lanes: event.lanes });
        else refresh(strategyId).catch(() => {});
      },
      controller.signal
    );
    return () => controller.abort();
  }, [runningJobId, strategyId, refresh]);

  const strategy = strategies?.find((s) => s.id === strategyId) ?? null;
  const ready = !!strategyId && workspace?.strategyId === strategyId;
  const copies = useMemo(() => (ready ? sortCopies(workspace!.copies) : []), [ready, workspace]);
  const job = ready ? workspace!.job : null;
  const chat = ready ? workspace!.chat : [];
  const openCopy = copies.find((c) => c.id === openCopyId) ?? null;

  const countFor = (p: string) => copies.filter((c) => normalizePlatform(c.platform) === p).length;
  const otherCount = copies.filter((c) => !(normalizePlatform(c.platform) in COPY_PLATFORMS)).length;
  const visible = platform === 'all' ? copies : copies.filter((c) => platformInfo(c.platform).id === platform);
  const skeletons = running
    ? COPY_PLATFORM_IDS.filter((p) => platform === 'all' || platform === p)
        .filter((p) => !job!.failedPlatforms.includes(p))
        .flatMap((p) => Array.from({ length: Math.max(0, COPIES_PER_PLATFORM - (job!.completed[p] ?? 0)) }, (_, i) => `${p}-${i}`))
    : [];

  const currentSet = running ? visible.filter((c) => c.jobId === job!.id) : [];
  const older = running ? visible.filter((c) => c.jobId !== job!.id) : visible;

  const generate = async () => {
    if (!strategyId) return;
    setStarting(true);
    setActionError(null);
    try {
      const started = await startCopyJob(strategyId);
      setWorkspace((prev) => (prev?.strategyId === strategyId ? { ...prev, job: started } : prev));
      setOpenCopyId(null);
      await refresh(strategyId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Couldn’t start generating copies.');
    } finally {
      setStarting(false);
    }
  };

  const send = async (message: string) => {
    if (!strategyId) return;
    setPending(message);
    setActionError(null);
    sendingRef.current = true;
    try {
      const result = await sendCopyChat(strategyId, message, openCopyId ?? undefined);
      setWorkspace((prev) => {
        if (prev?.strategyId !== strategyId) return prev;
        const ids = new Set(prev.chat.map((m) => m.id));
        const copies = result.copy
          ? [result.copy, ...prev.copies.filter((c) => c.id !== result.copy!.id)]
          : prev.copies;
        return {
          ...prev,
          copies,
          job: result.job ?? prev.job,
          chat: [...prev.chat, ...result.messages.filter((m) => !ids.has(m.id))],
        };
      });
      if (result.copy) markFresh([result.copy.id]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'The copywriter couldn’t answer.');
      // The server saved the question (and an apology); show them
      sendingRef.current = false;
      await refresh(strategyId).catch(() => {});
    } finally {
      sendingRef.current = false;
      setPending(null);
    }
  };

  const removeCopy = async (id: string) => {
    await deleteCopy(id);
    if (openCopyId === id) setOpenCopyId(null);
    setWorkspace((prev) => (prev ? { ...prev, copies: prev.copies.filter((c) => c.id !== id) } : prev));
  };

  const showCopy = (id: string) => {
    if (!copies.some((c) => c.id === id)) return;
    setOpenCopyId(id);
    setChatOpen(false);
  };

  const chatPanel = (onClose?: () => void) => (
    <CopyChatPanel
      brandName={strategy?.brandName ?? null}
      messages={chat}
      pending={pending}
      job={job}
      lanes={live && live.jobId === job?.id ? live.lanes : null}
      jobCopies={job ? copies.filter((c) => c.jobId === job.id) : []}
      openCopy={openCopy}
      disabled={!ready}
      onSend={send}
      onShowCopy={showCopy}
      onClose={onClose}
    />
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-78px-60px)] font-heading">
      {/* Results */}
      <div className="flex-1 min-w-0 lg:overflow-y-auto lg:pr-1">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 mb-5">
          <div className="min-w-0">
            <h1 className="text-[28px] leading-[36px] tracking-[-0.025em] font-bold text-[#0b1c30]">Copywriter</h1>
            <p className="text-[14px] text-[#464555]">Platform-ready copy from your strategy.</p>
          </div>
          {strategies && strategies.length > 0 && (
            <div className="ml-auto flex items-center gap-2 min-w-0">
              <label htmlFor="copy-strategy" className="sr-only">Strategy</label>
              <select
                id="copy-strategy"
                value={strategyId ?? ''}
                onChange={(e) => e.target.value && selectStrategy(e.target.value)}
                className="min-w-0 max-w-[260px] h-10 pl-3.5 pr-9 rounded-xl bg-white border border-[#c7c4d8]/50 text-[14px] font-semibold text-[#0b1c30] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] truncate"
              >
                <option value="" disabled>
                  Choose a strategy…
                </option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.brandName} — {strategyLabel(s)}
                  </option>
                ))}
              </select>
              {ready && (
                <button
                  type="button"
                  onClick={generate}
                  disabled={running || starting}
                  className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#4f46e5] text-white shadow-sm hover:opacity-95 disabled:opacity-50 whitespace-nowrap ${LABEL_MD}`}
                >
                  <Icon
                    icon={running || starting ? 'material-symbols:progress-activity' : 'material-symbols:auto-awesome'}
                    width={17}
                    height={17}
                    className={running || starting ? 'animate-spin' : ''}
                  />
                  <span className="text-inherit">{running ? 'Writing…' : 'Generate full set'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {(loadError || actionError) && (
          <div className="mb-4 bg-[#ffdad6]/60 text-[#93000a] rounded-xl px-4 py-3 text-[13px] font-medium flex items-center gap-2" role="alert">
            <Icon icon="material-symbols:error-outline" width={18} height={18} />
            <span className="text-inherit flex-1">{actionError ?? loadError}</span>
            {actionError && (
              <button type="button" onClick={() => setActionError(null)} aria-label="Dismiss" className="text-inherit">
                <Icon icon="material-symbols:close" width={16} height={16} />
              </button>
            )}
          </div>
        )}

        {ready && job?.status === 'failed' && job.error && !running && (
          <div className="mb-4 bg-amber-50 text-amber-800 rounded-xl px-4 py-3 text-[13px] font-medium flex items-center gap-2">
            <Icon icon="material-symbols:warning-outline" width={18} height={18} />
            <span className="text-inherit flex-1">{job.error}</span>
          </div>
        )}

        {strategies === null || (strategyId && !ready && !loadError) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4" aria-label="Loading">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-white/70 animate-pulse" />
            ))}
          </div>
        ) : !strategyId ? (
          <StrategyPicker strategies={strategies} onPick={selectStrategy} />
        ) : !ready ? null : openCopy ? (
          <CopyEditor
            key={`${openCopy.id}:${openCopy.updatedAt}`}
            copy={openCopy}
            onBack={() => setOpenCopyId(null)}
            onSaved={(saved) =>
              setWorkspace((prev) => (prev ? { ...prev, copies: prev.copies.map((c) => (c.id === saved.id ? saved : c)) } : prev))
            }
            onDelete={() => removeCopy(openCopy.id)}
          />
        ) : (
          <>
            {/* Platform tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4" role="tablist" aria-label="Platforms">
              <PlatformTab active={platform === 'all'} onClick={() => setPlatform('all')} label="All" count={copies.length} />
              {COPY_PLATFORM_IDS.map((p) => (
                <PlatformTab
                  key={p}
                  active={platform === p}
                  onClick={() => setPlatform(p)}
                  label={COPY_PLATFORMS[p].label}
                  icon={PLATFORM_STYLE[p].icon}
                  count={countFor(p)}
                  writing={running && !job!.failedPlatforms.includes(p) && (job!.completed[p] ?? 0) < COPIES_PER_PLATFORM}
                />
              ))}
              {otherCount > 0 && (
                <PlatformTab active={platform === 'other'} onClick={() => setPlatform('other')} label="Other" count={otherCount} />
              )}
            </div>

            {visible.length === 0 && skeletons.length === 0 ? (
              <EmptyCopies hasAny={copies.length > 0} onGenerate={generate} starting={starting} />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 pb-6">
                {/* The running set's copies, then what's still being written, then everything older */}
                {[...currentSet, ...skeletons, ...older].map((item) =>
                  typeof item === 'string' ? (
                    <CopyCardSkeleton key={item} platform={item.split('-')[0]} />
                  ) : (
                    <CopyCard
                      key={item.id}
                      copy={item}
                      fresh={fresh.has(item.id)}
                      onOpen={() => setOpenCopyId(item.id)}
                      onDelete={() => removeCopy(item.id)}
                    />
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chat: fixed on the right on large screens, a sheet on smaller ones */}
      <aside className="hidden lg:block w-[clamp(460px,45%,720px)] shrink-0 h-full">{chatPanel()}</aside>

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className={`lg:hidden fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 h-12 px-5 rounded-full bg-[#4f46e5] text-white shadow-lg ${LABEL_MD}`}
      >
        <Icon icon={running || pending ? 'material-symbols:progress-activity' : 'material-symbols:chat-outline'} width={18} height={18} className={running || pending ? 'animate-spin' : ''} />
        <span className="text-inherit">Copywriter chat</span>
      </button>
      {chatOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/30 backdrop-blur-sm p-3 flex" role="dialog" aria-modal="true" aria-label="Copywriter chat">
          <div className="flex-1 max-w-lg ml-auto">{chatPanel(() => setChatOpen(false))}</div>
        </div>
      )}
    </div>
  );
}

function PlatformTab({
  active,
  onClick,
  label,
  icon,
  count,
  writing = false,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: string;
  count: number;
  writing?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-2 h-9 px-3.5 rounded-full transition-colors ${LABEL_MD} ${
        active ? 'bg-[#4f46e5] text-white shadow-sm' : 'bg-white text-[#464555] hover:bg-[#e5eeff]'
      }`}
    >
      {icon && <Icon icon={icon} width={14} height={14} />}
      <span className="text-inherit">{label}</span>
      {writing ? (
        <Icon icon="material-symbols:progress-activity" width={13} height={13} className="animate-spin" />
      ) : (
        <span className={`${LABEL_SM} px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-[#eff4ff] text-[#464555]'}`}>{count}</span>
      )}
    </button>
  );
}

function EmptyCopies({ hasAny, onGenerate, starting }: { hasAny: boolean; onGenerate: () => void; starting: boolean }) {
  return (
    <div className="bg-white rounded-2xl p-10 shadow-sm text-center flex flex-col items-center gap-3">
      <span className="w-12 h-12 rounded-full bg-[#e2dfff] flex items-center justify-center">
        <Icon icon="material-symbols:edit-note" width={24} height={24} className="text-[#4f46e5]" />
      </span>
      <p className="text-[16px] font-bold text-[#0b1c30]">{hasAny ? 'No copies for this platform yet' : 'No copies yet'}</p>
      <p className="text-[14px] text-[#464555] max-w-md">
        Generate a full set — 7 copies each for X, Instagram, LinkedIn and Facebook — or ask the copywriter for a single post.
        You can leave while it writes; your copies will be here when you come back.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={starting}
        className={`inline-flex items-center gap-1.5 px-5 py-2.5 mt-1 bg-[#4f46e5] text-white rounded-xl shadow-sm hover:opacity-95 disabled:opacity-50 ${LABEL_MD}`}
      >
        <Icon icon="material-symbols:auto-awesome" width={17} height={17} />
        <span className="text-inherit">Generate full set</span>
      </button>
    </div>
  );
}

function StrategyPicker({ strategies, onPick }: { strategies: StrategyRecord[]; onPick: (id: string) => void }) {
  if (strategies.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-10 shadow-sm text-center flex flex-col items-center gap-3">
        <p className="text-[16px] font-bold text-[#0b1c30]">You need a strategy first</p>
        <p className="text-[14px] text-[#464555]">The copywriter writes from your brand strategy.</p>
        <Link
          href="/dashboard/strategist/new"
          className={`inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#4f46e5] text-white rounded-xl shadow-sm hover:opacity-95 ${LABEL_MD}`}
        >
          <Icon icon="material-symbols:add" width={18} height={18} />
          <span className="text-inherit">Create a strategy</span>
        </Link>
      </div>
    );
  }
  return (
    <div>
      <p className={`${LABEL_SM} text-[#777587] uppercase mb-3`}>Pick a strategy to write from</p>
      <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4">
        {strategies.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s.id)}
            className="text-left bg-white rounded-2xl p-5 shadow-sm border border-[#c7c4d8]/25 hover:shadow-md hover:border-[#4f46e5]/30 transition-all flex items-center gap-3"
          >
            <span className="w-11 h-11 rounded-xl bg-[#e2dfff] flex items-center justify-center text-[22px] shrink-0" aria-hidden="true">
              {s.quiz?.niches[0]?.emoji ?? '✨'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold text-[#0b1c30] truncate">{s.brandName}</span>
              <span className="block text-[13px] text-[#464555] truncate">{s.quiz?.niches.map((n) => n.label).join(', ') ?? s.industry}</span>
            </span>
            <Icon icon="material-symbols:arrow-forward" width={18} height={18} className="text-[#3525cd] shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
