import { z } from 'zod';

export const GuildSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    tag: z.string().describe('Short guild tag shown in brackets in-game (e.g. "[WIKI]")'),
    emblem: z
      .object({
        background: z.object({
          id: z.number(),
          colors: z.array(z.number()).describe('Palette color IDs applied to this layer'),
        }),
        foreground: z.object({
          id: z.number(),
          colors: z
            .array(z.number())
            .describe('Palette color IDs applied to this layer (index 0 = primary fill, 1 = secondary fill)'),
        }),
        flags: z
          .array(
            z.enum([
              'FlipBackgroundHorizontal',
              'FlipBackgroundVertical',
              'FlipForegroundHorizontal',
              'FlipForegroundVertical',
            ]),
          )
          .describe('Flip transformations applied during emblem rendering'),
      })
      .optional()
      .describe('Guild emblem configuration; absent if the guild has not set an emblem'),
    level: z.number().optional().describe('Guild hall upgrade level (requires authenticated guild token)'),
    motd: z.string().optional().describe('Message of the Day (requires authenticated guild token)'),
    influence: z.number().optional().describe('Influence resource total (requires authenticated guild token)'),
    aetherium: z.string().optional().describe('Aetherium resource total (requires authenticated guild token)'),
    favor: z.number().optional().describe('Favor resource total (requires authenticated guild token)'),
    member_count: z.number().optional().describe('Current member count (requires authenticated guild token)'),
    member_capacity: z.number().optional().describe('Maximum member capacity (requires authenticated guild token)'),
  })
  .describe('Guild profile from /v2/guild/:id');

export type Guild = z.infer<typeof GuildSchema>;
