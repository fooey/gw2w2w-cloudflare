import { getApi } from '#lib/api/api.server.ts';
import { fetchGuild, fetchGuildByName } from '#lib/api/gw2/guild';
import { getEmblemSrc } from '#lib/emblems';
import { GuildSearch } from '#ui/guilds/guild-search/GuildSearch';
import { GuildDetail } from '#ui/guilds/GuildDetail';
import { GuildNotFound } from '#ui/guilds/GuildNotFound';
import { SiteLayout } from '#ui/layout/SiteLayout';
import type { Guild } from '@repo/service-api/types';
import { isPresent, validateArenaNetUuid } from '@repo/utils';
import type { Metadata } from 'next';
import { cache } from 'react';

export interface GuildPageProps {
  params: Promise<{ guildId: string }>;
}

const getData = cache(async (guildId: string): Promise<Guild | null> => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(guildId);
  } catch {
    return null;
  }
  const isUuid = validateArenaNetUuid(decoded);
  const api = await getApi();
  const fn = isUuid ? fetchGuild : fetchGuildByName;
  return fn(api, decoded);
});

export async function generateMetadata({ params }: GuildPageProps): Promise<Metadata> {
  const { guildId } = await params;

  try {
    const guildData = await getData(guildId);

    if (!guildData) {
      return {
        title: `Not Found - GW2W2W`,
      };
    }

    const guild = guildData;

    const canonical = `https://gw2w2w.com/guild/${guild.id}`;
    const emblemUrl = guild.emblem ? getEmblemSrc(guild.id) : undefined;
    const title = `${guild.name} [${guild.tag}] - GW2W2W`;
    const description = `${guild.name} [${guild.tag}] guild emblem`;

    return {
      title,
      description,
      keywords: `Guild Wars 2, GW2, guild, ${guild.name}, ${guild.tag}, gaming, MMORPG`,
      alternates: { canonical },
      icons: isPresent(emblemUrl) ? { icon: emblemUrl, shortcut: emblemUrl, apple: emblemUrl } : undefined,
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'GW2W2W',
        type: 'website',
        images: isPresent(emblemUrl)
          ? [
              {
                url: emblemUrl,
                width: 128,
                height: 128,
                alt: `${guild.name} [${guild.tag}] Guild Emblem`,
              },
            ]
          : undefined,
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: isPresent(emblemUrl) ? [emblemUrl] : undefined,
      },
    };
  } catch (e) {
    console.error(e);
    return {
      title: `Error Loading Guild - GW2W2W`,
      description: `Unable to load guild information for ${guildId}. The guild may not exist or there may be a temporary service issue.`,
      robots: { index: false, follow: false },
    };
  }
}

export default async function GuildPage({ params }: GuildPageProps) {
  const { guildId } = await params;
  const guild = await getData(guildId);

  if (!guild) {
    return (
      <SiteLayout pageHeader={'Guild Not Found'} headerActions={<GuildSearch />}>
        <GuildNotFound guildId={guildId} />
      </SiteLayout>
    );
  }

  return (
    <SiteLayout pageHeader={'Guild Emblems'} headerActions={<GuildSearch />}>
      <GuildDetail guild={guild} />
    </SiteLayout>
  );
}
