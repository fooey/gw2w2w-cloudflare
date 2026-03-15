import type { CloudflareEnv } from '@service-api/index';
import { createCacheProviders } from '@service-api/lib/cache-providers';
import { getGuild } from '@service-api/lib/resources/guild';
import type { Guild } from '@service-api/lib/types';
import pLimit from 'p-limit';
import { withObjectCache } from '../cache-wrapper';
import { getWvwGuild } from './guilds';

// Each getGuild() that misses R2 issues one fetch() to the GW2 API.
// Cloudflare Workers count fetch() calls as subrequests (limit 1000 on paid plans).
// Cap concurrency to stay comfortably within that limit and avoid rate-limiting the upstream API.
const guildFetchLimit = pLimit(25);

export async function getWvwTeamGuilds(teamId: string, env: CloudflareEnv): Promise<Guild[]> {
  return withObjectCache<Guild[]>(
    `wvw-team-guilds:${teamId}`,
    async () => {
      const wvwGuilds = await getWvwGuild('all', env);
      const teamGuilds = wvwGuilds?.filter((g) => g.teamId === teamId) ?? [];
      const results = await Promise.all(
        teamGuilds.map((wvwGuild) => guildFetchLimit(() => getGuild(wvwGuild.id, env))),
      );
      return results.filter((g): g is Guild => g != null);
    },
    createCacheProviders(env),
  );
}
