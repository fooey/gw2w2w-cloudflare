import type { Bindings } from '@/index';
import { createCacheProviders } from '@/lib/cache-providers';
import { getGuild } from '@/lib/resources';
import { Hono } from 'hono';

export const gw2apiRoutes = new Hono<{ Bindings: Bindings }>();

gw2apiRoutes.get('/guild/:guildId', async (c) => {
  const guildId = c.req.param('guildId');

  return getGuild(guildId, createCacheProviders(c.env)).then((guild) => {
    if (!guild) {
      c.status(404);
      return c.json({
        message: 'Guild not found',
        status: 404,
      });
    }

    return c.json(guild);
  });
});

gw2apiRoutes.get('/guild', (c) => {
  c.status(404);
  return c.json({
    message: 'Guild ID not provided',
    status: 404,
  });
});

gw2apiRoutes.get('*', (c) => {
  c.status(501);
  return c.json({
    message: 'Not Implemented',
    status: 501,
    url: new URL(c.req.url).pathname,
    service: 'gw2api',
  });
});
