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
        {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/70 to-white/60" />
      </div>

      {/* Content - positioned above background */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Trust Badge */}
        <div className="mb-8 flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-sm">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
          </div>
          <span className="text-sm text-gray-700 font-medium">Trusted by 50K startups & enterprenuers all over the world</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-gray-900 mb-6 leading-tight text-center max-w-4xl">
          Your Social Media Team
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Replaced By AI
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-lg lg:text-xl text-gray-600 mb-10 max-w-2xl mx-auto text-center">
          Stop wasting hours on social media. Zetca replaces your team with AI agents that plan, create, design, schedule, and publish content automatically.
        </p>

        {/* CTA Button */}
        <Link href="/dashboard/strategist">
          <Button variant="primary" size="lg" className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transition-shadow">
            Get Started →
          </Button>
        </Link>

        {/* Dashboard Preview Image */}
        <div className="mt-16 w-full max-w-6xl mx-auto">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
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
