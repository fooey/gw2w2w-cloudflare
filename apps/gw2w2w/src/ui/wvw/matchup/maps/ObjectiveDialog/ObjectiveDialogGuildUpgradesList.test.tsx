// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { GuildUpgrade } from '@repo/service-api/types';
import { ObjectiveDialogGuildUpgradesList } from './ObjectiveDialogGuildUpgradesList';

afterEach(cleanup);

function makeUpgrade(overrides: Partial<GuildUpgrade> = {}): GuildUpgrade {
  return {
    id: 1,
    name: 'Guild Bank Bag Slot',
    description: 'Unlocks an additional guild bank tab.',
    icon: 'https://render.guildwars2.com/icon.png',
    type: 'BankBag',
    ...overrides,
  };
}

describe('ObjectiveDialogGuildUpgradesList', () => {
  it('renders one row per guild upgrade with its name and description', () => {
    const guildUpgrades = [
      makeUpgrade({ id: 1, name: 'Upgrade A', description: 'Description A' }),
      makeUpgrade({ id: 2, name: 'Upgrade B', description: 'Description B' }),
    ];

    render(<ObjectiveDialogGuildUpgradesList guildUpgrades={guildUpgrades} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Upgrade A')).toBeDefined();
    expect(screen.getByText('Description A')).toBeDefined();
    expect(screen.getByText('Upgrade B')).toBeDefined();
    expect(screen.getByText('Description B')).toBeDefined();
  });

  it('renders the section heading', () => {
    render(<ObjectiveDialogGuildUpgradesList guildUpgrades={[makeUpgrade()]} />);

    expect(screen.getByRole('heading', { name: 'Guild Upgrades' })).toBeDefined();
  });

  it('renders no rows when guildUpgrades is empty', () => {
    render(<ObjectiveDialogGuildUpgradesList guildUpgrades={[]} />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
