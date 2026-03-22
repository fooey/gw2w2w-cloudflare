'use client';

import { getCustomEmblemSrc } from '@gw2w2w/lib/emblems';
import type { Color, Emblem } from '@service-api/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CopyToClipboardInput } from '../controls/CopyToClipboardInput';
import { ColorPicker } from './ColorPicker';
import { DesignerInit } from './DesignerInit';
import { EmblemPreview } from './EmblemPreview';
import { decodeShortlink, encodeShortlink } from './shortlink';
import type { EmblemFlag, EmblemState } from './types';

interface EmblemDesignerProps {
  colors: Color[];
  backgrounds: Emblem[];
  foregrounds: Emblem[];
}

const P = {
  BG: 'background_id',
  BGC: 'background_color_id',
  FG: 'foreground_id',
  FGC1: 'foreground_primary_color_id',
  FGC2: 'foreground_secondary_color_id',
} as const;

const FLAG_PARAM: Record<EmblemFlag, string> = {
  FlipBackgroundHorizontal: 'flags_flip_bg_horizontal',
  FlipBackgroundVertical: 'flags_flip_bg_vertical',
  FlipForegroundHorizontal: 'flags_flip_fg_horizontal',
  FlipForegroundVertical: 'flags_flip_fg_vertical',
};

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

  const flags = (Object.entries(FLAG_PARAM) as [EmblemFlag, string][])
    .filter(([, param]) => params.has(param))
    .map(([flag]) => flag);
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
  for (const flag of state.flags) params.set(FLAG_PARAM[flag], '');
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

  const setEmblem = (updater: (prev: EmblemState) => EmblemState) => {
    const next = updater(stateFromParams(searchParams));
    const qs = stateToParams(next).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const qs = stateToParams(emblem).toString();
  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${pathname}${qs ? `?${qs}` : ''}` : '';
  const shortUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${pathname}?s=${encodeShortlink(emblem)}` : '';
  const emblemSrc = getCustomEmblemSrc(emblem);

  return (
    <DesignerInit backgrounds={backgrounds} foregrounds={foregrounds}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Preview */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Preview</h3>
          <EmblemPreview emblem={emblem} colors={colors} backgrounds={backgrounds} foregrounds={foregrounds} />
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

        {/* Emblem image URL */}
        <CopyToClipboardInput label="Emblem image" value={emblemSrc} />
      </section>

      {/* Other sizes */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Other sizes</h3>
        <div className="flex items-end gap-3">
          <EmblemPreview
            emblem={emblem}
            colors={colors}
            backgrounds={backgrounds}
            foregrounds={foregrounds}
            size={32}
            compact
          />
          <EmblemPreview
            emblem={emblem}
            colors={colors}
            backgrounds={backgrounds}
            foregrounds={foregrounds}
            size={64}
            compact
          />
          <EmblemPreview
            emblem={emblem}
            colors={colors}
            backgrounds={backgrounds}
            foregrounds={foregrounds}
            size={256}
            compact
          />
        </div>
      </section>
    </DesignerInit>
  );
}
