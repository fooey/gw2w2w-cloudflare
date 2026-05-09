import type { ServiceApiClient } from '#lib/api/api.client.ts';

export async function fetchAllBackgrounds(api: ServiceApiClient) {
  const res = await api.gw2.emblem.background.$get();
  if (!res.ok) return null;
  return res.json();
}

export async function fetchAllForegrounds(api: ServiceApiClient) {
  const res = await api.gw2.emblem.foreground.$get();
  if (!res.ok) return null;
  return res.json();
}
