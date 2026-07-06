// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { WvWUpgrade } from '@repo/service-api/types';

import { ObjectiveDialogActiveUpgradesList } from './ObjectiveDialogActiveUpgradesList';

afterEach(cleanup);

const upgrade: WvWUpgrade = {
  id: 1,
  tiers: [
    {
      name: 'Secured',
      yaks_required: 20,
      upgrades: [{ name: 'Arrow Cart', description: 'Unlocks arrow carts.', icon: 'https://example.com/1.png' }],
    },
    {
      name: 'Reinforced',
      yaks_required: 50,
      upgrades: [{ name: 'Cannon', description: 'Unlocks a cannon.', icon: 'https://example.com/2.png' }],
    },
    {
      name: 'Fortified',
      yaks_required: 100,
      upgrades: [{ name: 'Treb', description: 'Unlocks a trebuchet.', icon: 'https://example.com/3.png' }],
    },
  ],
};

describe('ObjectiveDialogActiveUpgradesList', () => {
  it('renders only the tiers reached so far, in order', () => {
    render(<ObjectiveDialogActiveUpgradesList upgrade={upgrade} currentTier={2} />);

    expect(screen.getByText('Tier I: Secured')).toBeDefined();
    expect(screen.getByText('Tier II: Reinforced')).toBeDefined();
    expect(screen.queryByText(/Fortified/u)).toBeNull();
  });

  it("renders each reached tier's upgrade effects", () => {
    render(<ObjectiveDialogActiveUpgradesList upgrade={upgrade} currentTier={1} />);

    expect(screen.getByText('Arrow Cart')).toBeDefined();
    expect(screen.getByText('Unlocks arrow carts.')).toBeDefined();
    expect(screen.queryByText('Cannon')).toBeNull();
  });

  it('renders every upgrade effect within a tier that has more than one', () => {
    const multiEffectUpgrade: WvWUpgrade = {
      id: 2,
      tiers: [
        {
          name: 'Secured',
          yaks_required: 20,
          upgrades: [
            { name: 'Arrow Cart', description: 'Unlocks arrow carts.', icon: 'https://example.com/1.png' },
            { name: 'Guard Waypoint', description: 'Unlocks a guard waypoint.', icon: 'https://example.com/4.png' },
          ],
        },
      ],
    };

    render(<ObjectiveDialogActiveUpgradesList upgrade={multiEffectUpgrade} currentTier={1} />);

    expect(screen.getByText('Arrow Cart')).toBeDefined();
    expect(screen.getByText('Unlocks arrow carts.')).toBeDefined();
    expect(screen.getByText('Guard Waypoint')).toBeDefined();
    expect(screen.getByText('Unlocks a guard waypoint.')).toBeDefined();
  });

  it('renders a reached tier with no upgrade effects as an empty list', () => {
    const noEffectUpgrade: WvWUpgrade = {
      id: 3,
      tiers: [{ name: 'Secured', yaks_required: 20, upgrades: [] }],
    };

    render(<ObjectiveDialogActiveUpgradesList upgrade={noEffectUpgrade} currentTier={1} />);

    expect(screen.getByText('Tier I: Secured')).toBeDefined();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('renders only the heading when currentTier is 0', () => {
    render(<ObjectiveDialogActiveUpgradesList upgrade={upgrade} currentTier={0} />);

    expect(screen.getByRole('heading', { name: 'Active Upgrades' })).toBeDefined();
    expect(screen.queryByText(/Secured|Reinforced|Fortified/u)).toBeNull();
  });
});
