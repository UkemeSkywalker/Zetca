'use client';

import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-start overflow-hidden pt-40 pb-20 px-4 sm:px-6 lg:px-8">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/Herobg.jpg"
          alt="Hero Background"
          fill
          priority
          className="object-cover"
          quality={90}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/70 to-surface/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Trust Badge */}
        <div className="mb-8 flex items-center gap-2 glass rounded-full px-4 sm:px-6 py-3 shadow-ambient-sm">
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 gradient-primary">
            <svg className="w-5 h-5 text-on-primary" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm text-on-surface/70 font-medium">Trusted by 50K startups & entrepreneurs all over the world</span>
        </div>

        {/* Main Heading - display-md with tight tracking */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold font-heading text-on-surface mb-6 leading-tight text-center max-w-4xl px-4" style={{ letterSpacing: '-0.02em' }}>
          Your Social Media Team
          <br />
          <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'var(--gradient-primary)' }}>
            Replaced By AI
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-base sm:text-lg lg:text-xl text-outline mb-10 max-w-2xl mx-auto text-center px-4">
          Stop wasting hours on social media. Zetca replaces your team with AI agents that plan, create, design, schedule, and publish content automatically.
        </p>

        {/* CTA Button */}
        <Link href="/dashboard/strategist">
          <Button variant="primary" size="lg" className="text-lg px-8 py-4 shadow-ambient hover:shadow-ambient-lg transition-shadow">
            Get Started →
          </Button>
        </Link>

        {/* Dashboard Preview Image */}
        <div className="mt-16 w-full max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-ambient-lg bg-surface-container-lowest" style={{ border: '1px solid var(--ghost-border)' }}>
            <Image
              src="/images/Dashboard.png"
              alt="Zetca Dashboard Preview"
              width={1200}
              height={800}
              priority
              className="w-full h-auto"
              quality={95}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
