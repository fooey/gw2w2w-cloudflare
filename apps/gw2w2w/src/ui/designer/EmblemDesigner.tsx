'use client';

import { ArrowsRightLeftIcon, ArrowsUpDownIcon } from '@heroicons/react/20/solid';
import { getCustomEmblemSrc } from '#lib/emblems';
import { emblemBackgroundClasses } from '#lib/definitions/emblem-backgrounds';
import { type Color, type Emblem } from '@repo/service-api/types';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CopyToClipboardInput } from '../controls/CopyToClipboardInput';
import { ColorPicker } from './ColorPicker';
import { DesignerInit } from './DesignerInit';
import { LayerPicker } from './LayerPicker';
import { EmblemPreview } from './EmblemPreview';
import { decodeShortlink, encodeShortlink } from './shortlink';
import { type EmblemFlag, type EmblemState } from './types';

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

const defaultState: EmblemState = {
  background: { id: 2, colors: [473] },
  foreground: { id: 40, colors: [673, 71] },
  flags: ['FlipBackgroundHorizontal', 'FlipBackgroundVertical'],
};

function stateFromParams(params: URLSearchParams): EmblemState {
  const s = params.get('s');
  if (s) return decodeShortlink(s) ?? defaultState;

  if (params.size === 0) return defaultState;

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

function toggleFlag(flags: EmblemFlag[], flag: EmblemFlag): EmblemFlag[] {
  return flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag];
}

export function EmblemDesigner({ colors, backgrounds, foregrounds }: EmblemDesignerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Capture mount-time values in refs so the one-shot effect has no missing deps
  const mountPathnameRef = useRef(pathname);
  const mountSearchParamsSizeRef = useRef(searchParams.size);

  const [emblem, setEmblem] = useState<EmblemState>(() => stateFromParams(searchParams));

  // Clear URL params after reading initial state once on mount
  useEffect(() => {
    if (mountSearchParamsSizeRef.current > 0) {
      router.replace(mountPathnameRef.current, { scroll: false });
    }
  }, [router]);

  const shortUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${pathname}?s=${encodeShortlink(emblem)}` : '';
  const fullUrl = (() => {
    if (typeof window === 'undefined') return '';
    const params = new URLSearchParams();
    if (emblem.background.id != null) params.set(P.BG, String(emblem.background.id));
    if (emblem.background.colors[0] != null) params.set(P.BGC, String(emblem.background.colors[0]));
    if (emblem.foreground.id != null) params.set(P.FG, String(emblem.foreground.id));
    if (emblem.foreground.colors[0] != null) params.set(P.FGC1, String(emblem.foreground.colors[0]));
    if (emblem.foreground.colors[1] != null) params.set(P.FGC2, String(emblem.foreground.colors[1]));
    for (const flag of emblem.flags) params.set(FLAG_PARAM[flag], '');
    const qs = params.toString();
    return `${window.location.origin}${pathname}${qs ? `?${qs}` : ''}`;
  })();
  const emblemSrc = getCustomEmblemSrc(emblem);

  const isEmpty = emblem.background.id == null && emblem.foreground.id == null;
  const previewEmblem = isEmpty ? defaultState : emblem;

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
                emblem={previewEmblem}
                colors={colors}
                backgrounds={backgrounds}
                foregrounds={foregrounds}
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

      {/* Share Image */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Share Image</h3>
        <CopyToClipboardInput label="Emblem image URL" value={emblemSrc} />
      </section>

      {/* Share Design */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold tracking-wide text-gray-500 uppercase">Share Design</h3>
        <CopyToClipboardInput label="Short link" value={shortUrl} />
        <CopyToClipboardInput label="Full URL" value={fullUrl} />
      </section>
    </DesignerInit>
  );
}
