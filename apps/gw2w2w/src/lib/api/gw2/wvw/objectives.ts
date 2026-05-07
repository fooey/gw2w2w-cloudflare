import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchWvwObjectives(api: ServiceApiClient) {
  const res = await api.gw2.wvw.objectives.$get();
  return res.json();
}

export async function fetchWvwObjective(api: ServiceApiClient, id: string) {
  const res = await api.gw2.wvw.objectives[':id'].$get({ param: { id } });
  if (!res.ok) return null;
  return res.json();
}
