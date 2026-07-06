// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Guild } from '@repo/service-api/types';
import { ObjectiveDialogHeader } from './ObjectiveDialogHeader';

afterEach(cleanup);

const ownerConfig = { bg: 'bg-red-500', text: 'text-red-100' };

const guild: Guild = { id: 'guild-1', name: 'Example Guild', tag: 'EG' };

describe('ObjectiveDialogHeader', () => {
  it('shows the emblem image and guild link when claimed and the guild has loaded', () => {
    render(
      <ObjectiveDialogHeader
        ownerConfig={ownerConfig}
        claimedBy="guild-1"
        guild={guild}
        name="Bravost Redoubt"
        isClaimed={true}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('Bravost Redoubt')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Example Guild' })).toBeDefined();
    const link = screen.getByRole('link', { name: '[EG] Example Guild' });
    expect(link.getAttribute('href')).toBe('/guilds/Example%20Guild');
    expect(screen.queryByText('Unclaimed')).toBeNull();
  });

  it('shows the emblem with a fallback alt but no guild link while the guild is still loading', () => {
    render(
      <ObjectiveDialogHeader
        ownerConfig={ownerConfig}
        claimedBy="guild-1"
        guild={undefined}
        name="Bravost Redoubt"
        isClaimed={true}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByRole('img', { name: 'Guild Emblem' })).toBeDefined();
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.queryByText('Unclaimed')).toBeNull();
  });

  it("shows 'Unclaimed' and no emblem when the objective has no claiming guild", () => {
    render(
      <ObjectiveDialogHeader
        ownerConfig={ownerConfig}
        claimedBy={null}
        guild={null}
        name="Bravost Redoubt"
        isClaimed={false}
        onClose={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('Unclaimed')).toBeDefined();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('invokes onClose when the close button is clicked', () => {
    const onClose = vi.fn<() => void>();
    render(
      <ObjectiveDialogHeader
        ownerConfig={ownerConfig}
        claimedBy={null}
        guild={null}
        name="Bravost Redoubt"
        isClaimed={false}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
