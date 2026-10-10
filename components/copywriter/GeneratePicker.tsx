'use client';

import { Icon } from '@iconify/react';
import { useEffect, useRef, useState } from 'react';
import { COPY_PLATFORMS, COPY_PLATFORM_IDS, type CopyPlatformId } from '@/lib/models/copyConstants';
import { PLATFORM_STYLE } from './platforms';

const LABEL_MD = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold';
/** Copies per platform in a set (matches COPIES_PER_PLATFORM on the server) */
const COPIES_PER_PLATFORM = 7;

interface GeneratePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Platforms ticked when the picker opens (read each time it opens) */
  getInitial: () => CopyPlatformId[];
  running: boolean;
  starting: boolean;
  onGenerate: (platforms: CopyPlatformId[]) => void;
}

/** "Generate copies" button with a panel to choose which platforms to write for */
export function GeneratePicker({ open, onOpenChange, getInitial, running, starting, onGenerate }: GeneratePickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const busy = running || starting;

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onOpenChange(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onOpenChange]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#4f46e5] text-white shadow-sm hover:opacity-95 disabled:opacity-50 whitespace-nowrap ${LABEL_MD}`}
      >
        <Icon
          icon={busy ? 'material-symbols:progress-activity' : 'material-symbols:auto-awesome'}
          width={17}
          height={17}
          className={busy ? 'animate-spin' : ''}
        />
        <span className="text-inherit">{running ? 'Writing…' : 'Generate copies'}</span>
        {!busy && <Icon icon={open ? 'material-symbols:expand-less' : 'material-symbols:expand-more'} width={17} height={17} />}
      </button>

      {open && (
        <PickerPanel
          initial={getInitial}
          busy={busy}
          onGenerate={(platforms) => {
            onOpenChange(false);
            onGenerate(platforms);
          }}
        />
      )}
    </div>
  );
}

/** The panel's own component, so it starts from the saved choice every time it opens */
function PickerPanel({
  initial,
  busy,
  onGenerate,
}: {
  initial: () => CopyPlatformId[];
  busy: boolean;
  onGenerate: (platforms: CopyPlatformId[]) => void;
}) {
  const [picked, setPicked] = useState<CopyPlatformId[]>(initial);
  const toggle = (p: CopyPlatformId) =>
    setPicked((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : COPY_PLATFORM_IDS.filter((x) => x === p || prev.includes(x))));

  return (
    <div
      role="dialog"
      aria-label="Choose platforms"
      className="absolute right-0 top-full mt-2 z-30 w-[320px] bg-white rounded-2xl shadow-xl border border-[#c7c4d8]/40 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-bold text-[#0b1c30]">Write copies for</p>
        <button
          type="button"
          onClick={() => setPicked(picked.length === COPY_PLATFORM_IDS.length ? [] : [...COPY_PLATFORM_IDS])}
          className="text-[12px] font-semibold text-[#3525cd] hover:underline"
        >
          {picked.length === COPY_PLATFORM_IDS.length ? 'Clear' : 'Select all'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Platforms">
        {COPY_PLATFORM_IDS.map((p) => {
          const on = picked.includes(p);
          return (
            <button
              key={p}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(p)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                on ? 'border-[#4f46e5] bg-[#eff4ff]' : 'border-[#c7c4d8]/50 hover:bg-[#f8f9ff]'
              }`}
            >
              <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${PLATFORM_STYLE[p].badge}`}>
                <Icon icon={PLATFORM_STYLE[p].icon} width={12} height={12} />
              </span>
              <span className="text-[13px] font-semibold text-[#0b1c30] flex-1">{COPY_PLATFORMS[p].label}</span>
              <Icon
                icon={on ? 'material-symbols:check-box' : 'material-symbols:check-box-outline-blank'}
                width={18}
                height={18}
                className={on ? 'text-[#4f46e5]' : 'text-[#c7c4d8]'}
              />
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-[#e5eeff] flex items-center justify-between gap-3">
        <p className="text-[12px] text-[#464555]">
          {picked.length
            ? `${COPIES_PER_PLATFORM} each · ${picked.length * COPIES_PER_PLATFORM} copies`
            : 'Pick at least one platform'}
        </p>
        <button
          type="button"
          disabled={picked.length === 0 || busy}
          onClick={() => onGenerate(picked)}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] text-white hover:opacity-95 disabled:opacity-40 ${LABEL_MD}`}
        >
          <span className="text-inherit">Generate</span>
        </button>
      </div>
    </div>
  );
}
