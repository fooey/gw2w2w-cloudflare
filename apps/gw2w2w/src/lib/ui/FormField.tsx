'use client';

import { CheckIcon, ClipboardDocumentIcon } from '@heroicons/react/20/solid';
import { snakeCase } from 'lodash-es';
import { useState } from 'react';

export function FormField({ label, name, value }: { label: string; name?: string; value: string }) {
  name = name || snakeCase(label);
  const [copied, setCopied] = useState(false);

  function copyValueToClipboard() {
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 2000);
      })
      .catch((err: unknown) => {
        console.error('Failed to copy to clipboard:', err);
        alert('Clipboard access not available');
      });
  }

  return (
    <div>
      <label htmlFor={name} className="block text-sm/6 font-medium text-gray-900">
        {label}
      </label>
      <div className="mt-2 grid grid-cols-1">
        <input
          id={name}
          name={name}
          type="text"
          placeholder="000-00-0000"
          className="col-start-1 row-start-1 block w-full rounded-md bg-white py-1.5 pr-10 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:pr-9 sm:text-sm/6"
          value={value}
          readOnly
        />
        {copied ? (
          <CheckIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-green-500 sm:size-4"
          />
        ) : (
          <ClipboardDocumentIcon
            onClick={copyValueToClipboard}
            aria-hidden="true"
            className="col-start-1 row-start-1 mr-3 size-5 cursor-pointer self-center justify-self-end text-gray-400 hover:text-gray-600 sm:size-4"
          />
        )}
      </div>
    </div>
  );
}
