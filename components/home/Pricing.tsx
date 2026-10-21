import Link from 'next/link';
import { Check, SectionHeading } from './ui';

interface Plan {
  name: string;
  blurb: string;
  price: string;
  features: { text: string; soon?: boolean }[];
  cta: { label: string; href: string };
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    name: 'Free',
    blurb: 'Perfect for getting started',
    price: '$0',
    features: [
      { text: 'Up to 10 posts per month' },
      { text: 'Basic AI strategy' },
      { text: '2 social media accounts' },
      { text: 'Email support' },
      { text: 'Basic analytics', soon: true },
    ],
    cta: { label: 'Get started', href: '/signup' },
  },
  {
    name: 'Pro',
    blurb: 'Best for growing businesses',
    price: '$49',
    popular: true,
    features: [
      { text: 'Unlimited posts' },
      { text: 'Advanced AI strategy' },
      { text: 'Unlimited social accounts' },
      { text: 'Priority support' },
      { text: 'Advanced analytics', soon: true },
      { text: 'AI image generation', soon: true },
      { text: 'Team collaboration', soon: true },
      { text: 'Custom branding', soon: true },
    ],
    cta: { label: 'Start free trial', href: '/signup' },
  },
  {
    name: 'Enterprise',
    blurb: 'For large organizations',
    price: 'Custom',
    features: [
      { text: 'Everything in Pro' },
      { text: 'Dedicated account manager' },
      { text: 'Custom integrations' },
      { text: 'SLA guarantee' },
      { text: 'Advanced security' },
      { text: 'White-label options', soon: true },
    ],
    cta: { label: 'Contact sales', href: 'mailto:hello@zetca.pro' },
  },
];

export function Pricing() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#F7F9FC] border-t border-[#E2E8F0] scroll-mt-20" id="pricing" aria-labelledby="pricing-title">
      <div className="max-w-6xl mx-auto">
        <SectionHeading id="pricing-title" eyebrow="Pricing" title="Simple pricing" subtitle="Start free. Upgrade when you’re ready." center />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white p-8 rounded-2xl flex flex-col justify-between h-full ${
                plan.popular ? 'border-2 border-primary shadow-xl md:-translate-y-2' : 'border border-[#E2E8F0] shadow-sm'
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full shadow-sm">
                  Popular
                </span>
              )}
              <div>
                <h3 className="text-xl font-bold text-[#0B1C30] mb-1">{plan.name}</h3>
                <p className="text-xs text-[#777587] mb-6">{plan.blurb}</p>
                <p className="flex items-baseline gap-1 mb-8">
                  <span className="text-4xl font-bold text-[#0B1C30]">{plan.price}</span>
                  {plan.price !== 'Custom' && <span className="text-sm font-medium text-[#777587]">/month</span>}
                </p>
                <ul className="space-y-3.5 text-sm text-[#464555] mb-8">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-start gap-2.5">
                      <span className="mt-0.5">
                        <Check small />
                      </span>
                      <span>
                        {f.text}
                        {f.soon && (
                          <span className="ml-2 inline-block px-2 py-0.5 text-[10px] font-semibold text-[#B45309] bg-[#FEF3C7] rounded align-middle whitespace-nowrap">
                            Coming soon
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={plan.cta.href}
                className={`block w-full py-3 text-center text-sm font-semibold rounded-xl transition-colors ${
                  plan.popular
                    ? 'text-white bg-primary hover:bg-primary-700 shadow-md'
                    : 'text-[#0B1C30] bg-white border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {plan.cta.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
