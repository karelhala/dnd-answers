import { describe, expect, it } from 'vitest';
import {
  STEED_IDS, buildEvidenceGraph, createSteedCase, proveUniquePrefix, raceSteeds, submitSteedAnswer,
} from '../src/domain/steeds';
import type { EvidenceGraph } from '../src/domain/steeds';
import { canonicalStrategy, seededRandom, steedTrial, unwrap } from '../src/test/fixtures';

describe('steed engine', () => {
  it('creates complete deterministic permutations', () => {
    for (let seed = 0; seed < 150; seed += 1) {
      const hidden = createSteedCase(seededRandom(seed));
      expect([...hidden.ranking].sort()).toEqual(STEED_IDS);
      expect(hidden).toEqual(createSteedCase(seededRandom(seed)));
    }
  });

  it('orders races by fixed speeds, regardless of selection order, without mutating selections', () => {
    const trial = steedTrial({ ranking: [...STEED_IDS].reverse() });
    const participants = Object.freeze(['A', 'E', 'C']);
    const first = unwrap(raceSteeds(trial, participants));
    expect(first.observations[0].order).toEqual(['E', 'C', 'A']);
    expect(unwrap(raceSteeds(trial, ['C', 'A', 'E']))).toEqual(first);
    expect(trial.observations).toEqual([]);
  });

  it.each([[], ['A'], ['A', 'A'], ['A', 'Z'], ['A', 'B', 'C', 'D', 'E', 'F']])('rejects invalid race %j without consuming quota', (...participants) => {
    const trial = steedTrial();
    const before = structuredClone(trial);
    expect(raceSteeds(trial, participants)).toMatchObject({ ok: false, category: 'invalid-input' });
    expect(trial).toEqual(before);
  });

  it('allows repeated races, including seventh; rejects eighth and deduplicates edges', () => {
    let trial = steedTrial();
    for (let index = 0; index < 7; index += 1) trial = unwrap(raceSteeds(trial, ['A', 'B']));
    expect(trial.observations.map((race) => race.number)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(raceSteeds(trial, ['C', 'D'])).toMatchObject({ ok: false, category: 'invalid-input' });
    const graph = unwrap(buildEvidenceGraph(trial.observations));
    expect(graph.size).toBe(25);
    expect([...graph.get('A')!]).toEqual(['B']);
    expect([...graph.get('Y')!]).toEqual([]);
    expect(submitSteedAnswer(trial, ['A', 'B', 'C'])).toMatchObject({ ok: false, category: 'insufficient-evidence' });
  });

  it('does not leak whether an unsupported guess matches the hidden order', () => {
    expect(submitSteedAnswer(steedTrial(), ['A', 'B', 'C'])).toMatchObject({ ok: false, category: 'invalid-input' });
    const trial = unwrap(raceSteeds(steedTrial(), ['A', 'B', 'C', 'D', 'E']));
    const correctGuess = submitSteedAnswer(trial, ['A', 'B', 'C']);
    const wrongGuess = submitSteedAnswer(trial, ['Y', 'X', 'W']);
    expect(correctGuess).toEqual(wrongGuess);
    expect(correctGuess).toMatchObject({ ok: false, category: 'insufficient-evidence' });
  });

  it.each([[], ['A', 'B'], ['A', 'A', 'B'], ['A', 'B', 'Z'], ['A', 'B', 'C', 'D']])('rejects invalid top-three input %j', (...answer) => {
    expect(submitSteedAnswer(steedTrial(), answer)).toMatchObject({ ok: false, category: 'invalid-input' });
  });

  it('certifies the canonical seven-race strategy for 150 fixed seeds', () => {
    for (let seed = 0; seed < 150; seed += 1) {
      const hidden = createSteedCase(seededRandom(seed));
      const trial = canonicalStrategy(hidden);
      expect(trial.observations).toHaveLength(7);
      const proof = unwrap(proveUniquePrefix(unwrap(buildEvidenceGraph(trial.observations)), 3));
      expect(proof).toEqual({ kind: 'proven', prefix: hidden.ranking.slice(0, 3) });
      expect(unwrap(submitSteedAnswer(trial, hidden.ranking.slice(0, 3))).phase).toBe('verification');
      expect(trial.phase).toBe('playing');
    }
  });

  it('accepts a noncanonical strategy and relies on transitive evidence', () => {
    // Six overlapping races establish a full chain, not five disjoint groups.
    let trial = steedTrial();
    for (let start = 0; start <= 20; start += 4) {
      trial = unwrap(raceSteeds(trial, STEED_IDS.slice(start, start + 5)));
    }
    expect(trial.observations).toHaveLength(6);
    expect(unwrap(submitSteedAnswer(trial, ['A', 'B', 'C'])).phase).toBe('verification');
  });

  it('allows answer corrections after the final race but rejects wrong proven order', () => {
    const trial = canonicalStrategy({ ranking: STEED_IDS });
    expect(submitSteedAnswer(trial, ['A', 'C', 'B'])).toMatchObject({ ok: false, category: 'incorrect-answer' });
    expect(submitSteedAnswer(trial, ['A', 'B', 'Y'])).toMatchObject({ ok: false, category: 'incorrect-answer' });
    expect(unwrap(submitSteedAnswer(trial, ['A', 'B', 'C'])).phase).toBe('verification');
    expect(trial.observations).toHaveLength(7);
  });

  it.each(['verification', 'solved', 'repaired'] as const)('freezes phase %s', (phase) => {
    const trial = { ...canonicalStrategy({ ranking: STEED_IDS }), phase };
    expect(raceSteeds(trial, ['A', 'B'])).toMatchObject({ ok: false, category: 'invalid-input' });
    expect(submitSteedAnswer(trial, ['A', 'B', 'C'])).toMatchObject({ ok: false, category: 'invalid-input' });
  });

  it('rejects impossible histories and hidden permutations as state errors', () => {
    const trial = { ...steedTrial(), observations: [{ number: 1, order: ['B', 'A'] as const }] };
    expect(submitSteedAnswer(trial, ['A', 'B', 'C'])).toMatchObject({ ok: false, category: 'state-error' });
    expect(raceSteeds(trial, ['C', 'D'])).toMatchObject({ ok: false, category: 'state-error' });
    const invalid = steedTrial({ ranking: [...STEED_IDS.slice(1), 'B'] });
    expect(raceSteeds(invalid, ['A', 'B'])).toMatchObject({ ok: false, category: 'state-error' });
  });
});

function graph(nodes: readonly string[], edges: readonly (readonly [string, string])[]): EvidenceGraph {
  return new Map(nodes.map((id) => [id, new Set(edges.filter(([from]) => from === id).map(([, to]) => to))]));
}

function permutations<T>(items: readonly T[]): T[][] {
  if (!items.length) return [[]];
  return items.flatMap((item, index) =>
    permutations(items.filter((_, other) => other !== index)).map((rest) => [item, ...rest]),
  );
}

describe('unique-prefix proof', () => {
  it('accepts a proven prefix without requiring the lower ranking to be unique', () => {
    const evidence = graph(['A', 'B', 'C', 'D', 'E'], [['A', 'B'], ['B', 'C'], ['C', 'D'], ['C', 'E']]);
    expect(unwrap(proveUniquePrefix(evidence, 3))).toEqual({ kind: 'proven', prefix: ['A', 'B', 'C'] });
  });

  it.each([
    { edges: [['A', 'B'], ['A', 'C'], ['A', 'D']] },
    { edges: [['A', 'B'], ['B', 'C'], ['B', 'D']] },
  ] as const)('rejects ambiguity after a proven first or second position', ({ edges }) => {
    expect(unwrap(proveUniquePrefix(graph(['A', 'B', 'C', 'D'], edges), 3)).kind).toBe('ambiguous');
  });

  it('rejects cycles even below a unique top three', () => {
    const evidence = graph(['A', 'B', 'C', 'D', 'E'], [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'E'], ['E', 'D']]);
    expect(proveUniquePrefix(evidence, 3)).toMatchObject({ ok: false, category: 'state-error' });
    expect(proveUniquePrefix(graph(['A'], [['A', 'A']]), 1)).toMatchObject({ ok: false, category: 'state-error' });
  });

  it('rejects unknown edge targets and invalid prefix lengths', () => {
    expect(proveUniquePrefix(graph(['A'], [['A', 'Z']]), 1)).toMatchObject({ ok: false, category: 'state-error' });
    for (const length of [0, -1, 1.5, 3]) {
      expect(proveUniquePrefix(graph(['A', 'B'], []), length)).toMatchObject({ ok: false, category: 'invalid-input' });
    }
  });

  it('matches independent permutation enumeration for all 1,024 forward-edge graphs on five nodes', () => {
    const nodes = ['C', 'A', 'E', 'B', 'D'];
    const possibleEdges = nodes.flatMap((from, index) => nodes.slice(index + 1).map((to) => [from, to] as const));
    const orders = permutations(nodes);
    for (let mask = 0; mask < 2 ** possibleEdges.length; mask += 1) {
      const edges = possibleEdges.filter((_, index) => (mask & (1 << index)) !== 0);
      const compatible = orders.filter((order) => edges.every(([from, to]) => order.indexOf(from) < order.indexOf(to)));
      const prefix: string[] = [];
      for (let index = 0; index < 3; index += 1) {
        if (!compatible.every((order) => order[index] === compatible[0][index])) break;
        prefix.push(compatible[0][index]);
      }
      const result = unwrap(proveUniquePrefix(graph(nodes, edges), 3));
      expect(result.prefix).toEqual(prefix);
      expect(result.kind).toBe(prefix.length === 3 ? 'proven' : 'ambiguous');
    }
  });
});
