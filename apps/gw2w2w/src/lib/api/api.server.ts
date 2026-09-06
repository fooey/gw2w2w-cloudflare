import { hc } from 'hono/client';

import type { ServiceApiAppType } from '@repo/service-api';

import { GW2W2W_API_BASE } from '#lib/api/constants.ts';

/**
 * Type-safe RPC client backed by the SERVICE_API service binding in production.
 *
 * Bindings are only reachable from a loader/action's context, so `env` is passed in explicitly
 * rather than read from an ambient global: `getApi(context.get(cloudflareContext).env)`.
 */
export function getApi(env: CloudflareEnv) {
  if (import.meta.env.PROD) {
    return hc<ServiceApiAppType>(GW2W2W_API_BASE, {
      fetch: env.SERVICE_API.fetch.bind(env.SERVICE_API),
    });
  }

  // Local dev — talk to the separately-running service-api on localhost.
  return hc<ServiceApiAppType>(GW2W2W_API_BASE);
}
