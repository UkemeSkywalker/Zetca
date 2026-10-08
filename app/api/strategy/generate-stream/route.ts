import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getConfig } from '@/lib/config';
import { getStrategyService } from '@/lib/services/container';
import { StrategyInputSchema } from '@/lib/models/strategy';
import { withTimeout, handleRouteError } from '@/lib/api/routeHelpers';

/**
 * Same as POST /api/strategy/generate, but streams server-sent events while the
 * strategy is written:
 *   progress  { stage, progress }   which part the model is on, and roughly how far
 *   result    { id }                the saved strategy
 *   error     { detail, status }
 */

function sseFrame(eventType: string, data: unknown): string {
  return `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function generateStrategyStreamHandler(req: NextRequest, userId: string): Promise<Response> {
  let input;
  try {
    input = StrategyInputSchema.parse(await req.json());
  } catch (error) {
    return handleRouteError(error, 'Invalid strategy input.');
  }
  const cfg = getConfig();
  const encoder = new TextEncoder();

  console.info(`Generating strategy (streamed) for brand: ${input.brand_name} (mock=${cfg.useMockAgent})`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // If the browser goes away, keep generating and saving (as the non-streamed
      // route does) so the strategy still shows up in the list
      let open = true;
      const send = (eventType: string, data: unknown) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(sseFrame(eventType, data)));
        } catch {
          open = false;
        }
      };

      // If the request times out, cancel so the late result isn't saved
      const cancel = new AbortController();
      try {
        const record = await withTimeout(
          getStrategyService().generateAndStoreStrategy(input, userId, {
            signal: cancel.signal,
            onProgress: (progress) => send('progress', progress),
          }),
          cfg.agentTimeoutSeconds,
          `Strategy generation timed out after ${cfg.agentTimeoutSeconds} seconds. Please try again.`,
          () => cancel.abort()
        );
        console.info(`Successfully generated and stored strategy for: ${input.brand_name} (ID: ${record.id})`);
        send('result', { id: record.id });
      } catch (error) {
        // Reuse the JSON route's error mapping for the message and status
        const response = handleRouteError(error, 'Strategy generation failed. Please try again.');
        const body = await response.json().catch(() => ({}));
        send('error', { detail: body.detail ?? 'Strategy generation failed. Please try again.', status: response.status });
      } finally {
        if (open) controller.close();
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
  const handler = await withAuth(generateStrategyStreamHandler);
  return handler(req);
}
