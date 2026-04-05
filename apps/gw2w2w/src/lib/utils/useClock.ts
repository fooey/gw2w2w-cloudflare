'use client';

import { useEffect, useState } from 'react';

export function useClock(): Temporal.Instant | null {
  const [now, setNow] = useState<Temporal.Instant | null>(null);
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Temporal.Now.instant());
    }, 1_000);
    return () => {
      clearInterval(id);
    };
  }, []);
  return now;
}
