import { getGuildRequest, searchGuildRequest } from '@gw2w2w/lib/api/gw2/guild';
import { getWvwGuildRequest } from '@gw2w2w/lib/api/gw2/wvw/guilds';
import { getWvwTeamRequest } from '@gw2w2w/lib/api/gw2/wvw/teams';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import { getEmblemSrc } from '@gw2w2w/lib/emblems';
import { Card } from '@gw2w2w/lib/ui/Card';
import { CodePreview } from '@gw2w2w/lib/ui/CodePreview';
import { FormField } from '@gw2w2w/lib/ui/FormField';
import { GuildSearch } from '@gw2w2w/lib/ui/guilds/guild-search/GuildSearch';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { Guild, WvWGuild, WvWTeam } from '@repo/service-api/lib/types';
import { validateArenaNetUuid } from '@repo/utils';
import { clsx } from 'clsx';
import type { Metadata } from 'next';
import Link from 'next/link';
import { cache } from 'react';

export interface GuildPageProps {
  params: Promise<{ guildId: string }>;
}

function getGuildTeam(guildId: string): Promise<WvWTeam | null> {
  return getWvwGuildRequest(guildId)
    .then(parseResponse<WvWGuild>)
    .then((data) => {
      if (!data) {
        return null;
      }
      return getWvwTeamRequest(data.teamId).then(parseResponse<WvWTeam>);
    });
}

export const getGuildData = cache(async (guildId: string): Promise<{ guild: Guild; team: WvWTeam | null } | null> => {
  const isUuid = validateArenaNetUuid(guildId);

  const fn = isUuid ? getGuildRequest : searchGuildRequest;

  return fn(guildId)
    .then(parseResponse<Guild>)
    .then(async (guild) => {
      if (!guild) {
        return null;
      }

      return getGuildTeam(guild.id).then((team) => ({ guild, team }));
    });
});

export async function generateMetadata({ params }: GuildPageProps): Promise<Metadata> {
  const { guildId } = await params;

  try {
    const guildData = await getGuildData(guildId);

    if (!guildData) {
      return {
        title: `Not Found - GW2W2W`,
      };
    }

    const { guild } = guildData;

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
  'bg-checkered',
  'bg-linear-to-br from-white to-red-900',
  'bg-linear-to-br from-red-400 to-black',
];

function GuildNotFound({ guildId }: { guildId: string }) {
  return (
    <SiteLayout pageHeader={'Guild Not Found'} headerActions={<GuildSearch />}>
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <MagnifyingGlassIcon className="size-16 text-gray-300" />
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-gray-900">
            No guild found for &quot;{decodeURIComponent(guildId)}&quot;
          </h2>
          <p className="text-sm text-gray-500">Try searching by exact guild name or UUID.</p>
        </div>
        <GuildSearch defaultValue={decodeURIComponent(guildId)} />
      </div>
    </SiteLayout>
  );
}

export default async function GuildPage({ params }: GuildPageProps) {
  const { guildId } = await params;
  const guildData = await getGuildData(guildId);

  if (!guildData) {
    return <GuildNotFound guildId={guildId} />;
  }

  const { guild, team } = guildData;

  return (
    <SiteLayout pageHeader={'Guild Emblems'} headerActions={<GuildSearch />}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            <Link href={`/guilds/${guild.id}`}>
              {guild.name} [{guild.tag}]
            </Link>
          </h2>
          <h3 className="flex flex-col">
            <GuildId guildId={guild.id} />
            <GuildWvWTeam guildId={guild.id} />
          </h3>
        </header>

        <Card title="Example Guild Emblems">
          <ul className="grid grid-cols-5 gap-4">
            {backgroundClasses.map((backgroundClass) => {
              return (
                <li key={backgroundClass}>
                  <Link href={getEmblemSrc(guild.id)} className={clsx(backgroundClass, 'inline-flex rounded-xl p-4')}>
                    <img loading="lazy" src={getEmblemSrc(guild.id)} alt="Guild Emblem" width={128} height={128} />
                  </Link>
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
          <CodePreview code={JSON.stringify({ team }, null, 2)} />
        </Card>
      </div>
    </SiteLayout>
  );
}

function GuildId({ guildId }: { guildId: string }) {
  return (
    <p className="text-sm text-gray-700">
      <span>Guild ID: </span>
      <Link href={`/guilds/${guildId}`} className="text-rose-900">
        {guildId}
      </Link>
    </p>
  );
}

function GuildWvWTeam({ guildId }: { guildId: string }) {
  return (
    <p className="text-sm text-gray-700">
      <span>WvW Team: </span>
      {getGuildTeam(guildId).then((team) => {
        if (!team) {
          return 'N/A';
        }
        return (
          <Link href={`/wvw/teams/${team.en}`} className="text-rose-900">
            {team.en}
          </Link>
        );
      })}
    </p>
  );
}
