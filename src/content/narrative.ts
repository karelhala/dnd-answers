import type { TeamId } from './teams';

export const mission = 'The shard can seal the Rift. Restore Rehor so both squads can carry it through the final battle together.';

export const briefings: Record<TeamId, readonly string[]> = {
  experience: [
    "Rehor's memories have shattered into twelve crystal fragments. One carries a corruption that distorts its weight. The ancient balance can expose it—but its power permits only three readings.",
    'Identify the corrupted fragment so Rehor can distinguish memory from interference.',
  ],
  framework: [
    "Rehor must choose three spectral steeds to carry the Rift's stabilizing seals. Their true speeds are unknown, and the arena records order—not time.",
    "Establish the fastest three before the arena's seven remaining races are spent.",
  ],
};

export const dialogue = {
  dormant: 'Help me separate what I know from what I merely suspect.',
  observed: 'Recorded. What does this rule out?',
  invalid: 'The instrument cannot accept that arrangement. Check its constraints.',
  incorrect: 'That finding does not match this case. Reconsider the evidence.',
  insufficient: 'A possibility is not yet a conclusion. Which alternatives have you ruled out?',
  exhausted: 'No readings remain. Work with what we have observed.',
  verification: 'The finding is accepted. Show me you understand the method.',
  incomplete: 'The connection is not stable yet. Review the reasoning check.',
  solved: 'Core restored. I am with you.',
  repaired: 'You restored what I could not repair alone.',
  training: 'Training sequence complete. The Official restoration remains unchanged.',
} as const;

export type DialogueKey = keyof typeof dialogue;

export const trailLabels = ['Gather evidence', 'Submit finding', 'Verify reasoning', 'Restore core'] as const;
export const trailGuidance = {
  dormant: 'Core dormant. Awaiting your first observation.',
  gathering: 'Evidence recorded. Review what your observations establish.',
  exhausted: 'Instrument exhausted. Review your evidence and submit a finding. The limit does not mean your evidence is sufficient.',
  verification: 'Finding accepted. Complete the reasoning check before reconnection.',
  solved: 'Core restored through the trial.',
  repaired: 'Core restored through the alliance.',
} as const;

export const transmissions = {
  experience: {
    title: 'Memory core online',
    scene: "Rehor's outline steadies. A thread of light leaves the shard and crosses toward the other gate.",
    voice: 'Tell the defenders: they are not holding alone.',
  },
  framework: {
    title: 'Judgment core online',
    scene: 'Rehor raises his head. The paths before him resolve into a clear direction.',
    voice: 'I can see the way forward. We take it together.',
  },
  repaired: {
    title: 'Alliance connection restored',
    scene: "The two squads reconnect the broken pathways. Rehor's outline holds.",
    voice: 'Not every answer comes from a trial. Some come from knowing whom to call.',
  },
  training: {
    title: 'Training sequence complete',
    scene: 'The training projection steadies. The restoration sequence is understood.',
    voice: 'Rehearsal complete. The mission awaits.',
  },
} as const;

export const readiness = {
  official: 'Both cores responding. Bring the shard to the Rift. We finish this together.',
  practice: 'Both projected cores responding. Training complete; the Official restoration remains unchanged.',
} as const;
