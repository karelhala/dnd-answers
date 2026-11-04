import { describe, expect, it } from 'vitest';
import { deriveOverview, deriveRestoration, restorationFacts } from '../src/domain/restoration';
import type { RestorationFacts } from '../src/domain/restoration';
import type { Phase } from '../src/domain/types';
import type { EventCategory, Mode, WorkshopState } from '../src/state/types';
import { workshopReducer } from '../src/state/reducer';
import { acceptedCoins, acceptedSteeds, at, fixtureWorkshop, solve, target } from '../src/test/workshopFixtures';

function facts(overrides: Partial<RestorationFacts> = {}): RestorationFacts {
  return { teamId: 'experience', mode: 'official', phase: 'playing', observations: 0, ...overrides };
}

describe('public restoration presentation', () => {
  for (const [teamId, quota] of [['experience', 3], ['framework', 7]] as const) {
    it.each([
      ['playing', 0, 0, 'dormant'], ['playing', 1, 0, 'gathering'], ['playing', quota, 1, 'exhausted'],
      ['verification', 1, 2, 'verification'], ['solved', 1, 3, 'solved'], ['repaired', 0, 3, 'repaired'],
    ] as const)(`${teamId}: %s with %i observations`, (phase, observations, currentStep, guidance) => {
      const result = deriveRestoration(facts({ teamId, phase, observations }));
      expect(result.currentStep).toBe(currentStep);
      expect(result.guidance).toBe(guidance);
      expect(result.bypassedSteps).toEqual(phase === 'repaired' ? [0, 1, 2] : []);
      expect(result.complete).toBe(phase === 'solved' || phase === 'repaired');
    });
  }

  it.each([
    ['invalid-input', 'invalid'], ['incorrect-answer', 'incorrect'], ['insufficient-evidence', 'insufficient'],
    ['observed', 'observed'], ['state-error', 'observed'],
  ] as const)('uses typed %s feedback without inspecting answers', (latestCategory, dialogueKey) => {
    expect(deriveRestoration(facts({ observations: 1, latestCategory })).dialogueKey).toBe(dialogueKey);
  });

  it('uses quota fallback, but retains actionable latest failure feedback', () => {
    expect(deriveRestoration(facts({ observations: 3, latestCategory: 'observed' })).dialogueKey).toBe('exhausted');
    expect(deriveRestoration(facts({ observations: 3, latestCategory: 'incorrect-answer' })).dialogueKey).toBe('incorrect');
    expect(deriveRestoration(facts({ observations: 1 })).canSubmitEarly).toBe(true);
    expect(deriveRestoration(facts()).canSubmitEarly).toBe(false);
  });

  it.each(['invalid-input', 'incorrect-answer', 'insufficient-evidence'] as EventCategory[])('phase overrides stale %s failures', (latestCategory) => {
    for (const phase of ['verification', 'solved', 'repaired'] as const) {
      expect(deriveRestoration(facts({ phase, latestCategory })).dialogueKey).toBe(phase);
    }
    expect(deriveRestoration(facts({ phase: 'solved', mode: 'practice', latestCategory })).dialogueKey).toBe('training');
  });

  it('incomplete verification reflects latest result and stays unchanged by edits', () => {
    let state = acceptedCoins();
    const session = state.sessions.experience.practice;
    state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: target(session), at: at(3) });
    const before = restorationFacts(state.sessions.experience.practice);
    state = workshopReducer(state, { type: 'EDIT_VERIFICATION', target: target(session), answers: {} });
    expect(restorationFacts(state.sessions.experience.practice)).toEqual(before);
    expect(deriveRestoration(before).dialogueKey).toBe('incomplete');
  });

  it('ignores hidden case changes and form edits for both puzzles', () => {
    const state = fixtureWorkshop();
    const coins = state.sessions.experience.practice;
    const steeds = state.sessions.framework.practice;
    expect(restorationFacts({ ...coins, trial: { ...coins.trial, case: { oddCoin: 'L', difference: 'lighter' } }, draft: { ...coins.draft, coin: 'L' } })).toEqual(restorationFacts(coins));
    expect(restorationFacts({ ...steeds, trial: { ...steeds.trial, case: { ranking: [...steeds.trial.case.ranking].reverse() } }, draft: { ...steeds.draft, answer: ['Y', 'X', 'W'] } })).toEqual(restorationFacts(steeds));
  });
});

describe('mode-aware overview', () => {
  it.each([
    ['solved', 'solved'], ['solved', 'repaired'], ['repaired', 'solved'], ['repaired', 'repaired'],
  ] as const)('Official readiness accepts %s / %s', (memory, judgment) => {
    const state = fixtureWorkshop();
    // Presentation-only phase matrix; integration tests use reducer-valid saved states.
    const withPhases: WorkshopState = {
      ...state, activeMode: 'official', sessions: {
        experience: { ...state.sessions.experience, official: { ...state.sessions.experience.official, trial: { ...state.sessions.experience.official.trial, phase: memory } } },
        framework: { ...state.sessions.framework, official: { ...state.sessions.framework.official, trial: { ...state.sessions.framework.official.trial, phase: judgment } } },
      },
    };
    expect(deriveOverview(withPhases)).toMatchObject({ bothRestored: true, officialReady: true, centralStatus: 'Both cores operational' });
    expect(deriveOverview({ ...withPhases, activeMode: 'practice' })).toMatchObject({ bothRestored: false, officialReady: false });
  });

  it.each(['playing', 'verification'] as Phase[])('one unresolved %s Official core prevents readiness', (phase) => {
    const state = fixtureWorkshop();
    const overview = deriveOverview({ ...state, activeMode: 'official', sessions: {
      ...state.sessions, experience: { ...state.sessions.experience, official: { ...state.sessions.experience.official, trial: { ...state.sessions.experience.official.trial, phase: 'solved' } } },
      framework: { ...state.sessions.framework, official: { ...state.sessions.framework.official, trial: { ...state.sessions.framework.official.trial, phase } } },
    } });
    expect(overview.officialReady).toBe(false);
    expect(overview.centralStatus).toBe('One core restored');
  });

  it('Practice success never restores Official; team switching only changes emphasis', () => {
    let state = acceptedCoins();
    state = solve(state, state.sessions.experience.practice);
    state = acceptedSteeds(state);
    state = solve(state, state.sessions.framework.practice);
    expect(deriveOverview(state)).toMatchObject({ simulation: true, bothRestored: true, officialReady: false });
    const switched = workshopReducer(state, { type: 'SELECT_TEAM', teamId: 'framework' });
    expect(deriveOverview(switched).cores.map((core) => core.complete)).toEqual([true, true]);
    expect(deriveOverview(switched).cores.map((core) => core.active)).toEqual([false, true]);
    expect(deriveOverview(workshopReducer(switched, { type: 'ACKNOWLEDGE_OFFICIAL' })).bothRestored).toBe(false);
  });

  it.each(['practice', 'official'] as Mode[])('derivation never mutates %s state or history', (mode) => {
    let state = acceptedCoins(fixtureWorkshop(), mode);
    state = workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: target(state.sessions.experience[mode]), at: at(3) });
    const before = structuredClone(state);
    deriveOverview(state);
    deriveRestoration(restorationFacts(state.sessions.experience[mode]));
    expect(state).toEqual(before);
  });
});
