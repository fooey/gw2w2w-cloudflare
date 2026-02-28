import { apiFetch } from '@gw2w2w/lib/api/client';
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { Card } from '@gw2w2w/lib/ui/Card';
import { CodePreview } from '@gw2w2w/lib/ui/CodePreview';
import { FormField } from '@gw2w2w/lib/ui/FormField';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import type { Guild } from '@repo/service-api/lib/types';
import { validateArenaNetUuid } from '@repo/utils';
import { clsx } from 'clsx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
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

const backgroundClasses = [
  'bg-white',
  'bg-black',
  'bg-linear-to-br from-white to-red-900',
  'bg-linear-to-br from-red-400 to-black',
];

export default async function GuildPage({ params }: GuildPageProps) {
  const { guildId } = await params;
  const guild = await getGuildData(guildId);

  if (!guild) {
    return notFound();
  }

  return (
    <SiteLayout pageHeader={'Guild Emblems'}>
      <div className="flex flex-col gap-8">
        <header>
          <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">
            {guild.name} [{guild.tag}]
          </h2>
          <p className="mb-4 text-sm text-gray-700">Guild ID: {guild.id}</p>
        </header>

        <Card title="Example Guild Emblems">
          <ul className="flex flex-wrap gap-8">
            {backgroundClasses.map((backgroundClass) => {
              return (
                <li key={backgroundClass} className="mb-4">
                  <img
                    src={getEmblemSrc(guild.id)}
                    alt="Guild Emblem"
                    width={128}
                    height={128}
                    className={clsx(backgroundClass, 'rounded-xl')}
                  />
                </li>
              );
            })}
          </ul>
        </Card>

        <Card title="How to Use Guild Emblems">
          <p>
            Your guild emblem is a <strong>128×128 image</strong> hosted on our servers. You can use it anywhere that
            accepts image URLs — forum signatures, Discord, social media profiles, and more.
          </p>

          <div className="mt-4 flex flex-col gap-6">
            <section>
              <h3 className="mb-1 text-sm font-semibold text-gray-700">Direct Image Link</h3>
              <p className="mb-2 text-sm text-gray-500">
                Use this URL anywhere that accepts a direct link to an image.
              </p>
              <FormField label="By Guild ID" value={getEmblemSrc(guild.id)} />
              <FormField label="By Guild Name" value={getEmblemSrc(guild.name)} />
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-gray-700">HTML</h3>
              <p className="mb-2 text-sm text-gray-500">Paste this into any website or blog that allows custom HTML.</p>
              <FormField
                label="By Guild ID"
                value={`<img src="${getEmblemSrc(guild.id)}" width="128" height="128" />`}
              />
              <FormField
                label="By Guild Name"
                value={`<img src="${getEmblemSrc(guild.name)}" width="128" height="128" />`}
              />
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-gray-700">BBCode</h3>
              <p className="mb-2 text-sm text-gray-500">
                Use this in forums that support BBCode, such as Reddit or older game forums.
              </p>
              <FormField label="By Guild ID" value={`[img]${getEmblemSrc(guild.id)}[/img]`} />
              <FormField label="By Guild Name" value={`[img]${getEmblemSrc(guild.name)}[/img]`} />
            </section>
          </div>
        </Card>

        <Card title="Guild Data (Debug)">
          <CodePreview code={JSON.stringify({ guild }, null, 2)} />
        </Card>
      </div>
    </SiteLayout>
  );
}
