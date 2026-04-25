import type { Guild } from '@repo/service-api/types';

export const demoGuilds: Pick<Guild, 'id' | 'name' | 'tag'>[] = [
  {
    id: '4BBB52AA-D768-4FC6-8EDE-C299F2822F0F',
    name: 'ArenaNet',
    tag: 'ArenaNet',
  },
  {
    id: '97C007DC-87D5-E311-9621-AC162DAE8ACD',
    name: 'Undefined Guild Name',
    tag: 'NULL',
  },
  {
    id: '9C05A42C-1F3A-EE11-8465-02315AB41281',
    name: 'Dobby Is Free',
    tag: 'SOCK',
  },
  {
    id: '94698BF8-5519-EF11-BA1F-12061042B485',
    name: 'Fellowship And Murder',
    tag: 'FAM',
  },
];
