import { getAllColorsRequest } from '@gw2w2w/lib/api/gw2/color';
import { getAllBackgroundsRequest, getAllForegroundsRequest } from '@gw2w2w/lib/api/gw2/emblem';
import { EmblemDesigner } from '@gw2w2w/lib/ui/designer/EmblemDesigner';
import SiteLayout from '@gw2w2w/lib/ui/layout/SiteLayout';
import { Suspense } from 'react';

export default async function DesignerPage() {
  const [colors, backgrounds, foregrounds] = await Promise.all([
    getAllColorsRequest(),
    getAllBackgroundsRequest(),
    getAllForegroundsRequest(),
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
