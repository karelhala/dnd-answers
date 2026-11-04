import { coinQuestions, steedQuestions } from '../content/questions';
import { isCoinId, submitCoinAnswer, weighCoins } from '../domain/coins';
import { isSteedId, raceSteeds, submitSteedAnswer } from '../domain/steeds';
import { gradeVerification } from '../domain/verification';
import { HISTORY_LIMIT } from './types';
import type { AttemptEvent, QuestionDrafts, TrialSession, WorkshopAction, WorkshopState } from './types';

export function validQuestionDrafts(puzzle: 'coins' | 'steeds', answers: QuestionDrafts): boolean {
  const questions = puzzle === 'coins' ? coinQuestions : steedQuestions;
  return Object.entries(answers).every(([id, values]) => {
    const question = questions.find((item) => item.id === id);
    return question && new Set(values).size === values.length &&
      values.every((value) => question.options.some((option) => option.id === value));
  });
}

function replaceSession(state: WorkshopState, session: TrialSession): WorkshopState {
  if (session.teamId === 'experience') {
    return { ...state, sessions: { ...state.sessions, experience: { ...state.sessions.experience, [session.mode]: session } } };
  }
  return { ...state, sessions: { ...state.sessions, framework: { ...state.sessions.framework, [session.mode]: session } } };
}

function appendEvent(session: TrialSession, event: AttemptEvent): TrialSession {
  return { ...session, history: [...session.history, event].slice(-HISTORY_LIMIT) };
}

function allSessions(state: WorkshopState): TrialSession[] {
  return [...Object.values(state.sessions.experience), ...Object.values(state.sessions.framework)];
}

function isFresh(session: TrialSession, state: WorkshopState): boolean {
  return session.trial.phase === 'playing' && session.trial.observations.length === 0 &&
    session.history.length === 0 && !session.acceptedAnswerAt && !session.resolvedAt &&
    Object.keys(session.verification).length === 0 && !session.verificationSubmitted &&
    (session.teamId === 'experience'
      ? session.draft.left.length === 0 && session.draft.right.length === 0 && session.draft.coin === '' && session.draft.difference === ''
      : session.draft.participants.length === 0 && session.draft.answer.every((id) => id === '')) &&
    !allSessions(state).some((existing) => existing.caseId === session.caseId);
}

