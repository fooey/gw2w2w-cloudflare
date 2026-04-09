'use client';

import {
  ArrowUturnLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/20/solid';
import { type Color, type Emblem } from '@repo/service-api/lib/types';
import { useEffect, useRef, useState } from 'react';
import { EmblemPreview } from '../EmblemPreview';
import { type EmblemState } from '../types';

interface LayerPickerProps {
  layers: Emblem[];
  layerType: 'background' | 'foreground';
  value: number | null;
  onChange: (id: number | null) => void;
  colors: Color[];
  colorIds: readonly (number | null)[];
  label?: string;
}

const MAX_VISIBLE = 512;

interface LayerThumbProps {
  thumbEmblem: EmblemState;
  layer: Emblem;
  isSelected: boolean;
  colors: Color[];
  backgrounds: Emblem[];
  foregrounds: Emblem[];
  onMouseEnter: () => void;
  onClick: () => void;
}

function LayerThumb({
  thumbEmblem,
  layer,
  isSelected,
  colors,
  backgrounds,
  foregrounds,
  onMouseEnter,
  onClick,
}: LayerThumbProps) {
  return (
    <button
      type="button"
      title={`#${layer.id}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 rounded-lg border-2 px-0.5 pt-0.5 transition-transform hover:scale-105 focus:outline-none ${
        isSelected
          ? 'border-indigo-500 ring-1 ring-indigo-400 ring-offset-1'
          : 'border-transparent hover:border-gray-300'
      }`}
    >
      <EmblemPreview
        emblem={thumbEmblem}
        colors={colors}
        backgrounds={backgrounds}
        foregrounds={foregrounds}
        size={48}
      />
      <span className="pb-0.5 text-[10px] text-gray-400">#{layer.id}</span>
    </button>
  );
}

function makeEmblemState(
  layerType: 'background' | 'foreground',
  layerId: number | null,
  colorIds: readonly (number | null)[],
): EmblemState {
  if (layerType === 'background') {
    return {
      background: { id: layerId, colors: [colorIds[0] ?? null] as [number | null] },
      foreground: { id: null, colors: [null, null] },
      flags: [],
    };
  }
  return {
    background: { id: null, colors: [null] },
    foreground: {
      id: layerId,
      colors: [colorIds[0] ?? null, colorIds[1] ?? null] as [number | null, number | null],
    },
    flags: [],
  };
}

export function LayerPicker({
  layers,
  layerType,
  value,
  onChange,
  colors,
  colorIds,
  label = 'Layer',
}: LayerPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const committedRef = useRef<number | null | undefined>(value);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', open);
    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [open]);

  const filtered = (() => {
    const s = search.trim();
    const result = s ? layers.filter((l) => String(l.id).includes(s)) : layers;
    return result.slice(0, MAX_VISIBLE);
  })();

  const triggerEmblem = makeEmblemState(layerType, value, colorIds);

  const backgrounds = layerType === 'background' ? layers : ([] as Emblem[]);
  const foregrounds = layerType === 'foreground' ? layers : ([] as Emblem[]);

  function handleSelect(id: number) {
    committedRef.current = id;
    onChange(id);
    setOpen(false);
    setSearch('');
  }

  function revertAndClose() {
    onChange(committedRef.current ?? null);
    setOpen(false);
    setSearch('');
  }

  function applyAndClose() {
    committedRef.current = value;
    setOpen(false);
    setSearch('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') revertAndClose();
    if (e.key === 'Enter') applyAndClose();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'ArrowRight') handleNext();
  }

  function handlePrev() {
    const idx = layers.findIndex((l) => l.id === value);
    const newIdx = idx <= 0 ? layers.length - 1 : idx - 1;
    const layer = layers[newIdx];
    if (layer) onChange(layer.id);
  }

  function handleNext() {
    const idx = layers.findIndex((l) => l.id === value);
    const newIdx = idx === -1 || idx >= layers.length - 1 ? 0 : idx + 1;
    const layer = layers[newIdx];
    if (layer) onChange(layer.id);
  }

  function handleUndo() {
    onChange(committedRef.current ?? null);
  }

  function handleRandom() {
    const layer = layers[Math.floor(Math.random() * layers.length)];
    if (layer) onChange(layer.id);
  }

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>

      {/* Trigger */}
      <button
        type="button"
        onClick={() => {
          committedRef.current = value;
          setOpen((v) => !v);
        }}
        className="flex w-full items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      >
        {value != null ? (
          <>
            <EmblemPreview
              emblem={triggerEmblem}
              colors={colors}
              backgrounds={backgrounds}
              foregrounds={foregrounds}
              size={64}
            />
            <span className="text-gray-700">#{value}</span>
          </>
        ) : (
          <span className="px-1 py-0.5 text-gray-400">Pick a layer…</span>
        )}
        <ChevronDownIcon className="ml-auto size-4 shrink-0 text-gray-400" />
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-20" aria-hidden="true" onClick={revertAndClose} />}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 z-30 flex w-full flex-col bg-white shadow-xl transition-transform duration-200 ease-out sm:w-1/2 ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
        onMouseLeave={() => {
          onChange(committedRef.current ?? null);
        }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-700">{label}</h2>
          <button
            type="button"
            onClick={revertAndClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 focus:outline-none"
          >
            <XMarkIcon className="size-5" />
          </button>
        </div>

        {/* Search + nav controls */}
        <div className="shrink-0 space-y-2 border-b border-gray-100 px-4 py-3">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search by ID…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
          <div className="flex gap-1">
            <button
              type="button"
              title="Previous layer"
              onClick={handlePrev}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 focus:outline-none"
            >
              <ChevronLeftIcon className="size-4" />
              Prev
            </button>
            <button
              type="button"
              title="Next layer"
              onClick={handleNext}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 focus:outline-none"
            >
              Next
              <ChevronRightIcon className="size-4" />
            </button>
            <button
              type="button"
              title="Undo — revert to opened value"
              onClick={handleUndo}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 focus:outline-none"
            >
              <ArrowUturnLeftIcon className="size-4" />
              Undo
            </button>
            <button
              type="button"
              title="Random layer"
              onClick={handleRandom}
              className="ml-auto flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 focus:outline-none"
            >
              <SparklesIcon className="size-4" />
              Random
            </button>
          </div>
        </div>

        {/* Layer grid */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(48px,1fr))] gap-2">
            {open &&
              filtered.map((layer) => {
                const isSelected = layer.id === value;
                const thumbEmblem = makeEmblemState(layerType, layer.id, colorIds);
                return (
                  <LayerThumb
                    key={layer.id}
                    layer={layer}
                    thumbEmblem={thumbEmblem}
                    isSelected={isSelected}
                    colors={colors}
                    backgrounds={backgrounds}
                    foregrounds={foregrounds}
                    onMouseEnter={() => {
                      onChange(layer.id);
                    }}
                    onClick={() => {
                      handleSelect(layer.id);
                    }}
                  />
                );
              })}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between border-t border-gray-100 px-4 py-2">
          <p className="text-xs text-gray-400">
            {filtered.length < layers.length ? `${filtered.length} of ${layers.length}` : `${layers.length} layers`}
          </p>
          <button
            type="button"
            onClick={applyAndClose}
            className="flex items-center gap-1 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus:outline-none"
          >
            <CheckIcon className="size-4" />
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
