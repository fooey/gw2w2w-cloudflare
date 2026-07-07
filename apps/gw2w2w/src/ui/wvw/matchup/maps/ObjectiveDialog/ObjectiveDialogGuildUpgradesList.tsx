import type { GuildUpgrade } from '@repo/service-api/types';

interface ObjectiveDialogGuildUpgradesListProps {
  guildUpgrades: GuildUpgrade[];
}

export function ObjectiveDialogGuildUpgradesList({ guildUpgrades }: ObjectiveDialogGuildUpgradesListProps) {
  return (
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
  );
}
