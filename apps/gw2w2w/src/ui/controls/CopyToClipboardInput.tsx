'use client';

import { tryWriteClipboardText } from '#ui/controls/clipboard';
import { isPresent } from '@repo/utils';
import { useState } from 'react';

interface CopyToClipboardInputProps {
  label?: string;
  value: string;
}

export function CopyToClipboardInput({ label, value }: CopyToClipboardInputProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const copiedOk = await tryWriteClipboardText(value, navigator.clipboard);
    if (!copiedOk) return;

    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  function onCopyClick() {
    void handleCopy();
  }

  return (
    <div className="flex flex-col gap-1">
      {isPresent(label) && <span className="text-xs text-gray-500">{label}</span>}
      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={value}
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          onFocus={(e) => {
            e.target.select();
          }}
        />
        <button
          type="button"
          onClick={onCopyClick}
          className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
