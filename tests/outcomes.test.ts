import { describe, expect, it } from 'vitest';
import { getOutcome } from '../src/domain/outcomes';
import { workshopReducer } from '../src/state/reducer';
import { acceptedCoins, acceptedSteeds, at, fixtureWorkshop, solve, target } from '../src/test/workshopFixtures';

describe('derived narrative outcomes', () => {
  it('has no outcome before resolution', () => {
    expect(getOutcome(fixtureWorkshop().sessions.experience.practice)).toBeNull();
    expect(getOutcome(acceptedCoins().sessions.experience.practice)).toBeNull();
  });

  it.each(['experience', 'framework'] as const)('derives %s Official rewards without counters or side effects', (teamId) => {
    let state = teamId === 'experience' ? acceptedCoins(fixtureWorkshop(), 'official') : acceptedSteeds(fixtureWorkshop(), 'official');
    state = solve(state, state.sessions[teamId].official);
    const session = state.sessions[teamId].official;
    const before = structuredClone(session);
    const outcome = getOutcome(session);
    expect(outcome?.title).toBe('Core restored');
    expect(outcome?.rewards[0]).toMatch(/1 Rehor intervention/);
    expect(outcome?.rewards[1]).toMatch(/Alliance Surge: 2 shared rerolls/);
    expect(outcome?.rewards[0]).toContain(teamId === 'experience' ? 'ConsoleDot Experience' : 'ConsoleDot Framework');
    expect(outcome?.rewards[1]).toContain(teamId === 'experience' ? 'ConsoleDot Framework' : 'ConsoleDot Experience');
    expect(getOutcome(session)).toEqual(outcome);
    expect(session).toEqual(before);
  });

  it('distinguishes repair rewards from solved rewards', () => {
    let state = acceptedCoins(fixtureWorkshop(), 'official');
    state = workshopReducer(state, { type: 'CONFIRM_REPAIR', target: target(state.sessions.experience.official), confirmations: [true, true, true], at: at(10) });
    const outcome = getOutcome(state.sessions.experience.official);
    expect(outcome?.method).toBe('Restored through cooperation');
    expect(outcome?.rewards[0]).toMatch(/1 Rehor intervention/);
    expect(outcome?.rewards[1]).toMatch(/no additional buff/);
  });
});
