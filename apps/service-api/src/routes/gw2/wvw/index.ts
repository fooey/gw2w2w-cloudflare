import type { CloudflareEnv } from '@service-api/index';
import { Hono } from 'hono';
import { apiWvwAbilitiesRoute } from './abilities';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwMatchesRoute } from './matches';
import { apiWvwObjectivesRoute } from './objectives';
import { apiWvwRanksRoute } from './ranks';
import { apiWvwTeamsRoute } from './teams';
import { apiWvwTimersRoute } from './timers';
import { apiWvwUpgradesRoute } from './upgrades';

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/abilities', apiWvwAbilitiesRoute)
  .route('/guilds', apiWvwGuildsRoute)
  .route('/matches', apiWvwMatchesRoute)
  .route('/objectives', apiWvwObjectivesRoute)
  .route('/ranks', apiWvwRanksRoute)
  .route('/teams', apiWvwTeamsRoute)
  .route('/timers', apiWvwTimersRoute)
  .route('/upgrades', apiWvwUpgradesRoute);
