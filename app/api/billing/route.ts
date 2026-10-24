/**
 * GET /api/billing: the user's plan, credit balance, the plans, and recent usage
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCredits, getLedger } from '@/lib/billing/charge';
import { PLANS, TOP_UPS } from '@/lib/billing/plans';
import { ACTIONS } from '@/lib/billing/prices';
import { handleRouteError } from '@/lib/api/routeHelpers';

export async function GET(req: NextRequest) {
  const handler = await withAuth(async (_request: NextRequest, userId: string) => {
    try {
      const [credits, usage] = await Promise.all([getCredits().get(userId), getLedger().recent(userId, 50).catch(() => [])]);
      return NextResponse.json({
        credits,
        plans: Object.values(PLANS),
        topUps: TOP_UPS,
        prices: Object.fromEntries(Object.entries(ACTIONS).map(([id, a]) => [id, a.credits])),
        // What the user sees of each entry: no Zetca costs or token counts
        usage: usage.map(({ entryId, action, credits: c, detail, status, createdAt }) => ({
          id: entryId,
          action,
          label: ACTIONS[action]?.label ?? action,
          credits: c,
          detail,
          status,
          createdAt,
        })),
      });
    } catch (error) {
      return handleRouteError(error, 'Couldn’t load your credits. Please try again.');
    }
  });
  return handler(req);
}
