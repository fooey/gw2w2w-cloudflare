/// <reference types="vite/client" />

/** Build stamps injected at build time by `define` in vite.config.ts. */
interface ImportMetaEnv {
  readonly VITE_BUILD_HASH: string;
  readonly VITE_BUILD_TIMESTAMP: string;
}
