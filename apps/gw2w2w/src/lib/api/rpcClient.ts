import type { ServiceApiAppType } from '@repo/service-api';
import { hc } from 'hono/client';

import { GW2W2W_API_BASE_DEVELOPMENT, GW2W2W_API_BASE_PRODUCTION } from '#lib/api/constants.ts';

export const apiBase = process.env.NODE_ENV === 'production' ? GW2W2W_API_BASE_PRODUCTION : GW2W2W_API_BASE_DEVELOPMENT;

export const rpc = hc<ServiceApiAppType>(apiBase);
