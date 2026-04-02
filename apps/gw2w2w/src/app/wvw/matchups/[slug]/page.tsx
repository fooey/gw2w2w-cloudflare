import { fetchWvwMatch, fetchWvwMatchByTeam } from '@gw2w2w/lib/api/gw2/wvw/matches';
import { MatchupViewContainer } from '@gw2w2w/lib/ui/wvw/matchup/MatchupView';
import { resolveSlug } from '@gw2w2w/lib/wvw/matchup';
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

  return <MatchupViewContainer match={match} selectedTeamId={selectedTeamId} />;
}
