import type { Color } from './Color';
import type { Emblem } from './Emblem';

/**
 * Represents a Guild Wars 2 guild with core details.
 * The endpoint includes more or less fields depending on whether an API Key
 * of a Leader or Member of the Guild with the `guilds` scope is included in the request.
 *
 * @see {@link https://wiki.guildwars2.com/wiki/API:2/guild/:id Guild Wars 2 Guild API Documentation}
 * @example
 * ```typescript
 * const guild: Guild = {
 *   id: "4BBB52AA-D768-4FC6-8EDE-C299F2822F0F",
 *   name: "ArenaNet",
 *   tag: "ArenaNet",
 *   emblem: {
 *     background: { id: 2, colors: [473] },
 *     foreground: { id: 40, colors: [673, 71] },
 *     flags: ["FlipBackgroundHorizontal", "FlipBackgroundVertical"]
 *   }
 * };
 * ```
 */
export interface Guild {
  /** The unique guild id. */
  id: string;
  /** The guild's name. */
  name: string;
  /** The 2 to 4 letter guild tag representing the guild. */
  tag: string;
  /** The guild emblem. */
  emblem?: {
    /** An array containing information of the background of the guild emblem. */
    background: {
      /** The background id, to be resolved against /v2/emblem/backgrounds. */
      id: Emblem['id'];
      /** An array of numbers containing the id of each color used. */
      colors: Array<Color['id']>;
    };
    /** An array containing information of the foreground of the guild emblem. */
    foreground: {
      /** The foreground id, to be resolved against /v2/emblem/foregrounds. */
      id: Emblem['id'];
      /** An array of numbers containing the id of each color used. */
      colors: Array<Color['id']>;
    };
    /** An array containing the manipulations applied to the logo. */
    flags: (
      | 'FlipBackgroundHorizontal'
      | 'FlipBackgroundVertical'
      | 'FlipForegroundHorizontal'
      | 'FlipForegroundVertical'
    )[];
  };
  /** The current level of the guild. Requires leader or member API token. */
  level?: number;
  /** The message of the day written out in a single string. Requires leader or member API token. */
  motd?: string;
  /** The guild's current influence. Requires leader or member API token. */
  influence?: number;
  /** The guild's current aetherium level. Requires leader or member API token. */
  aetherium?: string;
  /** The guild's current level of favor. Requires leader or member API token. */
  favor?: number;
  /** The number of people currently in the Guild. Requires leader or member API token. */
  member_count?: number;
  /** The maximum number of people that can be in the Guild. Requires leader or member API token. */
  member_capacity?: number;
}
