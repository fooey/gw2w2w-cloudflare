import { notFound } from 'next/navigation';

import { WVW_TEAMS } from '@repo/service-api/definitions';
import { isNil, isPresent } from '@repo/utils';

import type { WvwMatchLookupResult } from '#lib/api/wvw/matches';
import { getApi } from '#lib/api/api.server.ts';
import { fetchWvwMatch, fetchWvwMatchByTeam } from '#lib/api/wvw/matches';
import { resolveSlug } from '#lib/wvw/matchup';
import { SiteLayout } from '#ui/layout/SiteLayout';
import { Link } from '#ui/Link';
import { MatchupView } from '#ui/wvw/matchup/MatchupView';

export const dynamic = 'force-dynamic';

export default async function WvwMatchupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { matchId, selectedTeamId } = resolveSlug(slug);

  const api = await getApi();
  let result: WvwMatchLookupResult;
  if (isPresent(matchId)) {
    result = await fetchWvwMatch(api, matchId);
  } else if (isPresent(selectedTeamId)) {
    result = await fetchWvwMatchByTeam(api, selectedTeamId);
  } else {
    result = { status: 'not_found' };
  }

  if (result.status !== 'ok') {
    // Slug didn't resolve to a known team or match ID format — genuine 404
    if (isNil(matchId) && isNil(selectedTeamId)) notFound();

    // The `in` check above already guards against an unknown team id; tsgo just doesn't narrow it.
    const teamName =
      isPresent(selectedTeamId) && selectedTeamId in WVW_TEAMS
        ? // eslint-disable-next-line typescript/no-unsafe-type-assertion
          WVW_TEAMS[selectedTeamId as keyof typeof WVW_TEAMS].en
        : null;
    const subject = teamName ? `${teamName}'s matchup` : `Matchup ${matchId ?? slug}`;
    // Poller-outage case retries fast (matching the API's own Retry-After); the "no active match
    // right now" case (weekly reset gap) retries slower since it's expected to resolve on its own.
    const refreshSeconds = result.status === 'unavailable' ? (result.retryAfterSeconds ?? 5) : 30;

    return (
      <SiteLayout pageHeader="WvW Matchup">
        <meta httpEquiv="refresh" content={String(refreshSeconds)} />
        <div className="space-y-4">
          <p className="text-gray-700">
            {result.status === 'unavailable' ? (
              <>
                {subject} data is temporarily unavailable — the match poller is catching up. This page will retry
                automatically.
              </>
            ) : (
              <>
                {subject} is not currently active. This typically happens briefly during the weekly reset — check back
                in a few minutes.
              </>
            )}
          </p>
          <div className="flex gap-4">
            <Link
              href={`/wvw/matchups/${slug}`}
              className="cursor-pointer rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Try again
            </Link>
            <Link
              href="/wvw/matchups"
              className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View all matchups
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return <MatchupView match={result.match} selectedTeamId={selectedTeamId} />;
}
