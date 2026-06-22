export function getRandomIndex(length: number, randomValue: number): number | null {
  if (!Number.isFinite(length) || length <= 0) return null;
  return randomValue % length;
}

export function getCryptoRandomUint32(cryptoObj: Pick<Crypto, 'getRandomValues'> = globalThis.crypto): number {
  const random = new Uint32Array(1);
  cryptoObj.getRandomValues(random);
  return random[0] ?? 0;
}
