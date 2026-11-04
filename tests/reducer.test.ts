import { describe, expect, it, vi } from 'vitest';
import { coinQuestions } from '../src/content/questions';
import { createSession } from '../src/state/createWorkshop';
import { workshopReducer } from '../src/state/reducer';
import { HISTORY_LIMIT } from '../src/state/types';
import { acceptedCoins, acceptedSteeds, at, fixtureWorkshop, solve, target } from '../src/test/workshopFixtures';

describe('workshop reducer', () => {
  it('creates four distinct slots and blocks Official selection until acknowledgment', () => {
    const state = fixtureWorkshop();
    const sessions = [...Object.values(state.sessions.experience), ...Object.values(state.sessions.framework)];
    expect(new Set(sessions.map((session) => session.caseId)).size).toBe(4);
    expect(workshopReducer(state, { type: 'SELECT_MODE', mode: 'official' })).toBe(state);
    const acknowledged = workshopReducer(state, { type: 'ACKNOWLEDGE_OFFICIAL' });
    expect(acknowledged.activeMode).toBe('official');
    expect(acknowledged.officialAcknowledged).toBe(true);
    expect(acknowledged.sessions).toBe(state.sessions);
  });

  it('keeps drafts and cases isolated through team and mode switches without generating randomness', () => {
    let state = fixtureWorkshop();
    const original = state;
    const random = vi.spyOn(crypto, 'getRandomValues');
    const ids = vi.spyOn(crypto, 'randomUUID');
    state = workshopReducer(state, {
      type: 'EDIT_COIN_DRAFT', target: target(state.sessions.experience.practice),
      draft: { left: ['A', 'B'], right: ['C', 'D'], coin: 'E', difference: 'lighter' },
    });
    state = workshopReducer(state, { type: 'SELECT_TEAM', teamId: 'framework' });
    state = workshopReducer(state, {
      type: 'EDIT_STEED_DRAFT', target: target(state.sessions.framework.practice),
      draft: { participants: ['A', 'Y'], answer: ['Y', '', 'A'] },
    });
    state = workshopReducer(state, { type: 'ACKNOWLEDGE_OFFICIAL' });
    state = workshopReducer(state, { type: 'SELECT_TEAM', teamId: 'experience' });
    state = workshopReducer(state, { type: 'SELECT_MODE', mode: 'practice' });
    expect(state.sessions.experience.practice.draft.left).toEqual(['A', 'B']);
    expect(state.sessions.framework.practice.draft.answer).toEqual(['Y', '', 'A']);
    expect(state.sessions.experience.official).toBe(original.sessions.experience.official);
    expect(state.sessions.framework.official).toBe(original.sessions.framework.official);
    expect(state.sessions.experience.practice.trial.case).toBe(original.sessions.experience.practice.trial.case);
    expect(random).not.toHaveBeenCalled();
    expect(ids).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('records invalid input without consuming observation quota or discarding drafts', () => {
    let state = fixtureWorkshop();
    const where = target(state.sessions.experience.practice);
    state = workshopReducer(state, {
      type: 'EDIT_COIN_DRAFT', target: where,
      draft: { left: ['A', 'B'], right: ['C'], coin: '', difference: '' },
    });
    state = workshopReducer(state, { type: 'WEIGH_COINS', target: where, at: at(1) });
    expect(state.sessions.experience.practice.trial.observations).toEqual([]);
    expect(state.sessions.experience.practice.draft.left).toEqual(['A', 'B']);
    expect(state.sessions.experience.practice.history.at(-1)).toMatchObject({ kind: 'error', category: 'invalid-input' });
  });

  it('enforces quota in state logic while allowing answer correction after the final weighing', () => {
    let state = fixtureWorkshop();
    const where = target(state.sessions.experience.practice);
    state = workshopReducer(state, { type: 'EDIT_COIN_DRAFT', target: where, draft: { left: ['A'], right: ['B'], coin: 'B', difference: 'heavier' } });
    for (let step = 1; step <= 4; step += 1) state = workshopReducer(state, { type: 'WEIGH_COINS', target: where, at: at(step) });
    expect(state.sessions.experience.practice.trial.observations).toHaveLength(3);
    state = workshopReducer(state, { type: 'SUBMIT_COIN_ANSWER', target: where, at: at(5) });
    expect(state.sessions.experience.practice.trial.phase).toBe('playing');
    expect(state.sessions.experience.practice.history.at(-1)?.category).toBe('incorrect-answer');
    state = workshopReducer(state, { type: 'EDIT_COIN_DRAFT', target: where, draft: { ...state.sessions.experience.practice.draft, coin: 'A' } });
    state = workshopReducer(state, { type: 'SUBMIT_COIN_ANSWER', target: where, at: at(6) });
    expect(state.sessions.experience.practice.trial.phase).toBe('verification');
  });

  it('accepts supported steeds and freezes evidence while questions remain correctable', () => {
    let state = acceptedSteeds();
    const session = state.sessions.framework.practice;
    const where = target(session);
    expect(session.trial.phase).toBe('verification');
    expect(session.acceptedAnswerAt).toBe(at(8));
    expect(session.trial.observations).toHaveLength(7);
    expect(workshopReducer(state, { type: 'RACE_STEEDS', target: where, at: at(9) })).toBe(state);
    expect(workshopReducer(state, { type: 'EDIT_STEED_DRAFT', target: where, draft: { participants: [], answer: ['', '', ''] } })).toBe(state);
    state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(9) });
    expect(state.sessions.framework.practice.trial.phase).toBe('verification');
    expect(state.sessions.framework.practice.verificationSubmitted).toBe(true);
    state = solve(state, state.sessions.framework.practice);
    expect(state.sessions.framework.practice.trial.phase).toBe('solved');
    expect(state.sessions.framework.practice.trial.observations).toBe(session.trial.observations);
    expect(state.sessions.framework.official.trial.phase).toBe('playing');
  });

  it('requires both questions, retains answers on failure, and isolates practice success', () => {
    let state = acceptedCoins();
    const where = target(state.sessions.experience.practice);
    state = workshopReducer(state, {
      type: 'EDIT_VERIFICATION', target: where,
      answers: { [coinQuestions[0].id]: coinQuestions[0].correctIds },
    });
    state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(3) });
    expect(state.sessions.experience.practice.trial.phase).toBe('verification');
    expect(state.sessions.experience.practice.verification[coinQuestions[0].id]).toEqual(coinQuestions[0].correctIds);
    state = solve(state, state.sessions.experience.practice);
    expect(state.sessions.experience.practice.trial.phase).toBe('solved');
    expect(state.sessions.experience.practice.resolvedAt).toBe(at(20));
    expect(state.sessions.experience.official.trial.phase).toBe('playing');
  });

  it.each(['playing', 'verification'] as const)('allows explicit Official repair from %s and prevents repeat resolution', (phase) => {
    let state = phase === 'playing'
      ? workshopReducer(fixtureWorkshop(), { type: 'ACKNOWLEDGE_OFFICIAL' })
      : acceptedCoins(fixtureWorkshop(), 'official');
    const where = target(state.sessions.experience.official);
    expect(workshopReducer(state, { type: 'CONFIRM_REPAIR', target: where, at: at(10), confirmations: [true, false, true] })).toBe(state);
    state = workshopReducer(state, { type: 'CONFIRM_REPAIR', target: where, at: at(10), confirmations: [true, true, true] });
    expect(state.sessions.experience.official.trial.phase).toBe('repaired');
    expect(state.sessions.experience.official.history.at(-1)?.category).toBe('repaired');
    expect(workshopReducer(state, { type: 'CONFIRM_REPAIR', target: where, at: at(11), confirmations: [true, true, true] })).toBe(state);
    expect(workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(12) })).toBe(state);
  });

  it('rejects Practice repair, premature questions, and unknown verification options', () => {
    let state = fixtureWorkshop();
    const where = target(state.sessions.experience.practice);
    expect(workshopReducer(state, { type: 'CONFIRM_REPAIR', target: where, at: at(1), confirmations: [true, true, true] })).toBe(state);
    expect(workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(1) })).toBe(state);
    state = acceptedCoins(state);
    expect(workshopReducer(state, { type: 'EDIT_VERIFICATION', target: where, answers: { unknown: ['unknown'] } })).toBe(state);
    expect(workshopReducer(state, { type: 'EDIT_VERIFICATION', target: where, answers: { [coinQuestions[0].id]: ['unknown'] } })).toBe(state);
  });

  it('makes solved outcomes terminal and idempotent without mutable reward counters', () => {
    let state = acceptedCoins(fixtureWorkshop(), 'official');
    state = solve(state, state.sessions.experience.official);
    const where = target(state.sessions.experience.official);
    expect(workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(21) })).toBe(state);
    expect(workshopReducer(state, { type: 'CONFIRM_REPAIR', target: where, at: at(21), confirmations: [true, true, true] })).toBe(state);
    expect(state.sessions.experience.official.history.filter((event) => event.kind === 'resolution')).toHaveLength(1);
    expect(state).not.toHaveProperty('rewards');
  });

  it('resets only the confirmed scope and ignores stale actions and reused case IDs', () => {
    let state = acceptedCoins();
    const old = state;
    const where = target(state.sessions.experience.practice);
    const replacements = fixtureWorkshop('replacement');
    const replacement = replacements.sessions.experience.practice;
    expect(workshopReducer(state, { type: 'START_NEW_CASE', target: where, replacement, confirmed: false })).toBe(state);
    expect(workshopReducer(state, { type: 'START_NEW_CASE', target: where, replacement: old.sessions.experience.practice, confirmed: true })).toBe(state);
    state = workshopReducer(state, { type: 'START_NEW_CASE', target: where, replacement, confirmed: true });
    expect(state.sessions.experience.practice).toBe(replacement);
    expect(state.sessions.experience.official).toBe(old.sessions.experience.official);
    expect(state.sessions.framework).toBe(old.sessions.framework);
    expect(workshopReducer(state, { type: 'WEIGH_COINS', target: where, at: at(30) })).toBe(state);

    const next = fixtureWorkshop('team-reset');
    const teamReset = { type: 'RESET_TEAM' as const, teamId: 'experience' as const, replacements: [next.sessions.experience.practice, next.sessions.experience.official] as const };
    expect(workshopReducer(state, { ...teamReset, confirmed: false })).toBe(state);
    state = workshopReducer(state, { ...teamReset, confirmed: true });
    expect(state.sessions.experience).toEqual(next.sessions.experience);
    expect(state.sessions.framework).toBe(old.sessions.framework);
    expect(workshopReducer(state, { type: 'RESET_WORKSHOP', replacement: next, confirmed: false })).toBe(state);
    const fresh = fixtureWorkshop('workshop-reset');
    expect(workshopReducer(state, { type: 'RESET_WORKSHOP', replacement: fresh, confirmed: true })).toBe(fresh);
  });

  it('rejects cross-puzzle actions, wrong reset identities, and out-of-order timestamps', () => {
    const state = acceptedCoins();
    expect(workshopReducer(state, { type: 'WEIGH_COINS', target: target(state.sessions.framework.practice), at: at(3) })).toBe(state);
    expect(workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: target(state.sessions.experience.practice), at: at(1) })).toBe(state);
    expect(workshopReducer(state, { type: 'START_NEW_CASE', target: target(state.sessions.experience.practice), replacement: createSession('framework', 'practice'), confirmed: true })).toBe(state);
  });

  it('bounds event logs without dropping grading evidence', () => {
    let state = acceptedCoins();
    const where = target(state.sessions.experience.practice);
    for (let step = 3; step < 150; step += 1) state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: where, at: at(step) });
    expect(state.sessions.experience.practice.history).toHaveLength(HISTORY_LIMIT);
    expect(state.sessions.experience.practice.trial.observations).toHaveLength(1);
    state = solve(state, state.sessions.experience.practice, 150);
    expect(state.sessions.experience.practice.trial.phase).toBe('solved');
    expect(state.sessions.experience.practice.history).toHaveLength(HISTORY_LIMIT);
  });
});
