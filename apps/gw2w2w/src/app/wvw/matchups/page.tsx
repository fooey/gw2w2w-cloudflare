import { getApi } from '#lib/api/api.server.ts';
import { fetchWvwMatches } from '#lib/api/wvw/matches';
import { SiteLayout } from '#ui/layout/SiteLayout';
import { Dashboard } from '#ui/wvw/dashboard/Dashboard';

export const dynamic = 'force-dynamic';

export async function getData() {
  return fetchWvwMatches(await getApi());
}

export default async function WvwMatchupsPage() {
  const matches = await getData();

  return (
    <SiteLayout pageHeader="WvW Matchups">
      <Dashboard matches={matches} />
    </SiteLayout>
  );
}
