import { coinQuestions, steedQuestions } from '../content/questions';
import { createWorkshop } from '../state/createWorkshop';
import { workshopReducer } from '../state/reducer';
import type { Mode, SessionTarget, TrialSession, WorkshopState } from '../state/types';
import { canonicalStrategy } from './fixtures';

export const createdAt = '2026-11-04T12:00:00.000Z';
export const at = (second: number) => new Date(Date.parse(createdAt) + second * 1000).toISOString();

export function fixtureWorkshop(prefix = 'case'): WorkshopState {
  let index = 0;
  return createWorkshop({ random: () => 0, now: () => createdAt, id: () => `${prefix}-${++index}` });
}

export function target(session: TrialSession): SessionTarget {
  return { teamId: session.teamId, mode: session.mode, caseId: session.caseId };
}

export function acceptedCoins(state = fixtureWorkshop(), mode: Mode = 'practice'): WorkshopState {
  if (mode === 'official') state = workshopReducer(state, { type: 'ACKNOWLEDGE_OFFICIAL' });
  const session = state.sessions.experience[mode];
  const where = target(session);
  state = workshopReducer(state, {
    type: 'EDIT_COIN_DRAFT', target: where,
    draft: { left: ['C'], right: ['D'], coin: session.trial.case.oddCoin, difference: session.trial.case.difference },
  });
  state = workshopReducer(state, { type: 'WEIGH_COINS', target: where, at: at(1) });
  return workshopReducer(state, { type: 'SUBMIT_COIN_ANSWER', target: where, at: at(2) });
}

export function acceptedSteeds(state = fixtureWorkshop(), mode: Mode = 'practice'): WorkshopState {
  if (mode === 'official') state = workshopReducer(state, { type: 'ACKNOWLEDGE_OFFICIAL' });
  const session = state.sessions.framework[mode];
  const where = target(session);
  const canonical = canonicalStrategy(session.trial.case);
  for (const race of canonical.observations) {
    state = workshopReducer(state, {
      type: 'EDIT_STEED_DRAFT', target: where,
      draft: { participants: race.order, answer: ['', '', ''] },
    });
    state = workshopReducer(state, { type: 'RACE_STEEDS', target: where, at: at(race.number) });
  }
  const [first, second, third] = session.trial.case.ranking;
  state = workshopReducer(state, {
    type: 'EDIT_STEED_DRAFT', target: where,
    draft: { participants: [], answer: [first, second, third] },
  });
  return workshopReducer(state, { type: 'SUBMIT_STEED_ANSWER', target: where, at: at(8) });
}

export function solve(state: WorkshopState, session: TrialSession, second = 20): WorkshopState {
  const questions = session.teamId === 'experience' ? coinQuestions : steedQuestions;
  state = workshopReducer(state, {
    type: 'EDIT_VERIFICATION', target: target(session),
    answers: Object.fromEntries(questions.map((question) => [question.id, question.correctIds])),
  });
  return workshopReducer(state, { type: 'SUBMIT_VERIFICATION', target: target(session), at: at(second) });
}
