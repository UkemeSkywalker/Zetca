'use client';

import { Icon } from '@iconify/react';
import { useEffect, useState } from 'react';

const STAGES = ['Reading your niche', 'Picking keywords', 'Writing descriptions', 'Planning your schedule'];

// When each stage becomes active (seconds after starting). Generation is one
// API call, so the checklist is paced to its typical length; the last stage
// stays active until the result arrives.
const STAGE_STARTS = [0, 2, 5, 22];

// Progress eases towards 95% while waiting; the last 5% fills on success
const MAX_WAITING_PROGRESS = 95;
const PROGRESS_TIME_CONSTANT = 18;

interface GeneratingStepProps {
  status: 'running' | 'done' | 'error';
  error: string | null;
  onRetry: () => void;
  onBackToReview: () => void;
}

export function GeneratingStep({ status, error, onRetry, onBackToReview }: GeneratingStepProps) {
  const [elapsed, setElapsed] = useState(0);

  // Each run is a fresh mount (the page keys this component by run), so the clock starts at 0
  useEffect(() => {
    if (status !== 'running') return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
    return () => clearInterval(timer);
  }, [status]);

  const runningStage = STAGE_STARTS.filter((s) => elapsed >= s).length - 1;
  const activeStage = status === 'done' ? STAGES.length : runningStage;
  const progress =
    status === 'done' ? 100 : MAX_WAITING_PROGRESS * (1 - Math.exp(-elapsed / PROGRESS_TIME_CONSTANT));
  const failed = status === 'error';

  return (
    <div className="w-full max-w-3xl bg-white rounded-2xl shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col md:flex-row">
      {/* Left: orb, headline and progress */}
      <div className="md:w-5/12 bg-[#eff4ff]/60 border-b md:border-b-0 md:border-r border-[#c7c4d8]/30 p-8 md:p-10 flex flex-col justify-between">
        <div>
          <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-[#e2dfff]/40">
            {!failed && <div className="absolute inset-0 rounded-full bg-[#4f46e5]/20 animate-ping opacity-40" />}
            <div className="absolute inset-0 rounded-full bg-[#e2dfff] blur-md opacity-70" />
            <Icon
              icon={failed ? 'material-symbols:error-outline' : 'material-symbols:auto-awesome'}
              width={32}
              height={32}
              className={`relative select-none ${failed ? 'text-[#ba1a1a]' : 'text-[#4f46e5]'}`}
            />
          </div>

          <h1 className="text-[24px] font-bold text-[#0b1c30] tracking-tight mt-6 mb-4 leading-snug">
            {failed ? 'Something went wrong' : status === 'done' ? 'Your strategy is ready!' : 'Building your strategy…'}
          </h1>

          {failed ? (
            <p className="text-[14px] leading-[22px] text-[#464555]" role="alert">
              {error ?? 'We couldn’t finish generating your strategy.'} Your answers are saved.
            </p>
          ) : (
            <div
              className="w-full h-1.5 bg-[#e5eeff] rounded-full overflow-hidden mt-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress)}
              aria-label="Strategy generation progress"
            >
              <div className="h-full bg-[#4f46e5] rounded-full transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>

        {failed && (
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              type="button"
              onClick={onRetry}
              className="px-5 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-[13px] font-semibold shadow-md transition-colors flex items-center gap-1.5"
            >
              <Icon icon="material-symbols:refresh" width={16} height={16} />
              <span className="text-inherit">Try again</span>
            </button>
            <button
              type="button"
              onClick={onBackToReview}
              className="px-5 py-2.5 rounded-xl bg-white border border-[#c7c4d8]/60 hover:bg-[#eff4ff] text-[#0b1c30] text-[13px] font-semibold transition-colors"
            >
              Back to review
            </button>
          </div>
        )}
      </div>

      {/* Right: stage checklist */}
      <div className="md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
        <ol className="w-full space-y-3 text-[15px]" aria-label="Generation steps">
          {STAGES.map((stage, i) => {
            const done = i < activeStage;
            const active = i === activeStage && !failed;
            const stopped = failed && i === runningStage;
            const pending = !done && !active && !stopped;
            return (
              <li
                key={stage}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-3.5 p-3.5 rounded-xl border transition-colors ${
                  active
                    ? 'border-[#3525cd]/20 bg-[#eff4ff]/40 shadow-sm'
                    : stopped
                      ? 'border-[#ba1a1a]/20 bg-[#ffdad6]/30'
                      : pending
                        ? 'border-[#c7c4d8]/20 bg-white/60 opacity-70'
                        : 'border-[#c7c4d8]/30 bg-white'
                }`}
              >
                <div className="flex items-center justify-center w-5 h-5 shrink-0">
                  {done && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50">
                      <Icon icon="material-symbols:check" width={16} height={16} className="text-emerald-600" />
                    </span>
                  )}
                  {active && <span className="w-4 h-4 rounded-full border-2 border-[#4f46e5] border-t-transparent animate-spin" />}
                  {stopped && <Icon icon="material-symbols:close" width={16} height={16} className="text-[#ba1a1a]" />}
                  {pending && <span className="w-3.5 h-3.5 rounded-full border border-[#c7c4d8]" />}
                </div>
                <span
                  className={
                    active
                      ? 'text-[#0b1c30] font-semibold'
                      : stopped
                        ? 'text-[#93000a] font-semibold'
                        : pending
                          ? 'text-[#777587] font-normal'
                          : 'text-[#464555] font-medium'
                  }
                >
                  {stage}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
