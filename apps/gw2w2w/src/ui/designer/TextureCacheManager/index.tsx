'use client';

import { useRef, useState } from 'react';

import type { Emblem } from '@repo/service-api/types';

import { clearTextureCache, clearTextureCacheMark, isTextureCacheMarked, prefetchAllTextures } from './textureCache';

type CacheState = 'needed' | 'downloading' | 'ready';

interface TextureCacheManagerProps {
  backgrounds: Emblem[];
  foregrounds: Emblem[];
  children: React.ReactNode;
}

export function TextureCacheManager({ backgrounds, foregrounds, children }: TextureCacheManagerProps) {
  const [cacheState, setCacheState] = useState<CacheState>(() => (isTextureCacheMarked() ? 'ready' : 'needed'));
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const downloadingRef = useRef(false);

  async function handleDownload() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setCacheState('downloading');
    setProgress({ completed: 0, total: 0 });

    const { failedUrls } = await prefetchAllTextures(backgrounds, foregrounds, setProgress);
    downloadingRef.current = false;

    if (failedUrls.length === 0) {
      setCacheState('ready');
    } else {
      clearTextureCacheMark();
      setCacheState('needed');
    }
  }

  function handleRedownload() {
    clearTextureCacheMark();
    setCacheState('needed');
  }

  async function handleClearCache() {
    await clearTextureCache();
    setCacheState('needed');
  }

  if (cacheState === 'needed' || cacheState === 'downloading') {
    const isDownloading = cacheState === 'downloading';
    const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-8 py-16 text-center">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-gray-800">Texture assets required</h3>
          <p className="text-sm text-gray-500">
            The designer needs to download ~650 emblem textures (~30 MB) to your browser cache before you can use it.
            This only happens once.
          </p>
        </div>

        {isDownloading ? (
          <div className="flex w-full max-w-xs flex-col gap-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-600 transition-all duration-150"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              {progress.completed} / {progress.total} textures
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              void handleDownload();
            }}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
          >
            Download textures
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {children}

      <section className="flex items-center gap-3 border-t border-gray-100 pt-2">
        <span className="text-xs text-gray-400">Textures cached locally.</span>
        <button
          type="button"
          onClick={handleRedownload}
          className="text-xs text-indigo-500 underline hover:text-indigo-700"
        >
          Re-download / verify
        </button>
        <button
          type="button"
          onClick={() => {
            void handleClearCache();
          }}
          className="text-xs text-red-400 underline hover:text-red-600"
        >
          Clear cache
        </button>
      </section>
    </div>
  );
}
