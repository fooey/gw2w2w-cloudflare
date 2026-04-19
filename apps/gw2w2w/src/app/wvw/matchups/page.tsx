import { fetchWvwMatchesService } from '#lib/api/gw2/wvw/matches';
import SiteLayout from '#ui/layout/SiteLayout';
import { Dashboard } from '#ui/wvw/dashboard/Dashboard';

export function getData() {
  return fetchWvwMatchesService();
}

export default async function WvwMatchupsPage() {
  const matches = await getData();

  return (
    <SiteLayout pageHeader={'WvW Matchups'}>
      <Dashboard matches={matches} />
    </SiteLayout>
  );
}
