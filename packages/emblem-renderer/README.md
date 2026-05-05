# emblem-renderer

Platform-independent Guild Wars 2 emblem compositing engine. Takes raw layer textures and color specs, produces a composited emblem image.

Used by both `service-emblem` (server-side WASM) and `gw2w2w` (client-side WASM).

## Exports

| Export      | Description                                                                     |
| ----------- | ------------------------------------------------------------------------------- |
| `.` (index) | `renderEmblem`, `renderEmblemLayers`, `resizeEmblemImage`                       |
| `./pixels`  | `renderEmblemPixels`, `getFlipsFromFlags` — pure pixel math, zero platform deps |
| `./sizes`   | `EMBLEM_SIZES`, `DEFAULT_EMBLEM_SIZE` (128), `EmblemSize` type                  |

## How It Works

1. **Decode** background and foreground layer textures into RGBA pixel arrays
2. **Flip** layers based on guild flags (`FlipBackgroundHorizontal`, etc.)
3. **Colorize** — background uses red channel as a color mask; foreground uses alpha channel
4. **Composite** layers via single-pass Porter-Duff "over" blend in `renderEmblemPixels`
5. **Resize** to the requested output size (16–1024px)

The `pixels.ts` module is intentionally dependency-free — it operates on raw `Uint8ClampedArray` data so it works identically in Workers, browsers, and tests.

## Testing

```sh
pnpm test
```

Tests cover flag parsing, transparency handling, and red-channel mask application.
