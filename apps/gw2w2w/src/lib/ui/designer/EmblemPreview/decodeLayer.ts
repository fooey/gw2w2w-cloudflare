import type { DecodedLayer } from '@repo/emblem-renderer/pixels';

import { getPhoton } from '../TextureCacheManager/photon';

/**
 * Decodes a PNG ArrayBuffer into a DecodedLayer using Photon WASM,
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

  const photon = await getPhoton();
  const img = photon.PhotonImage.new_from_byteslice(new Uint8Array(buf));

  if (flipH) photon.fliph(img);
  if (flipV) photon.flipv(img);

  // Copy pixels out of WASM memory before freeing the image
  const data = new Uint8Array(img.get_raw_pixels());
  const width = img.get_width();
  const height = img.get_height();
  img.free();

  const u32 = new Uint32Array(data.buffer);
  return { data, u32, width, height };
}
