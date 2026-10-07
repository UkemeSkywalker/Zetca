'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/context/AuthContext';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

export function WizardShell({ step, totalSteps, children }: WizardShellProps) {
  const { user } = useAuth();
  const progress = Math.max(4, Math.round((step / totalSteps) * 100));

  return (
    <div className="min-h-screen flex flex-col bg-[#eef2f7] font-heading">
      {/* Top bar */}
      <header className="h-[80px] bg-white/80 backdrop-blur border-b border-slate-200/70 px-6 md:px-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_6px_16px_rgba(99,102,241,0.35)]">
            <Icon icon="lucide:sparkles" width={22} height={22} className="text-white" />
          </div>
          <span className="text-[22px] font-bold text-slate-900 tracking-[-0.02em]">Zetca</span>
          <span className="hidden sm:inline-block px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[11px] font-semibold tracking-[0.06em] text-slate-600">
            AI STRATEGIST
          </span>
        </div>

        <div className="hidden md:flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <span className="text-[13px] font-semibold text-slate-800">Step {step} of {totalSteps}</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" aria-hidden="true" />
          <span className="text-[13px] text-slate-500">Discovery Flow</span>
          <span className="ml-2 w-[100px] h-[6px] rounded-full bg-slate-200 overflow-hidden" aria-hidden="true">
            <span className="block h-full rounded-full bg-indigo-600" style={{ width: `${progress}%` }} />
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-[14px] font-medium text-slate-700 hover:text-slate-900 transition-colors">
            <span className="hidden sm:inline text-inherit">Exit to Dashboard</span>
            <Icon icon="lucide:x" width={15} height={15} className="text-slate-400" />
          </Link>
          <span className="w-px h-7 bg-slate-200" aria-hidden="true" />
          <div className="w-10 h-10 rounded-full bg-indigo-700 flex items-center justify-center">
            <span className="text-white text-[13px] font-semibold">{getInitials(user?.name)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-12 md:py-[70px]">{children}</main>

      {/* Bottom status bar */}
      <footer className="border-t border-slate-200/70 bg-[#f4f7fb] px-6 md:px-8 py-4 flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <p className="text-slate-700">
          Zetca Content OS <span className="text-slate-400">•</span>{' '}
          <span className="text-slate-500">Adaptive Discovery Engine</span>
        </p>
        <div className="flex items-center gap-3 text-slate-500">
          <span className="flex items-center gap-1.5">
            <Icon icon="lucide:lock" width={13} height={13} className="text-slate-400" />
            <span className="text-inherit">Enterprise Encryption</span>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-400">All answers saved live</span>
        </div>
      </footer>
    </div>
  );
}
