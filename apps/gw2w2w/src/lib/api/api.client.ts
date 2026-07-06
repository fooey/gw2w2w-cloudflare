import { hc } from 'hono/client';

import type { ServiceApiAppType } from '@repo/service-api';

import { GW2W2W_API_BASE } from '#lib/api/constants.ts';

/** The Hono RPC client type shared by server and client API layers */
export type ServiceApiClient = ReturnType<typeof getClientApi>;

/** Type-safe RPC client for browser usage — plain fetch, no service bindings */
export function getClientApi() {
  return hc<ServiceApiAppType>(GW2W2W_API_BASE);
}
