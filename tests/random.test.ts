import { describe, expect, it, vi } from 'vitest';
import { cryptoRandom, randomIndex, shuffle } from '../src/domain/random';
import { seededRandom } from '../src/test/fixtures';

describe('random source', () => {
  it('uses native crypto and returns a uint32', () => {
    const random = vi.spyOn(globalThis.crypto, 'getRandomValues');
    const value = cryptoRandom();
    expect(random).toHaveBeenCalledOnce();
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(2 ** 32);
    random.mockRestore();
  });

  it('rejects the biased tail before selecting an index', () => {
    const random = vi.fn().mockReturnValueOnce(2 ** 32 - 1).mockReturnValueOnce(7);
    expect(randomIndex(3, random)).toBe(1);
    expect(random).toHaveBeenCalledTimes(2);
  });

  it.each([0, -1, 1.5, 2 ** 32 + 1, NaN])('rejects invalid range %s', (length) => {
    expect(() => randomIndex(length)).toThrow(RangeError);
  });

  it.each([-1, 0.5, 2 ** 32, NaN])('rejects invalid random output %s', (value) => {
    expect(() => randomIndex(3, () => value)).toThrow(RangeError);
  });

  it('shuffles reproducibly without mutating input', () => {
    const input = Object.freeze(['A', 'B', 'C', 'D', 'E']);
    const first = shuffle(input, seededRandom(42));
    expect(first).toEqual(shuffle(input, seededRandom(42)));
    expect([...first].sort()).toEqual(input);
    expect(first).not.toBe(input);
    expect(shuffle([], seededRandom(1))).toEqual([]);
  });
});
