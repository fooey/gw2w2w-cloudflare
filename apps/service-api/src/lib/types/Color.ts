/**
 * Represents a Guild Wars 2 dye color with detailed material appearance information.
 *
 * @see {@link https://wiki.guildwars2.com/wiki/API:2/colors Guild Wars 2 Color API Documentation}
 * @example
 * ```typescript
 * const color: Color = {
 *   id: 10,
 *   name: "Sky",
 *   base_rgb: [128, 26, 26],
 *   cloth: {
 *     brightness: 22,
 *     contrast: 1.25,
 *     hue: 196,
 *     saturation: 0.742188,
 *     lightness: 1.32813,
 *     rgb: [54, 130, 160]
 *   },
 *   leather: {
 *     brightness: 22,
 *     contrast: 1.25,
 *     hue: 196,
 *     saturation: 0.664063,
 *     lightness: 1.32813,
 *     rgb: [61, 129, 156]
 *   },
 *   metal: {
 *     brightness: 22,
 *     contrast: 1.28906,
 *     hue: 196,
 *     saturation: 0.546875,
 *     lightness: 1.32813,
 *     rgb: [65, 123, 146]
 *   },
 *   fur: {
 *     brightness: 22,
 *     contrast: 1.25,
 *     hue: 196,
 *     saturation: 0.742188,
 *     lightness: 1.32813,
 *     rgb: [54, 130, 160]
 *   },
 *   item: 20370,
 *   categories: ["Blue", "Vibrant", "Rare"]
 * };
 * ```
 */
export interface Color {
  /**
   * The unique color identifier.
   */
  id: number;

  /**
   * The localized display name of the color.
   */
  name: string;

  /**
   * The base RGB color values as an array of three numbers (0-255).
   */
  base_rgb: [number, number, number];

  /**
   * Detailed color information when applied to cloth armor.
   */
  cloth: ColorMaterialInfo;

  /**
   * Detailed color information when applied to leather armor.
   */
  leather: ColorMaterialInfo;

  /**
   * Detailed color information when applied to metal armor.
   */
  metal: ColorMaterialInfo;

  /**
   * Optional detailed color information when applied to fur armor.
   * Note: Every color except Hydra (1594) has this field due to an API bug.
   */
  fur?: ColorMaterialInfo;

  /**
   * Optional ID of the corresponding dye item that unlocks this color.
   */
  item?: number;

  /**
   * Array of category classifications for this color.
   * Categories include hue (Gray, Brown, Red, Orange, Yellow, Green, Blue, Purple),
   * material (Vibrant, Leather, Metal), and rarity (Starter, Common, Uncommon, Rare, Exclusive).
   */
  categories: string[];
}

/**
 * Detailed color appearance information for a specific material type.
 */
export interface ColorMaterialInfo {
  /**
   * The brightness value applied to the material.
   */
  brightness: number;

  /**
   * The contrast value applied to the material.
   */
  contrast: number;

  /**
   * The hue value in the HSL colorspace.
   */
  hue: number;

  /**
   * The saturation value in the HSL colorspace.
   */
  saturation: number;

  /**
   * The lightness value in the HSL colorspace.
   */
  lightness: number;

  /**
   * The final calculated RGB values as an array of three numbers (0-255).
   */
  rgb: [number, number, number];
}
