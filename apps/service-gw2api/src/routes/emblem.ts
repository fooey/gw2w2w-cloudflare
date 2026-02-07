import type { CloudflareEnv } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { getEmblemBackground, getEmblemForeground } from '@/lib/resources/emblem';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

const validateEmblemIdParam = zValidator(
  'param',
  z.object({ emblemId: z.coerce.number().nonnegative().max(999).nonoptional() }),
);

export default new Hono<{ Bindings: CloudflareEnv }>()
  .get('/background/:emblemId', validateEmblemIdParam, async (c) => {
    const emblemId = Number(c.req.param('emblemId'));

    console.log(`🚀 ~ emblem.ts ~ background ~ emblemId:`, emblemId);

    return getEmblemBackground(emblemId, createCacheProviders(c.env)).then((result) => {
      if (!result) {
        return c.notFound();
      }

      return c.json(result);
    });
  })
  .get('/foreground/:emblemId', validateEmblemIdParam, async (c) => {
    const emblemId = Number(c.req.param('emblemId'));

    console.log(`🚀 ~ emblem.ts ~ foreground ~ emblemId:`, emblemId);

    return getEmblemForeground(emblemId, createCacheProviders(c.env)).then((result) => {
      if (!result) {
        return c.notFound();
      }

      return c.json(result);
    });
  });
