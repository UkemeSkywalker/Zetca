import type { Metadata } from 'next';
import { Hero } from '@/components/home/Hero';
import { WorkflowBanner, HowItWorks } from '@/components/home/HowItWorks';
import { Features, Platforms } from '@/components/home/Features';
import { Highlights, TeamBanner } from '@/components/home/Highlights';
import { Pricing } from '@/components/home/Pricing';
import { Faq, FinalCta } from '@/components/home/Faq';

export const metadata: Metadata = {
  title: 'Zetca — An AI content team for your brand',
  description:
    'Zetca plans your content strategy, writes posts for every platform, schedules them and publishes automatically. Start free.',
};

export default function Home() {
  return (
    <div className="bg-[#F7F9FC] text-[#464555] overflow-x-hidden">
      <Hero />
      <WorkflowBanner />
      <HowItWorks />
      <Features />
      <Platforms />
      <Highlights />
      <TeamBanner />
      <Pricing />
      <Faq />
      <FinalCta />
    </div>
  );
}
