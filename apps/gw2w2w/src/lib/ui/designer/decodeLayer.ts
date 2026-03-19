import { type DecodedLayer, IMAGE_DIMENSION } from '@repo/emblem-renderer/pixels';

/**
 * Decodes a PNG ArrayBuffer into a DecodedLayer using the browser Canvas API,
 * applying optional horizontal/vertical flip transforms.
 *
 * Returns null if buf is null (missing optional layer).
 */
export async function decodeLayer(
  buf: ArrayBuffer | null,
  flipH: boolean,
  flipV: boolean,
): Promise<DecodedLayer | null> {
  if (!buf) return null;

  const blob = new Blob([buf], { type: 'image/png' });
  const bitmap = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(IMAGE_DIMENSION, IMAGE_DIMENSION);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context');

  if (flipH || flipV) {
    ctx.translate(flipH ? IMAGE_DIMENSION : 0, flipV ? IMAGE_DIMENSION : 0);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  }

  ctx.drawImage(bitmap, 0, 0, IMAGE_DIMENSION, IMAGE_DIMENSION);
  bitmap.close();

  const imageData = ctx.getImageData(0, 0, IMAGE_DIMENSION, IMAGE_DIMENSION);
  const data = new Uint8Array(imageData.data.buffer);
  const u32 = new Uint32Array(data.buffer);

  return { data, u32, width: IMAGE_DIMENSION, height: IMAGE_DIMENSION };
}
