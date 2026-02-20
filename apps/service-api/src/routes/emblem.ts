import type { CloudflareEnv } from '@service-api/index';
import { getEmblemBackground, getEmblemForeground } from '@service-api/lib/resources/emblem';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

const layerSlugs = ['background', 'foreground'] as const;
const layerSlugSchema = z.enum(layerSlugs);

export const apiEmblemRoute = new Hono<{ Bindings: CloudflareEnv }>().get(
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
        return c.json({ error: { message: 'Emblem not found', status: 404 }, layer, emblemId }, 404);
      }

      return c.json(result);
    });
  },
);
