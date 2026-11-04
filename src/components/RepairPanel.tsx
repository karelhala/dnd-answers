import { useEffect, useRef, useState } from 'react';
import { teams } from '../content/teams';
import { useWorkshop } from '../state/WorkshopProvider';
import type { TrialSession } from '../state/types';

const questions = [
  'Name one component the other squad protects.',
  'Name one dependency or handoff between your squads.',
  'If that handoff breaks, what should your squads do first?',
];

export function RepairPanel({ session }: { session: TrialSession }) {
  const { dispatch } = useWorkshop();
  const [open, setOpen] = useState(false);
  const [confirmations, setConfirmations] = useState([false, false, false]);
  const trigger = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const wasOpen = useRef(false);
  const available = session.mode === 'official' && (session.trial.phase === 'playing' || session.trial.phase === 'verification');

  useEffect(() => {
    if (open) heading.current?.focus();
    else if (wasOpen.current) trigger.current?.focus();
    wasOpen.current = open;
  }, [open]);

  if (!available) return null;
  const team = teams[session.teamId];
  const otherTeam = teams[session.teamId === 'experience' ? 'framework' : 'experience'];

  return (
    <section className="trial-section" aria-label="Cooperative repair">
      <h3>Presenter action</h3>
      <p>Use cooperative repair when time ends or the trial remains incomplete. This is not authenticated access control.</p>
      <button type="button" ref={trigger} aria-expanded={open} aria-controls="repair-panel" onClick={() => {
        setConfirmations([false, false, false]);
        setOpen(true);
      }}>Resolve through cooperative repair</button>
      {open && (
        <section id="repair-panel" className="notice" aria-labelledby="repair-heading">
          <h4 id="repair-heading" tabIndex={-1} ref={heading}>Repair {team.name}'s {team.core} core</h4>
          <p>{otherTeam.name} leads the repair; {team.name} may help. Accept reasonable spoken answers.</p>
          <p>
            This retains the case evidence and resolves only this Official core as repaired.
            {team.name} receives one Rehor intervention; no Alliance Surge is granted.
            If both cores need repair, confirm each separately.
          </p>
          <form onSubmit={(event) => {
            event.preventDefault();
            dispatch({
              type: 'CONFIRM_REPAIR', target: { teamId: session.teamId, mode: session.mode, caseId: session.caseId },
              at: new Date().toISOString(), confirmations,
            });
          }}>
            <fieldset>
              <legend>Confirm all three spoken answers</legend>
              <div className="repair-questions">
                {questions.map((question, index) => (
                  <label key={question}>
                    <input type="checkbox" checked={confirmations[index]} onChange={(event) => setConfirmations(
                      confirmations.map((checked, other) => other === index ? event.target.checked : checked),
                    )} />
                    {question}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="choices">
              <button type="submit" disabled={!confirmations.every(Boolean)} aria-describedby="repair-requirement">Confirm repair</button>
              <button type="button" onClick={() => setOpen(false)}>Cancel repair</button>
            </div>
            <p id="repair-requirement">All three answers must be confirmed. Solved or repaired cores cannot receive another repair.</p>
          </form>
        </section>
      )}
    </section>
  );
}
