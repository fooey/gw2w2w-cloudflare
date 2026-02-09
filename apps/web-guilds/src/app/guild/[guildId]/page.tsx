import { apiFetch } from '@/lib/api/client';
import type { Guild } from '@repo/service-api/lib/resources';
import type { Metadata } from 'next';
import Image from 'next/image';
import { cache } from 'react';
import { validate as uuidValidate } from 'uuid';

interface GuildPageProps {
  params: { guildId: string };
}

function getGuild(guildId: string): Promise<Response> {
  return apiFetch(`/guild/${guildId}`);
}

function searchGuild(name: string): Promise<Response> {
  return apiFetch(`/guild/search/${name.toLocaleLowerCase()}`);
}

export const getGuildData = cache(async (guildId: string) => {
  const isUuid = uuidValidate(guildId);
  const fn = isUuid ? getGuild : searchGuild;
  return fn(guildId).then((response) => response.json()) as Promise<Guild>;
});

export async function generateMetadata({ params }: GuildPageProps): Promise<Metadata> {
  const { guildId } = await params;

  try {
    const guild = await getGuildData(guildId); // More specific cache key

    const canonical = `https://gw2w2w.com/guild/${guild.id}`;

    return {
      title: `${guild.name} [${guild.tag}] - GW2W2W`,
      description: `Guild Wars 2 guild: ${guild.name} [${guild.tag}]`,
      alternates: { canonical },
    };
  } catch (e) {
    console.error(e);
    return {
      title: `Guild ${guildId} - GW2W2W`,
      alternates: {
        canonical: `https://gw2w2w.com/guild/${guildId}`,
      },
    };
  }
}

export default async function Guild({ params }: GuildPageProps) {
  const { guildId } = await params;
  const guild = await getGuildData(guildId);

  return (
    <div className="flex items-center justify-center bg-zinc-50 font-sans text-zinc-900">
      <main className="flex max-w-3xl flex-col items-center justify-between p-16 bg-white sm:items-start sm:text-left">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="text-4xl font-bold">Guild Page</h1>

          {guild ? (
            <>
              <p>Guild ID: {guild.id}</p>
              <Image src={`/emblem/${guild.id}`} alt="Guild Emblem" width={128} height={128} className="rounded-xl" />
              <pre>{JSON.stringify({ guild }, null, 2)}</pre>
            </>
          ) : (
            <p className="text-red-500">Guild not found or api unavailable.</p>
          )}
        </div>
      </main>
    </div>
  );
}
