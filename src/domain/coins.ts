import { randomIndex } from './random';
import type { RandomSource } from './random';
import { failure, success } from './types';
import type { Phase, Result } from './types';

export const COIN_IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
export const MAX_WEIGHINGS = 3;
export type CoinId = (typeof COIN_IDS)[number];
export type WeightDifference = 'heavier' | 'lighter';
export type BalanceOutcome = 'left-heavy' | 'balanced' | 'right-heavy';

export interface CoinCase {
  readonly oddCoin: CoinId;
  readonly difference: WeightDifference;
}

export interface Weighing {
  readonly number: number;
  readonly left: readonly CoinId[];
  readonly right: readonly CoinId[];
  readonly outcome: BalanceOutcome;
}

export interface CoinTrial {
  readonly puzzle: 'coins';
  readonly case: CoinCase;
  readonly phase: Phase;
  readonly observations: readonly Weighing[];
}

export function isCoinId(id: string): id is CoinId {
  return COIN_IDS.some((known) => known === id);
}

export function createCoinCase(random?: RandomSource): CoinCase {
  const index = randomIndex(COIN_IDS.length * 2, random);
  return { oddCoin: COIN_IDS[Math.floor(index / 2)], difference: index % 2 === 0 ? 'heavier' : 'lighter' };
}

export function validatePans(
  left: readonly string[],
  right: readonly string[],
): Result<{ left: CoinId[]; right: CoinId[] }> {
  if (!left.length || !right.length) {
    return failure('invalid-input', 'Place at least one fragment on each pan.');
  }
  if (left.length !== right.length || left.length > 6) {
    return failure('invalid-input', 'Use equal counts of at most six fragments on each pan.');
  }
  if (!left.every(isCoinId) || !right.every(isCoinId)) {
    return failure('invalid-input', 'Choose only known fragments A–L.');
  }
  if (new Set([...left, ...right]).size !== left.length + right.length) {
    return failure('invalid-input', 'Each fragment may appear once, on only one pan.');
  }
  return success({ left: [...left], right: [...right] });
}

function balanceOutcome(hidden: CoinCase, left: readonly CoinId[], right: readonly CoinId[]): BalanceOutcome {
  const side = left.includes(hidden.oddCoin) ? 1 : right.includes(hidden.oddCoin) ? -1 : 0;
  const contribution = side * (hidden.difference === 'heavier' ? 1 : -1);
  return contribution === 0 ? 'balanced' : contribution > 0 ? 'left-heavy' : 'right-heavy';
}

function validateTrial(trial: CoinTrial): Result<null> {
  if (!isCoinId(trial.case.oddCoin) || !['heavier', 'lighter'].includes(trial.case.difference)) {
    return failure('state-error', 'The fragment case is inconsistent.');
  }
  if (trial.observations.length > MAX_WEIGHINGS) {
    return failure('state-error', 'The weighing history exceeds the trial limit.');
  }
  for (const [index, observation] of trial.observations.entries()) {
    if (
      !validatePans(observation.left, observation.right).ok ||
      observation.number !== index + 1 ||
      balanceOutcome(trial.case, observation.left, observation.right) !== observation.outcome
    ) {
      return failure('state-error', 'The weighing history is inconsistent with this case.');
    }
  }
  return success(null);
}

export function weighCoins(trial: CoinTrial, left: readonly string[], right: readonly string[]): Result<CoinTrial> {
  const integrity = validateTrial(trial);
  if (!integrity.ok) return integrity;
  if (trial.phase !== 'playing') return failure('invalid-input', 'Weighing is closed after answer acceptance or restoration.');
  if (trial.observations.length >= MAX_WEIGHINGS) return failure('invalid-input', 'Three weighings used. Submit an identification using existing observations.');
  const pans = validatePans(left, right);
  if (!pans.ok) return pans;
  return success({
    ...trial,
    observations: [...trial.observations, {
      number: trial.observations.length + 1,
      ...pans.value,
      outcome: balanceOutcome(trial.case, pans.value.left, pans.value.right),
    }],
  });
}

export function submitCoinAnswer(trial: CoinTrial, coin: string, difference: string): Result<CoinTrial> {
  const integrity = validateTrial(trial);
  if (!integrity.ok) return integrity;
  if (trial.phase !== 'playing') return failure('invalid-input', 'An identification has already been accepted or the core restored.');
  if (!isCoinId(coin) || !['heavier', 'lighter'].includes(difference)) {
    return failure('invalid-input', 'Choose one fragment and either heavier or lighter.');
  }
  if (!trial.observations.length) return failure('invalid-input', 'Complete at least one weighing before submitting.');
  if (coin !== trial.case.oddCoin || difference !== trial.case.difference) {
    return failure('incorrect-answer', 'That identification does not match this case. Review the observations or start a new case.');
  }
  return success({ ...trial, phase: 'verification' });
}
