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
