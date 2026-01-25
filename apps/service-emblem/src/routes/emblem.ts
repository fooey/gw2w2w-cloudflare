import type { Bindings } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { renderEmblemById } from '@/lib/renderer';
import { Hono } from 'hono';

export const emblemRoutes = new Hono<{ Bindings: Bindings }>();

emblemRoutes.get('/:guildId', async (c) => {
  const guildId = c.req.param('guildId');

  const emblemBytes = await renderEmblemById(
    guildId,
    createCacheProviders(c.env),
  );

  const response = new Response(emblemBytes, {
    headers: { 'Content-Type': 'image/webp' },
  });

  return response;
});

emblemRoutes.get('*', (c) => {
  c.status(404);
  return c.json({
    message: 'Not Found',
    status: 404,
    url: new URL(c.req.url).pathname,
  });
});
