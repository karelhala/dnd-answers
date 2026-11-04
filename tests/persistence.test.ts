import { describe, expect, it, vi } from 'vitest';
import { loadWorkshop, parseWorkshopState, saveWorkshop, STORAGE_KEY } from '../src/state/persistence';
import type { StorageAccess } from '../src/state/persistence';
import { workshopReducer } from '../src/state/reducer';
import type { WorkshopState } from '../src/state/types';
import { unwrap } from '../src/test/fixtures';
import { acceptedCoins, acceptedSteeds, at, fixtureWorkshop, solve, target } from '../src/test/workshopFixtures';

type Mutable<T> = { -readonly [K in keyof T]: T[K] extends object ? Mutable<T[K]> : T[K] };
function editable(state: WorkshopState): Mutable<WorkshopState> {
  return structuredClone(state) as Mutable<WorkshopState>;
}

function memoryStorage(raw: string | null = null) {
  let value = raw;
  return {
    getItem: vi.fn((key: string) => key === STORAGE_KEY ? value : null),
    setItem: vi.fn((key: string, next: string) => { if (key === STORAGE_KEY) value = next; }),
  };
}

describe('persistence round trips', () => {
  it('restores playing drafts, switches, and acknowledgment exactly', () => {
    let state = fixtureWorkshop();
    state = workshopReducer(state, { type: 'EDIT_COIN_DRAFT', target: target(state.sessions.experience.practice), draft: { left: ['A', 'B'], right: ['C'], coin: '', difference: 'lighter' } });
    state = workshopReducer(state, { type: 'EDIT_STEED_DRAFT', target: target(state.sessions.framework.official), draft: { participants: ['A'], answer: ['A', '', 'A'] } });
    // Official editing is blocked until acknowledgment.
    expect(state.sessions.framework.official.draft.participants).toEqual([]);
    state = workshopReducer(state, { type: 'ACKNOWLEDGE_OFFICIAL' });
    state = workshopReducer(state, { type: 'SELECT_TEAM', teamId: 'framework' });
    state = workshopReducer(state, { type: 'EDIT_STEED_DRAFT', target: target(state.sessions.framework.official), draft: { participants: ['A'], answer: ['A', '', 'A'] } });
    const storage = memoryStorage();
    expect(saveWorkshop(storage, state)).toBe(true);
    expect(loadWorkshop(storage)).toEqual({ state, storage, status: 'ready' });
  });

  it.each(['practice', 'official'] as const)('restores accepted and solved coin sessions in %s', (mode) => {
    let state = acceptedCoins(fixtureWorkshop(), mode);
    expect(unwrap(parseWorkshopState(state))).toEqual(state);
    state = solve(state, state.sessions.experience[mode]);
    expect(unwrap(parseWorkshopState(JSON.parse(JSON.stringify(state))))).toEqual(state);
  });

  it.each(['practice', 'official'] as const)('restores evidence-supported accepted and solved steeds in %s', (mode) => {
    let state = acceptedSteeds(fixtureWorkshop(), mode);
    expect(unwrap(parseWorkshopState(state))).toEqual(state);
    state = solve(state, state.sessions.framework[mode]);
    expect(unwrap(parseWorkshopState(JSON.parse(JSON.stringify(state))))).toEqual(state);
  });

  it.each(['playing', 'verification'] as const)('restores Official repair from %s without conflating it with solving', (phase) => {
    let state = phase === 'verification'
      ? acceptedCoins(fixtureWorkshop(), 'official')
      : workshopReducer(fixtureWorkshop(), { type: 'ACKNOWLEDGE_OFFICIAL' });
    state = workshopReducer(state, { type: 'CONFIRM_REPAIR', target: target(state.sessions.experience.official), at: at(10), confirmations: [true, true, true] });
    expect(unwrap(parseWorkshopState(state))).toEqual(state);
    expect(state.sessions.experience.official.trial.phase).toBe('repaired');
  });

  it('restores a bounded history even when its original acceptance event was trimmed', () => {
    let state = acceptedCoins();
    const where = target(state.sessions.experience.practice);
    for (let step = 3; step < 150; step += 1) state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(step) });
    state = solve(state, state.sessions.experience.practice, 150);
    expect(unwrap(parseWorkshopState(state))).toEqual(state);
  });

  it('loads valid state without generating any new case or writing storage', () => {
    const state = acceptedSteeds();
    const storage = memoryStorage(JSON.stringify(state));
    const random = vi.spyOn(crypto, 'getRandomValues');
    const ids = vi.spyOn(crypto, 'randomUUID');
    expect(loadWorkshop(storage).state).toEqual(state);
    expect(random).not.toHaveBeenCalled();
    expect(ids).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('drops unknown properties instead of carrying unrelated data into state', () => {
    const state = fixtureWorkshop();
    const parsed = unwrap(parseWorkshopState({ ...state, unrelated: 'discard me' }));
    expect(parsed).toEqual(state);
    expect(parsed).not.toHaveProperty('unrelated');
  });
});

