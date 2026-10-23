/**
 * Plans and what they include. Credits reset monthly; top-up credits come on
 * top and last 12 months. Prices are in US dollars a month.
 * See docs/pricing/Zetca credits and pricing.xlsx for the working.
 */

export const PLAN_IDS = ['free', 'starter', 'pro', 'agency'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export interface Plan {
  id: PlanId;
  name: string;
  priceUsd: number;
  monthlyCredits: number;
  /** AI images and videos (Free users get text designs and stock photos) */
  aiMedia: boolean;
  /** 0 = Free, 1 = Starter, 2 = Pro, 3 = Agency: models list the lowest tier that can use them */
  tier: number;
}

export const PLANS: Record<PlanId, Plan> = {
  free: { id: 'free', name: 'Free', priceUsd: 0, monthlyCredits: 100, aiMedia: false, tier: 0 },
  starter: { id: 'starter', name: 'Starter', priceUsd: 15, monthlyCredits: 1500, aiMedia: true, tier: 1 },
  pro: { id: 'pro', name: 'Pro', priceUsd: 39, monthlyCredits: 4000, aiMedia: true, tier: 2 },
  agency: { id: 'agency', name: 'Agency', priceUsd: 99, monthlyCredits: 10000, aiMedia: true, tier: 3 },
};

export const planOf = (id: string | undefined): Plan => PLANS[(PLAN_IDS as readonly string[]).includes(id ?? '') ? (id as PlanId) : 'free'];

/** Top-up packs: credits on top of the plan, for 12 months */
export const TOP_UPS = [
  { id: 'topup-500', credits: 500, priceUsd: 6 },
  { id: 'topup-2000', credits: 2000, priceUsd: 22 },
] as const;
