export const GW2_API_BASE = 'https://api.guildwars2.com/v2';
export const GW2W2W_API_BASE_PRODUCTION = 'https://api.gw2w2w.com';
export const GW2W2W_API_BASE_DEVELOPMENT = 'http://localhost:8788';

export const GW2W2W_API_BASE =
  process.env.NODE_ENV === 'production' ? GW2W2W_API_BASE_PRODUCTION : GW2W2W_API_BASE_DEVELOPMENT;
