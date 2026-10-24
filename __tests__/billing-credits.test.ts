/**
 * @jest-environment node
 */
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { Credits, OutOfCreditsError, PlanRequiredError, monthOf } from '@/lib/billing/credits';
import { charge, requireAiMedia, setBillingBackends, withCredits } from '@/lib/billing/charge';
import { memoryBilling } from '@/lib/billing/testing';
import { recordTokens } from '@/lib/billing/usage';
import { ACTIONS, creditsFor, transcriptCredits } from '@/lib/billing/prices';
import { AI_IMAGE_MODELS, AI_VIDEO_MODELS, imageCredits, videoCredits } from '@/lib/billing/aiModels';
import { PLANS } from '@/lib/billing/plans';

/** A tiny stand-in for the users table: enough for the credit updates */
function usersTable(row: Record<string, number | string>) {
  const fail = () => {
    throw new ConditionalCheckFailedException({ message: 'no', $metadata: {} });
  };
  const send = jest.fn(async (cmd: { constructor: { name: string }; input: { UpdateExpression?: string; ExpressionAttributeValues?: Record<string, number | string> } }) => {
    if (cmd.constructor.name === 'GetCommand') return { Item: { ...row } };
    const v = cmd.input.ExpressionAttributeValues!;
    const expr = cmd.input.UpdateExpression!;
    if (expr === 'ADD creditsUsed :cost') {
      if (row.creditsMonth !== v[':month'] || (row.creditsUsed as number) > (v[':max'] as number)) fail();
      row.creditsUsed = (row.creditsUsed as number) + (v[':cost'] as number);
    } else if (expr.startsWith('SET creditsMonth')) {
      if (row.creditsMonth === v[':month']) fail();
      row.creditsMonth = v[':month'];
      row.creditsUsed = v[':cost'];
    } else if (expr === 'ADD creditsBonus :minus') {
      if (((row.creditsBonus as number) ?? 0) < (v[':cost'] as number)) fail();
      row.creditsBonus = (row.creditsBonus as number) + (v[':minus'] as number);
    } else if (expr === 'ADD creditsUsed :minus') {
      if (row.creditsMonth !== v[':month'] || (row.creditsUsed as number) < (v[':cost'] as number)) fail();
      row.creditsUsed = (row.creditsUsed as number) + (v[':minus'] as number);
    } else if (expr === 'ADD creditsBonus :cost' || expr === 'ADD creditsBonus :n') {
      row.creditsBonus = ((row.creditsBonus as number) ?? 0) + ((v[':cost'] ?? v[':n']) as number);
    } else throw new Error(`unexpected ${expr}`);
    return {};
  });
  return { row, doc: { send } as never };
}

describe('credit balance', () => {
  it('gives each plan its monthly credits, starting again each month', async () => {
    const t = usersTable({ userId: 'u1', plan: 'starter', creditsMonth: '2000-01', creditsUsed: 1400 });
    const credits = new Credits(t.doc);
    expect((await credits.get('u1')).left).toBe(1500);
    expect((await credits.take('u1', 26)).source).toBe('monthly');
    expect(t.row).toMatchObject({ creditsMonth: monthOf(), creditsUsed: 26 });
    expect((await credits.get('u1')).monthly).toEqual({ used: 26, limit: 1500, left: 1474 });
  });

  it('treats an unknown or missing plan as Free', async () => {
    const t = usersTable({ userId: 'u1' });
    const b = await new Credits(t.doc).get('u1');
    expect(b).toMatchObject({ plan: 'free', left: 100, aiMedia: false });
  });

  it('spends top-up credits once the month runs out, and refunds to the same place', async () => {
    const t = usersTable({ userId: 'u1', plan: 'free', creditsMonth: monthOf(), creditsUsed: 99, creditsBonus: 50 });
    const credits = new Credits(t.doc);
    const taken = await credits.take('u1', 4);
    expect(taken.source).toBe('bonus');
    expect(t.row).toMatchObject({ creditsUsed: 99, creditsBonus: 46 });
    await credits.refund('u1', 4, 'bonus', monthOf());
    expect(t.row.creditsBonus).toBe(50);
  });

  it('refuses when nothing covers the cost', async () => {
    const t = usersTable({ userId: 'u1', plan: 'free', creditsMonth: monthOf(), creditsUsed: 98, creditsBonus: 1 });
    const error = await new Credits(t.doc).take('u1', 4).catch((e) => e);
    expect(error).toBeInstanceOf(OutOfCreditsError);
    expect(error.statusCode).toBe(402);
    expect(error.message).toContain('needs 4 credits and you have 3 left');
    expect(t.row).toMatchObject({ creditsUsed: 98, creditsBonus: 1 });
  });

  it('only refunds monthly credits within their month', async () => {
    const t = usersTable({ userId: 'u1', plan: 'pro', creditsMonth: monthOf(), creditsUsed: 30 });
    const credits = new Credits(t.doc);
    await credits.refund('u1', 10, 'monthly', '2000-01');
    expect(t.row.creditsUsed).toBe(30);
    await credits.refund('u1', 10, 'monthly', monthOf());
    expect(t.row.creditsUsed).toBe(20);
  });
});

