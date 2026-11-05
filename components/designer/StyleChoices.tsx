'use client';

/**
 * The choices a style comes with: its colours (the style's own, a brand's,
 * or custom ones, always kept readable) and, for styles with several
 * layouts, whether posts mix them or always use one.
 */

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { bestTextColor, contrastRatio } from '@/lib/design/contrast';
import type { Colors } from '@/lib/design/recipeKit';
import { listStrategies } from '@/lib/api/strategyClient';

export type ColorChoice = { kind: 'style' } | { kind: 'brand'; name: string; colors: Colors } | { kind: 'custom'; colors: Colors };

/** The colours a choice means (undefined: the style's own) */
export const colorsOf = (c: ColorChoice): Colors | undefined => (c.kind === 'style' ? undefined : c.colors);

export interface BrandPalette {
  name: string;
  colors: Colors;
}

let palettes: Promise<BrandPalette[]> | null = null;

/** Brand colours saved on the user's campaigns, one per brand */
export function useBrandPalettes(): BrandPalette[] {
  const [list, setList] = useState<BrandPalette[]>([]);
  useEffect(() => {
    let live = true;
    palettes ??= listStrategies().then(
      (all) => {
        const seen = new Map<string, BrandPalette>();
        for (const s of all) {
          const c = s.designStyle?.colors;
          if (c && !seen.has(s.brandName)) seen.set(s.brandName, { name: s.brandName, colors: c });
        }
        return [...seen.values()].slice(0, 4);
      },
      () => {
        palettes = null;
        return [];
      }
    );
    palettes.then((p) => live && setList(p));
    return () => {
      live = false;
    };
  }, []);
  return list;
}

/** Forget the cached brand colours (after a campaign's colours change) */
export const forgetBrandPalettes = () => {
  palettes = null;
};

const SWATCH_ROLES: { key: keyof Colors; label: string }[] = [
  { key: 'main', label: 'Main' },
  { key: 'ink', label: 'Text' },
  { key: 'accent', label: 'Accent' },
];

function Swatches({ colors }: { colors: Colors }) {
  return (
    <span className="flex -space-x-1.5" aria-hidden>
      {[colors.main, colors.ink, colors.accent].map((c, i) => (
        <span key={i} className="h-5 w-5 rounded-full border-2 border-white shadow-sm" style={{ background: c }} />
      ))}
    </span>
  );
}

