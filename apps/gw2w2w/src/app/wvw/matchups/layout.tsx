'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function MatchupsLayout({ children }: { children: React.ReactNode }) {
  // eslint-disable-next-line react/hook-use-state -- lazily-created, per-instance QueryClient; no setter needed.
  const [queryClient] = useState(() => new QueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
