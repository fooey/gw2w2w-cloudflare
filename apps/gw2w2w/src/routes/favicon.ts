import { redirect } from 'react-router';

import { getEmblemSrc } from '#lib/emblems';

/** The guild whose emblem serves as the site favicon. */
const FAVICON_GUILD_ID = '97C007DC-87D5-E311-9621-AC162DAE8ACD';

/**
 * Serves the site favicon by redirecting to the emblem service rather than shipping a static icon.
 *
 * There must be no `public/favicon.ico`: Cloudflare Workers serve a matching static asset without
 * invoking the Worker at all, which would make this route unreachable. To switch to a static icon,
 * add that file and delete this route.
 */
export function loader() {
  return redirect(getEmblemSrc(FAVICON_GUILD_ID), 302);
}
