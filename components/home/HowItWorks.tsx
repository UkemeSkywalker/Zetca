import Image from 'next/image';
import { SectionHeading } from './ui';

const STEPS = [
  { title: 'Define your plan', text: 'Answer a quick quiz about your brand and audience, and get a content strategy with topics and keywords.' },
  { title: 'Review your drafts', text: 'The Copywriter writes posts for every platform. Read and edit each one before it’s scheduled.' },
  { title: 'Automate publishing', text: 'Pick the times or let Zetca suggest them. Posts go out to your connected channels on schedule.' },
];

export function WorkflowBanner() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 mb-8" aria-label="Connected content operations">
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-blue-50/50 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-300" aria-hidden="true">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-primary">Connected content operations</div>
            <div className="text-lg font-bold text-[#0B1C30]">Strategy, copy and scheduling in one workspace</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <span className="text-xs font-semibold text-[#059669] bg-[#ECFDF5] border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            LinkedIn auto-publishing live
          </span>
          <a className="text-xs font-bold text-primary hover:text-primary-700 transition-colors" href="#how-it-works">
            See the 3 steps →
          </a>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="py-16 px-4 sm:px-6 scroll-mt-20" id="how-it-works" aria-labelledby="how-title">
      <div className="max-w-6xl mx-auto">
        <SectionHeading
          id="how-title"
          eyebrow="Workflow"
          title="How content moves from idea to published post"
          subtitle="Three simple steps to keep your channels active without daily manual uploads."
        />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <ol className="lg:col-span-7 flex flex-col justify-between gap-4">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm flex items-start gap-5 hover:border-indigo-200 transition-colors"
              >
                <span className="w-10 h-10 rounded-xl bg-indigo-50 text-primary font-bold text-sm flex items-center justify-center shrink-0 border border-indigo-100">
                  0{i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold text-[#0B1C30] mb-1">{step.title}</h3>
                  <p className="text-sm text-[#464555] leading-relaxed">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <figure className="lg:col-span-5 bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden flex flex-col justify-between">
            <div className="relative h-64 sm:h-72 lg:h-full lg:min-h-[260px] w-full overflow-hidden">
              <Image
                src="/home/workspace.jpg"
                alt="Hands typing on a laptop in a creator's workspace"
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B1C30]/80 via-transparent to-transparent" />
              <figcaption className="absolute bottom-4 left-4 right-4 text-white">
                <span className="px-2.5 py-0.5 text-[10px] font-bold text-[#34D399] bg-black/60 backdrop-blur-md rounded-full border border-emerald-400/40">
                  One workspace
                </span>
                <div className="text-sm font-bold mt-1">From first idea to published post</div>
              </figcaption>
            </div>
            <div className="p-5 bg-slate-50 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
              <span className="text-[#777587]">Auto-publishing</span>
              <span className="font-bold text-[#0B1C30] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                LinkedIn today, more soon
              </span>
            </div>
          </figure>
        </div>
      </div>
    </section>
  );
}
