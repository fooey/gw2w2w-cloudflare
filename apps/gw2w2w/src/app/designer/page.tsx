import { fetchAllColors } from '#lib/api/gw2/color';
import { fetchAllBackgrounds, fetchAllForegrounds } from '#lib/api/gw2/emblem';
import { EmblemDesigner } from '#ui/designer/EmblemDesigner';
import SiteLayout from '#ui/layout/SiteLayout';
import { Suspense } from 'react';

export default async function DesignerPage() {
  const [colors, backgrounds, foregrounds] = await Promise.all([
    fetchAllColors(),
    fetchAllBackgrounds(),
    fetchAllForegrounds(),
  ]);

  return (
    <SiteLayout pageHeader={'Emblem Designer'}>
      <main>
        <Suspense>
          <EmblemDesigner colors={colors ?? []} backgrounds={backgrounds ?? []} foregrounds={foregrounds ?? []} />
        </Suspense>
      </main>
    </SiteLayout>
  );
}
