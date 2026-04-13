import { fetchWvwMatchesService } from '#lib/api/gw2/wvw/matches';
import SiteLayout from '#ui/layout/SiteLayout';
import { MatchupDashboardContainer } from '#ui/wvw/matchup-dashboard/MatchupDashboard';

export function getData() {
  return fetchWvwMatchesService();
}

export default async function WvwMatchupsPage() {
  const matches = await getData();

  return (
    <SiteLayout pageHeader={'WvW Matchups'}>
      <MatchupDashboardContainer matches={matches} />
    </SiteLayout>
  );
}