function Option({ selected, onClick, label, colors, children }: { selected: boolean; onClick: () => void; label: string; colors?: Colors; children?: React.ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left text-sm font-semibold transition ${selected ? 'border-primary bg-primary-50 text-[#0B1C30]' : 'border-[#E2E8F0] bg-white text-[#0B1C30] hover:border-primary/40'}`}
    >
      {colors ? <Swatches colors={colors} /> : children}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {selected && <Icon icon="lucide:circle-check" className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
    </button>
  );
}

/** Whether text in `ink` reads on `main` (and on the accent, which text sometimes sits on) */
export function readability(c: Colors): { ok: boolean; fix: Colors } {
  const ok = contrastRatio(c.ink, c.main) >= 3;
  return { ok, fix: { ...c, ink: bestTextColor([c.main], ['#FFFFFF', '#0B0B0F']) } };
}

export function ColorChooser({
  value,
  onChange,
  styleColors,
  brands,
}: {
  value: ColorChoice;
  onChange: (next: ColorChoice) => void;
  /** The style's own colours, for the first option and as the start of a custom set */
  styleColors: Colors;
  brands: BrandPalette[];
}) {
  const [open, setOpen] = useState<keyof Colors | null>(null);
  const custom = value.kind === 'custom' ? value.colors : null;
  const check = custom ? readability(custom) : null;
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Colours">
      <Option selected={value.kind === 'style'} onClick={() => onChange({ kind: 'style' })} label="Style colours" colors={styleColors} />
      {brands.map((b) => (
        <Option
          key={b.name}
          selected={value.kind === 'brand' && value.name === b.name}
          onClick={() => onChange({ kind: 'brand', name: b.name, colors: b.colors })}
          label={b.name}
          colors={b.colors}
        />
      ))}
      <Option
        selected={value.kind === 'custom'}
        onClick={() => onChange({ kind: 'custom', colors: custom ?? (value.kind === 'brand' ? value.colors : styleColors) })}
        label="Custom"
        colors={custom ?? undefined}
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-dashed border-[#94A3B8] text-[#64748B]" aria-hidden>
          <Icon icon="lucide:plus" className="h-3 w-3" />
        </span>
      </Option>
      {custom && (
        <div className="space-y-2 rounded-xl bg-[#F8F9FF] p-3">
          {SWATCH_ROLES.map(({ key, label }) => (
            <div key={key}>
              <div className="flex items-center gap-3">
                <label className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-full border border-[#E2E8F0]" style={{ background: custom[key] }}>
                  <span className="sr-only">{label} colour</span>
                  <input
                    type="color"
                    value={custom[key]}
                    onChange={(e) => onChange({ kind: 'custom', colors: { ...custom, [key]: e.target.value.toUpperCase() } })}
                    onFocus={() => setOpen(key)}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  />
                </label>
                <span className="flex-1 text-sm font-medium text-[#0B1C30]">{label}</span>
                <HexInput
                  label={`${label} colour hex`}
                  value={custom[key]}
                  active={open === key}
                  onFocus={() => setOpen(key)}
                  onValid={(v) => onChange({ kind: 'custom', colors: { ...custom, [key]: v } })}
                />
              </div>
            </div>
          ))}
          {check &&
            (check.ok ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                <Icon icon="lucide:circle-check" className="h-4 w-4" aria-hidden /> Text stays readable
              </p>
            ) : (
              <p className="flex items-center gap-1.5 rounded-lg bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-700" role="alert">
                <Icon icon="lucide:triangle-alert" className="h-4 w-4 shrink-0" aria-hidden />
                <span className="flex-1">This text colour is hard to read</span>
                <button type="button" onClick={() => onChange({ kind: 'custom', colors: check.fix })} className="underline">
                  Fix it
                </button>
              </p>
            ))}
        </div>
      )}
    </div>
  );
}

/** A hex code field: what's typed stays while it's half-written, and only a whole colour is used */
function HexInput({ label, value, active, onFocus, onValid }: { label: string; value: string; active: boolean; onFocus: () => void; onValid: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [focused, setFocused] = useState(false);
  return (
    <input
      aria-label={label}
      value={focused ? draft : value}
      onChange={(e) => {
        const v = e.target.value.trim();
        setDraft(v);
        const hex = v.startsWith('#') ? v : `#${v}`;
        if (/^#[0-9A-Fa-f]{6}$/.test(hex)) onValid(hex.toUpperCase());
      }}
      onFocus={() => {
        setDraft(value);
        setFocused(true);
        onFocus();
      }}
      onBlur={() => setFocused(false)}
      className={`w-[84px] min-w-0 rounded-lg border bg-white px-1.5 py-1 font-mono text-xs uppercase text-[#0B1C30] ${active ? 'border-primary' : 'border-[#E2E8F0]'}`}
      maxLength={7}
    />
  );
}

/** For styles with several layouts: mix them post by post, or always use one */
export function LayoutModeChooser({ mix, onChange, layoutName }: { mix: boolean; onChange: (mix: boolean) => void; layoutName: string }) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Layouts on each post">
      {[
        { on: true, label: 'Mix the layouts', hint: 'Each post gets a different layout, all in one look' },
        { on: false, label: 'Always use this one', hint: `Every post uses “${layoutName}”` },
      ].map((o) => (
        <button
          key={o.label}
          type="button"
          role="radio"
          aria-checked={mix === o.on}
          onClick={() => onChange(o.on)}
          className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${mix === o.on ? 'border-primary bg-primary-50' : 'border-[#E2E8F0] bg-white hover:border-primary/40'}`}
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-[#0B1C30]">{o.label}</span>
            <span className="block truncate text-xs text-[#64748B]">{o.hint}</span>
          </span>
          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 ${mix === o.on ? 'border-primary' : 'border-[#CBD5E1]'}`} aria-hidden>
            {mix === o.on && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
          </span>
        </button>
      ))}
    </div>
  );
}
