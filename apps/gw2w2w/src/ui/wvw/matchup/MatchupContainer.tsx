'use client';

import { MatchupView, type MatchupViewProps } from '#ui/wvw/matchup/MatchupView';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export type { MatchupViewProps };

export function MatchupContainer({ match, selectedTeamId }: MatchupViewProps) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MatchupView match={match} selectedTeamId={selectedTeamId} />
    </QueryClientProvider>
  );
}
