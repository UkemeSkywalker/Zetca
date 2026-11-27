'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import type { BrandProfile } from '@/lib/models/brandResearch';

type BrandColor = BrandProfile['brandKit']['colors'][number];

const HEX = /^#[0-9a-f]{6}$/i;
const ROLES: BrandColor['role'][] = ['primary', 'secondary', 'accent', 'background', 'text'];
const MAX_COLORS = 5;

/** Popular Google Fonts, offered while typing a font name (any Google Fonts family works) */
export const FONT_SUGGESTIONS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Nunito', 'Work Sans', 'DM Sans', 'Manrope', 'Kanit',
  'Space Grotesk', 'IBM Plex Sans', 'Outfit', 'Sora', 'Plus Jakarta Sans', 'Archivo', 'Barlow', 'Oswald', 'Bebas Neue', 'Anton',
  'Playfair Display', 'Fraunces', 'Merriweather', 'Lora', 'DM Serif Display', 'Libre Baskerville', 'Cormorant Garamond', 'EB Garamond',
  'Space Mono', 'JetBrains Mono', 'IBM Plex Mono', 'Pacifico', 'Dancing Script', 'Caveat',
];

const INPUT = 'rounded-lg border border-[#0b1c30]/20 bg-white px-2 py-1 text-[#0b1c30] outline-none focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/20';

/** Text that turns into a box when clicked; Enter or leaving the box saves, Escape cancels */
export function EditableText({
  value,
  label,
  onSave,
  editable,
  className = '',
  style,
  maxLength = 140,
  as: Tag = 'span',
}: {
  value: string;
  label: string;
  onSave: (next: string) => void;
  editable: boolean;
  className?: string;
  style?: React.CSSProperties;
  maxLength?: number;
  as?: 'span' | 'h2' | 'p';
}) {
  const [draft, setDraft] = useState<string | null>(null);
  if (!editable) return <Tag className={className} style={style}>{value}</Tag>;
  if (draft !== null) {
    const done = (save: boolean) => {
      const next = draft.trim();
      setDraft(null);
      if (save && next && next !== value) onSave(next);
    };
    return (
      <input
        autoFocus
        aria-label={label}
        value={draft}
        maxLength={maxLength}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => done(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') done(true);
          if (e.key === 'Escape') done(false);
        }}
        className={`${INPUT} w-full ${className}`}
        style={style}
      />
    );
  }
  return (
    <Tag className={`group/edit ${className}`} style={style}>
      <button type="button" onClick={() => setDraft(value)} title={`Edit ${label}`} className="cursor-text rounded-md text-left decoration-dotted underline-offset-4 hover:underline">
        {value || <span className="opacity-50">Add {label}</span>}
        <Icon icon="lucide:pencil" className="ml-1.5 inline h-[0.6em] w-[0.6em] opacity-0 transition group-hover/edit:opacity-50" aria-hidden />
        <span className="sr-only">, edit {label}</span>
      </button>
    </Tag>
  );
}

