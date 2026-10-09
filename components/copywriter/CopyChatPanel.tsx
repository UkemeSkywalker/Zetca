'use client';

import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import type { CopyChatMessage, CopyJob, CopyRecord } from '@/types/agent';
import type { CopyJobLane } from '@/lib/api/copyClient';
import { COPY_PLATFORM_IDS } from '@/lib/models/copyConstants';
import { platformInfo } from './platforms';

const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

interface CopyChatPanelProps {
  brandName: string | null;
  messages: CopyChatMessage[];
  /** The user's message while it's being answered */
  pending: string | null;
  job: CopyJob | null;
  /** What each platform of the running set is writing right now (null until the live feed connects) */
  lanes: Record<string, CopyJobLane> | null;
  /** Copies written by the latest set, for its summary */
  jobCopies: CopyRecord[];
  /** The copy open in the editor; requests like "make it punchier" apply to it */
  openCopy: CopyRecord | null;
  disabled: boolean;
  onSend: (message: string) => void;
  onShowCopy: (copyId: string) => void;
  onClose?: () => void;
}

const GENERAL_PROMPTS = [
  'Write a LinkedIn post about our biggest customer win',
  'Write an Instagram caption for a behind-the-scenes photo',
  'Write a short X post announcing something new',
  'Generate a full set for every platform',
];

const OPEN_COPY_PROMPTS = ['Make it punchier', 'Shorten it', 'Add a stronger call to action', 'Try a more playful tone'];

function jobProgress(job: CopyJob): number {
  return Object.values(job.completed).reduce((sum, n) => sum + n, 0);
}

