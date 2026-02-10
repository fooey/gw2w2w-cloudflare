import type { CloudflareEnv } from '@/index';
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

    return getEmblemBackground(emblemId, c.env).then((result) => {
      if (!result) {
        return c.notFound();
      }

      return c.json(result);
    });
  })
  .get('/foreground/:emblemId', validateEmblemIdParam, async (c) => {
    const emblemId = Number(c.req.param('emblemId'));

    return getEmblemForeground(emblemId, c.env).then((result) => {
      if (!result) {
        return c.notFound();
      }

      return c.json(result);
    });
  });
