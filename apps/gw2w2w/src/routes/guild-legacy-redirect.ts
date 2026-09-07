import { href, redirect } from 'react-router';

import { decodeRouteParam } from '#lib/utils/decodeRouteParam';

import type { Route } from './+types/guild-legacy-redirect';

/**
 * Legacy singular `/guild/:guildId` from an earlier version of the site.
 *
 * It still receives real traffic — around 760 hits a week in Workers Observability — and has been
 * answering 404 the whole time, so those links have been dead rather than merely old. The plural
 * `/guilds/:guildId` is the canonical URL (it is what the page's own `rel=canonical` emits), which
 * makes this a permanent move: 301, so clients and crawlers replace the link rather than keep
 * asking. `href()` re-encodes the id, so the param is decoded first to avoid double-encoding a
 * name containing a literal `/`.
 */
export function loader({ params }: Route.LoaderArgs) {
  return redirect(href('/guilds/:guildId', { guildId: decodeRouteParam(params.guildId) }), 301);
}
