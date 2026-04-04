/* eslint-disable @typescript-eslint/consistent-type-imports */
type PhotonModule = typeof import('@silvia-odwyer/photon');

let photonReady: Promise<PhotonModule> | null = null;
let photonModule: PhotonModule | null = null;

/** Start loading the Photon WASM module. Safe to call multiple times. */
export function initPhoton(): Promise<PhotonModule> {
  photonReady ??= import('@silvia-odwyer/photon').then(async (mod) => {
    await mod.default(); // init WASM
    photonModule = mod;
    return mod;
  });
  return photonReady;
}

/** Returns true if the Photon WASM module has finished loading. */
export function isPhotonReady(): boolean {
  return photonModule !== null;
}

/** Returns the initialized Photon module, starting load if not yet started. */
export function getPhoton(): Promise<PhotonModule> {
  return initPhoton();
}
