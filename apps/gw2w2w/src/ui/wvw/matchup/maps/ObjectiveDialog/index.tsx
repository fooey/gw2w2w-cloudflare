'use client';

import { getEmblemSrc } from '#lib/emblems';
import { useClockStore } from '#lib/store/useClock';
import { cn } from '#lib/utils/cn';
import { useWvwObjective } from '#lib/wvw/objectives';
import { useWvwUpgrades } from '#lib/wvw/upgrades';
import { useGuild } from '#lib/wvw/useGuild';
import { useGuildUpgrades } from '#lib/wvw/useGuildUpgrades';
import { tryWriteClipboardText } from '#ui/controls/clipboard';
import { ObjectiveIcon } from '#ui/wvw/common/ObjectiveIcon';
import { getMapLabelFull } from '#ui/wvw/config/mapLabels';
import { getDirectionLabel, type Direction } from '#ui/wvw/config/objectivesLayoutConfig';
import { teamColorConfig, type TeamColorConfigKey } from '#ui/wvw/config/teamColorConfig';
import { ClipboardIcon, XMarkIcon } from '@heroicons/react/20/solid';
import type { WvWMapType, WvWMatchObjective } from '@repo/service-api/types';
import { type MouseEvent, useEffect, useRef } from 'react';
import { formatLocalized, formatRelative, getEtaDisplay } from './utils';

const TIER_ROMAN: Record<number, string> = { 1: 'I', 2: 'II', 3: 'III' };

const TIER_CLASS: Record<number, string> = {
  1: 'bg-amber-800 text-amber-100',
  2: 'bg-slate-400 text-slate-900',
  3: 'bg-yellow-400 text-yellow-900',
};

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
    matchObjective.owner !== 'Neutral'
      ? teamColorConfig[matchObjective.owner as TeamColorConfigKey]
      : teamColorConfig.Neutral;

  const guild = guildQuery.data;
  const isClaimed = !!matchObjective.claimed_by;

  function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  async function copyChatLink() {
    if (!objectiveDef?.chat_link) {
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
      {/* Header */}
      <div className={cn('flex shrink-0 items-center gap-3 p-4', ownerConfig.bg)}>
        {isClaimed && matchObjective.claimed_by && (
          <img
            src={getEmblemSrc(matchObjective.claimed_by)}
            alt={guild?.name ?? 'Guild Emblem'}
            width={64}
            height={64}
            className="shrink-0 rounded"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className={cn('text-lg leading-tight font-semibold', ownerConfig.text)}>
            {objectiveDef?.name ?? matchObjective.id}
          </p>
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
          onClick={onClose}
          aria-label="Close dialog"
          className={cn('shrink-0 cursor-pointer rounded p-1 hover:bg-black/10', ownerConfig.text)}
        >
          <XMarkIcon className="size-5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto p-4">
        {/* Objective icon + location */}
        <div className="mb-4 flex items-center gap-3">
          <ObjectiveIcon type={matchObjective.type} owner={matchObjective.owner} size={32} />
          <p className="text-sm text-gray-500">
            {direction !== 'C' ? `${getDirectionLabel(direction)} ` : ''}
            {matchObjective.type} - {getMapLabelFull(mapType)}
          </p>
        </div>

        {/* Capture / claim times */}
        {(matchObjective.last_flipped ?? matchObjective.claimed_at) && (
          <div className="mb-4 flex flex-col gap-1 text-sm">
            {matchObjective.last_flipped && (
              <div className="flex justify-between">
                <span className="text-gray-400">Captured</span>
                <span className="text-gray-600">
                  {now && (
                    <>
                      {formatRelative(matchObjective.last_flipped, now)}
                      {' · '}
                    </>
                  )}
                  {formatLocalized(matchObjective.last_flipped)}
                </span>
              </div>
            )}
            {matchObjective.claimed_at && (
              <div className="flex justify-between">
                <span className="text-gray-400">Claimed</span>
                <span className="text-gray-600">
                  {now && (
                    <>
                      {formatRelative(matchObjective.claimed_at, now)}
                      {' · '}
                    </>
                  )}
                  {formatLocalized(matchObjective.claimed_at)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tier + yak progress */}
        {upgrade && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              {currentTier > 0 ? (
                <span className={cn('rounded px-2 py-0.5 text-sm font-semibold', TIER_CLASS[currentTier])}>
                  Tier {TIER_ROMAN[currentTier]}: {upgrade.tiers[currentTier - 1]?.name}
                </span>
              ) : (
                <span className="rounded bg-gray-100 px-2 py-0.5 text-sm text-gray-500">No upgrades yet</span>
              )}
              {!isFullyUpgraded && <span className="text-sm text-gray-500">{yaksDelivered} yaks delivered</span>}
            </div>

            {isFullyUpgraded ? (
              <p className="text-sm font-medium text-green-700">Fully upgraded</p>
            ) : (
              <div className="flex flex-col gap-3">
                {remainingTiers.map((tier, i) => {
                  const tierIndex = currentTier + i;
                  const eta = getEtaDisplay(tier.yaks_required, yaksDelivered, matchObjective.last_flipped, now);
                  return (
                    <div key={tier.name}>
                      <div className="mb-1 flex justify-between text-xs text-gray-400">
                        <span>
                          Tier {TIER_ROMAN[tierIndex + 1]}: {tier.name}
                        </span>
                        <span>
                          {yaksDelivered} / {tier.yaks_required}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-green-500"
                          style={{
                            width: `${Math.min(100, (yaksDelivered / tier.yaks_required) * 100).toFixed(1)}%`,
                          }}
                        />
                      </div>
                      {eta && <p className="mt-1 text-right text-xs text-gray-400">ETA {eta}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Guild Upgrades */}
        {guildUpgrades && guildUpgrades.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-gray-400 uppercase">Guild Upgrades</h3>
            <ul className="flex flex-col gap-2">
              {guildUpgrades.map((gu) => (
                <li key={gu.id} className="flex items-start gap-2">
                  <img src={gu.icon} alt={gu.name} width={24} height={24} className="mt-0.5 shrink-0 rounded" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800">{gu.name}</p>
                    <p className="text-xs text-gray-500">{gu.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Active upgrades grouped by tier */}
        {currentTier > 0 && upgrade && (
          <div className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold tracking-wide text-gray-400 uppercase">Active Upgrades</h3>
            {upgrade.tiers.slice(0, currentTier).map((tier, i) => (
              <div key={tier.name}>
                <p className="mb-2 text-xs font-semibold text-gray-500">
                  Tier {TIER_ROMAN[i + 1]}: {tier.name}
                </p>
                <ul className="flex flex-col gap-2">
                  {tier.upgrades.map((effect) => (
                    <li key={effect.name} className="flex items-start gap-2">
                      <img
                        src={effect.icon}
                        alt={effect.name}
                        width={24}
                        height={24}
                        className="mt-0.5 shrink-0 rounded"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{effect.name}</p>
                        <p className="text-xs text-gray-500">{effect.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Points + chat link */}
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-3">
          <div className="flex gap-4 text-xs text-gray-400">
            <span>{matchObjective.points_tick} pts/tick</span>
            <span>{matchObjective.points_capture} pts/capture</span>
          </div>
          {objectiveDef?.chat_link && (
            <button
              className="flex cursor-pointer items-center gap-1 rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500 hover:bg-gray-200"
              title="Copy chat link"
              onClick={onCopyChatLink}
            >
              <ClipboardIcon className="size-3" />
              {objectiveDef.chat_link}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
