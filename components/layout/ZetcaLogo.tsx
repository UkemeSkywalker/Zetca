import { Icon } from '@iconify/react';

interface ZetcaLogoProps {
  /** "dark" text for light backgrounds, "light" text for dark ones */
  tone?: 'dark' | 'light';
  /** Show "CONTENT OS" under the name */
  tagline?: boolean;
}

/** The Zetca mark and name, as used across the site and dashboard */
export function ZetcaLogo({ tone = 'dark', tagline = true }: ZetcaLogoProps) {
  return (
    <span className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-[10px] flex items-center justify-center bg-gradient-to-br from-indigo-500 to-blue-500 shrink-0 shadow-[0_6px_16px_rgba(79,70,229,0.35)]">
        <Icon icon="lucide:box" width={20} height={20} className="text-white" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1">
          <span className={`text-[19px] font-bold font-heading leading-none ${tone === 'light' ? 'text-white' : 'text-slate-900'}`}>Zetca</span>
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 -mt-1.5" aria-hidden="true" />
        </span>
        {tagline && (
          <span className={`block text-[9.5px] font-semibold tracking-[0.12em] mt-1 ${tone === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
            CONTENT OS
          </span>
        )}
      </span>
    </span>
  );
}
