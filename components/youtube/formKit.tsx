'use client';

import React, { useId, useState } from 'react';
import { Icon } from '@iconify/react';

export const CARD = 'bg-white rounded-2xl border border-[#c7c4d8]/25 shadow-sm';
export const INPUT =
  'w-full rounded-xl bg-surface-container-low border border-transparent px-4 py-3 text-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:border-primary/40 focus:bg-white focus:ring-2 focus:ring-primary/15 transition-colors';

export function SectionCard({
  id,
  title,
  subtitle,
  required,
  action,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  required?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={`section-${id}`} className={`${CARD} p-6 scroll-mt-40`} aria-labelledby={`section-${id}-title`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={`section-${id}-title`} className="text-lg font-semibold font-heading text-on-surface">
            {title}
            {required && <span className="text-red-500"> *</span>}
          </h2>
          <p className="text-sm text-outline">{subtitle}</p>
        </div>
        {action}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs font-medium text-red-600">
      {message}
    </p>
  );
}

export function Counter({ value, max, over }: { value: number; max: number; over?: boolean }) {
  return (
    <span className={`text-xs tabular-nums ${over || value > max ? 'text-red-600 font-semibold' : 'text-outline'}`}>
      {value.toLocaleString()} / {max.toLocaleString()}
    </span>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-on-surface cursor-pointer">
          {label}
        </label>
        {description && <p className="text-xs text-outline mt-0.5">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
          checked ? 'bg-primary' : 'bg-surface-container-highest'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </button>
    </div>
  );
}

export function RadioRow({
  name,
  label,
  description,
  checked,
  onSelect,
  disabled,
}: {
  name: string;
  label: string;
  description?: string;
  checked: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${checked ? 'border-primary/40 bg-primary-50/60' : 'border-[#c7c4d8]/40 hover:border-primary/30'}`}
    >
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onSelect}
        disabled={disabled}
        className="mt-0.5 h-4 w-4 accent-[#4f46e5]"
      />
      <span>
        <span className="block text-sm font-medium text-on-surface">{label}</span>
        {description && <span className="block text-xs text-outline mt-0.5">{description}</span>}
      </span>
    </label>
  );
}

export function Select({
  label,
  value,
  onChange,
  options,
  error,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  error?: string;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-on-surface mb-1.5">
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} appearance-none pr-10`}
          aria-invalid={!!error}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          icon="solar:alt-arrow-down-linear"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline"
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}

/** Chip input: Enter or comma adds a tag, Backspace on empty removes the last */
export function TagInput({
  tags,
  onChange,
  counter,
  error,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  counter: React.ReactNode;
  error?: string;
}) {
  const [text, setText] = useState('');
  const id = useId();
  const add = (raw: string) => {
    const next = [...tags];
    for (const part of raw.split(',')) {
      const tag = part.replace(/[<>]/g, '').trim().slice(0, 100);
      if (tag && !next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    onChange(next);
    setText('');
  };
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label htmlFor={id} className="text-sm font-medium text-on-surface">
          Tags
        </label>
        {counter}
      </div>
      <div
        className={`flex flex-wrap items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 border ${
          error ? 'border-red-300' : 'border-transparent'
        } focus-within:border-primary/40 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/15`}
      >
        {tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 rounded-full bg-white border border-[#c7c4d8]/50 pl-3 pr-1.5 py-1 text-xs text-on-surface">
            {tag}
            <button
              type="button"
              onClick={() => onChange(tags.filter((t) => t !== tag))}
              className="rounded-full p-0.5 text-outline hover:text-red-600"
              aria-label={`Remove tag ${tag}`}
            >
              <Icon icon="solar:close-circle-linear" className="w-3.5 h-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={text}
          onChange={(e) => {
            if (e.target.value.includes(',')) add(e.target.value);
            else setText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(text);
            } else if (e.key === 'Backspace' && !text && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={() => text.trim() && add(text)}
          placeholder={tags.length ? '' : 'Add a tag and press Enter'}
          className="flex-1 min-w-[140px] bg-transparent text-sm py-1 focus:outline-none placeholder:text-outline-variant"
        />
      </div>
      <FieldError message={error} />
    </div>
  );
}
