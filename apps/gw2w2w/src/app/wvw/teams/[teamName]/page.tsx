import { WvWTeamGuild } from '@gw2w2w/app/wvw/teams/[teamName]/WvWTeamGuild';
import { getWvwTeamGuildsRequest } from '@gw2w2w/lib/api/gw2/wvw/teams';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import type { WvWGuild } from '@repo/service-api/lib/types';
import { WVW_TEAMS } from '@repo/service-api/src/definitions';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

interface WvWTeamPageProps {
  params: Promise<{ teamName: string }>;
}

export default async function WvWTeamPage({ params }: WvWTeamPageProps) {
  const { teamName: encodedTeamName } = await params;
  const teamName = decodeURIComponent(encodedTeamName);

  const team = Object.values(WVW_TEAMS).find((t) => t.en === teamName || t.de === teamName || t.es === teamName || t.fr === teamName);

  if (!team) {
    return notFound();
  }

  const teamGuilds = (await getWvwTeamGuildsRequest(team.id).then(parseResponse<WvWGuild[]>)) ?? [];

  return (
    <SiteLayout pageHeader={teamName}>
      <header>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-gray-900">Guilds</h2>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-4">
          {teamGuilds.map((wvwGuild) => (
            <Suspense key={wvwGuild.id} fallback={<div className="h-32 w-32 animate-pulse bg-gray-100" />}>
              <WvWTeamGuild guildId={wvwGuild.id} />
            </Suspense>
          ))}
        </div>
      </header>
    </SiteLayout>
  );
}
