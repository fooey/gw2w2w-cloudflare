'use client';

import { useEffect, useRef, useState } from 'react';

const CURRENT_BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function UpdateNotifier() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json<{ buildId: string }>();
        if (buildId !== 'dev' && buildId !== CURRENT_BUILD_ID) {
          setUpdateAvailable(true);
        }
      } catch {
        // ignore transient network errors
      }
    }

    intervalRef.current = setInterval(() => {
      void check();
    }, POLL_INTERVAL_MS);

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void check();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-lg bg-zinc-900 px-4 py-3 text-white shadow-lg">
      <span className="text-sm">A new version is available.</span>
      <button
        onClick={() => {
          window.location.reload();
        }}
        className="rounded bg-white px-3 py-1 text-xs font-semibold text-zinc-900 hover:bg-zinc-200"
      >
        Reload
      </button>
    </div>
  );
}
