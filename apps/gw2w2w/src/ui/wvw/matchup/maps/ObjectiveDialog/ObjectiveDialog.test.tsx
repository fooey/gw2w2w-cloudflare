// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Guild, GuildUpgrade, WvWMatchObjective, WvWObjective, WvWUpgrade } from '@repo/service-api/types';
import { useClockStore } from '#lib/store/useClock';
import { useWvwObjective, useWvWObjectiveIcon } from '#lib/wvw/objectives';
import { useWvwUpgrades } from '#lib/wvw/upgrades';
import { useGuild } from '#lib/wvw/useGuild';
import { useGuildUpgrades } from '#lib/wvw/useGuildUpgrades';
import { tryWriteClipboardText } from '#ui/controls/clipboard';
import { ObjectiveDialog } from './ObjectiveDialog';

// ObjectiveDialog's own job is wiring hook data into the right children under the right
// conditions — the fetch/query behavior of each hook has its own home elsewhere, so all of
// them are mocked at the module boundary here.
vi.mock('#lib/store/useClock');
vi.mock('#lib/wvw/objectives');
vi.mock('#lib/wvw/upgrades');
vi.mock('#lib/wvw/useGuild');
vi.mock('#lib/wvw/useGuildUpgrades');
vi.mock('#ui/controls/clipboard');

afterEach(cleanup);

function makeMatchObjective(overrides: Partial<WvWMatchObjective> = {}): WvWMatchObjective {
  return {
    id: '38-1',
    type: 'Camp',
    owner: 'Green',
    last_flipped: null,
    claimed_by: null,
    claimed_at: null,
    points_tick: 2,
    points_capture: 10,
    ...overrides,
  };
}

const objectiveDef: WvWObjective = {
  id: '38-1',
  name: 'Bravost Redoubt',
  sector_id: 1,
  type: 'Camp',
  map_type: 'Center',
  map_id: 38,
  upgrade_id: 7,
  chat_link: '[&BLwBAAA=]',
};

const upgrade: WvWUpgrade = {
  id: 7,
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
  ],
};

const guild: Guild = { id: 'guild-1', name: 'Example Guild', tag: 'EG' };

const guildUpgrades: GuildUpgrade[] = [
  {
    id: 1,
    name: 'Guild Bank Bag Slot',
    description: 'Unlocks an additional guild bank tab.',
    icon: 'icon.png',
    type: 'BankBag',
  },
];

const now = Temporal.Instant.from('2026-06-22T12:00:00Z');

interface HookState {
  objectiveDef?: WvWObjective;
  allUpgrades?: WvWUpgrade[];
  guild?: Guild | null;
  guildUpgrades?: GuildUpgrade[] | null;
  now?: Temporal.Instant | null;
}

function getDialogElement(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector('dialog');
  if (!dialog) throw new Error('Expected a <dialog> element to be rendered');
  return dialog;
}

function setupHooks(state: HookState = {}) {
  vi.mocked(useWvwObjective).mockReturnValue({ data: state.objectiveDef } as ReturnType<typeof useWvwObjective>);
  vi.mocked(useWvWObjectiveIcon).mockReturnValue({ data: undefined } as ReturnType<typeof useWvWObjectiveIcon>);
  vi.mocked(useWvwUpgrades).mockReturnValue({ data: state.allUpgrades } as ReturnType<typeof useWvwUpgrades>);
  vi.mocked(useGuild).mockReturnValue({ data: state.guild ?? null } as ReturnType<typeof useGuild>);
  vi.mocked(useGuildUpgrades).mockReturnValue({
    data: state.guildUpgrades ?? null,
  } as ReturnType<typeof useGuildUpgrades>);
  vi.mocked(useClockStore).mockReturnValue(state.now ?? null);
}

