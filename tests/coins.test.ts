import { describe, expect, it } from 'vitest';
import {
  COIN_IDS, createCoinCase, submitCoinAnswer, validatePans, weighCoins,
} from '../src/domain/coins';
import type { CoinCase, WeightDifference } from '../src/domain/coins';
import { coinTrial, unwrap } from '../src/test/fixtures';

const cases: CoinCase[] = COIN_IDS.flatMap((oddCoin) =>
  (['heavier', 'lighter'] as const).map((difference) => ({ oddCoin, difference })),
);

describe('coin engine', () => {
  it.each(cases)('simulates all placements for $oddCoin $difference', (hidden) => {
    const [normal, other] = COIN_IDS.filter((id) => id !== hidden.oddCoin);
    const initial = coinTrial(hidden);
    const left = unwrap(weighCoins(initial, [hidden.oddCoin], [normal]));
    const right = unwrap(weighCoins(initial, [normal], [hidden.oddCoin]));
    const absent = unwrap(weighCoins(initial, [normal], [other]));
    expect(left.observations[0].outcome).toBe(hidden.difference === 'heavier' ? 'left-heavy' : 'right-heavy');
    expect(right.observations[0].outcome).toBe(hidden.difference === 'heavier' ? 'right-heavy' : 'left-heavy');
    expect(absent.observations[0].outcome).toBe('balanced');
    expect(initial.observations).toEqual([]);
  });

  it.each(cases)('grades identification for $oddCoin $difference', (hidden) => {
    const trial = unwrap(weighCoins(coinTrial(hidden), ['A'], ['B']));
    const wrongDirection: WeightDifference = hidden.difference === 'heavier' ? 'lighter' : 'heavier';
    expect(submitCoinAnswer(trial, hidden.oddCoin, wrongDirection)).toMatchObject({ ok: false, category: 'incorrect-answer' });
    const wrongCoin = COIN_IDS.find((id) => id !== hidden.oddCoin)!;
    expect(submitCoinAnswer(trial, wrongCoin, hidden.difference)).toMatchObject({ ok: false, category: 'incorrect-answer' });
    expect(unwrap(submitCoinAnswer(trial, hidden.oddCoin, hidden.difference)).phase).toBe('verification');
    expect(trial.phase).toBe('playing');
  });

  it('selects every one of the 24 cases from explicit randomness', () => {
    expect(Array.from({ length: 24 }, (_, index) => createCoinCase(() => index))).toEqual(cases);
  });

  it.each([
    [[], ['A']], [['A'], []], [['A'], ['B', 'C']], [['Z'], ['B']],
    [['A', 'A'], ['B', 'C']], [['A', 'B'], ['C', 'C']], [['A'], ['A']],
    [['A', 'B', 'C', 'D', 'E', 'F', 'G'], ['F', 'G', 'H', 'I', 'J', 'K', 'L']],
  ])('rejects invalid pans %j / %j without changing evidence', (left, right) => {
    const trial = coinTrial();
    const before = structuredClone(trial);
    expect(weighCoins(trial, left, right)).toMatchObject({ ok: false, category: 'invalid-input' });
    expect(trial).toEqual(before);
  });

  it('allows six fragments per pan and owns copies of selections', () => {
    expect(validatePans(COIN_IDS.slice(0, 6), COIN_IDS.slice(6))).toMatchObject({ ok: true });
    const left = ['A'];
    const trial = unwrap(weighCoins(coinTrial(), left, ['B']));
    left.push('C');
    expect(trial.observations[0].left).toEqual(['A']);
  });

  it('allows the third weighing, rejects the fourth, and still accepts answer corrections', () => {
    let trial = coinTrial();
    for (let index = 0; index < 3; index += 1) trial = unwrap(weighCoins(trial, ['A'], ['B']));
    expect(trial.observations.map((observation) => observation.number)).toEqual([1, 2, 3]);
    expect(weighCoins(trial, ['C'], ['D'])).toMatchObject({ ok: false, category: 'invalid-input' });
    expect(submitCoinAnswer(trial, 'B', 'lighter')).toMatchObject({ ok: false, category: 'incorrect-answer' });
    expect(unwrap(submitCoinAnswer(trial, 'A', 'heavier')).phase).toBe('verification');
    expect(trial.observations).toHaveLength(3);
  });

  it('requires interaction, not a unique proof of the coin answer', () => {
    expect(submitCoinAnswer(coinTrial(), 'A', 'heavier')).toMatchObject({ ok: false, category: 'invalid-input' });
    const ambiguous = unwrap(weighCoins(coinTrial(), ['C'], ['D']));
    expect(unwrap(submitCoinAnswer(ambiguous, 'A', 'heavier')).phase).toBe('verification');
  });

  it.each([['', 'heavier'], ['Z', 'heavier'], ['A', ''], ['A', 'normal']])('rejects missing/unknown answer %s %s', (coin, direction) => {
    const trial = unwrap(weighCoins(coinTrial(), ['A'], ['B']));
    expect(submitCoinAnswer(trial, coin, direction)).toMatchObject({ ok: false, category: 'invalid-input' });
  });

  it.each(['verification', 'solved', 'repaired'] as const)('freezes accepted and terminal phase %s', (phase) => {
    const trial = { ...unwrap(weighCoins(coinTrial(), ['A'], ['B'])), phase };
    expect(weighCoins(trial, ['A'], ['B'])).toMatchObject({ ok: false, category: 'invalid-input' });
    expect(submitCoinAnswer(trial, 'A', 'heavier')).toMatchObject({ ok: false, category: 'invalid-input' });
  });

  it('rejects impossible stored evidence instead of grading it', () => {
    const trial = unwrap(weighCoins(coinTrial(), ['A'], ['B']));
    const corrupt = { ...trial, observations: [{ ...trial.observations[0], outcome: 'balanced' as const }] };
    expect(submitCoinAnswer(corrupt, 'A', 'heavier')).toMatchObject({ ok: false, category: 'state-error' });
    expect(weighCoins(corrupt, ['C'], ['D'])).toMatchObject({ ok: false, category: 'state-error' });
  });
});
