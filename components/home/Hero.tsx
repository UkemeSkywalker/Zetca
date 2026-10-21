import Image from 'next/image';
import Link from 'next/link';
import { BrandIcon, PLATFORM_NAMES, type Platform } from '@/components/marketing/BrandIcons';

const BUILT_FOR: Platform[] = ['youtube', 'linkedin', 'instagram', 'x', 'facebook', 'tiktok'];

export function Hero() {
  return (
    <section className="relative pt-14 sm:pt-16 pb-16 px-4 sm:px-6" aria-labelledby="hero-title">
      {/* Soft indigo glow behind the headline */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[640px] pointer-events-none -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[720px] h-[520px] bg-gradient-to-b from-[#EEF2FF] via-[#EEF2FF]/60 to-transparent rounded-full blur-3xl opacity-80" />
      </div>

      <div className="max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-emerald-200 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#10B981]" />
          <span className="text-xs font-semibold text-[#059669]">Zetca Content OS is live</span>
        </div>
        <h1 id="hero-title" className="text-[40px] sm:text-6xl md:text-[64px] font-bold text-[#0B1C30] tracking-tight leading-[1.08] mb-6 font-heading">
          An AI content team for your brand
        </h1>
        <p className="text-lg sm:text-xl text-[#464555] max-w-2xl mx-auto mb-10 leading-relaxed">
          Plan strategy, write tailored posts, schedule, and publish automatically from one place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/signup"
            className="w-full sm:w-auto px-7 py-3.5 text-base font-semibold text-white bg-primary hover:bg-primary-700 rounded-xl shadow-sm shadow-indigo-300 transition-colors text-center"
          >
            Start planning posts
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-6 py-3.5 text-base font-semibold text-[#0B1C30] bg-white border border-[#E2E8F0] hover:border-slate-300 rounded-xl transition-colors text-center"
          >
            See the workflow
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 sm:gap-x-8 gap-y-3 pt-4 border-t border-[#E2E8F0]/70 text-sm font-medium">
          <span className="text-xs tracking-wider uppercase font-semibold text-[#777587]">Built for</span>
          {BUILT_FOR.map((p) => (
            <span key={p} className="inline-flex items-center gap-1.5 text-[#0B1C30]">
              <BrandIcon platform={p} className={p === 'x' || p === 'tiktok' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
              {PLATFORM_NAMES[p]}
            </span>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-14 grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
        <div className="hidden xl:block xl:col-span-3">
          <PhotoCard
            src="/home/creator-studio.jpg"
            alt="A creator editing a video at her desk"
            label="Creators"
            pill={{ text: 'Copywriter', tone: 'green' }}
            title="For creators"
            line="Plan a week of posts and videos in one sitting."
          />
        </div>
        <div className="xl:col-span-6 w-full">
          <AppMockup />
        </div>
        <div className="hidden xl:block xl:col-span-3">
          <PhotoCard
            src="/home/solo-founder.jpg"
            alt="A founder working from a sunlit home office"
            label="Small businesses"
            pill={{ text: 'Scheduler', tone: 'indigo' }}
            title="For founders"
            line="Posts go out on time while you run the business."
          />
        </div>
      </div>
    </section>
  );
}

function PhotoCard({
  src,
  alt,
  label,
  pill,
  title,
  line,
}: {
  src: string;
  alt: string;
  label: string;
  pill: { text: string; tone: 'green' | 'indigo' };
  title: string;
  line: string;
}) {
  return (
    <figure className="bg-white p-3 rounded-2xl border border-[#E2E8F0] shadow-md">
      <div className="h-48 rounded-xl overflow-hidden relative mb-3">
        <Image src={src} alt={alt} fill sizes="(min-width: 1280px) 25vw, 0px" className="object-cover" />
        <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold text-white bg-black/60 backdrop-blur-md rounded-md">{label}</span>
        <span
          className={`absolute bottom-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
            pill.tone === 'green' ? 'text-[#059669] bg-[#ECFDF5] border-emerald-200' : 'text-indigo-700 bg-indigo-50 border-indigo-200'
          }`}
        >
          {pill.text}
        </span>
      </div>
      <figcaption className="text-left px-1">
        <div className="text-xs font-bold text-[#0B1C30]">{title}</div>
        <p className="text-[11px] text-[#777587]">{line}</p>
      </figcaption>
    </figure>
  );
}

const NAV = [
  { label: 'Dashboard', d: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { label: 'Strategist', d: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4.24 5.76-2.12 6.36-6.36 2.12 2.12-6.36z' },
  { label: 'Copywriter', d: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z' },
  { label: 'Scheduler', d: 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM16 2v4M8 2v4M3 10h18' },
  { label: 'Publisher', d: 'M22 2 11 13M22 2l-7 20-4-9-9-4z' },
];

/** The Scheduler, drawn in HTML so it stays sharp at any size */
function AppMockup() {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-xl shadow-slate-200/50 overflow-hidden" role="img" aria-label="Zetca's Scheduler showing this week's posts">
      <div className="h-10 bg-slate-50 border-b border-[#E2E8F0] px-4 flex items-center justify-between" aria-hidden="true">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="w-3 h-3 rounded-full bg-slate-300" />
          <span className="w-3 h-3 rounded-full bg-slate-300" />
        </div>
        <div className="px-4 py-1 bg-white rounded-md border border-[#E2E8F0] text-xs text-[#777587] font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          zetca.pro/dashboard/scheduler
        </div>
        <div className="w-10" />
      </div>
      <div className="flex flex-col md:flex-row min-h-[420px] bg-[#F7F9FC] text-left" aria-hidden="true">
        <div className="hidden md:flex w-48 bg-[#0B1220] p-4 text-white flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2.5 px-2 py-2 mb-6">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                <div className="w-3.5 h-3.5 border-2 border-white rounded-[2px]" />
              </div>
              <div>
                <div className="text-sm font-bold">Zetca</div>
                <div className="text-[8px] tracking-wider text-slate-400 uppercase">Content OS</div>
              </div>
            </div>
            <div className="space-y-1 text-xs font-medium">
              {NAV.map((item) => (
                <div
                  key={item.label}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2.5 ${
                    item.label === 'Scheduler' ? 'bg-primary text-white font-semibold' : 'text-slate-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d={item.d} />
                  </svg>
                  {item.label}
                </div>
              ))}
              <div className="px-3 py-2 rounded-lg text-slate-400 flex items-center justify-between">
                Designer
                <span className="text-[9px] font-semibold text-amber-300 bg-amber-900/60 px-1.5 py-0.5 rounded">Soon</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-800 flex items-center gap-2.5 px-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">AV</div>
            <div className="text-xs truncate">
              <div className="font-medium">Alex Vance</div>
              <div className="text-[10px] text-slate-400">Studio</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0] mb-4">
              <div>
                <div className="text-base font-bold text-[#0B1C30]">This week</div>
                <p className="text-xs text-[#777587]">3 posts scheduled across your channels</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#ECFDF5] text-[#059669] rounded-full border border-emerald-200">LinkedIn connected</span>
                <span className="px-2.5 py-1 text-xs font-semibold text-white bg-primary rounded-lg">Schedule post</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <MockPost
                platform="linkedin"
                kind="LinkedIn post"
                when="Thu · 9:00 AM"
                title="3 habits that keep a small team shipping every week"
                status={{ text: 'Publishes automatically', tone: 'green' }}
              />
              <MockPost
                platform="instagram"
                kind="Instagram caption"
                when="Fri · 6:30 PM"
                title="Behind the scenes: how we plan a month of content"
                status={{ text: 'Scheduled', tone: 'indigo' }}
              />
              <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1C30]">
                    <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d={NAV[1].d} />
                    </svg>
                    Strategist topic
                  </span>
                  <span className="text-[10px] font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full">Approved</span>
                </div>
                <div className="text-xs font-bold text-[#0B1C30] mb-0.5">Morning mobility for remote workers</div>
                <p className="text-[11px] text-[#777587] line-clamp-1">5 short exercises for lower-back tension from long days of sitting.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-2.5 border-t border-[#E2E8F0] flex flex-wrap gap-2 items-center justify-between text-[10px] text-[#777587]">
            <span>Times shown in your time zone</span>
            <span className="font-medium text-[#0B1C30]">Next post: Thu at 9:00 AM</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockPost({
  platform,
  kind,
  when,
  title,
  status,
}: {
  platform: Platform;
  kind: string;
  when: string;
  title: string;
  status: { text: string; tone: 'green' | 'indigo' };
}) {
  return (
    <div className="bg-white p-3 rounded-xl border border-[#E2E8F0] shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B1C30]">
          <BrandIcon platform={platform} className="w-3.5 h-3.5" />
          {kind}
        </span>
        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full whitespace-nowrap">{when}</span>
      </div>
      <div className="text-xs font-bold text-[#0B1C30] truncate">{title}</div>
      <div className="mt-1 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${status.tone === 'green' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
        <span className={`text-[10px] font-medium ${status.tone === 'green' ? 'text-emerald-700' : 'text-indigo-700'}`}>{status.text}</span>
      </div>
    </div>
  );
}
