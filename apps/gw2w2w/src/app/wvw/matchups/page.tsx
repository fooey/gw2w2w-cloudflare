import { fetchWvwMatches } from '@gw2w2w/lib/api/gw2/wvw/matches';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import { MatchupDashboardContainer } from '@gw2w2w/lib/ui/wvw/matchup-dashboard/MatchupDashboard';

export function getData() {
  return fetchWvwMatches();
}

export default async function WvwMatchupsPage() {
  const matches = await getData();

  return (
    <SiteLayout pageHeader={'WvW Matchups'}>
      <MatchupDashboardContainer matches={matches} />
    </SiteLayout>
  );
}
