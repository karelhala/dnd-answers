import { createCoinCase } from '../domain/coins';
import { createSteedCase } from '../domain/steeds';
import type { RandomSource } from '../domain/random';
import type { TeamId } from '../content/teams';
import type { CoinSession, Mode, SteedSession, TrialSession, WorkshopState } from './types';

interface CreationOptions {
  readonly random?: RandomSource;
  readonly id?: () => string;
  readonly now?: () => string;
}

export function createSession(teamId: 'experience', mode: Mode, options?: CreationOptions): CoinSession;
export function createSession(teamId: 'framework', mode: Mode, options?: CreationOptions): SteedSession;
export function createSession(teamId: TeamId, mode: Mode, options?: CreationOptions): TrialSession;
export function createSession(teamId: TeamId, mode: Mode, options: CreationOptions = {}): TrialSession {
  const base = {
    caseId: (options.id ?? (() => globalThis.crypto.randomUUID()))(),
    createdAt: (options.now ?? (() => new Date().toISOString()))(),
    mode,
    history: [],
    verification: {},
    verificationSubmitted: false,
  };
  return teamId === 'experience'
    ? {
        ...base, teamId,
        trial: { puzzle: 'coins', case: createCoinCase(options.random), phase: 'playing', observations: [] },
        draft: { left: [], right: [], coin: '', difference: '' },
      }
    : {
        ...base, teamId,
        trial: { puzzle: 'steeds', case: createSteedCase(options.random), phase: 'playing', observations: [] },
        draft: { participants: [], answer: ['', '', ''] },
      };
}

// Call during bootstrap or explicit reset handlers, never inside the reducer.
export function createWorkshop(options: CreationOptions = {}): WorkshopState {
  return {
    schemaVersion: 1,
    activeTeam: 'experience',
    activeMode: 'practice',
    officialAcknowledged: false,
    sessions: {
      experience: {
        practice: createSession('experience', 'practice', options),
        official: createSession('experience', 'official', options),
      },
      framework: {
        practice: createSession('framework', 'practice', options),
        official: createSession('framework', 'official', options),
      },
    },
  };
}
