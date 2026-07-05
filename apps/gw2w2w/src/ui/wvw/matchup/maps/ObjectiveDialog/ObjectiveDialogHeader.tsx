import { getEmblemSrc } from '#lib/emblems';
import { cn } from '#lib/utils/cn';
import type { Guild } from '@repo/service-api/types';
import { isPresent } from '@repo/utils';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface ObjectiveDialogHeaderProps {
  ownerConfig: { bg: string; text: string };
  claimedBy: string | null | undefined;
  guild: Guild | null | undefined;
  name: string;
  isClaimed: boolean;
  onClose: () => void;
}

export function ObjectiveDialogHeader({
  ownerConfig,
  claimedBy,
  guild,
  name,
  isClaimed,
  onClose,
}: ObjectiveDialogHeaderProps) {
  return (
    <div className={cn('flex shrink-0 items-center gap-3 p-4', ownerConfig.bg)}>
      {isClaimed && isPresent(claimedBy) && (
        <img
          src={getEmblemSrc(claimedBy)}
          alt={guild?.name ?? 'Guild Emblem'}
          width={64}
          height={64}
          className="shrink-0 rounded"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn('text-lg leading-tight font-semibold', ownerConfig.text)}>{name}</p>
        {guild ? (
          <a
            href={`/guilds/${encodeURIComponent(guild.name)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn('text-sm underline-offset-2 opacity-80 hover:underline', ownerConfig.text)}
          >
            [{guild.tag}] {guild.name}
          </a>
        ) : (
          !isClaimed && <p className={cn('text-sm opacity-60', ownerConfig.text)}>Unclaimed</p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className={cn('shrink-0 cursor-pointer rounded p-1 hover:bg-black/10', ownerConfig.text)}
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );
}
