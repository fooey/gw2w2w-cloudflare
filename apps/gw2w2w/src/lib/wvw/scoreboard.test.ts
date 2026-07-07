import { describe, expect, it } from 'vitest';

import { formatKdr } from './scoreboard';

describe('formatKdr', () => {
  it('formats a ratio to 2 decimals when deaths > 0', () => {
    expect(formatKdr(10, 4)).toBe('2.50');
    expect(formatKdr(1, 3)).toBe('0.33');
  });
  it('returns the infinity symbol for kills with no deaths', () => {
    expect(formatKdr(5, 0)).toBe('∞');
  });
  it('returns an em dash when there are no kills or deaths', () => {
    expect(formatKdr(0, 0)).toBe('—');
  });
});
