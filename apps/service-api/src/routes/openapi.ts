import { Scalar } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { openAPIRouteHandler } from 'hono-openapi';

import type { CloudflareEnv } from '#index.ts';

const OPENAPI_DESCRIPTION = `
REST API for **gw2w2w.com**.

## Proxied Routes (\`/gw2\`)
Thin cache layer over the official [Guild Wars 2 API](https://wiki.guildwars2.com/wiki/API:Main).
Responses are aggressively cached to reduce upstream calls and improve latency.

## Custom Routes
Built specifically for gw2w2w.com, backed by **D1** and **Durable Objects**:
- WvW event history (objective captures and claims)
- Guild activity aggregation per match
- Match state snapshots
- Real-time SSE streaming of match updates
`.trim();

const OPENAPI_TAGS = [
  // Proxied — data sourced from the official Guild Wars 2 API
  { name: 'GW2 Colors', description: 'Proxied from GW2 API (v2/colors). Dye color definitions.' },
  {
    name: 'GW2 Emblems',
    description: 'Proxied from GW2 API (v2/emblem). Guild emblem layer definitions.',
  },
  {
    name: 'GW2 Guilds',
    description: 'Proxied from GW2 API (v2/guild). Guild lookup and upgrades.',
  },
  {
    name: 'GW2 WvW Reference',
    description:
      'Proxied from GW2 API (v2/wvw). Static WvW reference data — abilities, objectives, ranks, teams, upgrades.',
  },
  {
    name: 'GW2 WvW Guilds',
    description: 'Proxied from GW2 API (v2/wvw/matches). WvW guild participation derived from match data.',
  },
  {
    name: 'GW2 WvW Matches',
    description: 'Proxied from GW2 API (v2/wvw/matches). Live match scores, stats, and world assignments.',
  },
  // Custom — service-api-owned endpoints backed by D1 / Durable Objects
  {
    name: 'WvW Events',
    description: 'Custom. Queryable event log of WvW objective captures and claims, stored in D1.',
  },
  {
    name: 'WvW Guilds',
    description: 'Custom. Aggregated guild claim activity per match, stored in D1.',
  },
  { name: 'WvW Matches', description: 'Custom. Cached match state snapshots from D1.' },
  {
    name: 'WvW Stream',
    description: 'Custom. Real-time SSE stream of WvW match updates via Durable Object.',
  },
];

/**
 * Creates OpenAPI JSON and Scalar UI routes that introspect the given app.
 * Must be mounted after all other routes are registered so the spec is complete.
 */
export function createOpenAPIRoutes(app: Hono<{ Bindings: CloudflareEnv }>) {
  return new Hono<{ Bindings: CloudflareEnv }>()
    .get(
      '/doc',
      openAPIRouteHandler(app, {
        documentation: {
          info: {
            title: 'gw2w2w service-api',
            version: '1.0.0',
            description: OPENAPI_DESCRIPTION,
          },
          servers: [
            { url: 'https://api.gw2w2w.com', description: 'Production' },
            { url: 'http://localhost:8788', description: 'Development' },
          ],
          tags: OPENAPI_TAGS,
        },
      }),
    )
    .get('/scalar', Scalar({ url: '/doc' }));
}
