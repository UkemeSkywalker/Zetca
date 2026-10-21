import { getConfig } from '@/lib/config';

/**
 * An absolute URL on Zetca's public site, for redirects.
 *
 * Behind the proxy, req.url is the container's own address (0.0.0.0:3000),
 * so redirects built from it send people nowhere. The OAuth redirect URIs
 * are configured with the public origin (https://zetca.pro, or
 * http://localhost:3000 in dev), so that origin is used instead.
 */
export function siteUrl(path: string): URL {
  const cfg = getConfig();
  const configured = cfg.youtubeRedirectUri || cfg.linkedinRedirectUri;
  return new URL(path, new URL(configured).origin);
}
