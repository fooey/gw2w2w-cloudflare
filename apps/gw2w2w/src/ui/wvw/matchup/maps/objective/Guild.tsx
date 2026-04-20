'use client';

import { getEmblemSrc } from '#lib/emblems';
import { cn } from '#lib/utils/cn';
import { useGuild } from '#lib/wvw/useGuild';
import Link from '#ui/Link';
import { NoSymbolIcon } from '@heroicons/react/20/solid';
import { useState } from 'react';

const ICON_SIZE = 24;

export function Guild({
  claimedBy,
  className,
  linkable = false,
}: {
  claimedBy: string | undefined;
  className?: string;
  linkable?: boolean;
}) {
  const guildQuery = useGuild(claimedBy);
  const [emblemError, setEmblemError] = useState(false);

  if (!claimedBy) return <span className={cn(className)} />;

  const inner = (
    <>
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
    </>
  );

  if (linkable) {
    return (
      <Link
        href={`/guilds/${guildQuery.data?.name ? encodeURIComponent(guildQuery.data.name) : claimedBy}`}
        className={cn('flex w-full items-center justify-between gap-1', className)}
        title={`${guildQuery.data?.name ?? ''} (${guildQuery.data?.tag ?? ''})`}
      >
        {inner}
      </Link>
    );
  }

  return <span className={cn('flex w-full items-center justify-between gap-1', className)}>{inner}</span>;
}
