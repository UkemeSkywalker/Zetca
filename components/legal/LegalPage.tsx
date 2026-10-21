import type { ReactNode } from 'react';

export interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

/** A legal document: title, date, a contents list (sticky on desktop) and readable sections */
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <div className="bg-[#F7F9FC] px-4 sm:px-6 py-12 sm:py-16">
      <div className="max-w-6xl mx-auto lg:grid lg:grid-cols-[220px_minmax(0,720px)] lg:gap-16 lg:justify-center">
        <nav aria-label="Contents" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-xs font-bold uppercase tracking-wider text-[#0B1C30] mb-3">Contents</p>
            <ol className="space-y-2 text-sm text-[#464555]">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="hover:text-primary transition-colors">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>
        <article className="min-w-0">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0B1C30] tracking-tight font-heading">{title}</h1>
          <p className="mt-3 text-sm text-[#777587]">Last updated {updated}</p>
          <div className="mt-8 text-base leading-relaxed text-[#464555] space-y-4">{intro}</div>
          {sections.map((s) => (
            <section key={s.id} id={s.id} className="mt-10 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0B1C30] mb-3 font-heading">{s.title}</h2>
              <div className="text-base leading-relaxed text-[#464555] space-y-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline [&_strong]:text-[#0B1C30]">
                {s.body}
              </div>
            </section>
          ))}
        </article>
      </div>
    </div>
  );
}
