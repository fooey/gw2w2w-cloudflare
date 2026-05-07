import { getApi } from '#lib/api/api.server.ts';

export async function fetchAllBackgrounds() {
  const api = await getApi();
  const res = await api.gw2.emblem.background.$get();
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAllForegrounds() {
  const api = await getApi();
  const res = await api.gw2.emblem.foreground.$get();
  if (!res.ok) return null;
  return res.json();
}
