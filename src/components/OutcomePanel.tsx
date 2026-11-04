import type { Ref } from 'react';
import { transmissions } from '../content/narrative';
import { getOutcome } from '../domain/outcomes';
import type { TrialSession } from '../state/types';

export function OutcomePanel({ session, headingRef }: { session: TrialSession; headingRef: Ref<HTMLHeadingElement> }) {
  const outcome = getOutcome(session);
  if (!outcome) return null;
  const transmission = session.mode === 'practice' ? transmissions.training
    : session.trial.phase === 'repaired' ? transmissions.repaired : transmissions[session.teamId];

  return (
    <section className="notice" aria-labelledby="outcome-heading">
      <h3 id="outcome-heading" tabIndex={-1} ref={headingRef}>{outcome.title}</h3>
      <div className="restoration-transmission">
        <h4>{transmission.title}</h4>
        <p>{transmission.scene}</p>
        <p>“{transmission.voice}”</p>
      </div>
      <p><strong>{outcome.method}</strong></p>
      <p>{outcome.description}</p>
      <ul>
        {outcome.rewards.map((reward) => <li key={reward}>{reward}</li>)}
      </ul>
      {session.mode === 'official' && (
        <p>
          This is the saved outcome, not a new reward grant on each visit.
          The presenter tracks intervention and reroll use outside this app.
        </p>
      )}
    </section>
  );
}
