import { getApi } from '#lib/api/api.server.ts';

export async function fetchWvwObjectives() {
  const api = await getApi();
  const res = await api.gw2.wvw.objectives.$get();
  return res.json();
}

export async function fetchWvwObjective(id: string) {
  const api = await getApi();
  const res = await api.gw2.wvw.objectives[':id'].$get({ param: { id } });
  if (!res.ok) return null;
  return res.json();
}
