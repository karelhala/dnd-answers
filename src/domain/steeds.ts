import { shuffle } from './random';
import type { RandomSource } from './random';
import { failure, success } from './types';
import type { Phase, Result } from './types';

export const STEED_IDS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y',
] as const;
export const MAX_RACES = 7;
export type SteedId = (typeof STEED_IDS)[number];

export interface SteedCase {
  readonly ranking: readonly SteedId[];
}

export interface Race {
  readonly number: number;
  readonly order: readonly SteedId[];
}

export interface SteedTrial {
  readonly puzzle: 'steeds';
  readonly case: SteedCase;
  readonly phase: Phase;
  readonly observations: readonly Race[];
}

export type EvidenceGraph = ReadonlyMap<string, ReadonlySet<string>>;
export type PrefixProof =
  | { kind: 'proven'; prefix: string[] }
  | { kind: 'ambiguous'; prefix: string[]; candidates: string[] };

export function isSteedId(id: string): id is SteedId {
  return STEED_IDS.some((known) => known === id);
}

export function createSteedCase(random?: RandomSource): SteedCase {
  return { ranking: shuffle(STEED_IDS, random) };
}

export function validateRace(participants: readonly string[]): Result<SteedId[]> {
  if (participants.length < 2 || participants.length > 5) {
    return failure('invalid-input', 'Choose two to five steeds; one steed provides no comparisons.');
  }
  if (!participants.every(isSteedId) || new Set(participants).size !== participants.length) {
    return failure('invalid-input', 'Choose distinct, known steeds A–Y.');
  }
  return success([...participants]);
}

function orderRace(hidden: SteedCase, participants: readonly SteedId[]): SteedId[] {
  const ranks = new Map(hidden.ranking.map((id, index) => [id, index]));
  return [...participants].sort((a, b) => ranks.get(a)! - ranks.get(b)!);
}

function validateTrial(trial: SteedTrial): Result<null> {
  if (
    trial.case.ranking.length !== STEED_IDS.length ||
    new Set(trial.case.ranking).size !== STEED_IDS.length ||
    !trial.case.ranking.every(isSteedId)
  ) return failure('state-error', 'The hidden steed order is not a complete permutation.');
  if (trial.observations.length > MAX_RACES) return failure('state-error', 'The race history exceeds the trial limit.');
  for (const [index, race] of trial.observations.entries()) {
    const ordered = orderRace(trial.case, race.order);
    if (
      !validateRace(race.order).ok || race.number !== index + 1 ||
      ordered.some((id, place) => id !== race.order[place])
    ) return failure('state-error', 'The race history is inconsistent with this case.');
  }
  return success(null);
}

export function raceSteeds(trial: SteedTrial, participants: readonly string[]): Result<SteedTrial> {
  const integrity = validateTrial(trial);
  if (!integrity.ok) return integrity;
  if (trial.phase !== 'playing') return failure('invalid-input', 'Racing is closed after answer acceptance or restoration.');
  if (trial.observations.length >= MAX_RACES) return failure('invalid-input', 'Seven races used. Submit a ranking using existing observations.');
  const selection = validateRace(participants);
  if (!selection.ok) return selection;
  return success({
    ...trial,
    observations: [...trial.observations, {
      number: trial.observations.length + 1,
      order: orderRace(trial.case, selection.value),
    }],
  });
}

export function buildEvidenceGraph(races: readonly Race[]): Result<EvidenceGraph> {
  const graph = new Map<string, Set<string>>(STEED_IDS.map((id) => [id, new Set<string>()]));
  for (const race of races) {
    if (!validateRace(race.order).ok) return failure('state-error', 'A recorded race contains invalid participants.');
    for (let index = 1; index < race.order.length; index += 1) {
      graph.get(race.order[index - 1])!.add(race.order[index]);
    }
  }
  return success(graph);
}

// Generic so an independent small-graph oracle can test the proof algorithm.
// Validate the WHOLE graph first: a unique top three must not hide a cycle below it.
export function proveUniquePrefix(graph: EvidenceGraph, length: number): Result<PrefixProof> {
  if (!Number.isInteger(length) || length < 1 || length > graph.size) {
    return failure('invalid-input', 'The requested prefix length is outside the graph.');
  }
  const indegrees = new Map([...graph.keys()].map((id) => [id, 0]));
  for (const edges of graph.values()) {
    for (const id of edges) {
      if (!indegrees.has(id)) return failure('state-error', 'Evidence refers to an unknown graph node.');
      indegrees.set(id, indegrees.get(id)! + 1);
    }
  }
  const check = new Map(indegrees);
  const queue = [...check.keys()].filter((id) => check.get(id) === 0);
  for (let index = 0; index < queue.length; index += 1) {
    for (const id of graph.get(queue[index])!) {
      check.set(id, check.get(id)! - 1);
      if (check.get(id) === 0) queue.push(id);
    }
  }
  if (queue.length !== graph.size) return failure('state-error', 'The race evidence contains a cycle.');

  const remaining = new Set(graph.keys());
  const prefix: string[] = [];
  while (prefix.length < length) {
    const candidates = [...remaining].filter((id) => indegrees.get(id) === 0);
    if (candidates.length !== 1) return success({ kind: 'ambiguous', prefix, candidates });
    const next = candidates[0];
    prefix.push(next);
    remaining.delete(next);
    for (const id of graph.get(next)!) indegrees.set(id, indegrees.get(id)! - 1);
  }
  return success({ kind: 'proven', prefix });
}

export function submitSteedAnswer(trial: SteedTrial, answer: readonly string[]): Result<SteedTrial> {
  const integrity = validateTrial(trial);
  if (!integrity.ok) return integrity;
  if (trial.phase !== 'playing') return failure('invalid-input', 'A ranking has already been accepted or the core restored.');
  if (answer.length !== 3 || !answer.every(isSteedId) || new Set(answer).size !== 3) {
    return failure('invalid-input', 'Choose three distinct, known steeds in finishing order.');
  }
  if (!trial.observations.length) return failure('invalid-input', 'Complete at least one race before submitting.');
  const graph = buildEvidenceGraph(trial.observations);
  if (!graph.ok) return graph;
  const proof = proveUniquePrefix(graph.value, 3);
  if (!proof.ok) return proof;
  if (proof.value.kind === 'ambiguous') {
    return failure('insufficient-evidence', 'Your observations do not yet establish a unique top three.');
  }
  const prefix = proof.value.prefix;
  if (prefix.some((id, index) => id !== trial.case.ranking[index])) {
    return failure('state-error', 'The evidence and case disagree. The saved trial needs recovery.');
  }
  if (prefix.some((id, index) => id !== answer[index])) {
    return failure('incorrect-answer', 'That ranking is not the order established by your race results.');
  }
  return success({ ...trial, phase: 'verification' });
}
