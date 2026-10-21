import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { BrowserFrame, Check, Eyebrow, MiniSidebar } from './ui';

function Highlight({
  eyebrow,
  title,
  text,
  bullets,
  children,
  imageFirst,
}: {
  eyebrow: string;
  title: string;
  text: string;
  bullets: string[];
  children: ReactNode;
  imageFirst?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
      <div className={imageFirst ? 'lg:order-2' : ''}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="text-3xl sm:text-[32px] font-bold text-[#0B1C30] tracking-tight mt-2 mb-4 leading-tight font-heading">{title}</h3>
        <p className="text-base text-[#464555] leading-relaxed mb-6">{text}</p>
        <ul className="space-y-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-3 text-sm font-medium text-[#0B1C30]">
              <Check />
              {b}
            </li>
          ))}
        </ul>
      </div>
      <div className={imageFirst ? 'lg:order-1' : ''}>{children}</div>
    </div>
  );
}

const PILLARS = [
  { name: 'Educational tutorials', share: '40%', tone: 'bg-blue-50 text-blue-700', text: 'Step-by-step guides your audience can follow along with.', tags: ['#HowTo', '#Beginners'] },
  { name: 'Industry insights', share: '35%', tone: 'bg-purple-50 text-purple-700', text: 'Weekly opinions and trends, written for LinkedIn readers.', tags: ['#Trends', '#Opinion'] },
  { name: 'Behind the scenes', share: '25%', tone: 'bg-amber-50 text-amber-700', text: 'How the work gets made: setups, plans and lessons.', tags: ['#BuildInPublic'] },
];

const DAYS = [
  { day: 'MON', chip: { platform: 'LINKEDIN', box: 'bg-blue-50 border-blue-200', label: 'text-blue-700', title: 'Pricing lessons', time: '09:00 AM' }, status: { text: '✓ Published', tone: 'text-emerald-600' } },
  { day: 'TUE', chip: { platform: 'YOUTUBE', box: 'bg-red-50 border-red-200', label: 'text-red-700', title: 'Weekly Q&A clip', time: '06:30 PM' }, status: { text: '• Scheduled', tone: 'text-indigo-600' } },
  { day: 'WED · TODAY', today: true, chip: { platform: 'LINKEDIN', box: 'bg-blue-50 border-blue-200', label: 'text-blue-700', title: '3 team habits', time: '02:15 PM' }, status: { text: 'Queued (auto)', tone: 'text-amber-600' } },
];

export function Highlights() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-white border-t border-[#E2E8F0]" aria-label="Product highlights">
      <div className="max-w-6xl mx-auto space-y-20 lg:space-y-24">
        <Highlight
          eyebrow="Strategist"
          title="Know what to post"
          text="Generate content pillars and a platform strategy made for your brand voice and your audience."
          bullets={['Content pillars and themes', 'SEO-ready channel bios', 'Keywords for your niche']}
        >
          <BrowserFrame url="zetca.pro/dashboard/strategist">
            <div className="flex min-h-[340px] bg-[#F7F9FC]" role="img" aria-label="A content strategy with three content pillars">
              <MiniSidebar active="Strategist" footer="Active brand" />
              <div className="flex-1 p-4 sm:p-5" aria-hidden="true">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0] mb-4">
                  <div>
                    <div className="text-xs font-bold text-[#0B1C30]">Brand content strategy</div>
                    <div className="text-[10px] text-[#777587]">Voice: practical · friendly · expert</div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-semibold text-primary bg-indigo-50 rounded-full border border-indigo-200 whitespace-nowrap">3 pillars</span>
                </div>
                <div className="space-y-3">
                  {PILLARS.map((p) => (
                    <div key={p.name} className="p-3 bg-white rounded-xl border border-[#E2E8F0]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#0B1C30]">{p.name}</span>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${p.tone}`}>{p.share} share</span>
                      </div>
                      <p className="text-[10px] text-[#777587] mb-2 leading-relaxed">{p.text}</p>
                      <div className="flex flex-wrap gap-1">
                        {p.tags.map((t) => (
                          <span key={t} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </BrowserFrame>
        </Highlight>

        <Highlight
          eyebrow="Scheduler"
          title="Never miss a post"
          text="Organise drafts on a calendar for every channel, with suggested times and the status of each post."
          bullets={['Drag posts to reschedule', 'Auto-schedule a whole set', 'See what’s published or failed']}
          imageFirst
        >
          <BrowserFrame url="zetca.pro/dashboard/scheduler">
            <div className="flex min-h-[340px] bg-[#F7F9FC]" role="img" aria-label="A weekly calendar with scheduled posts">
              <MiniSidebar active="Scheduler" footer="Queued: 8 posts" />
              <div className="flex-1 p-4 sm:p-5 min-w-0" aria-hidden="true">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
                  <span className="text-xs font-bold text-[#0B1C30]">This week</span>
                  <span className="px-2 py-0.5 bg-primary text-white rounded text-[10px] font-semibold">+ Schedule post</span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {DAYS.map((d) => (
                    <div
                      key={d.day}
                      className={`p-2 bg-white rounded-lg border border-[#E2E8F0] min-h-[170px] flex flex-col justify-between ${d.today ? 'ring-1 ring-primary/40' : ''}`}
                    >
                      <div>
                        <div className={`text-[10px] font-bold mb-1 ${d.today ? 'text-primary' : 'text-[#777587]'}`}>{d.day}</div>
                        <div className={`p-1.5 rounded border ${d.chip.box}`}>
                          <span className={`text-[8px] font-bold ${d.chip.label}`}>{d.chip.platform}</span>
                          <div className="text-[9px] font-bold text-[#0B1C30] truncate mt-0.5">{d.chip.title}</div>
                          <div className="text-[8px] text-[#777587]">{d.chip.time}</div>
                        </div>
                      </div>
                      <div className={`text-[8px] font-semibold ${d.status.tone}`}>{d.status.text}</div>
                    </div>
                  ))}
                  <div className="hidden sm:flex p-2 bg-slate-50/70 rounded-lg border border-dashed border-[#E2E8F0] min-h-[170px] flex-col justify-between items-center text-center">
                    <div className="w-full">
                      <div className="text-[10px] font-bold text-[#777587] mb-1">THU</div>
                      <div className="mt-4 p-2 rounded border border-dashed border-slate-300 text-[9px] text-[#777587]">Drop a post here</div>
                    </div>
                    <div className="text-[8px] text-primary font-semibold">+ Suggested time</div>
                  </div>
                </div>
              </div>
            </div>
          </BrowserFrame>
        </Highlight>
      </div>
    </section>
  );
}

export function TeamBanner() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-6" aria-labelledby="team-title">
      <div className="relative rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-lg min-h-[320px] flex items-center">
        <Image src="/home/team.jpg" alt="" fill sizes="(min-width: 1152px) 1104px, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B1C30]/90 via-[#0B1C30]/70 to-[#0B1C30]/20" />
        <div className="relative p-8 sm:p-12 max-w-xl text-white">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-4">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Built for modern growth teams
          </div>
          <h2 id="team-title" className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 font-heading text-white">
            Scale your entire social voice together
          </h2>
          <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-6">
            From small studios to growing startups, keep your strategy in one place and your posts flowing across platforms.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-primary hover:bg-primary-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
            >
              Start planning posts
            </Link>
            <span className="text-xs text-slate-300">No credit card required</span>
          </div>
        </div>
      </div>
    </section>
  );
}
