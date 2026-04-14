import { fetchGuild, fetchGuildByName } from '#lib/api/gw2/guild';
import { fetchWvwGuild } from '#lib/api/gw2/wvw/guilds';
import { fetchWvwTeam } from '#lib/api/gw2/wvw/teams';
import { emblemBackgroundClasses } from '#lib/definitions/emblem-backgrounds';
import { getDesignerSrc, getEmblemSrc } from '#lib/emblems';
import { Card } from '#ui/Card';
import { CodePreview } from '#ui/CodePreview';
import { CopyToClipboardInput } from '#ui/controls/CopyToClipboardInput';
import { GuildSearch } from '#ui/guilds/guild-search/GuildSearch';
import SiteLayout from '#ui/layout/SiteLayout';
import { MagnifyingGlassIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { type Guild, type WvWTeam } from '@repo/service-api/types';
import { validateArenaNetUuid } from '@repo/utils';
import { clsx } from 'clsx';
import { type Metadata } from 'next';
import Link from '#ui/Link';
import { cache } from 'react';

export interface GuildPageProps {
  params: Promise<{ guildId: string }>;
}

function getGuildTeam(guildId: string): Promise<WvWTeam | null> {
  return fetchWvwGuild(guildId).then((data) => {
    if (!data) {
      return null;
    }
    return fetchWvwTeam(data.teamId);
  });
}

const getData = cache(async (guildId: string): Promise<{ guild: Guild; team: WvWTeam | null } | null> => {
  const isUuid = validateArenaNetUuid(guildId);

  const fn = isUuid ? fetchGuild : fetchGuildByName;

  return fn(guildId).then(async (guild) => {
    if (!guild) {
      return null;
    }

    return getGuildTeam(guild.id).then((team) => ({ guild, team }));
  });
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

    const { guild } = guildData;

    const canonical = `https://gw2w2w.com/guild/${guild.id}`;
    const emblemUrl = guild.emblem ? getEmblemSrc(guild.id) : undefined;
    const title = `${guild.name} [${guild.tag}] - GW2W2W`;
    const description = `${guild.name} [${guild.tag}] guild emblem`;

    return {
      title,
      description,
      keywords: `Guild Wars 2, GW2, guild, ${guild.name}, ${guild.tag}, gaming, MMORPG`,
      alternates: { canonical },
      icons: emblemUrl ? { icon: emblemUrl, shortcut: emblemUrl, apple: emblemUrl } : undefined,
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'GW2W2W',
        type: 'website',
        images: emblemUrl
          ? [{ url: emblemUrl, width: 128, height: 128, alt: `${guild.name} [${guild.tag}] Guild Emblem` }]
          : undefined,
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: emblemUrl ? [emblemUrl] : undefined,
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
  const guildData = await getData(guildId);

  if (!guildData) {
    return <GuildNotFound guildId={guildId} />;
  }

  const { guild, team } = guildData;

  return (
    <SiteLayout pageHeader={'Guild Emblems'} headerActions={<GuildSearch />}>
      <div className="flex flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            <Link href={`/guilds/${guild.name}`}>
              {guild.name} [{guild.tag}]
            </Link>
          </h2>
          <h3 className="flex flex-col">
            <GuildId guildId={guild.id} />
            <GuildWvWTeam guildId={guild.id} />
          </h3>
        </header>

        {guild.emblem ? (
          <Card title="Example Guild Emblems">
            <ul className="grid grid-cols-3 gap-3 md:grid-cols-5">
              {emblemBackgroundClasses.map((backgroundClass) => {
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
        ) : (
          <Card title="No Emblem">
            <p className="text-sm text-gray-500">This guild has not set a custom emblem.</p>
          </Card>
        )}

        {guild.emblem && (
          <Card title="Open in Emblem Designer">
            <p className="mb-4 text-sm text-gray-600">
              Load this guild&apos;s emblem into the designer to customize colors, flip layers, or use it as a starting
              point for your own design.
            </p>
            <Link
              href={getDesignerSrc(guild.emblem)}
              className="inline-flex items-center gap-3 rounded-lg bg-rose-900 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:outline-none"
            >
              <PencilSquareIcon className="size-5" />
              Open in Designer
            </Link>
          </Card>
        )}

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
              <CopyToClipboardInput label="By Guild ID" value={getEmblemSrc(guild.id)} />
              <CopyToClipboardInput label="By Guild Name" value={getEmblemSrc(guild.name)} />
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-gray-700">HTML</h3>
              <p className="mb-2 text-sm text-gray-500">Paste this into any website or blog that allows custom HTML.</p>
              <CopyToClipboardInput
                label="By Guild ID"
                value={`<img src="${getEmblemSrc(guild.id)}" width="128" height="128" />`}
              />
              <CopyToClipboardInput
                label="By Guild Name"
                value={`<img src="${getEmblemSrc(guild.name)}" width="128" height="128" />`}
              />
            </section>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-gray-700">BBCode</h3>
              <p className="mb-2 text-sm text-gray-500">
                Use this in forums that support BBCode, such as Reddit or older game forums.
              </p>
              <CopyToClipboardInput label="By Guild ID" value={`[img]${getEmblemSrc(guild.id)}[/img]`} />
              <CopyToClipboardInput label="By Guild Name" value={`[img]${getEmblemSrc(guild.name)}[/img]`} />
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
          <Link href={`/wvw/matchups/${team.en}`} className="text-rose-900">
            {team.en}
          </Link>
        );
      })}
    </p>
  );
}
