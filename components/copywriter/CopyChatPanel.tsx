'use client';

import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import type { CopyChatMessage, CopyJob, CopyRecord } from '@/types/agent';
import { platformInfo } from './platforms';

const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

interface CopyChatPanelProps {
  brandName: string | null;
  messages: CopyChatMessage[];
  /** The user's message while it's being answered */
  pending: string | null;
  job: CopyJob | null;
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

export function CopyChatPanel({ brandName, messages, pending, job, openCopy, disabled, onSend, onShowCopy, onClose }: CopyChatPanelProps) {
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const running = job?.status === 'running';
  const busy = pending !== null;

  // Keep the newest message in view
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, running]);

  const send = (text: string) => {
    const message = text.trim();
    if (!message || busy || disabled) return;
    onSend(message);
    setDraft('');
  };

  const prompts = openCopy ? OPEN_COPY_PROMPTS : GENERAL_PROMPTS;
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
          <ChatBubble key={m.id} message={m} onShowCopy={onShowCopy} />
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

        {running && (
          <div className="bg-[#eff4ff] rounded-2xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className={`${LABEL_SM} text-[#3525cd]`}>Writing your full set</span>
              <span className={`${LABEL_SM} text-[#464555]`}>
                {jobProgress(job!)} / {job!.total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white overflow-hidden">
              <div className="h-full bg-[#4f46e5] rounded-full transition-all duration-500" style={{ width: `${(jobProgress(job!) / job!.total) * 100}%` }} />
            </div>
          </div>
        )}
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
