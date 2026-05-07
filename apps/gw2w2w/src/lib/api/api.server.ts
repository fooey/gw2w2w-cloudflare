import type { ServiceApiAppType } from '@repo/service-api';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { hc } from 'hono/client';

import { GW2W2W_API_BASE } from '#lib/api/constants.ts';

/** Type-safe RPC client backed by the SERVICE_API service binding in production */
export async function getApi() {
  if (process.env.NODE_ENV === 'production') {
    const { env } = await getCloudflareContext({ async: true });
    return hc<ServiceApiAppType>(GW2W2W_API_BASE, { fetch: env.SERVICE_API.fetch.bind(env.SERVICE_API) });
  }

  // Local dev — no Cloudflare context, use standard fetch
  return hc<ServiceApiAppType>(GW2W2W_API_BASE);
}
