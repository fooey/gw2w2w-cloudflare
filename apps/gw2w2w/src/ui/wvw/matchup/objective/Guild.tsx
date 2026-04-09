'use client';

import { getEmblemSrc } from '#lib/emblems';
import { cn } from '#lib/utils/cn';
import { useGuild } from '#lib/wvw/useGuild';
import { NoSymbolIcon } from '@heroicons/react/20/solid';
import Link from 'next/link';
import { useState } from 'react';

const ICON_SIZE = 24;

export function ObjectiveGuild({ claimedBy, className }: { claimedBy: string | undefined; className?: string }) {
  const guildQuery = useGuild(claimedBy);
  const [emblemError, setEmblemError] = useState(false);

  if (!claimedBy) return <span className={cn(className)} />;

  return (
    <Link
      href={`/guilds/${guildQuery.data?.name ? encodeURIComponent(guildQuery.data.name) : claimedBy}`}
      className={cn('flex items-center justify-between', className)}
      title={`${guildQuery.data?.name} (${guildQuery.data?.tag})`}
    >
      <span className="w-6 text-[8px]">{guildQuery.data?.tag}</span>
      {emblemError ? (
        <NoSymbolIcon className="size-6 text-zinc-400 opacity-25" />
      ) : (
        <img
          src={getEmblemSrc(claimedBy)}
          alt={guildQuery.data?.name ?? 'Guild Emblem'}
          width={ICON_SIZE}
          height={ICON_SIZE}
          onError={() => {
            setEmblemError(true);
          }}
        />
      )}
    </Link>
  );
}
