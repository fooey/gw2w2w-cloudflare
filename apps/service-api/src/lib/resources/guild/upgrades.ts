import { type CloudflareEnv } from '#index.ts';
import { apiFetch } from '#lib/resources/api.ts';

export interface GuildUpgrade {
  id: number;
  name: string;
  description: string;
  icon: string;
  type: string;
}

export async function getGuildUpgrades(ids: number[], env: CloudflareEnv): Promise<GuildUpgrade[] | null> {
  if (ids.length === 0) return [];
  const response = await apiFetch(env, `/guild/upgrades?ids=${ids.join(',')}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`API error: ${response.status.toString()} ${response.statusText}`);
  }
  return response.json();
}
