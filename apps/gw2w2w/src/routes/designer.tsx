import type { ShouldRevalidateFunctionArgs } from 'react-router';

import { getApi } from '#lib/api/api.server.ts';
import { fetchAllColors } from '#lib/api/gw2/color';
import { fetchAllBackgrounds, fetchAllForegrounds } from '#lib/api/gw2/emblem';
import { cloudflareContext } from '#lib/cloudflare-context.ts';
import { EmblemDesigner } from '#ui/designer/EmblemDesigner';
import { SiteLayout } from '#ui/layout/SiteLayout';

import type { Route } from './+types/designer';

export async function loader({ context }: Route.LoaderArgs) {
  const api = getApi(context.get(cloudflareContext).env);
  const [colors, backgrounds, foregrounds] = await Promise.all([
    fetchAllColors(api),
    fetchAllBackgrounds(api),
    fetchAllForegrounds(api),
  ]);

  return { colors, backgrounds: backgrounds ?? [], foregrounds: foregrounds ?? [] };
}

/**
 * The designer strips its `?s=` shortlink param on mount with a same-path
 * `navigate(pathname, { replace: true })`. React Router revalidates loaders on every navigation by
 * default, so that would re-run this loader immediately after first render — three service-api
 * round trips for reference data that cannot have changed. Revalidate only on a real path change.
 */
export function shouldRevalidate({ currentUrl, nextUrl }: ShouldRevalidateFunctionArgs) {
  return currentUrl.pathname !== nextUrl.pathname;
}

export default function DesignerPage({ loaderData }: Route.ComponentProps) {
  const { colors, backgrounds, foregrounds } = loaderData;

  return (
    <SiteLayout pageHeader="Emblem Designer">
      <main>
        <EmblemDesigner colors={colors} backgrounds={backgrounds} foregrounds={foregrounds} />
      </main>
    </SiteLayout>
  );
}
