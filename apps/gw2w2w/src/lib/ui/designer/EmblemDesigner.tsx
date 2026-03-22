'use client';

import { ArrowsRightLeftIcon, ArrowsUpDownIcon } from '@heroicons/react/20/solid';
import { getCustomEmblemSrc } from '@gw2w2w/lib/emblems';
import { emblemBackgroundClasses } from '@gw2w2w/lib/definitions/emblem-backgrounds';
import type { Color, Emblem } from '@service-api/lib/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CopyToClipboardInput } from '../controls/CopyToClipboardInput';
import { ColorPicker } from './ColorPicker';
import { DesignerInit } from './DesignerInit';
import { LayerPicker } from './LayerPicker';
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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr_1fr]">
        {/* Preview */}
        <section className="flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Preview</h3>
          <div className="grid grid-cols-3 gap-3">
            {emblemBackgroundClasses.map((bgClass) => (
              <EmblemPreview
                key={bgClass}
                emblem={emblem}
                colors={colors}
                backgrounds={backgrounds}
                foregrounds={foregrounds}
                compact
                tileClassName={bgClass}
              />
            ))}
          </div>
        </section>

        {/* Background */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Background</h3>

          <LayerPicker
            layers={backgrounds}
            layerType="background"
            value={emblem.background.id}
            onChange={(id) => {
              setEmblem((prev) => ({ ...prev, background: { ...prev.background, id } }));
            }}
            colors={colors}
            colorIds={emblem.background.colors}
            label="Layer"
          />

          <ColorPicker
            colors={colors}
            label="Color"
            value={emblem.background.colors[0]}
            onChange={(colorId) => {
              setEmblem((prev) => ({ ...prev, background: { ...prev.background, colors: [colorId] } }));
            }}
          />

          <div className="grid grid-cols-2 gap-2">
            {(['FlipBackgroundHorizontal', 'FlipBackgroundVertical'] as const).map((flag) => {
              const active = emblem.flags.includes(flag);
              const isH = flag === 'FlipBackgroundHorizontal';
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => {
                    setEmblem((prev) => ({ ...prev, flags: toggleFlag(prev.flags, flag) }));
                  }}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {isH ? <ArrowsRightLeftIcon className="size-4" /> : <ArrowsUpDownIcon className="size-4" />}
                  {isH ? 'Flip H' : 'Flip V'}
                </button>
              );
            })}
          </div>
        </section>

        {/* Foreground */}
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Foreground</h3>

          <LayerPicker
            layers={foregrounds}
            layerType="foreground"
            value={emblem.foreground.id}
            onChange={(id) => {
              setEmblem((prev) => ({ ...prev, foreground: { ...prev.foreground, id } }));
            }}
            colors={colors}
            colorIds={emblem.foreground.colors}
            label="Layer"
          />

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

          <div className="grid grid-cols-2 gap-2">
            {(['FlipForegroundHorizontal', 'FlipForegroundVertical'] as const).map((flag) => {
              const active = emblem.flags.includes(flag);
              const isH = flag === 'FlipForegroundHorizontal';
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => {
                    setEmblem((prev) => ({ ...prev, flags: toggleFlag(prev.flags, flag) }));
                  }}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium shadow-sm transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                    active
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {isH ? <ArrowsRightLeftIcon className="size-4" /> : <ArrowsUpDownIcon className="size-4" />}
                  {isH ? 'Flip H' : 'Flip V'}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      {/* Share */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Share</h3>
        <CopyToClipboardInput label="Full URL" value={fullUrl} />
        <CopyToClipboardInput label="Short link" value={shortUrl} />
        <CopyToClipboardInput label="Emblem image" value={emblemSrc} />
      </section>
    </DesignerInit>
  );
}
