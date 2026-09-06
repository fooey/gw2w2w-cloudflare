import type { RouteConfig } from '@react-router/dev/routes';
import { index, layout, prefix, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('designer', 'routes/designer.tsx'),
  route('guilds', 'routes/guilds.tsx'),
  route('guilds/:guildId', 'routes/guild-detail.tsx'),
  route('guild-search', 'routes/guild-search.ts'),

  // Public redirect targets — see each route module for why they exist.
  route('guilds/:guildId/:size.svg', 'routes/guild-emblem-svg.ts'),
  route('favicon.ico', 'routes/favicon.ts'),

  // `matchups-layout` carries the QueryClientProvider that app/wvw/matchups/layout.tsx provided.
  ...prefix('wvw/matchups', [
    layout('routes/wvw/matchups-layout.tsx', [
      index('routes/wvw/matchups.tsx'),
      route(':slug', 'routes/wvw/matchup-detail.tsx'),
    ]),
  ]),

  route('api/texture', 'routes/api/texture.ts'),
  route('api/version', 'routes/api/version.ts'),
] satisfies RouteConfig;
