import { zValidator } from '@hono/zod-validator';
import type { CloudflareEnv, ErrorPayload } from '@service-api/index';
import { getGuild, searchGuild } from '@service-api/lib/resources/guild';
import type { Guild } from '@service-api/lib/types';
import { Hono } from 'hono';
import { z } from 'zod';

export const apiGuildRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/search', zValidator('query', z.object({ name: z.string() })), async (c) => {
    const name = c.req.query('name');

    if (!name) {
      const payload: ErrorPayload = {
        message: 'Guild Not Found',
        statusCode: 404,
        url: new URL(c.req.url).pathname,
        service: 'service-api/guild',
      };
      return c.json(payload, payload.statusCode);
    }

    return searchGuild(name, c.env).then((guildId) => {
      if (!guildId) {
        const payload: ErrorPayload = {
          message: 'Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild',
        };
        return c.json(payload, payload.statusCode);
      }

      return getGuild(guildId, c.env).then((guild) => {
        if (!guild) {
          const payload: ErrorPayload = {
            message: 'Guild Not Found',
            statusCode: 404,
            url: new URL(c.req.url).pathname,
            service: 'service-api/guild',
          };
          return c.json(payload, payload.statusCode);
        }

        // Set canonical location header to the direct guild endpoint
        c.header('Content-Location', `/guilds/${guildId}`);
        return c.json<Guild>(guild);
      });
    });
  })
  .get('/:guildId', zValidator('param', z.object({ guildId: z.string() })), async (c) => {
    const guildId = c.req.param('guildId');

    return getGuild(guildId, c.env).then((guild) => {
      if (!guild) {
        const payload: ErrorPayload = {
          message: 'Guild Not Found',
          statusCode: 404,
          url: new URL(c.req.url).pathname,
          service: 'service-api/guild',
        };
        return c.json(payload, payload.statusCode);
      }

      return c.json<Guild>(guild);
    });
  })
  .get('*', (c) => {
    const payload: ErrorPayload = {
      message: 'Not Found',
      statusCode: 404,
      url: new URL(c.req.url).pathname,
      service: 'service-api/guild',
    };
    return c.json(payload, payload.statusCode);
  });
