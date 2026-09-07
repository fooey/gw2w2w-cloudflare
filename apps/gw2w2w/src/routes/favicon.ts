import { redirect } from 'react-router';

import { getEmblemSrc } from '#lib/emblems';

/** The guild whose emblem serves as the site favicon. */
const FAVICON_GUILD_ID = '97C007DC-87D5-E311-9621-AC162DAE8ACD';

/**
 * Serves the site favicon by redirecting to the live emblem service rather than shipping a static
 * icon, so the favicon tracks the guild's current emblem.
 *
 * There must be no `public/favicon.ico`: Cloudflare Workers serve a matching static asset without
 * invoking the Worker at all, which would make this route unreachable. To switch to a static icon,
 * add that file and delete this route.
 *
 * Note this is genuinely new behaviour rather than a port of the old one. next.config.ts declared
 * the same redirect, but Next served src/app/favicon.ico as a static asset ahead of it, so the
 * redirect never fired and production has always answered 200 with a 25931-byte ICO. The emblem
 * service returns WebP, so the served image and its content type both change.
 */
export function loader() {
  // Cache the redirect itself. Without this the response carries no cache headers at all, so every
  // cold page load re-runs the Worker just to be told where the icon lives — and root.tsx points
  // both `icon` and `apple-touch-icon` here, so browsers ask twice. The target is a fixed guild id
  // and never varies, so it is safe to hold; 24h matches what the emblem service sends for the
  // image itself. Changing FAVICON_GUILD_ID would take up to that long to reach existing visitors.
  return redirect(getEmblemSrc(FAVICON_GUILD_ID), {
    status: 307,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
