import type { ServiceApiClient } from '#lib/api/api.client.ts';

/**
 * A 4xx is a real answer: service-api returns 404 for a guild that does not exist and 400 for a
 * malformed id, and neither is fixed by asking again. A 5xx is not an answer at all — it is
 * service-api erroring, or the SERVICE_API binding failing because the Worker is down, which
 * wrangler surfaces as a synthesised 5xx response rather than a thrown error.
 *
 * Flattening a 5xx to `null` makes the caller render "No guild found", stating as established fact
 * something that was never established. Throwing instead lets the route return a 503. The 500
 * threshold matches `interpretErrorStatus` in lib/api/wvw/matches.ts.
 */
function assertAnswered(res: { status: number }): void {
  if (res.status >= 500) throw new Error(`guild lookup failed upstream (${res.status.toString()})`);
}

export async function fetchGuild(api: ServiceApiClient, guildId: string) {
  const res = await api.gw2.guild[':guildId'].$get({ param: { guildId } });
  assertAnswered(res);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchGuildByName(api: ServiceApiClient, name: string) {
  const res = await api.gw2.guild.search.$get({ query: { name: name.toLocaleLowerCase() } });
  assertAnswered(res);
  if (!res.ok) return null;
  return res.json();
}
