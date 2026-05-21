import { z } from 'zod';

const rgb = z.tuple([z.number(), z.number(), z.number()]).describe('[R, G, B] values (0–255)');

export const ColorMaterialInfoSchema = z
  .object({
    brightness: z.number().describe('Brightness shift (−100 to 100)'),
    contrast: z.number().describe('Contrast multiplier (0 to 255)'),
    hue: z.number().describe('Hue rotation in degrees (0 to 360)'),
    saturation: z.number().describe('Saturation shift (−100 to 100)'),
    lightness: z.number().describe('Lightness shift (−100 to 100)'),
    rgb,
  })
  .describe('Dye application properties for a single material surface');

export const ColorSchema = z
  .object({
    id: z.number(),
    name: z.string(),
    base_rgb: rgb,
    cloth: ColorMaterialInfoSchema,
    leather: ColorMaterialInfoSchema,
    metal: ColorMaterialInfoSchema,
    fur: ColorMaterialInfoSchema.optional(),
    item: z.number().optional().describe('Default dyeable item ID for in-game preview (if applicable)'),
    categories: z.array(z.string()).describe('Filter categories (e.g. Hue, Material, Rarity)'),
  })
  .describe('GW2 dye color from /v2/colors');

export type ColorMaterialInfo = z.infer<typeof ColorMaterialInfoSchema>;
export type Color = z.infer<typeof ColorSchema>;
