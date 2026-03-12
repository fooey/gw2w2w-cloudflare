'use client';

import type { Color, Emblem } from '@service-api/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { ColorPicker } from './ColorPicker';
import { CopyToClipboardInput } from '../controls/CopyToClipboardInput';
import { decodeShortlink, encodeShortlink } from './shortlink';
import type { EmblemFlag, EmblemState } from './types';

interface EmblemDesignerProps {
  colors: Color[];
  backgrounds: Emblem[];
  foregrounds: Emblem[];
}

const P = {
  BG: 'background',
  BGC: 'background_color',
  FG: 'foreground',
  FGC1: 'foreground_color_1',
  FGC2: 'foreground_color_2',
  FLAGS: 'flags',
} as const;

const FLAG_PARAM: Record<EmblemFlag, string> = {
  FlipBackgroundHorizontal: 'flip_background_horizontal',
  FlipBackgroundVertical: 'flip_background_vertical',
  FlipForegroundHorizontal: 'flip_foreground_horizontal',
  FlipForegroundVertical: 'flip_foreground_vertical',
};
const PARAM_FLAG = Object.fromEntries(Object.entries(FLAG_PARAM).map(([k, v]) => [v, k])) as Record<string, EmblemFlag>;

function parseNum(s: string | null): number | null {
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const emptyState: EmblemState = {
  background: { id: null, colors: [null] },
  foreground: { id: null, colors: [null, null] },
  flags: [],
};

function stateFromParams(params: URLSearchParams): EmblemState {
  const s = params.get('s');
  if (s) return decodeShortlink(s) ?? emptyState;

  const flagStr = params.get(P.FLAGS);
  const flags = flagStr
    ? flagStr
        .split(',')
        .map((a) => PARAM_FLAG[a])
        .filter((f): f is EmblemFlag => !!f)
    : [];
  return {
    background: { id: parseNum(params.get(P.BG)), colors: [parseNum(params.get(P.BGC))] },
    foreground: {
      id: parseNum(params.get(P.FG)),
      colors: [parseNum(params.get(P.FGC1)), parseNum(params.get(P.FGC2))],
    },
    flags,
  };
}

function stateToParams(state: EmblemState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.background.id != null) params.set(P.BG, String(state.background.id));
  if (state.background.colors[0] != null) params.set(P.BGC, String(state.background.colors[0]));
  if (state.foreground.id != null) params.set(P.FG, String(state.foreground.id));
  if (state.foreground.colors[0] != null) params.set(P.FGC1, String(state.foreground.colors[0]));
  if (state.foreground.colors[1] != null) params.set(P.FGC2, String(state.foreground.colors[1]));
  if (state.flags.length > 0) params.set(P.FLAGS, state.flags.map((f) => FLAG_PARAM[f]).join(','));
  return params;
}

function toggleFlag(flags: EmblemFlag[], flag: EmblemFlag): EmblemFlag[] {
  return flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag];
}

