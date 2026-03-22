'use client';

import { getFlipsFromFlags, IMAGE_DIMENSION, renderEmblemPixels, type ColorRGB } from '@repo/emblem-renderer/pixels';
import type { Color, Emblem } from '@service-api/lib/types';
import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { decodeLayer } from './decodeLayer';
import { fetchTexture } from '../TextureCacheManager/textureCache';
import type { EmblemState } from '../types';

interface EmblemPreviewProps {
  emblem: EmblemState;
  colors: Color[];
  backgrounds: Emblem[];
  foregrounds: Emblem[];
  size?: number;
  compact?: boolean;
  tileClassName?: string;
}

export function EmblemPreview({
  emblem,
  colors,
  backgrounds,
  foregrounds,
  size = 128,
  compact = false,
  tileClassName,
}: EmblemPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderIdRef = useRef(0);

  const bgDef = backgrounds.find((b) => b.id === emblem.background.id);
  const fgDef = foregrounds.find((f) => f.id === emblem.foreground.id);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Capture in a const so the async closure has a stable non-null reference
    const canvasEl = canvas;

    const myId = ++renderIdRef.current;

    const colorMap = new Map<number, ColorRGB>(colors.map((c) => [c.id, c.cloth.rgb as ColorRGB]));
    const bgRGB = colorMap.get(emblem.background.colors[0] ?? -1) ?? [0, 0, 0];
    const fg1RGB = colorMap.get(emblem.foreground.colors[0] ?? -1) ?? [0, 0, 0];
    const fg2RGB = colorMap.get(emblem.foreground.colors[1] ?? -1) ?? [0, 0, 0];
    const { flipBgH, flipBgV, flipFgH, flipFgV } = getFlipsFromFlags(emblem.flags);

    async function render() {
      if (!bgDef && !fgDef) {
        const ctx = canvasEl.getContext('2d');
        ctx?.clearRect(0, 0, canvasEl.width, canvasEl.height);
        return;
      }

      const bgUrl = bgDef?.layers[0] ?? null;
      const fg1Url = fgDef?.layers[1] ?? null;
      const fg2Url = fgDef?.layers[2] ?? null;

      const [bgBuf, fg1Buf, fg2Buf] = await Promise.all([
        bgUrl ? fetchTexture(bgUrl) : Promise.resolve(null),
        fg1Url ? fetchTexture(fg1Url) : Promise.resolve(null),
        fg2Url ? fetchTexture(fg2Url) : Promise.resolve(null),
      ]);

      if (renderIdRef.current !== myId) return;

      const [bgLayer, fg1Layer, fg2Layer] = await Promise.all([
        decodeLayer(bgBuf, flipBgH, flipBgV),
        decodeLayer(fg1Buf, flipFgH, flipFgV),
        decodeLayer(fg2Buf, flipFgH, flipFgV),
      ]);

      if (renderIdRef.current !== myId) return;

      const result = renderEmblemPixels(bgLayer, fg1Layer, fg2Layer, { bgRGB, fg1RGB, fg2RGB, flags: emblem.flags });

      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;
      const imageData = new ImageData(
        new Uint8ClampedArray(result.data.buffer as ArrayBuffer),
        result.width,
        result.height,
      );
      ctx.putImageData(imageData, 0, 0);
    }

    render().catch(console.error);

    const idRef = renderIdRef;
    return () => {
      idRef.current++;
    };
  }, [bgDef, fgDef, emblem.background.colors, emblem.foreground.colors, emblem.flags, colors]);

  const hasSelection = bgDef ?? fgDef;
  const scale = size / IMAGE_DIMENSION;
  const scaleLabel = scale === 1 ? 'native' : `×${scale}`;

  if (compact) {
    const bgClass = tileClassName ?? 'bg-gray-100';
    return (
      <div className={clsx('flex flex-col items-center gap-1', tileClassName && 'rounded-xl')}>
        <div className={clsx('relative rounded-xl', bgClass)} style={{ width: size, height: size }}>
          <canvas
            ref={canvasRef}
            width={IMAGE_DIMENSION}
            height={IMAGE_DIMENSION}
            className={hasSelection ? 'rounded-xl' : 'hidden'}
            style={{ width: size, height: size }}
          />
        </div>
        {!tileClassName && (
          <p className="text-center text-xs text-gray-400">
            {size}px
            <br />
            <span className={scale === 1 ? 'font-medium text-indigo-400' : 'text-gray-300'}>{scaleLabel}</span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className="relative flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
        style={{ width: size, height: size }}
      >
        {!hasSelection && <span>Select layers to preview</span>}

        <canvas
          ref={canvasRef}
          width={IMAGE_DIMENSION}
          height={IMAGE_DIMENSION}
          className={hasSelection ? 'rounded-md' : 'hidden'}
          style={hasSelection ? { width: size, height: size } : undefined}
        />
      </div>
      <p className="text-xs text-gray-400">
        {size}×{size}px{' '}
        <span className={scale === 1 ? 'font-medium text-indigo-400' : 'text-gray-300'}>{scaleLabel}</span>
      </p>
    </div>
  );
}
