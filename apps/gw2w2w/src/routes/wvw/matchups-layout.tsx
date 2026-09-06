import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Outlet } from 'react-router';

export default function MatchupsLayout() {
  // eslint-disable-next-line react/hook-use-state -- lazily-created, per-instance QueryClient; no setter needed.
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
