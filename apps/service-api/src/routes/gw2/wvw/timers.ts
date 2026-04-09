import { type CloudflareEnv } from '#index.ts';
import { withCacheJson } from '#lib/cache-providers/cf-cache.ts';
import { CACHE_TTL } from '#lib/resources/constants.ts';
import {
  getWvWLockoutTimer,
  getWvWTeamAssignmentTimer,
  getWvWTimers,
  WVW_REGIONS,
  type WvWRegion,
} from '#lib/resources/wvw/timers.ts';
import { Hono } from 'hono';

export const apiWvwTimersRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', (c) => {
    const now = new Date();
    const timers = WVW_REGIONS.map((region: WvWRegion) => getWvWTimers(region, now));
    return withCacheJson(c, CACHE_TTL.live.http, timers);
  })
  .get('/lockout', (c) => {
    const now = new Date();
    const lockouts = WVW_REGIONS.map((region: WvWRegion) => getWvWLockoutTimer(region, now));
    return withCacheJson(c, CACHE_TTL.live.http, lockouts);
  })
  .get('/teamAssignment', (c) => {
    const now = new Date();
    const assignments = WVW_REGIONS.map((region: WvWRegion) => getWvWTeamAssignmentTimer(region, now));
    return withCacheJson(c, CACHE_TTL.live.http, assignments);
  });
