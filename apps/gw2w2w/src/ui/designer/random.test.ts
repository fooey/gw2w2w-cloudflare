import { describe, expect, it } from 'vitest';

import { getCryptoRandomUint32, getRandomIndex } from './random';

describe('getRandomIndex', () => {
  it('returns null for invalid lengths', () => {
    expect(getRandomIndex(0, 10)).toBeNull();
    expect(getRandomIndex(-1, 10)).toBeNull();
  });

  it('maps values into the array bounds', () => {
    expect(getRandomIndex(5, 0)).toBe(0);
    expect(getRandomIndex(5, 7)).toBe(2);
    expect(getRandomIndex(3, 10)).toBe(1);
  });
});

describe('getCryptoRandomUint32', () => {
  it('returns the random value from the provided crypto object', () => {
    const fakeCrypto: Pick<Crypto, 'getRandomValues'> = {
      // Must mirror Crypto's generic signature rather than narrowing to Uint32Array.
      getRandomValues<T extends Exclude<BufferSource, ArrayBuffer>>(array: T): T {
        new Uint32Array(array.buffer, array.byteOffset, 1)[0] = 123_456;
        return array;
      },
    };

    expect(getCryptoRandomUint32(fakeCrypto)).toBe(123_456);
  });
});
