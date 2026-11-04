// Inject a uint32 source in tests; only case creation uses randomness.
export type RandomSource = () => number;

const UINT32_RANGE = 2 ** 32;

export const cryptoRandom: RandomSource = () =>
  globalThis.crypto.getRandomValues(new Uint32Array(1))[0];

export function randomIndex(length: number, random: RandomSource = cryptoRandom): number {
  if (!Number.isInteger(length) || length < 1 || length > UINT32_RANGE) {
    throw new RangeError('Random selection requires a positive uint32-sized range.');
  }

  // Rejection sampling avoids modulo bias when length does not divide 2^32.
  const limit = UINT32_RANGE - (UINT32_RANGE % length);
  while (true) {
    const value = random();
    if (!Number.isInteger(value) || value < 0 || value >= UINT32_RANGE) {
      throw new RangeError('Random source must return an unsigned 32-bit integer.');
    }
    if (value < limit) return value % length;
  }
}

export function shuffle<T>(items: readonly T[], random: RandomSource = cryptoRandom): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = randomIndex(index + 1, random);
    [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
  }
  return shuffled;
}
