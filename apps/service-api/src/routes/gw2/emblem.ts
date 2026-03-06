import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getEmblemBackground, getEmblemForeground } from '@service-api/lib/resources/emblem';
import { Emblem } from '@service-api/lib/types';
import { Hono } from 'hono';
import { z } from 'zod';

const layerSlugs = ['background', 'foreground'] as const;
const layerSlugSchema = z.enum(layerSlugs);

export const apiEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>()
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

      return getEmblemLayer(Number(emblemId), c.env).then((result) => {
        if (!result) {
          const payload: ErrorPayload = {
            message: 'Emblem Not Found',
            statusCode: 404,
            url: new URL(c.req.url).pathname,
            service: 'service-api/emblem',
          };
          return c.json(payload, payload.statusCode);
        }

        return c.json<Emblem[]>(result);
      });
    },
  )
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/emblem',
    };
    return c.json(payload, payload.statusCode);
  });
