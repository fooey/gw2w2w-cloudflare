import { Hono } from 'hono';

import type { CloudflareEnv } from '#index.ts';

import { apiWvwAbilitiesRoute } from './abilities';
import { apiWvwGuildsRoute } from './guilds';
import { apiWvwMatchesRoute } from './matches';
import { apiWvwObjectivesRoute } from './objectives';
import { apiWvwRanksRoute } from './ranks';
import { apiWvwTeamsRoute } from './teams';
import { apiWvwUpgradesRoute } from './upgrades';

export const apiWvwRoute = new Hono<{ Bindings: CloudflareEnv }>()
  .route('/abilities', apiWvwAbilitiesRoute)
  .route('/guilds', apiWvwGuildsRoute)
  .route('/matches', apiWvwMatchesRoute)
  .route('/objectives', apiWvwObjectivesRoute)
  .route('/ranks', apiWvwRanksRoute)
  .route('/teams', apiWvwTeamsRoute)
  .route('/upgrades', apiWvwUpgradesRoute);
