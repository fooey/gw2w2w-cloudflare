import { href, redirect } from 'react-router';

import type { Route } from './+types/guild-search';

/**
 * A real form POST target rather than an onSubmit handler, so the search box still works without
 * JS.
 *
 * Deliberately not mounted under /guilds/* — `guilds/search` would shadow a guild actually named
 * "search" on the `guilds/:guildId` route.
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const raw = formData.get('guild');
  const value = typeof raw === 'string' ? raw.trim() : '';

  // href() percent-encodes the param itself, so `value` must be passed raw.
  return redirect(value ? href('/guilds/:guildId', { guildId: value }) : href('/guilds'));
}
