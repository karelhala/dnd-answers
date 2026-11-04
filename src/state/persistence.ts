import { coinQuestions, steedQuestions } from '../content/questions';
import type { TeamId } from '../content/teams';
import { isCoinId, submitCoinAnswer, weighCoins } from '../domain/coins';
import type { CoinTrial } from '../domain/coins';
import { isSteedId, raceSteeds, STEED_IDS, submitSteedAnswer } from '../domain/steeds';
import type { SteedTrial } from '../domain/steeds';
import { failure, success } from '../domain/types';
import type { Phase, Result } from '../domain/types';
import { gradeVerification } from '../domain/verification';
import { createWorkshop } from './createWorkshop';
import { HISTORY_LIMIT } from './types';
import type { AttemptEvent, CoinDraft, Mode, QuestionDrafts, SteedDraft, TrialSession, WorkshopState } from './types';

export const STORAGE_KEY = 'dnd-answers.workshop';
export interface StorageAccess {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export type StorageStatus = 'ready' | 'recovery' | 'unavailable';
export interface WorkshopBootstrap {
  readonly state: WorkshopState;
  readonly storage: StorageAccess | null;
  readonly status: StorageStatus;
}

function invalid(): never {
  throw new Error('Invalid saved workshop record.');
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function text(value: unknown, max = 100): string {
  if (typeof value !== 'string' || !value.length || value.length > max) invalid();
  return value;
}

function timestamp(value: unknown): string {
  const at = text(value);
  if (!Number.isFinite(Date.parse(at)) || new Date(at).toISOString() !== at) invalid();
  return at;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') invalid();
  return value;
}

function list<T>(value: unknown, limit: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > limit) invalid();
  return value.map(parse);
}

function coinId(value: unknown) {
  if (typeof value !== 'string' || !isCoinId(value)) invalid();
  return value;
}

function steedId(value: unknown) {
  if (typeof value !== 'string' || !isSteedId(value)) invalid();
  return value;
}

function unique<T>(values: T[]): T[] {
  if (new Set(values).size !== values.length) invalid();
  return values;
}

function difference(value: unknown) {
  if (value !== 'heavier' && value !== 'lighter') invalid();
  return value;
}

function coinDraft(value: unknown): CoinDraft {
  const draft = record(value);
  return {
    left: unique(list(draft.left, 12, coinId)),
    right: unique(list(draft.right, 12, coinId)),
    coin: draft.coin === '' ? '' : coinId(draft.coin),
    difference: draft.difference === '' ? '' : difference(draft.difference),
  };
}

function steedDraft(value: unknown): SteedDraft {
  const draft = record(value);
  const answer = list(draft.answer, 3, (item) => item === '' ? '' : steedId(item));
  if (answer.length !== 3) invalid();
  return {
    participants: unique(list(draft.participants, 25, steedId)),
    answer: [answer[0], answer[1], answer[2]],
  };
}

function verificationDraft(value: unknown, puzzle: 'coins' | 'steeds'): QuestionDrafts {
  const questions = puzzle === 'coins' ? coinQuestions : steedQuestions;
  const entries = Object.entries(record(value)).map(([id, raw]) => {
    const question = questions.find((candidate) => candidate.id === id);
    if (!question) invalid();
    const answers = unique(list(raw, question.options.length, (item) => {
      const answer = text(item);
      if (!question.options.some((option) => option.id === answer)) invalid();
      return answer;
    }));
    return [id, answers];
  });
  return Object.fromEntries(entries);
}

const categoriesByKind = {
  observation: ['observed'],
  answer: ['accepted', 'incorrect-answer', 'insufficient-evidence', 'state-error'],
  verification: ['verification-incomplete'],
  resolution: ['solved', 'repaired'],
  error: ['invalid-input'],
} as const;

function history(value: unknown, caseId: string, createdAt: string): AttemptEvent[] {
  let previous = createdAt;
  return list(value, HISTORY_LIMIT, (raw) => {
    const event = record(raw);
    const kind = text(event.kind);
    const category = text(event.category);
    if (!Object.hasOwn(categoriesByKind, kind)) invalid();
    const allowed: readonly string[] = categoriesByKind[kind as keyof typeof categoriesByKind];
    if (!allowed.includes(category) || event.caseId !== caseId) invalid();
    const at = timestamp(event.at);
    if (at < previous) invalid();
    previous = at;
    return {
      caseId, at,
      kind: kind as AttemptEvent['kind'],
      category: category as AttemptEvent['category'],
      message: text(event.message, 500),
    };
  });
}

function phase(value: unknown): Phase {
  if (value !== 'playing' && value !== 'verification' && value !== 'solved' && value !== 'repaired') invalid();
  return value;
}

function coinTrial(value: Record<string, unknown>): CoinTrial {
  const hidden = record(value.case);
  let trial: CoinTrial = {
    puzzle: 'coins', phase: 'playing', observations: [],
    case: { oddCoin: coinId(hidden.oddCoin), difference: difference(hidden.difference) },
  };
  for (const raw of list(value.observations, 3, record)) {
    const left = list(raw.left, 6, coinId);
    const right = list(raw.right, 6, coinId);
    const next = weighCoins(trial, left, right);
    if (!next.ok) invalid();
    const observed = next.value.observations.at(-1)!;
    if (observed.number !== raw.number || observed.outcome !== raw.outcome) invalid();
    trial = next.value;
  }
  return trial;
}

function steedTrial(value: Record<string, unknown>): SteedTrial {
  const hidden = record(value.case);
  const ranking = unique(list(hidden.ranking, 25, steedId));
  if (ranking.length !== STEED_IDS.length) invalid();
  let trial: SteedTrial = { puzzle: 'steeds', phase: 'playing', observations: [], case: { ranking } };
  for (const raw of list(value.observations, 7, record)) {
    const order = list(raw.order, 5, steedId);
    const next = raceSteeds(trial, order);
    if (!next.ok) invalid();
    const observed = next.value.observations.at(-1)!;
    if (observed.number !== raw.number || observed.order.some((id, index) => id !== order[index])) invalid();
    trial = next.value;
  }
  return trial;
}

function session(value: unknown, teamId: TeamId, mode: Mode): TrialSession {
  const saved = record(value);
  if (saved.teamId !== teamId || saved.mode !== mode) invalid();
  const caseId = text(saved.caseId);
  const createdAt = timestamp(saved.createdAt);
  const acceptedAnswerAt = saved.acceptedAnswerAt === undefined ? undefined : timestamp(saved.acceptedAnswerAt);
  const resolvedAt = saved.resolvedAt === undefined ? undefined : timestamp(saved.resolvedAt);
  const trial = record(saved.trial);
  const expectedPuzzle = teamId === 'experience' ? 'coins' : 'steeds';
  if (trial.puzzle !== expectedPuzzle) invalid();
  const savedPhase = phase(trial.phase);
  const verification = verificationDraft(saved.verification, expectedPuzzle);
  const verificationSubmitted = boolean(saved.verificationSubmitted);
  const events = history(saved.history, caseId, createdAt);
  const terminal = savedPhase === 'solved' || savedPhase === 'repaired';
  const requiresAcceptance = savedPhase === 'verification' || savedPhase === 'solved';
  if (requiresAcceptance && !acceptedAnswerAt) invalid();
  if (savedPhase === 'playing' && acceptedAnswerAt) invalid();
  if (terminal !== Boolean(resolvedAt)) invalid();
  if (savedPhase === 'repaired' && mode !== 'official') invalid();
  if (acceptedAnswerAt && acceptedAnswerAt < createdAt) invalid();
  if (acceptedAnswerAt && (!events.length || acceptedAnswerAt > events.at(-1)!.at)) invalid();
  if (!acceptedAnswerAt && events.some((event) => event.category === 'accepted')) invalid();
  if (resolvedAt && (resolvedAt < (acceptedAnswerAt ?? createdAt) || events.some((event) => event.at > resolvedAt))) invalid();
  if (!acceptedAnswerAt && (Object.keys(verification).length > 0 || verificationSubmitted)) invalid();
  const passed = gradeVerification(expectedPuzzle, verification).passed;
  if ((savedPhase === 'solved') !== (verificationSubmitted && passed)) invalid();
  if (terminal && (events.at(-1)?.kind !== 'resolution' || events.at(-1)?.category !== savedPhase || events.at(-1)?.at !== resolvedAt)) invalid();
  if (terminal && events.filter((event) => event.kind === 'resolution').length !== 1) invalid();
  if (!terminal && events.some((event) => event.kind === 'resolution')) invalid();
  const base = {
    caseId, mode, createdAt, history: events, verification, verificationSubmitted,
    ...(acceptedAnswerAt ? { acceptedAnswerAt } : {}),
    ...(resolvedAt ? { resolvedAt } : {}),
  };

  if (teamId === 'experience') {
    const draft = coinDraft(saved.draft);
    const replayed = coinTrial(trial);
    if (acceptedAnswerAt && !submitCoinAnswer(replayed, draft.coin, draft.difference).ok) invalid();
    return { ...base, teamId, draft, trial: { ...replayed, phase: savedPhase } };
  }
  const draft = steedDraft(saved.draft);
  const replayed = steedTrial(trial);
  if (acceptedAnswerAt && !submitSteedAnswer(replayed, draft.answer).ok) invalid();
  return { ...base, teamId, draft, trial: { ...replayed, phase: savedPhase } };
}

export function parseWorkshopState(value: unknown): Result<WorkshopState> {
  try {
    const saved = record(value);
    if (saved.schemaVersion !== 1) invalid();
    if (saved.activeTeam !== 'experience' && saved.activeTeam !== 'framework') invalid();
    if (saved.activeMode !== 'practice' && saved.activeMode !== 'official') invalid();
    const officialAcknowledged = boolean(saved.officialAcknowledged);
    if (saved.activeMode === 'official' && !officialAcknowledged) invalid();
    const slots = record(saved.sessions);
    const experience = record(slots.experience);
    const framework = record(slots.framework);
    const ep = session(experience.practice, 'experience', 'practice');
    const eo = session(experience.official, 'experience', 'official');
    const fp = session(framework.practice, 'framework', 'practice');
    const fo = session(framework.official, 'framework', 'official');
    if (ep.teamId !== 'experience' || eo.teamId !== 'experience' || fp.teamId !== 'framework' || fo.teamId !== 'framework') invalid();
    if (new Set([ep.caseId, eo.caseId, fp.caseId, fo.caseId]).size !== 4) invalid();
    return success({
      schemaVersion: 1, activeTeam: saved.activeTeam, activeMode: saved.activeMode, officialAcknowledged,
      sessions: { experience: { practice: ep, official: eo }, framework: { practice: fp, official: fo } },
    });
  } catch {
    return failure('state-error', 'Saved progress is malformed or uses an unsupported schema.');
  }
}

export function loadWorkshop(storage?: StorageAccess | null): WorkshopBootstrap {
  let available: StorageAccess | null = null;
  let raw: string | null;
  try {
    available = storage === undefined ? window.localStorage : storage;
    if (!available) return { state: createWorkshop(), storage: null, status: 'unavailable' };
    raw = available.getItem(STORAGE_KEY);
  } catch {
    return { state: createWorkshop(), storage: available, status: 'unavailable' };
  }
  if (raw === null) return { state: createWorkshop(), storage: available, status: 'ready' };
  try {
    const parsed = parseWorkshopState(JSON.parse(raw));
    return parsed.ok
      ? { state: parsed.value, storage: available, status: 'ready' }
      : { state: createWorkshop(), storage: available, status: 'recovery' };
  } catch {
    return { state: createWorkshop(), storage: available, status: 'recovery' };
  }
}

export function saveWorkshop(storage: StorageAccess | null, state: WorkshopState): boolean {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
