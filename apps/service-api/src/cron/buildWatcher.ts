import type { CloudflareEnv } from '#index.ts';
import { getColor } from '#lib/resources/color.ts';
import { getEmblemBackground, getEmblemForeground } from '#lib/resources/emblem.ts';
import { getGuildUpgrades } from '#lib/resources/guild/upgrades.ts';
import { gw2Fetch } from '#lib/resources/gw2Fetch.ts';
import { getWvWAbility } from '#lib/resources/wvw/abilities.ts';
import { getWvWObjective } from '#lib/resources/wvw/objectives.ts';
import { getWvWRank } from '#lib/resources/wvw/ranks.ts';
import { getWvWUpgrade } from '#lib/resources/wvw/upgrades.ts';

// Appended directly to GW2_API_BASE / GW2_PROXY_BASE via gw2Fetch — both already include `/v2`.
const GW2_BUILD_PATH = '/build';
const BUILD_ID_KV_KEY = 'meta:build_id';

/**
 * R2 object keys that should be invalidated when the GW2 build ID changes.
 * Add keys here to opt a cached collection into build-aware invalidation.
 *
 * Keep this list in sync with WARM_CACHE_FNS below.
 */
export const STATIC_CACHE_KEYS: string[] = [
  'colors.json',
  'wvw-objectives.json',
  'wvw-abilities.json',
  'wvw-ranks.json',
  'wvw-upgrades.json',
  'guild-upgrades.json',
  'backgrounds.json',
  'foregrounds.json',
];

/**
 * Cache warm-up functions paired with STATIC_CACHE_KEYS.
 * Each fetches its full collection, repopulating the R2 object deleted on invalidation.
 * Called via ctx.waitUntil after a build change — fire-and-forget, not awaited.
 *
 * Keep this list in sync with STATIC_CACHE_KEYS above.
 */
const WARM_CACHE_FNS: ((env: CloudflareEnv) => Promise<unknown>)[] = [
  async (env) => getColor('all', env),
  async (env) => getWvWObjective('all', env),
  async (env) => getWvWAbility('all', env),
  async (env) => getWvWRank('all', env),
  async (env) => getWvWUpgrade('all', env),
  async (env) => getGuildUpgrades('all', env),
  async (env) => getEmblemBackground('all', env),
  async (env) => getEmblemForeground('all', env),
];

export async function warmStaticCaches(env: CloudflareEnv): Promise<void> {
  await Promise.allSettled(WARM_CACHE_FNS.map(async (fn) => fn(env)));
  console.info(`Warmed ${WARM_CACHE_FNS.length.toString()} static caches`);
}

/**
 * Returns true if the build ID changed and caches were invalidated.
 */
export async function checkBuildId(env: CloudflareEnv): Promise<boolean> {
  // Timeout is managed by gw2Fetch itself (per-attempt, not shared across direct+proxy) — don't set signal here.
  const response = await gw2Fetch(env, GW2_BUILD_PATH, { headers: { 'User-Agent': 'gw2w2w.com' } }, 20_000);

  if (!response.ok) {
    console.error(`Build ID check failed: ${response.status.toString()} ${response.statusText}`);
    return false;
  }

  const { id } = await response.json<{ id: number }>();
  const buildId = String(id);

  const stored = await env.EMBLEM_ENGINE_GUILD_LOOKUP.get(BUILD_ID_KV_KEY);

  if (stored === buildId) {
    return false;
  }

  console.info(`GW2 build changed: ${stored ?? 'none'} → ${buildId}`);

  await Promise.all(STATIC_CACHE_KEYS.map(async (key) => env.EMBLEM_ASSETS.delete(key)));
  console.info(`Invalidated ${STATIC_CACHE_KEYS.length.toString()} R2 cache keys: ${STATIC_CACHE_KEYS.join(', ')}`);

  await env.EMBLEM_ENGINE_GUILD_LOOKUP.put(BUILD_ID_KV_KEY, buildId);
  return true;
}
