// based on https://wiki.guildwars2.com/wiki/API:2/emblem
// https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds
// https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds

/**
 * Represents a Guild Wars 2 emblem part (background or foreground) with image resources
 * needed to render guild emblems.
 *
 * @see {@link https://wiki.guildwars2.com/wiki/API:2/emblem/backgrounds Emblem Backgrounds API Documentation}
 * @see {@link https://wiki.guildwars2.com/wiki/API:2/emblem/foregrounds Emblem Foregrounds API Documentation}
 * @example
 * ```typescript
 * const background: Emblem = {
 *   id: 1,
 *   layers: [
 *     "https://render.guildwars2.com/file/B1417CDCD8320A390AB5781909F59C0FE805047D/59597.png"
 *   ]
 * };
 *
 * const foreground: Emblem = {
 *   id: 1,
 *   layers: [
 *     "https://render.guildwars2.com/file/F90A286E11257C357965269863F636CCF8D11EDB/59641.png",
 *     "https://render.guildwars2.com/file/E4EA93330BF9EF03917EDF0CBE616411F5383D7F/59643.png",
 *     "https://render.guildwars2.com/file/A7E731CF0BFF5EB890C3CA2F0F019901261C4755/59645.png"
 *   ]
 * };
 * ```
 */
export interface Emblem {
  /**
   * The ID of the emblem part.
   */
  id: number;

  /**
   * An array of URLs to images that make up the various parts of the emblem.
   */
  layers: string[];
}
