# emblem-renderer — Agent Instructions

Rules specific to `packages/emblem-renderer`. The root [AGENTS.md](../../AGENTS.md) covers monorepo-wide conventions.

## Platform Independence

- `pixels.ts` must have **zero dependencies** — no Photon, no Cloudflare APIs, no DOM
- It operates on raw `Uint8ClampedArray` pixel data so it runs identically in Workers, browsers, and Vitest
- Platform-specific code (Photon WASM calls, image decoding) belongs in `index.ts`, not `pixels.ts`

## Compositing Rules

- **Background:** uses the **red channel** as a color mask — multiply the guild color by the red value
- **Foreground:** uses the **alpha channel** — apply guild color weighted by alpha
- **Flip before composite** — apply horizontal/vertical flips to the raw pixel data before blending
- **Resize after composite** — never resize individual layers; resize the final composited image
- Compositing uses a single-pass Porter-Duff "over" blend — do not split into multiple passes

## Image Dimensions

- Source textures are always 128×128 (`IMAGE_DIMENSION = 128`)
- Valid output sizes are defined in `EMBLEM_SIZES` (16 to 1024) — do not add arbitrary sizes
