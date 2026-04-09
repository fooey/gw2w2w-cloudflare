import { type CloudflareEnv } from '#index.ts';
import { createCacheProviders } from '#lib/cache-providers/index.ts';
import { getGuild } from '#lib/resources/guild.ts';
import { type Guild } from '#lib/types/index.ts';
import { newQueue } from '@henrygd/queue/rl';
import { withObjectCache } from '../cache-wrapper';
import { getWvwGuild } from './guilds';

// 50 concurrent, 100 starts/sec, back off to 10/sec if needed
const guildQueue = newQueue(50, 100, 1000);

export async function getWvwTeamGuilds(teamId: string, env: CloudflareEnv): Promise<Guild[]> {
  return withObjectCache<Guild[]>(
    `wvw-team-guilds:${teamId}`,
    async () => {
      const wvwGuilds = await getWvwGuild('all', env);
      const teamGuilds = wvwGuilds?.filter((g) => g.teamId === teamId) ?? [];
      const results = await guildQueue.all(teamGuilds.map((wvwGuild) => () => getGuild(wvwGuild.id, env)));
      return results.filter((g): g is Guild => g != null);
    },
    createCacheProviders(env),
  );
}
