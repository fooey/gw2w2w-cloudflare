import { Hono } from 'hono';
import { describeRoute, validator, resolver } from 'hono-openapi';
import { z } from 'zod';

import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { WvWUpgradeSchema, getWvWUpgrade } from '#lib/resources/wvw/upgrades.ts';

export const apiWvwUpgradesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all WvW upgrades',
      description:
        'Returns all WvW objective upgrade definitions. Proxied from [GW2 API v2/wvw/upgrades](https://wiki.guildwars2.com/wiki/API:2/wvw/upgrades).',
      tags: ['GW2 WvW Reference'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWUpgradeSchema)) } },
          description: 'Array of WvW upgrade objects',
        },
      },
    }),
    async (c) => {
      const upgrades = await getWvWUpgrade('all', c.env);
      return withCacheJson(c, CACHE_TTL.patch.http, upgrades);
    },
  )
  .get(
    '/:id',
    describeRoute({
      summary: 'Get WvW upgrade by ID',
      description:
        'Returns a single WvW upgrade by ID. Proxied from [GW2 API v2/wvw/upgrades](https://wiki.guildwars2.com/wiki/API:2/wvw/upgrades).',
      tags: ['GW2 WvW Reference'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(WvWUpgradeSchema) } },
          description: 'WvW upgrade object',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const id = c.req.param('id');
      const upgrades = await getWvWUpgrade(Number(id), c.env);
      const [upgrade] = upgrades;
      if (!upgrade) {
        const payload: ErrorPayload = {
          message: 'WvW Upgrade Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/upgrades',
        };
        return c.json(payload, 404);
      }
      return withCacheJson(c, CACHE_TTL.patch.http, upgrade);
    },
  );
