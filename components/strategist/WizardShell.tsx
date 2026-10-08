'use client';

import Link from 'next/link';
import { Icon } from '@iconify/react';
import { DashboardHeader } from '@/components/layout/DashboardHeader';

interface WizardShellProps {
  step: number;
  totalSteps: number;
  /** Progress bar fill, 0–100 */
  progress: number;
  /** Page background colour; screens from Stitch don't all use the same one */
  background?: string;
  /** Layout classes for the main area; defaults to a vertically centred column */
  mainClassName?: string;
  children: React.ReactNode;
}

const DEFAULT_MAIN = 'flex-1 w-full flex flex-col items-center justify-center px-4 py-8 sm:py-12';


export function WizardShell({ step, totalSteps, progress, background = '#EEF2F7', mainClassName = DEFAULT_MAIN, children }: WizardShellProps) {
  return (
    <div className="min-h-screen flex flex-col text-slate-900 font-heading antialiased" style={{ backgroundColor: background }}>
      {/* The dashboard's own header, with the logo and quiz progress on the left */}
      <DashboardHeader
        className="sticky top-0 z-50"
        trailing={
          <>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <span className="hidden sm:inline text-inherit">Exit to Dashboard</span>
              <span className="sm:hidden text-inherit">Exit</span>
              <Icon icon="material-symbols:close" width={15} height={15} className="text-slate-400" aria-hidden="true" />
            </Link>
            <div className="h-4 w-px bg-slate-200" aria-hidden="true" />
          </>
        }
        leading={
          <div className="flex items-center gap-5 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity" aria-label="Back to dashboard">
              <div className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-500 shadow-[0_6px_16px_rgba(79,70,229,0.35)]">
                <Icon icon="lucide:box" width={20} height={20} className="text-white" />
              </div>
              <span className="text-[19px] font-bold text-slate-900 tracking-tight">Zetca</span>
            </Link>
            <div className="hidden lg:flex items-center gap-3.5 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-700">
                Step {step} of {totalSteps}
              </span>
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="text-xs font-medium text-slate-500">Discovery Flow</span>
              <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden ml-1">
                <div className="h-full bg-indigo-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>
        }
      >
        {/* Progress line for screens too narrow for the step pill */}
        <div className="w-full h-1 bg-slate-100 lg:hidden">
          <div className="h-full bg-indigo-600" style={{ width: `${progress}%` }} />
        </div>
      </DashboardHeader>

      <main className={mainClassName}>{children}</main>

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
