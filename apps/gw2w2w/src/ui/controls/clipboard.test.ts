import { describe, expect, it, vi } from 'vitest';
import { tryWriteClipboardText } from './clipboard';

describe('tryWriteClipboardText', () => {
  it('returns true when clipboard write succeeds', async () => {
    const clipboard = {
      writeText: vi.fn<() => Promise<void>>(async () => {}),
    };

    await expect(tryWriteClipboardText('hello', clipboard)).resolves.toBe(true);
    expect(clipboard.writeText).toHaveBeenCalledWith('hello');
  });

  it('returns false when clipboard write fails', async () => {
    const clipboard = {
      writeText: vi.fn<() => Promise<void>>(async () => {
        throw new Error('denied');
      }),
    };

    await expect(tryWriteClipboardText('hello', clipboard)).resolves.toBe(false);
    expect(clipboard.writeText).toHaveBeenCalledWith('hello');
  });
});
