# GW2 Emblem Tools

An open-source suite for rendering and designing _Guild Wars 2_ guild emblems using modern edge computing. This project provides a high-speed hotlinking service for Discord/Web and a real-time interactive emblem designer.

## Features

- **Blazing Fast Hotlinks**: Generate and serve guild emblems directly as `.png` files.
- **Interactive Designer**: A client-side editor to build emblems from scratch using official ArenaNet API resources.
- **Consistent Rendering**: Uses a shared WebAssembly (WASM) engine to ensure the designer preview exactly matches the final generated image.
- **Edge-Optimized**: Built specifically for the Cloudflare ecosystem (Workers, Pages, R2).

## How it Works

### 🎨 The Rendering Engine

ArenaNet's API provides emblem pieces as grayscale textures. To match the in-game look, we use a **Multiply Blending** strategy. This takes the RGB values from the game's color palette and multiplies them against the texture layers. We use the [Photon](https://github.com/silvia-odwyer/photon) library (WASM) for high-performance image decoding, encoding, and transformations. The core blending and layer composition is implemented via direct pixel manipulation on the raw buffers exposed by Photon, ensuring the specific Guild Wars 2 color algorithms are applied correctly.

**Shared Logic Goal**: A primary architectural goal is to share the exact same rendering logic between the client-side Designer (React) and the server-side Hotlink API (Cloudflare Workers). By utilizing a shared WASM module powered by Photon, we ensure that what users see in the designer is pixel-perfectly identical to the generated static image served by the edge.

### 🚀 Caching Strategy

To ensure reliability and speed while respecting ArenaNet's API rate limits, we use a tiered caching approach:

1. **The Edge Cache**: The most recent requests are served instantly from Cloudflare's CDN.
2. **Persistent R2 Storage**: Rendered emblems are stored in Cloudflare R2. This acts as a permanent library, ensuring we only render a specific emblem configuration once.
3. **Smart Prefetching**: Raw grayscale assets are mirrored in R2 to avoid redundant calls to the GW2 render servers.

### 🛠 Tech Stack

- **Framework**: Next.js (Designer UI)
- **Runtime**: Cloudflare Workers (Hotlink API)
- **Image Processing**: WASM / Photon
- **Monorepo Management**: Turborepo
- **Package Manager**: pnpm

## Local Development

This project is built to be developed locally with high fidelity using Cloudflare's `wrangler` CLI.

1. Clone the repo.
2. Enable pnpm: `corepack enable`
3. Install dependencies: `pnpm install`
4. Run the dev suite: `pnpm dev`

## Acknowledgements

- Thanks to [guildwars2-ts](https://gitlab.com/dinckelman/guildwars2-ts) for the Guild Wars 2 API TypeScript definitions.

## License

[Choose a license, e.g., MIT]

_Disclaimer: This project is not affiliated with ArenaNet or Guild Wars 2. All game assets are property of ArenaNet._
