import type { CloudflareEnv } from '@service-api/index';
import {
  getWvWLockoutTimer,
  getWvWTeamAssignmentTimer,
  getWvWTimers,
  type WvWLockoutTimer,
  type WvWRegion,
  type WvWTeamAssignmentTimer,
  type WvWTimers,
  WVW_REGIONS,
} from '@service-api/lib/resources/wvw/timers';
import { Hono } from 'hono';

export const apiWvwTimersRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .get('/', (c) => {
    const now = new Date();
    const timers = WVW_REGIONS.map((region: WvWRegion) => getWvWTimers(region, now));
    return c.json<WvWTimers[]>(timers, 200);
  })
  .get('/lockout', (c) => {
    const now = new Date();
    const lockouts = WVW_REGIONS.map((region: WvWRegion) => getWvWLockoutTimer(region, now));
    return c.json<WvWLockoutTimer[]>(lockouts, 200);
  })
  .get('/teamAssignment', (c) => {
    const now = new Date();
    const assignments = WVW_REGIONS.map((region: WvWRegion) => getWvWTeamAssignmentTimer(region, now));
    return c.json<WvWTeamAssignmentTimer[]>(assignments, 200);
  });
