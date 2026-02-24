import { apiFetch } from '@gw2w2w/lib/api/client';
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import type { Guild } from '@repo/service-api/lib/types';
import { validateArenaNetUuid } from '@repo/utils';
import type { Metadata } from 'next';
import { cache } from 'react';

interface GuildPageProps {
  params: Promise<{ guildId: string }>;
}

function getGuild(guildId: string): Promise<Response> {
  return apiFetch(`/guild/${guildId}`);
}

function searchGuild(name: string): Promise<Response> {
  return apiFetch(`/guild/search?name=${name.toLocaleLowerCase()}`);
}

export const getGuildData = cache(async (guildId: string): Promise<Guild | null> => {
  const isUuid = validateArenaNetUuid(guildId);

  const fn = isUuid ? getGuild : searchGuild;
  return fn(guildId).then((response) => {
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new Error(`Failed to fetch guild data: ${response.status.toString()} ${response.statusText}`);
    }
    return response.json();
  });
});

export async function generateMetadata({ params }: GuildPageProps): Promise<Metadata> {
  const { guildId } = await params;

  try {
    const guild = await getGuildData(guildId);

    if (!guild) {
      return {
        title: `Not Found - GW2W2W`,
      };
    }

    const canonical = `https://gw2w2w.com/guild/${guild.id}`;
    const emblemUrl = getEmblemSrc(guild.id);
    const title = `${guild.name} [${guild.tag}] - GW2W2W`;
    const description = `${guild.name} [${guild.tag}] guild emblem`;

    return {
      title,
      description,
      keywords: `Guild Wars 2, GW2, guild, ${guild.name}, ${guild.tag}, gaming, MMORPG`,
      alternates: { canonical },
      icons: { icon: emblemUrl, shortcut: emblemUrl, apple: emblemUrl },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'GW2W2W',
        type: 'website',
        images: [{ url: emblemUrl, width: 128, height: 128, alt: `${guild.name} [${guild.tag}] Guild Emblem` }],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: [emblemUrl],
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
  const guild = await getGuildData(guildId);

  if (!guild) {
    return {
      notFound: true,
    };
  }

  return (
    <SiteLayout pageHeader={'Guild Emblems'}>
      <div className="bg-white">
        <header>
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">
            {guild.name} [{guild.tag}]
          </h2>
        </header>
        <p className="mb-4 text-gray-700">Guild ID: {guild.id}</p>
        <img src={getEmblemSrc(guild.id)} alt="Guild Emblem" width={128} height={128} className="rounded-xl" />
        <pre>{JSON.stringify({ guild }, null, 2)}</pre>
      </div>
    </SiteLayout>
  );
}
