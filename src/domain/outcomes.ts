import { teams } from '../content/teams';
import type { TrialSession } from '../state/types';

export function getOutcome(session: TrialSession) {
  const { phase } = session.trial;
  if (phase !== 'solved' && phase !== 'repaired') return null;
  const team = teams[session.teamId];
  const method = phase === 'solved' ? 'Puzzle verified' : 'Restored through cooperation';

  if (session.mode === 'practice') {
    return {
      title: 'Practice complete',
      method,
      description: `${team.name} completed the ${team.core} practice trial.`,
      rewards: ['Practice only. No official rewards are granted.'],
    };
  }

  const otherTeam = teams[session.teamId === 'experience' ? 'framework' : 'experience'];
  return {
    title: 'Core restored',
    method,
    description: `${team.name} restored Rehor's ${team.core} core.`,
    rewards: [
      `${team.name} → 1 Rehor intervention for an upcoming battle or the finale.`,
      phase === 'solved'
        ? `${otherTeam.name} → Alliance Surge: 2 shared rerolls.`
        : `${otherTeam.name} → no additional buff from this repair.`,
    ],
  };
}
