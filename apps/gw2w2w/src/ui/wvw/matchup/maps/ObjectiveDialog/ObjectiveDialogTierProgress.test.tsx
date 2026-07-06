import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

// @vitest-environment happy-dom
import type { WvWUpgrade } from '@repo/service-api/types';

import { ObjectiveDialogTierProgress } from './ObjectiveDialogTierProgress';

afterEach(cleanup);

const upgrade: WvWUpgrade = {
  id: 1,
  tiers: [
    { name: 'Secured', yaks_required: 20, upgrades: [] },
    { name: 'Reinforced', yaks_required: 50, upgrades: [] },
    { name: 'Fortified', yaks_required: 100, upgrades: [] },
  ],
};

const now = Temporal.Instant.from('2026-06-22T12:00:00Z');
const oneHourAgo = '2026-06-22T11:00:00.000Z';

describe('ObjectiveDialogTierProgress', () => {
  it('shows the current tier badge, yaks-delivered count, and an ETA per remaining tier', () => {
    render(
      <ObjectiveDialogTierProgress
        upgrade={upgrade}
        currentTier={1}
        remainingTiers={upgrade.tiers.slice(1)}
        isFullyUpgraded={false}
        yaksDelivered={30}
        lastFlipped={oneHourAgo}
        now={now}
      />,
    );

    expect(screen.getByText('Tier I: Secured')).toBeDefined();
    expect(screen.getByText('30 yaks delivered')).toBeDefined();
    expect(screen.getByText('Tier II: Reinforced')).toBeDefined();
    expect(screen.getByText('30 / 50')).toBeDefined();
    expect(screen.getByText('Tier III: Fortified')).toBeDefined();
    expect(screen.getByText('30 / 100')).toBeDefined();
    expect(screen.getByText('ETA ~40m')).toBeDefined();
    expect(screen.getByText('ETA ~2h 20m')).toBeDefined();
  });

  it("shows the 'No upgrades yet' badge when currentTier is 0 and omits ETA when yaksDelivered is 0", () => {
    render(
      <ObjectiveDialogTierProgress
        upgrade={upgrade}
        currentTier={0}
        remainingTiers={upgrade.tiers}
        isFullyUpgraded={false}
        yaksDelivered={0}
        lastFlipped={oneHourAgo}
        now={now}
      />,
    );

    expect(screen.getByText('No upgrades yet')).toBeDefined();
    expect(screen.getByText('0 yaks delivered')).toBeDefined();
    expect(screen.queryByText(/ETA/u)).toBeNull();
  });

  it("shows 'Fully upgraded' and hides yaks-delivered and remaining tiers when isFullyUpgraded", () => {
    render(
      <ObjectiveDialogTierProgress
        upgrade={upgrade}
        currentTier={3}
        remainingTiers={[]}
        isFullyUpgraded={true}
        yaksDelivered={100}
        lastFlipped={oneHourAgo}
        now={now}
      />,
    );

    expect(screen.getByText('Fully upgraded')).toBeDefined();
    expect(screen.getByText('Tier III: Fortified')).toBeDefined(); // the current-tier badge itself still renders
    expect(screen.queryByText(/yaks delivered/u)).toBeNull();
    expect(screen.queryByText(/\//u)).toBeNull(); // no "x / y" progress rows
  });

  it('renders exactly one remaining-tier row when only one tier remains', () => {
    render(
      <ObjectiveDialogTierProgress
        upgrade={upgrade}
        currentTier={2}
        remainingTiers={upgrade.tiers.slice(2)}
        isFullyUpgraded={false}
        yaksDelivered={60}
        lastFlipped={oneHourAgo}
        now={now}
      />,
    );

    expect(screen.getByText('Tier II: Reinforced')).toBeDefined();
    expect(screen.getByText('60 yaks delivered')).toBeDefined();
    expect(screen.getByText('Tier III: Fortified')).toBeDefined();
    expect(screen.getByText('60 / 100')).toBeDefined();
    expect(screen.getByText('ETA ~40m')).toBeDefined();
    expect(screen.getAllByText(/^\d+ \/ \d+$/u)).toHaveLength(1);
  });

  it('omits the ETA for a remaining tier whose requirement is already met, but still shows one for a tier still in progress', () => {
    // yaksDelivered (60) already exceeds Reinforced's requirement (50) — that tier gets no ETA —
    // but is still short of Fortified's requirement (100), which does get one.
    render(
      <ObjectiveDialogTierProgress
        upgrade={upgrade}
        currentTier={1}
        remainingTiers={upgrade.tiers.slice(1)}
        isFullyUpgraded={false}
        yaksDelivered={60}
        lastFlipped={oneHourAgo}
        now={now}
      />,
    );

    const etas = screen.getAllByText(/^ETA /u);
    expect(etas).toHaveLength(1);
    expect(etas[0]?.textContent).toBe('ETA ~40m');
  });

  it('omits ETA for every remaining tier when no time has elapsed since lastFlipped', () => {
    render(
      <ObjectiveDialogTierProgress
        upgrade={upgrade}
        currentTier={1}
        remainingTiers={upgrade.tiers.slice(1)}
        isFullyUpgraded={false}
        yaksDelivered={30}
        lastFlipped={now.toString()}
        now={now}
      />,
    );

    expect(screen.getByText('Tier II: Reinforced')).toBeDefined();
    expect(screen.getByText('Tier III: Fortified')).toBeDefined();
    expect(screen.queryByText(/ETA/u)).toBeNull();
  });
});
