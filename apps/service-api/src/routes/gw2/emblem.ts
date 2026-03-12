import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getEmblemBackground, getEmblemForeground } from '@service-api/lib/resources/emblem';
import { Emblem } from '@service-api/lib/types';
import { Hono } from 'hono';
import { z } from 'zod';

const layerSlugs = ['background', 'foreground'] as const;
const layerSlugSchema = z.enum(layerSlugs);

export const apiEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/background', async (c) => {
    const result = await getEmblemBackground('all', c.env);
    if (!result) {
      const payload: ErrorPayload = {
        message: 'Emblem Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/emblem',
      };
      return c.json(payload, 404);
    }
    return c.json<Emblem[]>(result, 200);
  })
  .get('/foreground', async (c) => {
    const result = await getEmblemForeground('all', c.env);
    if (!result) {
      const payload: ErrorPayload = {
        message: 'Emblem Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/emblem',
      };
      return c.json(payload, 404);
    }
    return c.json<Emblem[]>(result, 200);
  })
  .get(
    '/:layer/:emblemId',
    zValidator(
      'param',
      z.object({
        layer: layerSlugSchema,
        emblemId: z.coerce.number().nonnegative().max(999).nonoptional(),
      }),
    ),
    async (c) => {
      const { layer, emblemId } = c.req.param();

      const getEmblemLayer = layer === 'background' ? getEmblemBackground : getEmblemForeground;

      const result = await getEmblemLayer(Number(emblemId), c.env);
      if (!result) {
        const payload: ErrorPayload = {
          message: 'Emblem Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/emblem',
        };
        return c.json(payload, 404);
      }

      return c.json<Emblem[]>(result, 200);
    },
  );