/** Chips you can rename (click), remove (×) and add to (+) */
export function EditableChips({
  items,
  label,
  onSave,
  editable,
  max = 8,
  className = '',
  chipClass = 'border-[#0b1c30]/10 bg-[#f1f5f9]',
}: {
  items: string[];
  label: string;
  onSave: (next: string[]) => void;
  editable: boolean;
  max?: number;
  className?: string;
  chipClass?: string;
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const chip = `rounded-full border px-3 py-1 text-[13px] font-medium ${chipClass}`;

  if (!editable) {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {items.map((c) => (
          <span key={c} className={chip}>
            {c}
          </span>
        ))}
      </div>
    );
  }

  /** index = items.length means a new chip */
  const open = (index: number) => {
    setEditing(index);
    setDraft(items[index] ?? '');
  };
  const commit = () => {
    const text = draft.trim().slice(0, 40);
    const index = editing;
    setEditing(null);
    if (index === null) return;
    const next = [...items];
    if (!text) {
      if (index < items.length) next.splice(index, 1);
    } else if (index < items.length) next[index] = text;
    else next.push(text);
    // No duplicates
    const unique = next.filter((c, i) => next.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i);
    if (JSON.stringify(unique) !== JSON.stringify(items)) onSave(unique);
  };
  const box = (
    <input
      autoFocus
      aria-label={editing !== null && editing < items.length ? `Rename ${items[editing]}` : `New ${label}`}
      value={draft}
      maxLength={40}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') setEditing(null);
      }}
      className={`${INPUT} h-8 w-40 rounded-full px-3 text-[13px]`}
    />
  );

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} aria-label={label} role="group">
      {items.map((c, i) =>
        editing === i ? (
          <React.Fragment key={`${c}-${i}`}>{box}</React.Fragment>
        ) : (
          <span key={`${c}-${i}`} className={`${chip} group/chip inline-flex items-center gap-1 pr-1.5`}>
            <button type="button" onClick={() => open(i)} title={`Rename ${c}`} className="cursor-text">
              {c}
            </button>
            <button
              type="button"
              onClick={() => onSave(items.filter((_, j) => j !== i))}
              aria-label={`Remove ${c}`}
              className="grid h-5 w-5 place-items-center rounded-full opacity-40 transition hover:bg-[#0b1c30]/10 hover:opacity-100 focus-visible:opacity-100"
            >
              <Icon icon="lucide:x" className="h-3 w-3" aria-hidden />
            </button>
          </span>
        )
      )}
      {editing === items.length
        ? box
        : items.length < max && (
            <button
              type="button"
              onClick={() => open(items.length)}
              aria-label={`Add ${label}`}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#0b1c30]/25 px-3 py-1 text-[13px] font-medium text-[#64748b] hover:border-[#0b1c30]/50 hover:text-[#0b1c30]"
            >
              <Icon icon="lucide:plus" className="h-3.5 w-3.5" aria-hidden /> Add
            </button>
          )}
    </div>
  );
}

/** Black or white text, whichever reads better on a colour */
export const inkOn = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55 ? '#0b0b0f' : '#ffffff';
};

