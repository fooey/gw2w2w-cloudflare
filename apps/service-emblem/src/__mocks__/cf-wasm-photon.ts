// Minimal stub so `@cf-wasm/photon` resolves in plain Node/Vitest.
// Only emblem-renderer/index.ts imports this at module-evaluation time;
// none of the smoke-tested routes call into it at runtime.
export class PhotonImage {}
export function fliph(_img: unknown): void {}
export function flipv(_img: unknown): void {}
