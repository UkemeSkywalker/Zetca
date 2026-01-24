import HeroSection from '@/components/home/HeroSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import WaitlistSection from '@/components/home/WaitlistSection';
import PricingSection from '@/components/home/PricingSection';

export default function Home() {
  return (
    <main>
      <HeroSection />
      <FeaturesSection />
      <WaitlistSection />
      <PricingSection />
    </main>
  );
}
