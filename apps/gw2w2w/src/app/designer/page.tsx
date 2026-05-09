import { getApi } from '#lib/api/api.server.ts';
import { fetchAllColors } from '#lib/api/gw2/color';
import { fetchAllBackgrounds, fetchAllForegrounds } from '#lib/api/gw2/emblem';
import { EmblemDesigner } from '#ui/designer/EmblemDesigner';
import SiteLayout from '#ui/layout/SiteLayout';
import { Suspense } from 'react';

export default async function DesignerPage() {
  const api = await getApi();
  const [colors, backgrounds, foregrounds] = await Promise.all([
    fetchAllColors(api),
    fetchAllBackgrounds(api),
    fetchAllForegrounds(api),
  ]);

  return (
    <SiteLayout pageHeader={'Emblem Designer'}>
      <main>
        <Suspense>
          <EmblemDesigner colors={colors} backgrounds={backgrounds ?? []} foregrounds={foregrounds ?? []} />
        </Suspense>
      </main>
    </SiteLayout>
  );
}
