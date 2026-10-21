import React from 'react';

/** Shared bits of the marketing home page */

export function StatusPill({ status, size = 'md' }: { status: 'live' | 'soon'; size?: 'sm' | 'md' }) {
  const pad = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';
  return status === 'live' ? (
    <span className={`${pad} font-semibold text-[#059669] bg-[#ECFDF5] rounded-full border border-emerald-200 whitespace-nowrap`}>Live</span>
  ) : (
    <span className={`${pad} font-semibold text-[#B45309] bg-[#FEF3C7] rounded-full border border-amber-200 whitespace-nowrap`}>
      {size === 'sm' ? 'Soon' : 'Coming soon'}
    </span>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold uppercase tracking-wider text-primary">{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center,
  id,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  center?: boolean;
  id?: string;
}) {
  return (
    <div className={`max-w-2xl mb-12 ${center ? 'mx-auto text-center' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="text-3xl sm:text-4xl font-bold text-[#0B1C30] tracking-tight mt-2 mb-3 font-heading">
        {title}
      </h2>
      {subtitle && <p className="text-base text-[#464555]">{subtitle}</p>}
    </div>
  );
}

export function Check({ small }: { small?: boolean }) {
  return (
    <span
      className={`${small ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-emerald-100 text-[#10B981] flex items-center justify-center shrink-0`}
      aria-hidden="true"
    >
      <svg className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  );
}

/** A soft browser window around an app screenshot */
export function BrowserFrame({ url, children, className = '' }: { url: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-[#E2E8F0] bg-white shadow-xl shadow-slate-200/50 overflow-hidden ${className}`}>
      <div className="h-9 sm:h-10 bg-slate-50 border-b border-[#E2E8F0] px-4 flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" />
        <span className="ml-2 truncate px-3 py-0.5 bg-white rounded-md border border-[#E2E8F0] text-[11px] text-[#777587] font-mono">{url}</span>
      </div>
      {children}
    </div>
  );
}

/** The dashboard's dark sidebar, shrunk for screenshots */
export function MiniSidebar({ active, footer }: { active: string; footer?: string }) {
  const items = ['Dashboard', 'Strategist', 'Copywriter', 'Scheduler'];
  return (
    <div className="w-36 bg-[#0B1220] p-3 text-white hidden sm:flex flex-col justify-between shrink-0" aria-hidden="true">
      <div className="space-y-1.5 text-[11px]">
        <div className="text-xs font-bold text-white mb-3">Zetca</div>
        {items.map((item) => (
          <div key={item} className={`px-2 py-1.5 rounded ${item === active ? 'bg-primary text-white font-semibold' : 'text-slate-400'}`}>
            {item}
          </div>
        ))}
      </div>
      {footer && <div className="text-[9px] text-slate-400">{footer}</div>}
    </div>
  );
}
