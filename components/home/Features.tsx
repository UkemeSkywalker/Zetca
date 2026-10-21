import type { ReactNode } from 'react';
import { BrandIcon, PLATFORM_NAMES, type Platform } from '@/components/marketing/BrandIcons';
import { SectionHeading, StatusPill } from './ui';

interface Feature {
  title: string;
  text: string;
  status: 'live' | 'soon';
  icon: ReactNode;
  footer?: string;
}

const stroke = (d: string | string[]) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
    {(Array.isArray(d) ? d : [d]).map((p) => (
      <path key={p} d={p} />
    ))}
  </svg>
);

const FEATURES: Feature[] = [
  {
    title: 'Strategist',
    text: 'A content plan, keywords and channel bios from a quick quiz.',
    status: 'live',
    icon: stroke(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z']),
    footer: 'Built from a 2-minute quiz',
  },
  {
    title: 'Copywriter',
    text: 'Chat with your AI copywriter and get posts for every platform.',
    status: 'live',
    icon: stroke(['M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', 'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z']),
    footer: 'Posts appear as they’re written',
  },
  {
    title: 'Scheduler',
    text: 'A calendar for every post, with smart time suggestions.',
    status: 'live',
    icon: stroke(['M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M16 2v4', 'M8 2v4', 'M3 10h18']),
    footer: 'Auto-schedule a whole set',
  },
  {
    title: 'Auto-publishing',
    text: 'Posts publish to LinkedIn on time, with retries if anything fails.',
    status: 'live',
    icon: stroke(['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3']),
  },
  {
    title: 'YouTube publishing',
    text: 'Upload Shorts and long videos with every detail, scheduled.',
    status: 'soon',
    icon: <BrandIcon platform="youtube" className="w-5 h-5" muted />,
  },
  {
    title: 'Graphic Designer',
    text: 'Create on-brand images and thumbnails for your posts.',
    status: 'soon',
    icon: stroke(['M12 19l7-7 3 3-7 7-3-3z', 'M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z', 'M2 2l7.586 7.586']),
  },
  {
    title: 'Video Editor',
    text: 'Trim, caption and resize videos for each platform.',
    status: 'soon',
    icon: stroke(['M23 7l-7 5 7 5V7z', 'M3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z']),
  },
  {
    title: 'Analytics',
    text: 'See what’s working across your channels.',
    status: 'soon',
    icon: stroke(['M18 20V10', 'M12 20V4', 'M6 20v-6']),
  },
  {
    title: 'More platforms',
    text: 'Auto-publishing for Instagram, Facebook, X and TikTok.',
    status: 'soon',
    icon: stroke(['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z', 'M2 12h20', 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z']),
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-white border-t border-[#E2E8F0] scroll-mt-20" id="features" aria-labelledby="features-title">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Everything your content needs"
          subtitle="The tools you can use today, and what’s coming next."
        />
        <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const live = f.status === 'live';
            return (
              <li
                key={f.title}
                className={`p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex flex-col justify-between transition-colors ${
                  live ? 'bg-[#F7F9FC] hover:border-indigo-300' : 'bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center ${
                        live ? 'bg-white border-indigo-100 text-primary' : 'bg-amber-50 border-amber-100 text-amber-600'
                      }`}
                    >
                      {f.icon}
                    </div>
                    <StatusPill status={f.status} />
                  </div>
                  <h3 className="text-lg font-bold text-[#0B1C30] mb-2">{f.title}</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">{f.text}</p>
                </div>
                {f.footer && (
                  <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-[11px] font-semibold text-primary">{f.footer}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

const WRITE_FOR: Platform[] = ['x', 'instagram', 'tiktok', 'linkedin', 'facebook', 'youtube'];
const PUBLISH_SOON: Platform[] = ['youtube', 'instagram', 'facebook', 'x', 'tiktok'];

export function Platforms() {
  return (
    <section className="py-12 px-4 sm:px-6 bg-[#F7F9FC] scroll-mt-20" id="platforms" aria-label="Supported platforms">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#0B1C30] min-w-[200px]">Write posts for</h2>
          <ul className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-3">
            {WRITE_FOR.map((p) => (
              <li key={p} className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1C30]">
                <BrandIcon platform={p} />
                {PLATFORM_NAMES[p]}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-[#0B1C30] min-w-[200px]">Publish automatically to</h2>
          <ul className="flex flex-wrap items-center gap-x-6 sm:gap-x-8 gap-y-3">
            <li className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1C30]">
              <BrandIcon platform="linkedin" />
              LinkedIn
              <StatusPill status="live" size="sm" />
            </li>
            {PUBLISH_SOON.map((p) => (
              <li key={p} className="inline-flex items-center gap-2 text-sm font-medium text-[#777587]">
                <BrandIcon platform={p} muted className="w-4 h-4 opacity-60" />
                <span className="opacity-70">{PLATFORM_NAMES[p]}</span>
                <StatusPill status="soon" size="sm" />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
