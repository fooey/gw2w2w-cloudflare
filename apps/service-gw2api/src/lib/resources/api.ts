import { GW2Api } from 'guildwars2-ts';

export function getApi() {
  return new GW2Api({ inBrowser: false });
}
