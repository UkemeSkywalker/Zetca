/**
 * Next.js instrumentation hook — runs once when the server process boots.
 *
 * Starts the publish scanner background loop that used to run inside the
 * Python service's FastAPI `lifespan` handler. This only makes sense in
 * the Node.js runtime (not Edge) and only as a persistent server process
 * (`next start` in Docker), not in a serverless deployment.
 */

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { getConfig } = await import('./lib/config');
  const cfg = getConfig();

  if (cfg.publisherEnabled) {
    const { getPublisherService } = await import('./lib/services/container');
    const { PublishScanner } = await import('./lib/services/publishScanner');
    new PublishScanner(getPublisherService()).start();
  }

  // Uploads scheduled YouTube videos
  if (cfg.youtubeWorkerEnabled) {
    const { YouTubeUploadScanner } = await import('./lib/services/youtubeUploadScanner');
    new YouTubeUploadScanner().start();
  }
}
