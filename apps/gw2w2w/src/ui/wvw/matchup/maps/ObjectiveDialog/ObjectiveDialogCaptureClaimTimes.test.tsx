// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ObjectiveDialogCaptureClaimTimes } from './ObjectiveDialogCaptureClaimTimes';
import { formatLocalized } from './utils';

afterEach(cleanup);

describe('ObjectiveDialogCaptureClaimTimes', () => {
  const now = Temporal.Instant.from('2026-06-22T12:00:00Z');

  it('renders the Captured row with relative and localized time', () => {
    const lastFlipped = '2026-06-22T11:30:00.000Z';
    const { container } = render(
      <ObjectiveDialogCaptureClaimTimes lastFlipped={lastFlipped} claimedAt={null} now={now} />,
    );

    expect(screen.getByText('Captured')).toBeDefined();
    expect(container.textContent).toContain('30m ago');
    expect(container.textContent).toContain(formatLocalized(lastFlipped));
    expect(screen.queryByText('Claimed')).toBeNull();
  });

  it('renders the Claimed row with relative and localized time', () => {
    const claimedAt = '2026-06-22T10:00:00.000Z';
    const { container } = render(
      <ObjectiveDialogCaptureClaimTimes lastFlipped={null} claimedAt={claimedAt} now={now} />,
    );

    expect(screen.getByText('Claimed')).toBeDefined();
    expect(container.textContent).toContain('2h ago');
    expect(container.textContent).toContain(formatLocalized(claimedAt));
    expect(screen.queryByText('Captured')).toBeNull();
  });

  it('renders both rows together when the objective has both a capture and a claim', () => {
    const lastFlipped = '2026-06-22T11:30:00.000Z';
    const claimedAt = '2026-06-22T10:00:00.000Z';
    const { container } = render(
      <ObjectiveDialogCaptureClaimTimes lastFlipped={lastFlipped} claimedAt={claimedAt} now={now} />,
    );

    expect(screen.getByText('Captured')).toBeDefined();
    expect(screen.getByText('Claimed')).toBeDefined();
    expect(container.textContent).toContain('30m ago');
    expect(container.textContent).toContain('2h ago');
  });

  it('omits the relative-time prefix on the Captured row when now is null', () => {
    const lastFlipped = '2026-06-22T11:30:00.000Z';
    const { container } = render(
      <ObjectiveDialogCaptureClaimTimes lastFlipped={lastFlipped} claimedAt={null} now={null} />,
    );

    expect(container.textContent).not.toContain('ago');
    expect(container.textContent).toContain(formatLocalized(lastFlipped));
  });

  it('omits the relative-time prefix on the Claimed row when now is null', () => {
    const claimedAt = '2026-06-22T10:00:00.000Z';
    const { container } = render(
      <ObjectiveDialogCaptureClaimTimes lastFlipped={null} claimedAt={claimedAt} now={null} />,
    );

    expect(container.textContent).not.toContain('ago');
    expect(container.textContent).toContain(formatLocalized(claimedAt));
  });

  it('renders nothing when both lastFlipped and claimedAt are absent', () => {
    render(<ObjectiveDialogCaptureClaimTimes lastFlipped={null} claimedAt={undefined} now={now} />);

    expect(screen.queryByText('Captured')).toBeNull();
    expect(screen.queryByText('Claimed')).toBeNull();
  });
});