export function workshopReducer(state: WorkshopState, action: WorkshopAction): WorkshopState {
  switch (action.type) {
    case 'SELECT_TEAM':
      return action.teamId === state.activeTeam ? state : { ...state, activeTeam: action.teamId };
    case 'SELECT_MODE':
      if (action.mode === 'official' && !state.officialAcknowledged) return state;
      return action.mode === state.activeMode ? state : { ...state, activeMode: action.mode };
    case 'ACKNOWLEDGE_OFFICIAL':
      return state.officialAcknowledged && state.activeMode === 'official'
        ? state : { ...state, officialAcknowledged: true, activeMode: 'official' };
    case 'RESET_WORKSHOP': {
      const replacements = allSessions(action.replacement);
      return action.confirmed && action.replacement.activeTeam === 'experience' &&
        action.replacement.activeMode === 'practice' && !action.replacement.officialAcknowledged &&
        replacements.every((session) => isFresh(session, state)) &&
        new Set(replacements.map((session) => session.caseId)).size === 4
        ? action.replacement : state;
    }
    case 'RESET_TEAM': {
      const [practice, official] = action.replacements;
      if (!action.confirmed || practice.teamId !== action.teamId || official.teamId !== action.teamId ||
          practice.mode !== 'practice' || official.mode !== 'official' || practice.caseId === official.caseId ||
          !isFresh(practice, state) || !isFresh(official, state)) return state;
      return replaceSession(replaceSession(state, practice), official);
    }
  }

  const session = state.sessions[action.target.teamId][action.target.mode];
  // Explicit case identity prevents delayed actions from modifying a replacement case.
  if (session.caseId !== action.target.caseId) return state;
  if (session.mode === 'official' && !state.officialAcknowledged) return state;
  if (action.type === 'START_NEW_CASE') {
    const next = action.replacement;
    return action.confirmed && next.teamId === session.teamId && next.mode === session.mode && isFresh(next, state)
      ? replaceSession(state, next) : state;
  }
  if (session.trial.phase === 'solved' || session.trial.phase === 'repaired') return state;

  if (action.type === 'EDIT_COIN_DRAFT') {
    const draft = action.draft;
    const validPan = (ids: readonly string[]) => ids.length <= 12 && new Set(ids).size === ids.length && ids.every(isCoinId);
    const valid = validPan(draft.left) && validPan(draft.right) &&
      (draft.coin === '' || isCoinId(draft.coin)) && ['', 'heavier', 'lighter'].includes(draft.difference);
    return session.teamId === 'experience' && session.trial.phase === 'playing' && valid
      ? replaceSession(state, { ...session, draft: structuredClone(action.draft) }) : state;
  }
  if (action.type === 'EDIT_STEED_DRAFT') {
    const draft = action.draft;
    const valid = draft.participants.length <= 25 && new Set(draft.participants).size === draft.participants.length &&
      draft.participants.every(isSteedId) && draft.answer.length === 3 && draft.answer.every((id) => id === '' || isSteedId(id));
    return session.teamId === 'framework' && session.trial.phase === 'playing' && valid
      ? replaceSession(state, { ...session, draft: structuredClone(action.draft) }) : state;
  }
  if (action.type === 'EDIT_VERIFICATION') {
    return session.trial.phase === 'verification' && validQuestionDrafts(session.trial.puzzle, action.answers)
      ? replaceSession(state, { ...session, verification: structuredClone(action.answers), verificationSubmitted: false }) : state;
  }
  const previousTime = session.history.at(-1)?.at ?? session.createdAt;
  if (!Number.isFinite(Date.parse(action.at)) || new Date(action.at).toISOString() !== action.at || action.at < previousTime) return state;
  const event = (kind: AttemptEvent['kind'], category: AttemptEvent['category'], message: string): AttemptEvent =>
    ({ caseId: session.caseId, at: action.at, kind, category, message });
  const record = (next: TrialSession, entry: AttemptEvent) => replaceSession(state, appendEvent(next, entry));

  if (action.type === 'CONFIRM_REPAIR') {
    if (session.mode !== 'official' || action.confirmations.length !== 3 || !action.confirmations.every((answer) => answer === true)) return state;
    return record(
      { ...session, trial: { ...session.trial, phase: 'repaired' }, resolvedAt: action.at } as TrialSession,
      event('resolution', 'repaired', 'Restored through cooperation.'),
    );
  }
  if (action.type === 'SUBMIT_VERIFICATION') {
    if (session.trial.phase !== 'verification') return state;
    const grading = gradeVerification(session.trial.puzzle, session.verification);
    const next = { ...session, verificationSubmitted: true };
    return grading.passed
      ? record(
          { ...next, trial: { ...next.trial, phase: 'solved' }, resolvedAt: action.at } as TrialSession,
          event('resolution', 'solved', 'Puzzle verified. Core restored.'),
        )
      : record(next, event('verification', 'verification-incomplete', 'Verification incomplete. Review both questions and try again.'));
  }

  if (session.trial.phase !== 'playing') return state;
  const isObservation = action.type === 'WEIGH_COINS' || action.type === 'RACE_STEEDS';
  let next: TrialSession;
  if (session.teamId === 'experience' && (action.type === 'WEIGH_COINS' || action.type === 'SUBMIT_COIN_ANSWER')) {
    const result = action.type === 'WEIGH_COINS'
      ? weighCoins(session.trial, session.draft.left, session.draft.right)
      : submitCoinAnswer(session.trial, session.draft.coin, session.draft.difference);
    if (!result.ok) return record(session, event(result.category === 'invalid-input' ? 'error' : 'answer', result.category, result.message));
    next = { ...session, trial: result.value };
  } else if (session.teamId === 'framework' && (action.type === 'RACE_STEEDS' || action.type === 'SUBMIT_STEED_ANSWER')) {
    const result = action.type === 'RACE_STEEDS'
      ? raceSteeds(session.trial, session.draft.participants)
      : submitSteedAnswer(session.trial, session.draft.answer);
    if (!result.ok) return record(session, event(result.category === 'invalid-input' ? 'error' : 'answer', result.category, result.message));
    next = { ...session, trial: result.value };
  } else return state;
  if (!isObservation) next = { ...next, acceptedAnswerAt: action.at };
  return record(next, isObservation
    ? event('observation', 'observed', 'Observation recorded.')
    : event('answer', 'accepted', 'Answer accepted. Complete both verification questions.'));
}
