import type { TeamId } from '../content/teams';
import type { DialogueKey, trailGuidance } from '../content/narrative';
import type { EventCategory, Mode, TrialSession, WorkshopState } from '../state/types';
import { MAX_WEIGHINGS } from './coins';
import { MAX_RACES } from './steeds';
import type { Phase } from './types';

// Presentation sees public facts only, never hidden cases, selections, or answer proximity.
export interface RestorationFacts {
  readonly teamId: TeamId;
  readonly mode: Mode;
  readonly phase: Phase;
  readonly observations: number;
  readonly latestCategory?: EventCategory;
}

export function restorationFacts(session: TrialSession): RestorationFacts {
  return {
    teamId: session.teamId, mode: session.mode, phase: session.trial.phase,
    observations: session.trial.observations.length,
    latestCategory: session.history.at(-1)?.category,
  };
}

export function isRestored(phase: Phase): boolean {
  return phase === 'solved' || phase === 'repaired';
}

export function deriveRestoration(facts: RestorationFacts) {
  const { phase, mode, observations, latestCategory } = facts;
  const exhausted = observations >= (facts.teamId === 'experience' ? MAX_WEIGHINGS : MAX_RACES);
  const complete = isRestored(phase);
  const currentStep = complete ? 3 : phase === 'verification' ? 2 : exhausted ? 1 : 0;
  const guidance: keyof typeof trailGuidance = complete ? phase as 'solved' | 'repaired'
    : phase === 'verification' ? 'verification' : exhausted ? 'exhausted' : observations ? 'gathering' : 'dormant';
  let dialogueKey: DialogueKey;
  if (complete) dialogueKey = mode === 'practice' ? 'training' : phase as 'solved' | 'repaired';
  else if (phase === 'verification') dialogueKey = latestCategory === 'verification-incomplete' ? 'incomplete' : 'verification';
  else if (latestCategory === 'invalid-input') dialogueKey = 'invalid';
  else if (latestCategory === 'incorrect-answer') dialogueKey = 'incorrect';
  else if (latestCategory === 'insufficient-evidence') dialogueKey = 'insufficient';
  else dialogueKey = exhausted ? 'exhausted' : observations ? 'observed' : 'dormant';

  return {
    currentStep, guidance, dialogueKey, complete,
    bypassedSteps: phase === 'repaired' ? [0, 1, 2] : [],
    canSubmitEarly: phase === 'playing' && observations > 0,
    status: phase === 'solved' ? 'Puzzle verified' : phase === 'repaired' ? 'Restored through cooperation'
      : phase === 'verification' ? 'Verification incomplete' : exhausted ? 'Awaiting finding' : observations ? 'Gathering evidence' : 'Dormant',
  };
}

export function deriveOverview(state: WorkshopState) {
  const mode = state.activeMode;
  const cores = (['experience', 'framework'] as const).map((teamId) => ({
    teamId, active: state.activeTeam === teamId,
    ...deriveRestoration(restorationFacts(state.sessions[teamId][mode])),
  }));
  const restoredCount = cores.filter((core) => core.complete).length;
  return {
    mode, cores, simulation: mode === 'practice', bothRestored: restoredCount === 2,
    officialReady: mode === 'official' && restoredCount === 2,
    centralStatus: restoredCount === 2 ? 'Both cores operational' : restoredCount === 1 ? 'One core restored' : 'Restoration pending',
  };
}