describe('charging for actions', () => {
  it('records the real tokens and cost of the AI calls inside the action', async () => {
    const b = memoryBilling('starter');
    setBillingBackends(b.credits, b.ledger);
    const result = await withCredits('u1', 'strategy', ACTIONS.strategy.credits, async () => {
      recordTokens(2450, 1450);
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(b.used.get('u1')).toBe(4);
    expect(b.entries[0]).toMatchObject({ action: 'strategy', credits: 4, status: 'charged', inputTokens: 2450, outputTokens: 1450 });
    expect(b.entries[0].costUsd).toBeCloseTo(0.032, 3);
  });

  it('gives the credits back when the action fails', async () => {
    const b = memoryBilling('starter');
    setBillingBackends(b.credits, b.ledger);
    await expect(withCredits('u1', 'copy_chat', 2, async () => Promise.reject(new Error('model down')))).rejects.toThrow('model down');
    expect(b.used.get('u1')).toBe(0);
    expect(b.entries[0]).toMatchObject({ action: 'copy_chat', credits: 0, status: 'refunded' });
  });

  it('refunds the part of a job that didn’t happen', async () => {
    const b = memoryBilling('starter');
    setBillingBackends(b.credits, b.ledger);
    const c = await charge('u1', 'copy_post', 28, 'instagram,x,linkedin,facebook');
    await c.done(7);
    expect(b.used.get('u1')).toBe(21);
    expect(b.entries[0]).toMatchObject({ credits: 21, status: 'charged' });
  });

  it('keeps AI images and videos to paid plans, and dear models to higher plans', async () => {
    setBillingBackends(memoryBilling('free').credits, memoryBilling('free').ledger);
    await expect(requireAiMedia('u1', 'AI images')).rejects.toBeInstanceOf(PlanRequiredError);
    const starter = memoryBilling('starter');
    setBillingBackends(starter.credits, starter.ledger);
    await expect(requireAiMedia('u1', 'Soul V2 images', 1)).resolves.toBeUndefined();
    await expect(requireAiMedia('u1', 'Kling 3.0 videos', 2)).rejects.toThrow('need the Pro plan');
  });
});

describe('prices', () => {
  it('are cost plus 40%, rounded, never below 1 credit', () => {
    expect(creditsFor(0.0066)).toBe(1);
    expect(creditsFor(0.032)).toBe(4);
    expect(creditsFor(0.188)).toBe(26);
  });

  it('match the pricing sheet for the AI models', () => {
    const image = Object.fromEntries(AI_IMAGE_MODELS.map((m) => [m.id, imageCredits(m)]));
    expect(image).toMatchObject({ 'soul-v2': 1, 'z-image-turbo': 2, 'recraft-v4-1': 5, 'ideogram-4': 8, 'soul-standard': 26, 'marketing-studio-2': 52 });
    const video = Object.fromEntries(AI_VIDEO_MODELS.map((m) => [m.id, videoCredits(m)]));
    expect(video).toMatchObject({ 'kling-2-5-turbo': 26, 'hailuo-2-3': 34, 'kling-3': 76, 'kling-3-4k': 251 });
    expect(ACTIONS.ai_video.credits).toBe(video['kling-2-5-turbo']);
  });

  it('charge transcripts by the minute', () => {
    expect(transcriptCredits(30)).toBe(1);
    expect(transcriptCredits(600)).toBe(8);
    expect(transcriptCredits(3600)).toBe(50);
  });

  it('give every plan more credits than the last', () => {
    const credits = Object.values(PLANS).map((p) => p.monthlyCredits);
    expect(credits).toEqual([...credits].sort((a, b) => a - b));
  });
});
