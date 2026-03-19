'use client';

import type { Color, Emblem } from '@service-api/lib/types';
import type { EmblemState } from '../types';

interface EmblemPreviewProps {
  emblem: EmblemState;
  colors: Color[];
  backgrounds: Emblem[];
  foregrounds: Emblem[];
}

export function EmblemPreview({ emblem, colors, backgrounds, foregrounds }: EmblemPreviewProps) {
  const selectedBg = backgrounds.find((b) => b.id === emblem.background.id);
  const selectedFg = foregrounds.find((f) => f.id === emblem.foreground.id);

  const bgColor = colors.find((c) => c.id === emblem.background.colors[0]);
  const fgColor1 = colors.find((c) => c.id === emblem.foreground.colors[0]);
  const fgColor2 = colors.find((c) => c.id === emblem.foreground.colors[1]);

  return (
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
  );
}
