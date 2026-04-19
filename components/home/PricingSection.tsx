'use client';

import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  isPopular?: boolean;
  ctaText: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started',
    features: [
      'Up to 10 posts per month',
      'Basic AI strategy',
      '2 social media accounts',
      'Email support',
      'Basic analytics',
    ],
    ctaText: 'Get Started',
  },
  {
    name: 'Pro',
    price: '$49',
    description: 'Best for growing businesses',
    features: [
      'Unlimited posts',
      'Advanced AI strategy',
      'Unlimited social accounts',
      'Priority support',
      'Advanced analytics',
      'AI image generation',
      'Team collaboration',
      'Custom branding',
    ],
    isPopular: true,
    ctaText: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For large organizations',
    features: [
      'Everything in Pro',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Advanced security',
      'White-label options',
    ],
    ctaText: 'Contact Sales',
  },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="py-22 px-4 bg-surface-container-low">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-display-md font-heading text-on-surface mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-outline max-w-2xl mx-auto">
            Choose the perfect plan for your social media needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative ${tier.isPopular ? 'transform lg:scale-105' : ''}`}
            >
              {/* Popular Badge */}
              {tier.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <span className="text-on-primary px-4 py-1 rounded-full text-sm font-semibold gradient-primary">
                    Popular
                  </span>
                </div>
              )}

              <Card
                className={`h-full flex flex-col ${
                  tier.isPopular
                    ? 'shadow-ambient-lg'
                    : 'ghost-border'
                }`}
                variant={tier.isPopular ? 'elevated' : 'default'}
              >
                <div className="flex-1">
                  <h3 className="text-headline-lg font-heading text-on-surface mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-outline mb-6">{tier.description}</p>

                  <div className="mb-8">
                    <span className="text-5xl font-bold font-heading text-on-surface">
                      {tier.price}
                    </span>
                    {tier.price !== 'Custom' && (
                      <span className="text-outline ml-2">/month</span>
                    )}
                  </div>

                  {/* Features - no dividers, spacing only */}
                  <ul className="space-y-4 mb-8">
                    {tier.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Icon
                          icon="solar:check-circle-bold"
                          className="text-emerald-500 text-xl mr-3 flex-shrink-0 mt-0.5"
                        />
                        <span className="text-on-surface/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto">
                  <Button
                    variant={tier.isPopular ? 'primary' : 'outline'}
                    className="w-full"
                  >
                    {tier.ctaText}
                  </Button>
                </div>
              </Card>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-outline">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      </div>
    </section>
  );
}