export function EmblemDesigner({ colors, backgrounds, foregrounds }: EmblemDesignerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const emblem = stateFromParams(searchParams);

  const setEmblem = useCallback(
    (updater: (prev: EmblemState) => EmblemState) => {
      const next = updater(stateFromParams(searchParams));
      const qs = stateToParams(next).toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const selectedBg = backgrounds.find((b) => b.id === emblem.background.id);
  const selectedFg = foregrounds.find((f) => f.id === emblem.foreground.id);

  const bgColor = colors.find((c) => c.id === emblem.background.colors[0]);
  const fgColor1 = colors.find((c) => c.id === emblem.foreground.colors[0]);
  const fgColor2 = colors.find((c) => c.id === emblem.foreground.colors[1]);

  const qs = stateToParams(emblem).toString();
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${pathname}${qs ? `?${qs}` : ''}` : '';
  const shortUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${pathname}?s=${encodeShortlink(emblem)}` : '';

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Preview */}
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Preview</h3>
          <div
            className="flex size-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 text-sm text-gray-400"
            style={bgColor ? { backgroundColor: `rgb(${bgColor.cloth.rgb.join(',')})` } : undefined}
          >
            {!selectedBg && !selectedFg ? (
              <span>Select layers to preview</span>
            ) : (
              <div className="flex flex-col items-center gap-1 text-center text-xs">
                {selectedBg && <span>BG: #{selectedBg.id}</span>}
                {selectedFg && <span>FG: #{selectedFg.id}</span>}
                {fgColor1 && (
                  <span
                    className="mt-1 inline-block size-4 rounded-sm border border-white/50"
                    style={{ backgroundColor: `rgb(${fgColor1.cloth.rgb.join(',')})` }}
                  />
                )}
                {fgColor2 && (
                  <span
                    className="inline-block size-4 rounded-sm border border-white/50"
                    style={{ backgroundColor: `rgb(${fgColor2.cloth.rgb.join(',')})` }}
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-6">
          {/* Background */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Background</h3>

            {/* Layer picker stub */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Layer</label>
              <select
                value={emblem.background.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value === '' ? null : Number(e.target.value);
                  setEmblem((prev) => ({ ...prev, background: { ...prev.background, id } }));
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Pick a background…</option>
                {backgrounds.map((bg) => (
                  <option key={bg.id} value={bg.id}>
                    Background #{bg.id}
                  </option>
                ))}
              </select>
            </div>

            <ColorPicker
              colors={colors}
              label="Color"
              value={emblem.background.colors[0]}
              onChange={(colorId) => {
                setEmblem((prev) => ({ ...prev, background: { ...prev.background, colors: [colorId] } }));
              }}
            />

            {/* Flip flags */}
            <div className="flex gap-4">
              {(['FlipBackgroundHorizontal', 'FlipBackgroundVertical'] as const).map((flag) => (
                <label key={flag} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={emblem.flags.includes(flag)}
                    onChange={() => {
                      setEmblem((prev) => ({ ...prev, flags: toggleFlag(prev.flags, flag) }));
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {flag === 'FlipBackgroundHorizontal' ? 'Flip H' : 'Flip V'}
                </label>
              ))}
            </div>
          </section>

          {/* Foreground */}
          <section className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Foreground</h3>

            {/* Layer picker stub */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Layer</label>
              <select
                value={emblem.foreground.id ?? ''}
                onChange={(e) => {
                  const id = e.target.value === '' ? null : Number(e.target.value);
                  setEmblem((prev) => ({ ...prev, foreground: { ...prev.foreground, id } }));
                }}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">Pick a foreground…</option>
                {foregrounds.map((fg) => (
                  <option key={fg.id} value={fg.id}>
                    Foreground #{fg.id}
                  </option>
                ))}
              </select>
            </div>

            <ColorPicker
              colors={colors}
              label="Primary Color"
              value={emblem.foreground.colors[0]}
              onChange={(colorId) => {
                setEmblem((prev) => ({
                  ...prev,
                  foreground: { ...prev.foreground, colors: [colorId, prev.foreground.colors[1]] },
                }));
              }}
            />

            <ColorPicker
              colors={colors}
              label="Secondary Color"
              value={emblem.foreground.colors[1]}
              onChange={(colorId) => {
                setEmblem((prev) => ({
                  ...prev,
                  foreground: { ...prev.foreground, colors: [prev.foreground.colors[0], colorId] },
                }));
              }}
            />

            {/* Flip flags */}
            <div className="flex gap-4">
              {(['FlipForegroundHorizontal', 'FlipForegroundVertical'] as const).map((flag) => (
                <label key={flag} className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={emblem.flags.includes(flag)}
                    onChange={() => {
                      setEmblem((prev) => ({ ...prev, flags: toggleFlag(prev.flags, flag) }));
                    }}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  {flag === 'FlipForegroundHorizontal' ? 'Flip H' : 'Flip V'}
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Share */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Share</h3>

        {/* Full URL */}
        <CopyToClipboardInput label="Full URL" value={fullUrl} />

        {/* Short link */}
        <CopyToClipboardInput label="Short link" value={shortUrl} />
      </section>
    </div>
  );
}
