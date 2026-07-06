// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WvWObjective } from '@repo/service-api/types';

import { ObjectiveDialogPointsAndChatLink } from './ObjectiveDialogPointsAndChatLink';

afterEach(cleanup);

function makeObjectiveDef(overrides: Partial<WvWObjective> = {}): WvWObjective {
  return {
    id: '38-1',
    name: 'Bravost Redoubt',
    sector_id: 1,
    type: 'Camp',
    map_type: 'Center',
    map_id: 38,
    chat_link: '[&BLwBAAA=]',
    ...overrides,
  };
}

describe('ObjectiveDialogPointsAndChatLink', () => {
  it('renders the points-per-tick and points-per-capture text', () => {
    render(
      <ObjectiveDialogPointsAndChatLink
        objectiveDef={makeObjectiveDef()}
        pointsTick={2}
        pointsCapture={10}
        onCopyChatLink={vi.fn<() => void>()}
      />,
    );

    expect(screen.getByText('2 pts/tick')).toBeDefined();
    expect(screen.getByText('10 pts/capture')).toBeDefined();
  });

  it('renders the chat link button and invokes the callback on click', () => {
    const onCopyChatLink = vi.fn<() => void>();
    render(
      <ObjectiveDialogPointsAndChatLink
        objectiveDef={makeObjectiveDef({ chat_link: '[&BLwBAAA=]' })}
        pointsTick={2}
        pointsCapture={10}
        onCopyChatLink={onCopyChatLink}
      />,
    );

    const button = screen.getByRole('button', { name: /\[&BLwBAAA=\]/u });
    fireEvent.click(button);

    expect(onCopyChatLink).toHaveBeenCalledTimes(1);
  });

  it('omits the chat link button when objectiveDef is undefined', () => {
    render(
      <ObjectiveDialogPointsAndChatLink
        objectiveDef={undefined}
        pointsTick={2}
        pointsCapture={10}
        onCopyChatLink={vi.fn<() => void>()}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });
});
