import type { CoinCase, CoinTrial } from '../domain/coins';
import { STEED_IDS, raceSteeds } from '../domain/steeds';
import type { SteedCase, SteedId, SteedTrial } from '../domain/steeds';
import type { RandomSource } from '../domain/random';
import type { Result } from '../domain/types';

export function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`${result.category}: ${result.message}`);
  return result.value;
}

export function seededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state;
  };
}

export function coinTrial(hidden: CoinCase = { oddCoin: 'A', difference: 'heavier' }): CoinTrial {
  return { puzzle: 'coins', case: hidden, observations: [], phase: 'playing' };
}

export function steedTrial(hidden: SteedCase = { ranking: STEED_IDS }): SteedTrial {
  return { puzzle: 'steeds', case: hidden, observations: [], phase: 'playing' };
}

// Facilitator-only canonical strategy fixture; never imported by production UI.
export function canonicalStrategy(hidden: SteedCase): SteedTrial {
  let trial = steedTrial(hidden);
  const groups: SteedId[][] = [];
  for (let index = 0; index < STEED_IDS.length; index += 5) {
    trial = unwrap(raceSteeds(trial, STEED_IDS.slice(index, index + 5)));
    groups.push([...trial.observations[trial.observations.length - 1].order]);
  }
  trial = unwrap(raceSteeds(trial, groups.map((group) => group[0])));
  const winners = trial.observations[5].order;
  const orderedGroups = winners.map((winner) => groups.find((group) => group[0] === winner)!);
  return unwrap(raceSteeds(trial, [
    orderedGroups[0][1], orderedGroups[0][2],
    orderedGroups[1][0], orderedGroups[1][1], orderedGroups[2][0],
  ]));
}
