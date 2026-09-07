export const GW2_API_BASE = 'https://api.guildwars2.com/v2';
export const GW2W2W_API_BASE_PRODUCTION = 'https://api.gw2w2w.com';
// 127.0.0.1 rather than localhost, matching the emblem host in lib/emblems.ts: wrangler dev binds
// IPv4 only, and this is now reached from inside workerd once per loader run.
export const GW2W2W_API_BASE_DEVELOPMENT = 'http://127.0.0.1:8788';

export const GW2W2W_API_BASE = import.meta.env.PROD ? GW2W2W_API_BASE_PRODUCTION : GW2W2W_API_BASE_DEVELOPMENT;