/** The palette: click a swatch to change its colour, name or role, remove it, or add one */
export function ColorsEditor({ colors, onSave, editable }: { colors: BrandColor[]; onSave: (next: BrandColor[]) => void; editable: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState<BrandColor | null>(null);
  const [hexText, setHexText] = useState('');
  // Close the editor if the palette changes underneath it (e.g. the chat changed it)
  const key = JSON.stringify(colors);
  const [seen, setSeen] = useState(key);
  if (seen !== key) {
    setSeen(key);
    setOpen(null);
    setDraft(null);
  }

  const shown = colors.map((c, i) => (i === open && draft ? draft : c));
  const adding = open === colors.length && draft;
  const start = (i: number) => {
    const c = colors[i] ?? { hex: '#888888', role: ROLES[Math.min(i, ROLES.length - 1)], name: 'New colour' };
    setOpen(i);
    setDraft(c);
    setHexText(c.hex.toUpperCase());
  };
  const close = () => {
    setOpen(null);
    setDraft(null);
  };
  const save = () => {
    if (open === null || !draft) return;
    const next = [...colors];
    next[open] = { ...draft, name: draft.name.trim() || draft.hex.toUpperCase() };
    close();
    if (JSON.stringify(next) !== JSON.stringify(colors)) onSave(next);
  };
  const remove = () => {
    if (open === null) return;
    const next = colors.filter((_, i) => i !== open);
    close();
    if (next.length) onSave(next);
  };

  const swatches = [...shown, ...(adding ? [draft] : [])];
  return (
    <div>
      {swatches.length ? (
        <div className="mt-3 flex h-28 overflow-hidden rounded-2xl">
          {swatches.map((c, i) => {
            const body = (
              <>
                <span className="text-sm font-semibold">{c.name}</span>
                <span className="text-[11px] uppercase opacity-70">{c.hex}</span>
              </>
            );
            const look = { background: c.hex, color: inkOn(c.hex) };
            return editable ? (
              <button
                key={i}
                type="button"
                onClick={() => (open === i ? close() : start(i))}
                aria-label={`Edit colour ${c.name} ${c.hex}`}
                aria-expanded={open === i}
                className={`group/sw relative flex flex-1 flex-col items-start justify-end p-3 text-left transition ${open === i ? 'ring-4 ring-inset ring-[#4f46e5]' : ''}`}
                style={look}
              >
                <Icon icon="lucide:pencil" className="absolute right-2 top-2 h-3.5 w-3.5 opacity-0 transition group-hover/sw:opacity-70" aria-hidden />
                {body}
              </button>
            ) : (
              <div key={i} className="flex flex-1 flex-col justify-end p-3" style={look}>
                {body}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#64748b]">No colours found on the site</p>
      )}

      {editable && open !== null && draft && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl border border-[#0b1c30]/10 bg-[#f8fafc] p-3 text-sm" role="group" aria-label="Edit colour">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#64748b]">Colour</span>
            <input
              type="color"
              value={draft.hex}
              onChange={(e) => {
                setDraft({ ...draft, hex: e.target.value.toUpperCase() });
                setHexText(e.target.value.toUpperCase());
              }}
              className="h-9 w-12 cursor-pointer rounded-lg border border-[#0b1c30]/20 bg-white p-0.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#64748b]">Hex</span>
            <input
              value={hexText}
              maxLength={7}
              onChange={(e) => {
                const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                setHexText(v.toUpperCase());
                if (HEX.test(v)) setDraft({ ...draft, hex: v.toUpperCase() });
              }}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              aria-invalid={!HEX.test(hexText)}
              className={`${INPUT} h-9 w-24 font-mono uppercase`}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#64748b]">Name</span>
            <input value={draft.name} maxLength={30} onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && save()} className={`${INPUT} h-9 w-32`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-[#64748b]">Used for</span>
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as BrandColor['role'] })} className={`${INPUT} h-9 capitalize`}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex gap-2">
            {open < colors.length && colors.length > 1 && (
              <button type="button" onClick={remove} className="h-9 rounded-full px-3 font-semibold text-red-700 hover:bg-red-50">
                Remove
              </button>
            )}
            <button type="button" onClick={close} className="h-9 rounded-full px-3 font-semibold text-[#464555] hover:bg-[#0b1c30]/5">
              Cancel
            </button>
            <button type="button" onClick={save} className="h-9 rounded-full bg-[#0b1c30] px-4 font-semibold text-white hover:bg-[#0b1c30]/90">
              Save
            </button>
          </div>
        </div>
      )}
      {editable && open === null && colors.length < MAX_COLORS && (
        <button type="button" onClick={() => start(colors.length)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[#4f46e5] hover:text-[#4338ca]">
          <Icon icon="lucide:plus" className="h-4 w-4" aria-hidden /> Add a colour
        </button>
      )}
    </div>
  );
}

/** A heading or body font: shows "Aa" in it; click to type another Google Fonts family */
export function FontPicker({
  font,
  role,
  onSave,
  editable,
  size,
}: {
  font?: string;
  role: 'Heading' | 'Body';
  onSave: (next: string | null) => void;
  editable: boolean;
  size: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const listId = `fonts-${role.toLowerCase()}`;
  if (!font && !editable) return null;
  const done = (save: boolean) => {
    const next = (draft ?? '').trim();
    setDraft(null);
    if (save && next !== (font ?? '')) onSave(next || null);
  };
  return (
    <div>
      <span className={`block leading-none ${size} ${font ? '' : 'opacity-25'}`} style={font ? { fontFamily: `"${font}", ${role === 'Heading' ? 'serif' : 'sans-serif'}` } : undefined}>
        Aa
      </span>
      {draft !== null ? (
        <>
          <input
            autoFocus
            list={listId}
            aria-label={`${role} font`}
            placeholder="Google Fonts name"
            value={draft}
            maxLength={50}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => done(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') done(true);
              if (e.key === 'Escape') done(false);
            }}
            className={`${INPUT} mt-2 h-8 w-40 text-xs`}
          />
          <datalist id={listId}>
            {FONT_SUGGESTIONS.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>
        </>
      ) : editable ? (
        <button type="button" onClick={() => setDraft(font ?? '')} className="group/font mt-2 block text-left text-xs text-[#64748b] hover:text-[#0b1c30]">
          <span className="font-semibold">{role}:</span> {font ?? 'Add a font'}
          <Icon icon="lucide:pencil" className="ml-1 inline h-3 w-3 opacity-0 transition group-hover/font:opacity-60" aria-hidden />
          <span className="sr-only">, change the {role.toLowerCase()} font</span>
        </button>
      ) : (
        <span className="mt-2 block text-xs text-[#64748b]">{font}</span>
      )}
    </div>
  );
}
