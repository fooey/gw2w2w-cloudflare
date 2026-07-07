'use client';

import { clsx } from 'clsx';
import { useEffect, useRef } from 'react';

import { DEFAULT_EMBLEM_SIZE, EMBLEM_SIZES } from '@repo/emblem-renderer/sizes';

import { getEmblemSrc } from '#lib/emblems';
import { useUserPrefs } from '#lib/store/userPrefs';
import { Card } from '#ui/Card';
import { CopyToClipboardInput } from '#ui/controls/CopyToClipboardInput';

interface GuildEmblemUsageProps {
  guildId: string;
  guildName: string;
}

export function GuildEmblemUsage({ guildId, guildName }: GuildEmblemUsageProps) {
  const size = useUserPrefs((s) => s.emblemSize);
  const setEmblemSize = useUserPrefs((s) => s.setEmblemSize);
  const sectionRef = useRef<HTMLDivElement>(null);
  const userClickedRef = useRef(false);

  useEffect(() => {
    if (!userClickedRef.current) return;
    userClickedRef.current = false;
    sectionRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, [size]);

  return (
    <div ref={sectionRef}>
      <Card title="How to Use Guild Emblems">
        <p>
          Your guild emblem is hosted on our servers and can be used anywhere that accepts image URLs — forum
          signatures, Discord, social media profiles, and more.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Size:</span>
          <div className="flex flex-wrap gap-1.5">
            {EMBLEM_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  userClickedRef.current = true;
                  setEmblemSize(s);
                }}
                className={clsx(
                  'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                  size === s ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {s}px
              </button>
            ))}
          </div>
          {size !== DEFAULT_EMBLEM_SIZE && (
            <p className="w-full rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <strong>Note:</strong> 128px is the native resolution and will look the sharpest. If you just need a
              larger display size, request 128px and let the browser scale it with CSS — only choose a larger size if
              you specifically need more pixels (e.g. for a forum that ignores width/height attributes).
            </p>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">Direct Image Link</h3>
            <p className="mb-2 text-sm text-gray-500">Use this URL anywhere that accepts a direct link to an image.</p>
            <CopyToClipboardInput label="By Guild ID" value={getEmblemSrc(guildId, size)} />
            <CopyToClipboardInput label="By Guild Name" value={getEmblemSrc(guildName, size)} />
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">HTML</h3>
            <p className="mb-2 text-sm text-gray-500">Paste this into any website or blog that allows custom HTML.</p>
            <CopyToClipboardInput
              label="By Guild ID"
              value={`<img src="${getEmblemSrc(guildId, size)}" width="${size}" height="${size}" />`}
            />
            <CopyToClipboardInput
              label="By Guild Name"
              value={`<img src="${getEmblemSrc(guildName, size)}" width="${size}" height="${size}" />`}
            />
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold text-gray-700">BBCode</h3>
            <p className="mb-2 text-sm text-gray-500">
              Use this in forums that support BBCode, such as Reddit or older game forums.
            </p>
            <CopyToClipboardInput label="By Guild ID" value={`[img]${getEmblemSrc(guildId, size)}[/img]`} />
            <CopyToClipboardInput label="By Guild Name" value={`[img]${getEmblemSrc(guildName, size)}[/img]`} />
          </section>
        </div>
      </Card>
    </div>
  );
}
