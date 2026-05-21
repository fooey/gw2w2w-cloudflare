// based on https://wiki.guildwars2.com/wiki/API:2/emblem
// https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds
// https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds

import { z } from 'zod';

export const EmblemSchema = z
  .object({
    id: z.number().describe('Numeric emblem ID'),
    layers: z
      .array(z.string())
      .describe('Ordered render-URL list; each entry is a texture path composited into the final emblem'),
  })
  .describe('Background or foreground emblem definition from /v2/emblem/backgrounds or /v2/emblem/foregrounds');

export type Emblem = z.infer<typeof EmblemSchema>;
