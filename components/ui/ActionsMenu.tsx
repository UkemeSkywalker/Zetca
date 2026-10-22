'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

export interface MenuAction {
  label: string;
  icon: string;
  onSelect: () => void;
  danger?: boolean;
}

/** A "⋯" button that opens a small menu of actions */
export function ActionsMenu({ actions, label = 'More options' }: { actions: MenuAction[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  if (!actions.length) return null;
  return (
    <div className="relative" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-low transition-colors"
      >
        <Icon icon="solar:menu-dots-bold" className="w-5 h-5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-30 min-w-[200px] rounded-xl bg-white shadow-xl border border-[#c7c4d8]/40 py-1.5">
          {actions.map((a) => (
            <button
              key={a.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                a.onSelect();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-left hover:bg-surface-container-low ${
                a.danger ? 'text-red-600' : 'text-on-surface'
              }`}
            >
              <Icon icon={a.icon} className="w-4 h-4 shrink-0" />
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