describe('untrusted saved records', () => {
  const mutations: { name: string; change: (state: Mutable<WorkshopState>) => void }[] = [
    { name: 'unsupported schema', change: (s) => { s.schemaVersion = 2 as never; } },
    { name: 'unknown team', change: (s) => { s.activeTeam = 'other' as never; } },
    { name: 'unknown mode', change: (s) => { s.activeMode = 'other' as never; } },
    { name: 'Official without acknowledgment', change: (s) => { s.activeMode = 'official'; } },
    { name: 'wrong slot team', change: (s) => { s.sessions.experience.practice.teamId = 'framework' as never; } },
    { name: 'wrong slot mode', change: (s) => { s.sessions.experience.practice.mode = 'official'; } },
    { name: 'cross-puzzle variant', change: (s) => { s.sessions.experience.practice.trial.puzzle = 'steeds' as never; } },
    { name: 'duplicate case IDs', change: (s) => { s.sessions.experience.official.caseId = s.sessions.experience.practice.caseId; } },
    { name: 'unknown coin', change: (s) => { s.sessions.experience.practice.trial.case.oddCoin = 'Z' as never; } },
    { name: 'unknown weight direction', change: (s) => { s.sessions.experience.practice.trial.case.difference = 'normal' as never; } },
    { name: 'short steed ranking', change: (s) => { s.sessions.framework.practice.trial.case.ranking.pop(); } },
    { name: 'duplicate steed ranking', change: (s) => { s.sessions.framework.practice.trial.case.ranking[0] = s.sessions.framework.practice.trial.case.ranking[1]; } },
    { name: 'unknown steed', change: (s) => { s.sessions.framework.practice.trial.case.ranking[0] = 'Z' as never; } },
    { name: 'unknown phase', change: (s) => { s.sessions.experience.practice.trial.phase = 'unknown' as never; } },
    { name: 'fake solved outcome', change: (s) => { s.sessions.experience.practice.trial.phase = 'solved'; } },
    { name: 'Practice repair', change: (s) => { s.sessions.experience.practice.trial.phase = 'repaired'; s.sessions.experience.practice.resolvedAt = at(5); } },
    { name: 'accepted timestamp without answer', change: (s) => { s.sessions.experience.practice.acceptedAnswerAt = at(1); } },
    { name: 'early resolution time', change: (s) => { s.sessions.experience.practice.resolvedAt = at(-1); } },
    { name: 'bad timestamp', change: (s) => { s.sessions.experience.practice.createdAt = 'not a date'; } },
    { name: 'duplicate pan draft', change: (s) => { s.sessions.experience.practice.draft.left = ['A', 'A']; } },
    { name: 'unknown draft coin', change: (s) => { s.sessions.experience.practice.draft.coin = 'Z' as never; } },
    { name: 'short answer draft', change: (s) => { s.sessions.framework.practice.draft.answer.pop(); } },
    { name: 'unknown question', change: (s) => { s.sessions.experience.practice.verification = { unknown: [] }; } },
    { name: 'premature question drafts', change: (s) => { s.sessions.experience.practice.verification = { 'coin-case-count': ['cases-24'] }; } },
  ];

  it.each(mutations)('rejects $name', ({ change }) => {
    const state = editable(fixtureWorkshop());
    change(state);
    expect(parseWorkshopState(state)).toMatchObject({ ok: false, category: 'state-error' });
  });

  it('replays observations and rejects fabricated outcomes, numbering, or excess quota', () => {
    const state = acceptedCoins();
    const outcome = editable(state);
    outcome.sessions.experience.practice.trial.observations[0].outcome = 'left-heavy';
    expect(parseWorkshopState(outcome).ok).toBe(false);
    const numbering = editable(state);
    numbering.sessions.experience.practice.trial.observations[0].number = 2;
    expect(parseWorkshopState(numbering).ok).toBe(false);
    const tooMany = editable(state);
    const observation = tooMany.sessions.experience.practice.trial.observations[0];
    tooMany.sessions.experience.practice.trial.observations = Array.from({ length: 4 }, (_, i) => ({ ...observation, number: i + 1 }));
    expect(parseWorkshopState(tooMany).ok).toBe(false);
    const pans = editable(state);
    pans.sessions.experience.practice.trial.observations[0].left = ['A', 'A'];
    expect(parseWorkshopState(pans).ok).toBe(false);
  });

  it('rejects accepted-but-wrong coins and unsupported steed answers', () => {
    const wrongCoin = editable(acceptedCoins());
    wrongCoin.sessions.experience.practice.draft.coin = 'B';
    expect(parseWorkshopState(wrongCoin).ok).toBe(false);
    const unsupported = editable(acceptedSteeds());
    unsupported.sessions.framework.practice.trial.observations.pop();
    expect(parseWorkshopState(unsupported).ok).toBe(false);
    const impossibleRace = editable(acceptedSteeds());
    impossibleRace.sessions.framework.practice.trial.observations[0].order.reverse();
    expect(parseWorkshopState(impossibleRace).ok).toBe(false);
  });

  it('rejects incomplete solved verification, unknown options, duplicate selections, and mismatched resolution', () => {
    const accepted = acceptedCoins();
    const solved = solve(accepted, accepted.sessions.experience.practice);
    const brokenAnswers: Record<string, string[]>[] = [{}, { 'coin-case-count': ['unknown'] }, { 'coin-case-count': ['cases-24', 'cases-24'] }];
    for (const verification of brokenAnswers) {
      const corrupt = editable(solved);
      corrupt.sessions.experience.practice.verification = verification;
      expect(parseWorkshopState(corrupt).ok).toBe(false);
    }
    const resolution = editable(solved);
    resolution.sessions.experience.practice.history.at(-1)!.category = 'repaired';
    expect(parseWorkshopState(resolution).ok).toBe(false);
    const timestamp = editable(solved);
    timestamp.sessions.experience.practice.resolvedAt = at(1);
    expect(parseWorkshopState(timestamp).ok).toBe(false);
  });

  it('rejects malformed history, wrong case IDs, and out-of-order events', () => {
    const state = acceptedCoins();
    const wrongCase = editable(state);
    wrongCase.sessions.experience.practice.history[0].caseId = 'other';
    expect(parseWorkshopState(wrongCase).ok).toBe(false);
    const time = editable(state);
    time.sessions.experience.practice.history[1].at = at(0);
    expect(parseWorkshopState(time).ok).toBe(false);
    const kind = editable(state);
    kind.sessions.experience.practice.history[0].category = 'solved';
    expect(parseWorkshopState(kind).ok).toBe(false);
  });

  it.each([null, [], 'string', 42, {}, { sessions: null }])('rejects malformed roots: %j', (raw) => {
    expect(parseWorkshopState(raw).ok).toBe(false);
  });
});

describe('storage recovery', () => {
  it.each(['{broken', 'null', JSON.stringify({ schemaVersion: 2 })])('preserves unreadable record %s until explicit recovery', (raw) => {
    const storage = memoryStorage(raw);
    const loaded = loadWorkshop(storage);
    expect(loaded.status).toBe('recovery');
    expect(loaded.state.sessions.experience.practice.trial.phase).toBe('playing');
    expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('uses in-memory state when reads or writes fail', () => {
    const storage: StorageAccess = {
      getItem: () => { throw new DOMException('Denied', 'SecurityError'); },
      setItem: () => { throw new DOMException('Full', 'QuotaExceededError'); },
    };
    expect(loadWorkshop(storage).status).toBe('unavailable');
    expect(loadWorkshop(null).status).toBe('unavailable');
    expect(saveWorkshop(storage, fixtureWorkshop())).toBe(false);
    expect(saveWorkshop(null, fixtureWorkshop())).toBe(false);
  });

  it('creates a fresh Practice workshop only when no record exists', () => {
    const storage = memoryStorage();
    const loaded = loadWorkshop(storage);
    expect(loaded.status).toBe('ready');
    expect(loaded.state.activeMode).toBe('practice');
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
