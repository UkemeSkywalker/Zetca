import Link from 'next/link';
import { Eyebrow } from './ui';

const QUESTIONS = [
  {
    q: 'Which platforms can Zetca publish to?',
    a: 'LinkedIn today. YouTube, Instagram, Facebook, X and TikTok are coming soon, and Zetca already writes posts for all of them.',
  },
  {
    q: 'Can I edit posts before they go out?',
    a: 'Yes. Every post is a draft you can edit by hand or ask the Copywriter to rewrite, and nothing is published until you schedule it.',
  },
  { q: 'Do I need a card to sign up?', a: 'No. You can start on the Free plan without a card.' },
  {
    q: 'Is my data safe?',
    a: 'Your content is stored encrypted, connected accounts are only used to publish what you schedule, and you can disconnect them at any time. Our Privacy Policy explains the details.',
  },
  {
    q: 'What are the Graphic Designer and Video Editor?',
    a: 'Two tools we’re building. The Graphic Designer will make on-brand images and thumbnails for your posts, and the Video Editor will trim, caption and resize videos for each platform.',
  },
];

export function Faq() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-white border-t border-[#E2E8F0] scroll-mt-20" id="faq" aria-labelledby="faq-title">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-title" className="text-3xl sm:text-4xl font-bold text-[#0B1C30] tracking-tight mt-2 font-heading">
            Questions, answered
          </h2>
        </div>
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {QUESTIONS.map((item, i) => (
            <details key={item.q} className="group py-6" open={i === 0}>
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-base sm:text-lg font-bold text-[#0B1C30] [&::-webkit-details-marker]:hidden">
                <span>{item.q}</span>
                <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[#777587] transition-transform group-open:rotate-180 shrink-0" aria-hidden="true">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </span>
              </summary>
              <p className="mt-3 text-sm text-[#464555] leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 sm:px-6 py-8" aria-labelledby="cta-title">
      <div className="max-w-5xl mx-auto bg-primary text-white px-6 py-12 md:p-16 rounded-3xl text-center shadow-xl my-12 sm:my-16">
        <h2 id="cta-title" className="text-3xl md:text-4xl font-bold tracking-tight font-heading text-white">
          Start creating with Zetca
        </h2>
        <p className="text-indigo-100 text-lg mt-3">Start free, no card needed.</p>
        <Link
          href="/signup"
          className="bg-white text-primary-700 font-bold px-8 py-3.5 rounded-xl mt-8 inline-block hover:bg-indigo-50 transition-colors shadow-sm"
        >
          Get started free
        </Link>
      </div>
    </section>
  );
}
