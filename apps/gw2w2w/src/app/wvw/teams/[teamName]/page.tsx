import { WvWTeamGuildFilter } from '@gw2w2w/app/wvw/teams/[teamName]/WvWTeamGuildFilter';
import { getGuildRequest } from '@gw2w2w/lib/api/gw2/guild';
import { getWvwTeamGuildsRequest } from '@gw2w2w/lib/api/gw2/wvw/teams';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import type { Guild, WvWGuild } from '@repo/service-api/lib/types';
import { WVW_TEAMS } from '@repo/service-api/src/definitions';
import { notFound } from 'next/navigation';
import pLimit from 'p-limit';
import { Suspense } from 'react';

interface WvWTeamPageProps {
  params: Promise<{ teamName: string }>;
}

const fetchLimit = pLimit(10);

// Cloudflare subrequests per invocation are limited
// Each guild detail fetch is one subrequest, plus one for the team guild list itself.
// This should match the configured subrequests limit in wrangler.toml, with some headroom for other potential subrequests.
const GUILD_FETCH_LIMIT = 1000;

async function fetchWvWTeamGuilds(teamId: string): Promise<Guild[]> {
  const wvwGuilds = ((await getWvwTeamGuildsRequest(teamId).then(parseResponse<WvWGuild[]>)) ?? []).slice(
    0,
    GUILD_FETCH_LIMIT,
  );
  const fetchGuild = (wvwGuild: WvWGuild) => fetchLimit(() => getGuildRequest(wvwGuild.id).then(parseResponse<Guild>));
  const results = await Promise.all(wvwGuilds.map(fetchGuild));
  return results.filter((g): g is Guild => g != null);
}

async function WvWTeamGuildList({ teamId }: { teamId: string }) {
  const guilds = await fetchWvWTeamGuilds(teamId);
  const sortKey = (name: string) => name.replace(/^(the|an?)\s+/i, '');
  const sortedGuilds = guilds.sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));

  return <WvWTeamGuildFilter guilds={sortedGuilds} />;
}

export default async function WvWTeamPage({ params }: WvWTeamPageProps) {
  const { teamName: encodedTeamName } = await params;
  const teamName = decodeURIComponent(encodedTeamName);

  const team = Object.values(WVW_TEAMS).find(
    (t) => t.en === teamName || t.de === teamName || t.es === teamName || t.fr === teamName,
  );

  if (!team) {
    return notFound();
  }

  return (
    <SiteLayout pageHeader={`${team.en} [${team.id}]`}>
      <header>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Guilds</h2>

        <p className="mb-4 rounded border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
          ⚠️ This page is a work in progress. Only the first 32 guilds are shown.
        </p>

        <Suspense
          fallback={
            <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-4">
              {Array.from({ length: 64 }).map((_, i) => (
                <div key={i} className="w-32">
                  <div className="flex h-32 w-32 items-center justify-center rounded bg-gray-50">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-400" />
                  </div>
                  <div className="mx-auto mt-1 h-3 w-20 animate-pulse rounded bg-gray-100" />
                </div>
              ))}
            </div>
          }
        >
          <WvWTeamGuildList teamId={team.id} />
        </Suspense>
      </header>
    </SiteLayout>
  );
}
