import { fetchWvwMatch, fetchWvwMatchByTeam } from '#lib/api/gw2/wvw/matches';
import { MatchupContainer } from '#ui/wvw/matchup/MatchupContainer';
import { resolveSlug } from '#lib/wvw/matchup';
import { notFound } from 'next/navigation';

export default async function WvwMatchupPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { matchId, selectedTeamId } = resolveSlug(slug);

  const match = matchId
    ? await fetchWvwMatch(matchId)
    : selectedTeamId
      ? await fetchWvwMatchByTeam(selectedTeamId)
      : null;

  if (!match) notFound();

  return <MatchupContainer match={match} selectedTeamId={selectedTeamId} />;
}