export function CopyChatPanel({ brandName, messages, pending, job, lanes, jobCopies, openCopy, disabled, onSend, onShowCopy, onClose }: CopyChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const running = job?.status === 'running';
  const busy = pending !== null;

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, running, lanes]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || busy || disabled) return;
    onSend(message);
    setDraft('');
  };

  const prompts = openCopy ? OPEN_COPY_PROMPTS : GENERAL_PROMPTS;
  // The finished set's summary goes just before the message announcing it's done
  const summaryAfter =
    job && job.status !== 'running' && job.finishedAt
      ? [...messages].reverse().find((m) => m.action === 'job_done' || m.action === 'job_failed')?.id
      : undefined;
  const openInfo = openCopy ? platformInfo(openCopy.platform) : null;

  return (
    <section className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-[#c7c4d8]/25 overflow-hidden" aria-label="Copywriter chat">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#e5eeff] flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0">
          <Icon icon="material-symbols:edit-note" width={20} height={20} className="text-white" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-[#0b1c30] leading-tight">Copywriter</h2>
          <p className="text-[12px] text-[#777587] truncate">
            {running
              ? `Writing copies · ${jobProgress(job!)} of ${job!.total}`
              : busy
                ? 'Thinking…'
                : brandName
                  ? `Working on ${brandName}`
                  : 'Pick a strategy to start'}
          </p>
        </div>
        {(running || busy) && <Icon icon="material-symbols:progress-activity" width={18} height={18} className="text-[#4f46e5] animate-spin" />}
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Close chat" className="w-8 h-8 rounded-lg flex items-center justify-center text-[#777587] hover:bg-[#eff4ff]">
            <Icon icon="material-symbols:close" width={18} height={18} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" aria-live="polite">
        {messages.length === 0 && !busy && (
          <div className="text-center px-3 py-6">
            <span className="w-11 h-11 rounded-full bg-[#e2dfff] inline-flex items-center justify-center mb-3">
              <Icon icon="material-symbols:auto-awesome" width={20} height={20} className="text-[#4f46e5]" />
            </span>
            <p className="text-[14px] font-bold text-[#0b1c30]">What should we write?</p>
            <p className="text-[13px] leading-[20px] text-[#464555] mt-1">
              Ask for a single post, have me rewrite one you&apos;ve opened, or generate a full set — copies appear on the left as they&apos;re written.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="space-y-3">
            {m.id === summaryAfter && job && <SetSummary job={job} copies={jobCopies} onShowCopy={onShowCopy} />}
            <ChatBubble message={m} onShowCopy={onShowCopy} />
          </div>
        ))}

        {pending !== null && (
          <>
            <ChatBubble message={{ id: 'pending', role: 'user', text: pending, createdAt: '' }} onShowCopy={onShowCopy} />
            <div className="flex gap-1.5 px-4 py-3 bg-[#eff4ff] rounded-2xl rounded-bl-md w-fit" aria-label="Copywriter is typing">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 rounded-full bg-[#4f46e5]/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </>
        )}

        {running && <LiveWriting job={job!} lanes={lanes} />}
      </div>

      {/* Composer */}
      <div className="border-t border-[#e5eeff] p-3">
        {!disabled && !busy && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-0.5 px-0.5" role="group" aria-label="Suggestions">
            {prompts.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                disabled={running && p.startsWith('Generate')}
                className="shrink-0 px-3 py-1.5 rounded-full bg-[#eff4ff] text-[12px] font-semibold text-[#3525cd] hover:bg-[#e2dfff] disabled:opacity-40 whitespace-nowrap"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {openCopy && openInfo && (
          <div className="flex items-center gap-2 mb-2 px-2.5 py-1.5 rounded-lg bg-[#e2dfff]/60">
            <Icon icon={openInfo.icon} width={12} height={12} className="text-[#3525cd] shrink-0" />
            <span className="text-[12px] font-semibold text-[#3525cd] truncate">
              Editing: {openInfo.label}
              {openCopy.angle ? ` · ${openCopy.angle}` : ''}
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-end gap-2"
        >
          <label htmlFor="copy-chat-input" className="sr-only">Message the copywriter</label>
          <textarea
            id="copy-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            rows={1}
            maxLength={2000}
            disabled={disabled}
            placeholder={
              disabled ? 'Pick a strategy first' : openCopy ? 'Tell me how to change this copy…' : 'Ask for a post, a caption, or a full set…'
            }
            className="flex-1 resize-none max-h-32 min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#eff4ff] text-[14px] leading-[22px] text-[#0b1c30] placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#4f46e5] disabled:opacity-60 [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || busy || disabled}
            aria-label="Send"
            className="w-11 h-11 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shrink-0 hover:opacity-95 disabled:opacity-40"
          >
            <Icon icon="material-symbols:send" width={18} height={18} />
          </button>
        </form>
      </div>
    </section>
  );
}

function ChatBubble({ message, onShowCopy }: { message: CopyChatMessage; onShowCopy: (copyId: string) => void }) {
  const mine = message.role === 'user';
  const linksToCopy = !mine && message.copyId && (message.action === 'create' || message.action === 'update');
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] px-4 py-2.5 rounded-2xl text-[14px] leading-[21px] whitespace-pre-line ${
          mine
            ? 'bg-[#4f46e5] text-white rounded-br-md'
            : message.action === 'job_failed'
              ? 'bg-[#ffdad6]/60 text-[#93000a] rounded-bl-md'
              : 'bg-[#eff4ff] text-[#0b1c30] rounded-bl-md'
        }`}
      >
        <span className="text-inherit">{message.text}</span>
        {linksToCopy && (
          <button
            type="button"
            onClick={() => onShowCopy(message.copyId!)}
            className="mt-1.5 flex items-center gap-1 text-[12px] font-bold text-[#3525cd] hover:underline"
          >
            {message.action === 'update' ? 'See the update' : 'Open the new copy'}
            <Icon icon="material-symbols:arrow-forward" width={13} height={13} />
          </button>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/** Seconds since `since`, ticking */
function useElapsed(since: string): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now - new Date(since).getTime();
}

/** The running set, streamed: one line per platform showing the copy being typed */
function LiveWriting({ job, lanes }: { job: CopyJob; lanes: Record<string, CopyJobLane> | null }) {
  const elapsed = useElapsed(job.startedAt);
  const done = jobProgress(job);
  return (
    <div className="bg-[#f8f9ff] border border-[#e5eeff] rounded-2xl overflow-hidden">
      <div className="px-4 pt-3 pb-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`${LABEL_SM} text-[#3525cd] inline-flex items-center gap-1.5`}>
            <Icon icon="material-symbols:progress-activity" width={13} height={13} className="animate-spin" />
            Writing your full set
          </span>
          <span className={`${LABEL_SM} text-[#464555] tabular-nums`}>
            {done} / {job.total} · {formatDuration(elapsed)}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white overflow-hidden">
          <div className="h-full bg-[#4f46e5] rounded-full transition-all duration-500" style={{ width: `${(done / job.total) * 100}%` }} />
        </div>
      </div>
      <ul className="divide-y divide-[#e5eeff] border-t border-[#e5eeff]">
        {COPY_PLATFORM_IDS.map((p) => {
          const info = platformInfo(p);
          const lane = lanes?.[p];
          const written = Math.max(lane?.written ?? 0, job.completed[p] ?? 0);
          const failed = job.failedPlatforms.includes(p);
          const finished = failed || lane?.done || written >= 7;
          return (
            <li key={p} className="px-4 py-2.5 flex gap-2.5">
              <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${info.badge}`}>
                <Icon icon={info.icon} width={12} height={12} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-[#0b1c30]">
                  <span className="text-inherit">{info.label}</span>
                  {!finished && lane?.angle && <span className="text-[#777587] font-semibold truncate">· {lane.angle}</span>}
                  <span className={`ml-auto shrink-0 tabular-nums ${failed ? 'text-[#ba1a1a]' : finished ? 'text-emerald-700' : 'text-[#777587]'}`}>
                    {failed ? 'Failed' : finished ? `✓ ${written} written` : `${written} / 7`}
                  </span>
                </p>
                {!finished && (
                  <p className="mt-0.5 text-[13px] leading-[19px] text-[#464555] line-clamp-3 break-words">
                    {lane?.text ? (
                      <span className="text-inherit">{lane.text}</span>
                    ) : (
                      <span className="text-[#777587] italic">{lanes ? 'Starting…' : 'Connecting…'}</span>
                    )}
                    <span className="inline-block w-1.5 h-3.5 bg-[#4f46e5] ml-0.5 align-middle animate-pulse" aria-hidden="true" />
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A finished set: "Wrote 28 copies in 1m 17s", expandable to the list of copies */
function SetSummary({ job, copies, onShowCopy }: { job: CopyJob; copies: CopyRecord[]; onShowCopy: (copyId: string) => void }) {
  const [open, setOpen] = useState(false);
  const took = formatDuration(new Date(job.finishedAt!).getTime() - new Date(job.startedAt).getTime());
  const written = jobProgress(job);
  return (
    <div className="rounded-2xl border border-[#e5eeff] bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-left text-[13px] font-semibold text-[#464555] hover:bg-[#f8f9ff] rounded-2xl"
      >
        <Icon icon="material-symbols:edit-note" width={17} height={17} className="text-[#4f46e5]" />
        <span className="text-inherit flex-1">
          Wrote {written} {written === 1 ? 'copy' : 'copies'} in {took}
        </span>
        <Icon icon={open ? 'material-symbols:expand-less' : 'material-symbols:expand-more'} width={18} height={18} />
      </button>
      {open && (
        <ul className="px-2 pb-2 max-h-72 overflow-y-auto">
          {copies.length === 0 && <li className="px-2 py-1.5 text-[12px] text-[#777587]">These copies have been deleted.</li>}
          {copies.map((c) => {
            const info = platformInfo(c.platform);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onShowCopy(c.id)}
                  className="w-full px-2 py-1.5 rounded-lg flex items-center gap-2 text-left hover:bg-[#eff4ff]"
                >
                  <Icon icon={info.icon} width={12} height={12} className="shrink-0 text-[#464555]" />
                  {c.angle && <span className="text-[11px] font-bold text-[#3525cd] shrink-0">{c.angle}</span>}
                  <span className="text-[12px] text-[#464555] truncate">{c.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
