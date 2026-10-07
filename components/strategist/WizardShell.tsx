'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { useAuth } from '@/context/AuthContext';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  /** Progress bar fill, 0–100 */
  progress: number;
  children: React.ReactNode;
}

function getInitials(name?: string): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

export function WizardShell({ step, totalSteps, progress, children }: WizardShellProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-[#EEF2F7] text-slate-900 font-heading antialiased">
      {/* Slim distraction-free header bar */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-2 ring-indigo-500/10">
              <Icon icon="material-symbols:auto-awesome" width={20} height={20} className="text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[19px] tracking-tight text-slate-900">Zetca</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/80 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                AI Strategist
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3.5 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-700">
              Step {step} of {totalSteps}
            </span>
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-xs font-medium text-slate-500">Discovery Flow</span>
            <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span className="text-inherit">Exit to Dashboard</span>
              <Icon icon="material-symbols:close" width={15} height={15} className="text-slate-400" />
            </Link>
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-sm">
              {getInitials(user?.name)}
            </div>
          </div>
        </div>
        {/* Mobile slim progress line */}
        <div className="w-full h-1 bg-slate-100 md:hidden">
          <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12">{children}</main>

      {/* Bottom minimal footer */}
      <footer className="w-full py-4 px-6 border-t border-slate-200/80 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="font-medium">
            <span className="text-slate-700 font-semibold">Zetca Content OS</span>{' '}
            <span className="text-slate-500">• Adaptive Discovery Engine</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1 font-medium text-slate-600">
              <Icon icon="material-symbols:lock-outline" width={14} height={14} className="text-slate-400" />
              <span className="text-inherit">Enterprise Encryption</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-300" />
            <span className="text-slate-500">All answers saved live</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
