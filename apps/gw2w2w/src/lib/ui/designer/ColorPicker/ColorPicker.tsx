'use client';

import { ChevronDownIcon, XMarkIcon } from '@heroicons/react/20/solid';
import type { Color } from '@service-api/lib/types';
import { matchSorter } from 'match-sorter';
import { useMemo, useRef, useState } from 'react';
import { HUE_CATEGORIES, RARITY_CATEGORIES } from './filtering';
import { SORT_OPTIONS, type SortEntry, sortColors } from './sorting';

interface ColorPickerProps {
  colors: Color[];
  label?: string;
  value?: number | null;
  onChange?: (colorId: number | null) => void;
}

export function ColorPicker({ colors, label = 'Color', value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeHue, setActiveHue] = useState<string | null>(null);
  const [activeRarity, setActiveRarity] = useState<string | null>(null);
  const [sort, setSort] = useState<SortEntry | null>({ key: 'hue', dir: 'asc' });
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const committedRef = useRef<number | null | undefined>(value);

  const selected = useMemo(() => colors.find((c) => c.id === value), [colors, value]);

  const filtered = useMemo(() => {
    const searched = search ? matchSorter(colors, search, { keys: ['name'] }) : colors;
    const result = searched.filter((c) => {
      const matchesHue = !activeHue || c.categories.includes(activeHue);
      const matchesRarity = !activeRarity || c.categories.includes(activeRarity);
      return matchesHue && matchesRarity;
    });
    return sortColors(result, sort);
  }, [colors, search, activeHue, activeRarity, sort]);

  function handleSelect(colorId: number) {
    committedRef.current = colorId;
    onChange?.(colorId);
    setOpen(false);
    setSearch('');
  }

  function revertAndClose() {
    onChange?.(committedRef.current ?? null);
    setOpen(false);
    setSearch('');
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!containerRef.current?.contains(e.relatedTarget)) {
      revertAndClose();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      revertAndClose();
    }
  }

  return (
    <div ref={containerRef} className="relative inline-block" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <div className="mb-1 text-sm font-medium text-gray-700">{label}</div>

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          committedRef.current = value;
          const rect = triggerRef.current?.getBoundingClientRect();
          if (rect) {
            setOpenUpward(rect.bottom > window.innerHeight / 2);
          }
          setOpen((v) => !v);
        }}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      >
        {selected ? (
          <>
            <span
              className="inline-block size-4 rounded-sm border border-gray-200 shadow-sm"
              style={{ backgroundColor: `rgb(${selected.cloth.rgb.join(',')})` }}
            />
            <span className="text-gray-800">{selected.name}</span>
          </>
        ) : (
          <span className="text-gray-400">Pick a color…</span>
        )}
        <ChevronDownIcon className="ml-1 size-4 text-gray-400" />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={`absolute z-20 w-lg rounded-lg border border-gray-200 bg-white p-3 shadow-lg ${
            openUpward ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {/* Search */}
          <div className="relative mb-2">
            <input
              type="search"
              autoFocus
              placeholder="Search colors…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              className="w-full rounded-md border border-gray-300 py-1.5 pr-7 pl-3 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                }}
                className="absolute inset-y-0 right-1 flex items-center px-1 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Hue filter */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-gray-500">Hue:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  setActiveHue(null);
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${!activeHue ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                All
              </button>
              {HUE_CATEGORIES.map((hue) => (
                <button
                  key={hue}
                  onClick={() => {
                    setActiveHue(activeHue === hue ? null : hue);
                  }}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${activeHue === hue ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {hue}
                </button>
              ))}
            </div>
          </div>

          {/* Rarity filter */}
          <div className="mb-1 flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-gray-500">Rarity:</span>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => {
                  setActiveRarity(null);
                }}
                className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${!activeRarity ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Any
              </button>
              {RARITY_CATEGORIES.map((rarity) => (
                <button
                  key={rarity}
                  onClick={() => {
                    setActiveRarity(activeRarity === rarity ? null : rarity);
                  }}
                  className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${activeRarity === rarity ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {rarity}
                </button>
              ))}{' '}
            </div>{' '}
          </div>

          {/* Sort */}
          <div className="mb-2 flex items-center gap-2">
            <span className="w-10 shrink-0 text-xs text-gray-500">Sort:</span>
            <div className="flex flex-wrap gap-1">
              {SORT_OPTIONS.map(({ key, label }) => {
                const active = sort?.key === key ? sort : null;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSort((prev) => {
                        if (prev?.key !== key) return { key, dir: 'asc' };
                        if (prev.dir === 'asc') return { key, dir: 'desc' };
                        return null;
                      });
                    }}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                      active ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label}
                    {active ? (active.dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Swatch grid */}
          <div
            className="grid max-h-52 grid-cols-[repeat(auto-fill,minmax(1.5rem,1fr))] gap-1 overflow-y-auto pr-0.5"
            onMouseLeave={() => {
              onChange?.(committedRef.current ?? null);
            }}
          >
            {filtered.map((color) => {
              const isSelected = color.id === value;
              return (
                <button
                  key={color.id}
                  title={color.name}
                  type="button"
                  onMouseEnter={() => {
                    onChange?.(color.id);
                  }}
                  onClick={() => {
                    handleSelect(color.id);
                  }}
                  className={`size-6 rounded-sm border transition-transform hover:z-10 hover:scale-125 focus:outline-none ${
                    isSelected
                      ? 'border-indigo-500 ring-2 ring-indigo-500 ring-offset-1'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ backgroundColor: `rgb(${color.cloth.rgb.join(',')})` }}
                />
              );
            })}
          </div>

          <p className="mt-2 text-right text-xs text-gray-400">{filtered.length} colors</p>
        </div>
      )}
    </div>
  );
}
