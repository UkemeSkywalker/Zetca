'use client';

import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getBilling, publishCredits, type Billing } from '@/lib/api/billingClient';
import { planOf } from '@/lib/billing/plans';

const CARD = 'bg-white rounded-2xl border border-[#E2E8F0]';

/** What the price list shows, in the order people use things */
const PRICE_ROWS: { id: string; label: string; unit?: string }[] = [
  { id: 'brand_research', label: 'Talk to Zetca: brand research' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'copy_post', label: 'Copywriter post', unit: 'a post' },
  { id: 'copy_chat', label: 'Copywriter chat message' },
  { id: 'copy_rewrite', label: 'Rewrite with AI' },
  { id: 'design_words', label: 'Design words (“Write it for me”)' },
  { id: 'ai_image', label: 'AI image', unit: 'from (by model)' },
  { id: 'ai_video', label: 'AI video, 5 seconds', unit: 'from (by model)' },
  { id: 'ai_video_draft', label: 'AI video draft, 480p (Wan 3.0)', unit: 'then HD from' },
  { id: 'video_write', label: 'YouTube title and description' },
  { id: 'video_topics', label: 'YouTube keyword research' },
  { id: 'video_suggestions', label: 'YouTube suggested titles and description' },
  { id: 'chapters', label: 'YouTube chapters' },
  { id: 'transcript', label: 'Video transcript', unit: 'about 1 a minute of video' },
  { id: 'auto_schedule', label: 'Auto-schedule' },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

export function BillingPage() {
  const [data, setData] = useState<Billing | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getBilling().then(
      (b) => {
        setData(b);
        publishCredits(b.credits);
      },
      (e) => setError(e instanceof Error ? e.message : 'Couldn’t load billing')
    );
  }, []);

  if (error) return <p className="text-sm font-medium text-red-600" role="alert">{error}</p>;
  if (!data) return <div className="h-96 rounded-2xl bg-white/60 animate-pulse" aria-label="Loading billing" />;

  const { credits } = data;
  const plan = planOf(credits.plan);
  const usedPct = credits.monthly.limit ? Math.min(100, (credits.monthly.used / credits.monthly.limit) * 100) : 0;

  return (
    <div className="max-w-[1100px] space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-bold font-heading text-[#0B1C30]">Billing</h1>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary">{plan.name} plan</span>
      </div>

      {/* Balance */}
      <section className={`${CARD} p-6 grid gap-6 md:grid-cols-[1.2fr_1fr]`} aria-labelledby="balance-title">
        <div>
          <h2 id="balance-title" className="text-sm font-semibold text-[#64748B]">
            Credits you can use
          </h2>
          <p className="mt-1 text-5xl font-extrabold font-heading text-[#0B1C30] tabular-nums">{credits.left.toLocaleString('en-US')}</p>
          <p className="mt-2 text-sm text-[#464555]">
            1 credit = $0.01 of AI work. Your {plan.name} credits reset on {fmtDate(credits.resetsAt)}.
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm">
              <span className="font-semibold text-[#0B1C30]">This month’s plan credits</span>
              <span className="tabular-nums text-[#464555]">
                {credits.monthly.used.toLocaleString('en-US')} of {credits.monthly.limit.toLocaleString('en-US')} used
              </span>
            </div>
            <div className="mt-2 h-2.5 rounded-full bg-[#E2E8F0] overflow-hidden" aria-hidden>
              <div className={`h-full rounded-full ${usedPct > 90 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${usedPct}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-[#0B1C30]">Top-up credits</span>
            <span className="tabular-nums text-[#464555]">{credits.bonus.toLocaleString('en-US')}</span>
          </div>
          <p className="text-xs text-[#777587]">Top-up credits are used once the month’s credits run out, and last 12 months.</p>
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-[#0B1C30]">Free AI to try</span>
            <span className="tabular-nums text-[#464555]">
              {credits.freeAi.image} {credits.freeAi.image === 1 ? 'image' : 'images'} · {credits.freeAi.video} {credits.freeAi.video === 1 ? 'video' : 'videos'} left
            </span>
          </div>
          <p className="text-xs text-[#777587]">Every account gets 5 AI images and 2 AI videos free, once, on the default models.</p>
        </div>
      </section>

      {/* Plans */}
      <section aria-labelledby="plans-title" className="space-y-4">
        <div>
          <h2 id="plans-title" className="text-xl font-bold font-heading text-[#0B1C30]">
            Plans
          </h2>
          <p className="text-sm text-[#464555]">Every plan has the whole app. Paid plans add more credits and AI images and videos.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.plans.map((p) => {
            const current = p.id === plan.id;
            return (
              <div key={p.id} className={`${CARD} p-5 flex flex-col ${current ? 'ring-2 ring-primary border-primary' : ''}`}>
                <p className="text-sm font-bold text-[#0B1C30]">{p.name}</p>
                <p className="mt-2">
                  <span className="text-3xl font-extrabold font-heading text-[#0B1C30]">${p.priceUsd}</span>
                  <span className="text-sm text-[#64748B]"> / month</span>
                </p>
                <p className="mt-1 text-sm font-semibold text-primary">{p.monthlyCredits.toLocaleString('en-US')} credits a month</p>
                <ul className="mt-4 space-y-2 text-sm text-[#464555] flex-1">
                  <li className="flex gap-2">
                    <Icon icon="lucide:check" className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" aria-hidden /> Strategist, Copywriter, Designer, Scheduler
                  </li>
                  <li className="flex gap-2">
                    <Icon icon={p.aiMedia ? 'lucide:check' : 'lucide:x'} className={`w-4 h-4 shrink-0 mt-0.5 ${p.aiMedia ? 'text-emerald-600' : 'text-[#94A3B8]'}`} aria-hidden />
                    {p.aiMedia ? (p.tier >= 3 ? 'Every AI image and video model' : p.tier === 2 ? 'Most AI image and video models' : 'AI images and videos') : 'No AI images or videos'}
                  </li>
                </ul>
                <div className="mt-5">
                  {current ? (
                    <span className="inline-flex w-full justify-center rounded-xl bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary">Your plan</span>
                  ) : (
                    <span className="inline-flex w-full justify-center rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-semibold text-[#94A3B8]" title="Card payments are being set up">
                      Payments coming soon
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-[#777587]">
          Top-up packs: {data.topUps.map((t) => `${t.credits.toLocaleString('en-US')} credits for $${t.priceUsd}`).join(' · ')} (coming with card payments).
        </p>
      </section>

      {/* Prices */}
      <section className={`${CARD} p-6`} aria-labelledby="prices-title">
        <h2 id="prices-title" className="text-xl font-bold font-heading text-[#0B1C30]">
          What things cost
        </h2>
        <p className="text-sm text-[#464555]">Editing designs, text designs, stock photos, scheduling and publishing are free. If something fails, its credits come back.</p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-[#64748B]">
              <th className="py-2 font-semibold">Action</th>
              <th className="py-2 font-semibold text-right">Credits</th>
            </tr>
          </thead>
          <tbody>
            {PRICE_ROWS.map((r) => (
              <tr key={r.id} className="border-t border-[#EEF2F7]">
                <td className="py-2.5 text-[#0B1C30]">{r.label}</td>
                <td className="py-2.5 text-right tabular-nums text-[#0B1C30]">
                  {data.prices[r.id] ?? '—'}{' '}
                  <span className="text-xs text-[#94A3B8]">
                    {r.unit ?? ''}
                    {r.id === 'ai_video_draft' && data.prices.ai_video_hd ? ` ${data.prices.ai_video_hd}` : ''}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Usage */}
      <section className={`${CARD} p-6`} aria-labelledby="usage-title">
        <h2 id="usage-title" className="text-xl font-bold font-heading text-[#0B1C30]">
          Recent usage
        </h2>
        {data.usage.length === 0 ? (
          <p className="mt-2 text-sm text-[#464555]">Nothing yet. Credits you spend show up here.</p>
        ) : (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#64748B]">
                <th className="py-2 font-semibold">When</th>
                <th className="py-2 font-semibold">What</th>
                <th className="py-2 font-semibold text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {data.usage.map((u) => (
                <tr key={u.id} className="border-t border-[#EEF2F7]">
                  <td className="py-2.5 text-[#64748B] whitespace-nowrap">{fmtTime(u.createdAt)}</td>
                  <td className="py-2.5 text-[#0B1C30]">
                    {u.label}
                    {u.detail ? <span className="text-[#94A3B8]"> · {u.detail}</span> : null}
                    {u.status === 'refunded' && <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">refunded</span>}
                  </td>
                  <td className="py-2.5 text-right tabular-nums text-[#0B1C30]">{u.status === 'charged' ? `−${u.credits}` : u.status === 'granted' ? `+${Math.abs(u.credits)}` : '0'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
