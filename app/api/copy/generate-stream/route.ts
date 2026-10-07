import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyRepository, getCopyService } from '@/lib/services/container';
import { CopyGenerateInputSchema, newCopyRecord } from '@/lib/models/copy';
import { jsonError } from '@/lib/api/routeHelpers';
import { ApiError } from '@/lib/errors';

/** Normalize platform names to lowercase, collapsing Twitter/X/TikTok variants to "x". */
function normalizePlatform(p: string): string {
  const lower = p.toLowerCase().trim();
  if (['twitter', 'twitter/x', 'x (twitter)', 'x/twitter', 'tiktok'].includes(lower)) return 'x';
  return lower;
}

function sseFrame(eventType: string, data: unknown): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function generateCopiesStreamHandler(req: NextRequest, userId: string): Promise<Response> {
  const body = await req.json();
  const input = CopyGenerateInputSchema.parse(body);
  const copyService = getCopyService();

  // Verify strategy ownership upfront before streaming.
  let strategy;
  try {
    strategy = await copyService.getStrategyWithOwnership(input.strategy_id, userId);
  } catch (error) {
    if (error instanceof ApiError) return jsonError(error.message, error.statusCode);
    throw error;
  }

  const strategyData: Record<string, any> = {
    brand_name: strategy.brand_name,
    industry: strategy.industry,
    target_audience: strategy.target_audience,
    goals: strategy.goals,
    ...strategy.strategy_output,
    platform_recommendations: [
      { platform: 'Twitter' },
      { platform: 'Instagram' },
      { platform: 'LinkedIn' },
      { platform: 'Facebook' },
    ],
  };

  const encoder = new TextEncoder();
  const agent = copyService.agent as any; // has generateCopiesStream (real or mock)

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let finalCopiesData: Array<{ text: string; platform: string; hashtags: string[] }> | null = null;

        for await (const event of agent.generateCopiesStream(strategyData)) {
          controller.enqueue(encoder.encode(sseFrame(event.event, event)));
          if (event.event === 'result') finalCopiesData = event.copies ?? [];
        }

        if (finalCopiesData) {
          const records = finalCopiesData.map((item) =>
            newCopyRecord({
              strategy_id: input.strategy_id,
              user_id: userId,
              text: item.text,
              platform: normalizePlatform(item.platform),
              hashtags: item.hashtags ?? [],
            })
          );
          const saved = await getCopyRepository().createCopies(records);
          controller.enqueue(encoder.encode(sseFrame('saved', saved)));
        }

        controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'));
      } catch (e: any) {
        console.error('Streaming copy generation failed:', e);
        controller.enqueue(encoder.encode(sseFrame('error', { event: 'error', message: e?.message ?? String(e) })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(req: NextRequest) {
  const handler = await withAuth(generateCopiesStreamHandler);
  return handler(req);
}
