import { redirect } from 'react-router';

import { getEmblemSrc } from '#lib/emblems';

import type { Route } from './+types/guild-emblem-svg';

/**
 * Public emblem hotlink URL — /guilds/:guildId/:size.svg redirects to the emblem service.
 *
 * `:size` is matched but intentionally unused: every size resolves to the same unsized emblem URL.
 * Existing hotlinks in the wild rely on that, so passing the size through would change what those
 * URLs return.
 */
export function loader({ params }: Route.LoaderArgs) {
  return redirect(getEmblemSrc(params.guildId), 307);
}
