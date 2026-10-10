import { NextRequest } from 'next/server';
import { withAuth } from '@/lib/middleware/withAuth';
import { getCopyService } from '@/lib/services/container';
import { subscribeFeed, type FeedEvent } from '@/lib/services/copyJobFeed';
import { handleRouteError, jsonError } from '@/lib/api/routeHelpers';

/**
 * Live text of a running copy job, as server-sent events:
 *   update  { lanes }     what each platform is writing right now
 *   copy    { platform }  a copy was finished and saved
 *   done    {}            the job finished, or has no live feed on this server
 * Requires ?strategy_id= so ownership can be checked.
 */

function sseFrame(event: FeedEvent): string {
  const { type, ...data } = event;
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

async function streamHandler(req: NextRequest, userId: string, jobId: string): Promise<Response> {
  const strategyId = req.nextUrl.searchParams.get('strategy_id');
  if (!strategyId) return jsonError('strategy_id is required', 400);
  try {
    const { job } = await getCopyService().getWorkspace(strategyId, userId);
    if (job?.id !== jobId) return jsonError('Job not found', 404);
  } catch (error) {
    return handleRouteError(error, 'Could not open the live feed.');
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const close = () => {
        if (!open) return;
        open = false;
        unsubscribe?.();
        controller.close();
      };
      const send = (event: FeedEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(sseFrame(event)));
        } catch {
          open = false;
          return;
        }
        // Let the frame go out before closing
        if (event.type === 'done') queueMicrotask(close);
      };
      unsubscribe = subscribeFeed(jobId, send);
      if (!unsubscribe) send({ type: 'done' });
    },
    cancel() {
      // The page went away; stop listening (the job itself keeps running)
      unsubscribe?.();
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

export async function GET(req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const handler = await withAuth(async (request, userId) => streamHandler(request, userId, jobId));
  return handler(req);
}
