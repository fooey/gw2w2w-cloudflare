import type { CloudflareEnv, ErrorPayload } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import { WvWAbilitySchema, getWvWAbility } from '#lib/resources/wvw/abilities.ts';
import { Hono } from 'hono';
import { describeRoute, validator, resolver } from 'hono-openapi';
import { z } from 'zod';

export const apiWvwAbilitiesRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get(
    '/',
    describeRoute({
      summary: 'List all WvW abilities',
      description:
        'Returns all WvW ability definitions. Proxied from [GW2 API v2/wvw/abilities](https://wiki.guildwars2.com/wiki/API:2/wvw/abilities).',
      tags: ['GW2 WvW Reference'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(z.array(WvWAbilitySchema)) } },
          description: 'Array of WvW ability objects',
        },
      },
    }),
    async (c) => {
      const abilities = await getWvWAbility('all', c.env);
      return withCacheJson(c, CACHE_TTL.patch.http, abilities);
    },
  )
  .get(
    '/:id',
    describeRoute({
      summary: 'Get WvW ability by ID',
      description:
        'Returns a single WvW ability by ID. Proxied from [GW2 API v2/wvw/abilities](https://wiki.guildwars2.com/wiki/API:2/wvw/abilities).',
      tags: ['GW2 WvW Reference'],
      responses: {
        200: {
          content: { 'application/json': { schema: resolver(WvWAbilitySchema) } },
          description: 'WvW ability object',
        },
        404: { description: 'Not found' },
      },
    }),
    validator('param', z.object({ id: z.coerce.number().int().positive() })),
    async (c) => {
      const id = c.req.param('id');
      const abilities = await getWvWAbility(Number(id), c.env);
      const [ability] = abilities;
      if (!ability) {
        const payload: ErrorPayload = {
          message: 'WvW Ability Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/wvw/abilities',
        };
        return c.json(payload, 404);
      }
      return withCacheJson(c, CACHE_TTL.patch.http, ability);
    },
  );
