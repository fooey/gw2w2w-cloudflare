import { getApi } from '#lib/api/api.server.ts';
import { fetchWvwMatches } from '#lib/api/wvw/matches';
import { cloudflareContext } from '#lib/cloudflare-context.ts';
import { SiteLayout } from '#ui/layout/SiteLayout';
import { Dashboard } from '#ui/wvw/dashboard/Dashboard';

import type { Route } from './+types/matchups';

export async function loader({ context }: Route.LoaderArgs) {
  return { matches: await fetchWvwMatches(getApi(context.get(cloudflareContext).env)) };
}

export default function WvwMatchupsPage({ loaderData }: Route.ComponentProps) {
  return (
    <SiteLayout pageHeader="WvW Matchups">
      <Dashboard matches={loaderData.matches} />
    </SiteLayout>
  );
}
