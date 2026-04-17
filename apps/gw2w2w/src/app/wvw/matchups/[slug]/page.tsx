import { fetchWvwMatch, fetchWvwMatchByTeam } from '#lib/api/gw2/wvw/matches';
import { MatchupContainer } from '#ui/wvw/matchup/MatchupContainer';
import { resolveSlug } from '#lib/wvw/matchup';
import { notFound } from 'next/navigation';
import { WVW_TEAMS } from '@repo/service-api/definitions';
import SiteLayout from '#ui/layout/SiteLayout';
import Link from '#ui/Link';

export default async function WvwMatchupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { matchId, selectedTeamId } = resolveSlug(slug);

  const match = matchId
    ? await fetchWvwMatch(matchId)
    : selectedTeamId
      ? await fetchWvwMatchByTeam(selectedTeamId)
      : null;

  if (!match) {
    // Slug didn't resolve to a known team or match ID format — genuine 404
    if (!matchId && !selectedTeamId) notFound();

    // Valid team/match but no active match right now — happens briefly during weekly reset
    const teamName = selectedTeamId ? WVW_TEAMS[selectedTeamId as keyof typeof WVW_TEAMS].en : null;

    return (
      <SiteLayout pageHeader="WvW Matchup">
        <meta httpEquiv="refresh" content="30" />
        <div className="space-y-4">
          <p className="text-gray-700">
            {teamName ? `${teamName}'s matchup` : `Matchup ${matchId ?? slug}`} is not currently active. This typically
            happens briefly during the weekly reset — check back in a few minutes.
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

  return <MatchupContainer match={match} selectedTeamId={selectedTeamId} />;
}
