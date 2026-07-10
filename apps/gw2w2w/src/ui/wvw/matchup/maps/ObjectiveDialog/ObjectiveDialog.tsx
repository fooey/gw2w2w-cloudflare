'use client';

import type { MouseEvent } from 'react';
import { useEffect, useRef } from 'react';

import type { WvWMapType, WvWMatchObjective } from '@repo/service-api/types';
import { isNil, isNonEmptyArray, isPresent } from '@repo/utils';

import type { Direction } from '#ui/wvw/config/objectivesLayoutConfig';
import type { TeamColorConfigKey } from '#ui/wvw/config/teamColorConfig';
import { useClockStore } from '#lib/store/useClock';
import { cn } from '#lib/utils/cn';
import { useWvwObjective } from '#lib/wvw/objectives';
import { useWvwUpgrades } from '#lib/wvw/upgrades';
import { useGuild } from '#lib/wvw/useGuild';
import { useGuildUpgrades } from '#lib/wvw/useGuildUpgrades';
import { tryWriteClipboardText } from '#ui/controls/clipboard';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { getMapLabelFull } from '#ui/wvw/config/mapLabels';
import { getDirectionLabel } from '#ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig } from '#ui/wvw/config/teamColorConfig';

import { ObjectiveDialogActiveUpgradesList } from './ObjectiveDialogActiveUpgradesList';
import { ObjectiveDialogCaptureClaimTimes } from './ObjectiveDialogCaptureClaimTimes';
import { ObjectiveDialogGuildUpgradesList } from './ObjectiveDialogGuildUpgradesList';
import { ObjectiveDialogHeader } from './ObjectiveDialogHeader';
import { ObjectiveDialogPointsAndChatLink } from './ObjectiveDialogPointsAndChatLink';
import { ObjectiveDialogTierProgress } from './ObjectiveDialogTierProgress';

interface ObjectiveDialogProps {
  matchObjective: WvWMatchObjective;
  mapType: WvWMapType;
  direction: Direction;
  onClose: () => void;
}

export function ObjectiveDialog({ matchObjective, mapType, direction, onClose }: ObjectiveDialogProps) {
  const { data: objectiveDef } = useWvwObjective(matchObjective.id);
  const { data: allUpgrades } = useWvwUpgrades();
  const guildQuery = useGuild(matchObjective.claimed_by ?? null);
  const { data: guildUpgrades } = useGuildUpgrades(matchObjective.guild_upgrades ?? null);
  const now = useClockStore((s) => s.nowMinute);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) {
      dialog.showModal();
    }
    dialog.addEventListener('cancel', onClose);
    // React's useEffect callback intentionally allows either no cleanup (void, as in the
    // early `if (!dialog) return;` above) or a cleanup function — not a bug.
    // eslint-disable-next-line typescript/consistent-return
    return () => {
      dialog.removeEventListener('cancel', onClose);
    };
  }, [onClose]);

  const upgrade = allUpgrades?.find((u) => u.id === objectiveDef?.upgrade_id);
  const yaksDelivered = matchObjective.yaks_delivered ?? 0;
  const currentTier = upgrade ? upgrade.tiers.filter((t) => yaksDelivered >= t.yaks_required).length : 0;
  const remainingTiers = upgrade?.tiers.slice(currentTier) ?? [];
  const isFullyUpgraded = currentTier === upgrade?.tiers.length;

  const ownerConfig =
    matchObjective.owner === 'Neutral'
      ? teamColorConfig.Neutral
      : teamColorConfig[matchObjective.owner as TeamColorConfigKey];

  const guild = guildQuery.data;
  const isClaimed = isPresent(matchObjective.claimed_by);
  const hasCaptureOrClaimData = isPresent(matchObjective.last_flipped) || isPresent(matchObjective.claimed_at);
  const hasActiveUpgrades = currentTier > 0 && isPresent(upgrade);

  function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  async function copyChatLink() {
    if (isNil(objectiveDef?.chat_link)) {
      return;
    }

    await tryWriteClipboardText(objectiveDef.chat_link, navigator.clipboard);
  }

  function onCopyChatLink() {
    void copyChatLink();
  }

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        'm-auto max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white p-0 shadow-2xl backdrop:bg-black/50 open:flex',
        'opacity-0 open:opacity-100 starting:open:opacity-0',
        'transition-opacity duration-200',
        'backdrop:opacity-0 open:backdrop:opacity-100 starting:open:backdrop:opacity-0',
        'backdrop:transition-opacity backdrop:duration-200',
        'transition-discrete',
      )}
    >
      <ObjectiveDialogHeader
        ownerConfig={ownerConfig}
        claimedBy={matchObjective.claimed_by}
        guild={guild}
        name={objectiveDef?.name ?? matchObjective.id}
        isClaimed={isClaimed}
        onClose={onClose}
      />

      {/* Scrollable body */}
      <div className="overflow-y-auto p-4">
        {/* Objective icon + location */}
        <div className="mb-4 flex items-center gap-3">
          <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={32} />
          <p className="text-sm text-gray-500">
            {direction === 'C' ? '' : `${getDirectionLabel(direction)} `}
            {matchObjective.type} - {getMapLabelFull(mapType)}
          </p>
        </div>

        {hasCaptureOrClaimData && (
          <ObjectiveDialogCaptureClaimTimes
            lastFlipped={matchObjective.last_flipped}
            claimedAt={matchObjective.claimed_at}
            now={now}
          />
        )}

        {upgrade && (
          <ObjectiveDialogTierProgress
            upgrade={upgrade}
            currentTier={currentTier}
            remainingTiers={remainingTiers}
            isFullyUpgraded={isFullyUpgraded}
            yaksDelivered={yaksDelivered}
            lastFlipped={matchObjective.last_flipped}
            now={now}
          />
        )}

        {isNonEmptyArray(guildUpgrades) && <ObjectiveDialogGuildUpgradesList guildUpgrades={guildUpgrades} />}

        {hasActiveUpgrades && <ObjectiveDialogActiveUpgradesList upgrade={upgrade} currentTier={currentTier} />}

        <ObjectiveDialogPointsAndChatLink
          objectiveDef={objectiveDef}
          pointsTick={matchObjective.points_tick}
          pointsCapture={matchObjective.points_capture}
          onCopyChatLink={onCopyChatLink}
        />
      </div>
    </dialog>
  );
}
