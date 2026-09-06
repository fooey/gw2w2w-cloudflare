import type { Guild } from '@repo/service-api/types';
import { isPresent, validateArenaNetUuid } from '@repo/utils';

import { getApi } from '#lib/api/api.server.ts';
import { fetchGuild, fetchGuildByName } from '#lib/api/gw2/guild';
import { cloudflareContext } from '#lib/cloudflare-context.ts';
import { getEmblemSrc } from '#lib/emblems';
import { GuildSearch } from '#ui/guilds/guild-search/GuildSearch';
import { GuildDetail } from '#ui/guilds/GuildDetail';
import { GuildNotFound } from '#ui/guilds/GuildNotFound';
import { SiteLayout } from '#ui/layout/SiteLayout';

import type { Route } from './+types/guild-detail';

async function getData(guildId: string, env: CloudflareEnv): Promise<Guild | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(guildId);
  } catch {
    return null;
  }
  const isUuid = validateArenaNetUuid(decoded);

  const api = getApi(env);
  const fn = isUuid ? fetchGuild : fetchGuildByName;
  return fn(api, decoded);
}

/**
 * Runs once per request; its result feeds both `meta` and the component, so the guild is fetched a
 * single time and needs no dedupe wrapper. Errors are caught rather than thrown so `meta` can emit
 * noindex tags for the failure case instead of handing off to the ErrorBoundary.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
  try {
    const guild = await getData(params.guildId, context.get(cloudflareContext).env);

    return { guild, failed: false };
  } catch (error) {
    console.error(error);
    return { guild: null, failed: true };
  }
}

export const meta: Route.MetaFunction = ({ loaderData, params }) => {
  const { guildId } = params;

  if (loaderData.failed) {
    return [
      { title: `Error Loading Guild - GW2W2W` },
      {
        name: 'description',
        content: `Unable to load guild information for ${guildId}. The guild may not exist or there may be a temporary service issue.`,
      },
      { name: 'robots', content: 'noindex, nofollow' },
    ];
  }

  const { guild } = loaderData;
  if (!guild) return [{ title: `Not Found - GW2W2W` }];

  const canonical = `https://gw2w2w.com/guild/${guild.id}`;
  const emblemUrl = guild.emblem ? getEmblemSrc(guild.id) : undefined;
  const title = `${guild.name} [${guild.tag}] - GW2W2W`;
  const description = `${guild.name} [${guild.tag}] guild emblem`;

  return [
    { title },
    { name: 'description', content: description },
    {
      name: 'keywords',
      content: `Guild Wars 2, GW2, guild, ${guild.name}, ${guild.tag}, gaming, MMORPG`,
    },
    { tagName: 'link', rel: 'canonical', href: canonical },

    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:site_name', content: 'GW2W2W' },
    { property: 'og:type', content: 'website' },

    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },

    ...(isPresent(emblemUrl)
      ? [
          { tagName: 'link', rel: 'icon', href: emblemUrl },
          { tagName: 'link', rel: 'apple-touch-icon', href: emblemUrl },
          { property: 'og:image', content: emblemUrl },
          { property: 'og:image:width', content: '128' },
          { property: 'og:image:height', content: '128' },
          {
            property: 'og:image:alt',
            content: `${guild.name} [${guild.tag}] Guild Emblem`,
          },
          { name: 'twitter:image', content: emblemUrl },
        ]
      : []),
  ];
};

export default function GuildPage({ loaderData, params }: Route.ComponentProps) {
  const { guild } = loaderData;

  if (!guild) {
    return (
      <SiteLayout pageHeader="Guild Not Found" headerActions={<GuildSearch />}>
        <GuildNotFound guildId={params.guildId} />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout pageHeader="Guild Emblems" headerActions={<GuildSearch />}>
      <GuildDetail guild={guild} />
    </SiteLayout>
  );
}