describe('ObjectiveDialog', () => {
  it('renders only the header and points row while dependent data is still loading', () => {
    setupHooks();
    render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective()}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('38-1')).toBeDefined(); // falls back to id when objectiveDef hasn't loaded
    expect(screen.getByText('Unclaimed')).toBeDefined();
    expect(screen.getByText('2 pts/tick')).toBeDefined();
    expect(screen.queryByText('Captured')).toBeNull();
    expect(screen.queryByText('Claimed')).toBeNull();
    expect(screen.queryByText('No upgrades yet')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Guild Upgrades' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Active Upgrades' })).toBeNull();
  });

  it('wires fully-loaded data into every section', () => {
    setupHooks({ objectiveDef, allUpgrades: [upgrade], guild, guildUpgrades, now });
    render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective({
          last_flipped: '2026-06-22T11:30:00.000Z',
          claimed_by: 'guild-1',
          claimed_at: '2026-06-22T11:00:00.000Z',
          guild_upgrades: [1],
          yaks_delivered: 30,
        })}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('Bravost Redoubt')).toBeDefined();
    expect(screen.getByRole('link', { name: '[EG] Example Guild' })).toBeDefined();
    expect(screen.getByText('Captured')).toBeDefined();
    expect(screen.getByText('Claimed')).toBeDefined();
    // currentTier=1: Secured is reached (rendered by both TierProgress's badge and
    // ActiveUpgradesList's header) and Reinforced is the one remaining tier.
    expect(screen.getAllByText('Tier I: Secured')).toHaveLength(2);
    expect(screen.getByText('Tier II: Reinforced')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Guild Upgrades' })).toBeDefined();
    expect(screen.getByText('Guild Bank Bag Slot')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Active Upgrades' })).toBeDefined();
    expect(screen.getByText('Arrow Cart')).toBeDefined();
    expect(screen.getByRole('button', { name: /\[&BLwBAAA=\]/u })).toBeDefined();
  });

  it('shows TierProgress but not ActiveUpgradesList when upgrade data has loaded but no tier has been reached', () => {
    setupHooks({ objectiveDef, allUpgrades: [upgrade], now });
    render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective({ yaks_delivered: 0 })}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('No upgrades yet')).toBeDefined();
    expect(screen.queryByRole('heading', { name: 'Active Upgrades' })).toBeNull();
  });

  it('computes isFullyUpgraded from real data and shows Fully upgraded once every tier requirement is met', () => {
    setupHooks({ objectiveDef, allUpgrades: [upgrade], now });
    render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective({ yaks_delivered: 50 })}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('Fully upgraded')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Active Upgrades' })).toBeDefined();
  });

  it('renders the direction label when direction is not center', () => {
    setupHooks();
    const { container } = render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective()}
        mapType="Center"
        direction="N"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(container.textContent).toContain('North Camp - Eternal Battlegrounds');
  });

  it("uses the Neutral color config when the objective's owner is Neutral", () => {
    setupHooks();
    const { container } = render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective({ owner: 'Neutral' })}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(container.querySelector('.bg-gray-50')).not.toBeNull();
    expect(container.querySelector('.bg-green-50')).toBeNull();
  });

  it('hides the Guild Upgrades section when guildUpgrades has loaded as an empty array', () => {
    setupHooks({ guildUpgrades: [] });
    render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective()}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.queryByRole('heading', { name: 'Guild Upgrades' })).toBeNull();
  });

  it('calls onClose when the backdrop (not the dialog content) is clicked', () => {
    setupHooks();
    const onClose = vi.fn<() => void>();
    const { container } = render(
      <ObjectiveDialog matchObjective={makeMatchObjective()} mapType="Center" direction="C" onClose={onClose} />,
    );

    fireEvent.click(getDialogElement(container));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when content inside the dialog is clicked', () => {
    setupHooks();
    const onClose = vi.fn<() => void>();
    render(<ObjectiveDialog matchObjective={makeMatchObjective()} mapType="Center" direction="C" onClose={onClose} />);

    fireEvent.click(screen.getByText('2 pts/tick'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows the dialog modally on mount', () => {
    setupHooks();
    const { container } = render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective()}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(getDialogElement(container).open).toBe(true);
  });

  it('calls onClose when the dialog fires a native cancel event', () => {
    setupHooks();
    const onClose = vi.fn<() => void>();
    const { container } = render(
      <ObjectiveDialog matchObjective={makeMatchObjective()} mapType="Center" direction="C" onClose={onClose} />,
    );

    getDialogElement(container).dispatchEvent(new Event('cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('copies the chat link via tryWriteClipboardText when the chat-link button is clicked', async () => {
    setupHooks({ objectiveDef });
    render(
      <ObjectiveDialog
        matchObjective={makeMatchObjective()}
        mapType="Center"
        direction="C"
        onClose={vi.fn<() => void>()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /\[&BLwBAAA=\]/u }));

    await vi.waitFor(() => {
      expect(tryWriteClipboardText).toHaveBeenCalledWith(objectiveDef.chat_link, navigator.clipboard);
    });
  });
});
