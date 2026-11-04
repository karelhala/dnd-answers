import { useEffect, useRef, useState } from 'react';
import { MAX_RACES, STEED_IDS, isSteedId } from '../domain/steeds';
import type { SteedId } from '../domain/steeds';
import { useWorkshop } from '../state/WorkshopProvider';
import type { SteedDraft, SteedSession } from '../state/types';
import { AttemptHistory } from './AttemptHistory';
import { OutcomePanel } from './OutcomePanel';
import { VerificationPanel } from './VerificationPanel';

export function SteedTrial({ session }: { session: SteedSession }) {
  const { dispatch } = useWorkshop();
  const { trial, draft } = session;
  const target = { teamId: session.teamId, mode: session.mode, caseId: session.caseId };
  const playing = trial.phase === 'playing';
  const racingClosed = !playing || trial.observations.length >= MAX_RACES;
  const previousPhase = useRef(trial.phase);
  const verificationHeading = useRef<HTMLHeadingElement>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const [feedbackArea, setFeedbackArea] = useState<'race' | 'ranking' | null>(null);
  const latest = session.history.at(-1);
  const lastRace = trial.observations.at(-1);
  const message = latest?.kind === 'observation' && lastRace
    ? `Race ${lastRace.number}, fastest first: ${lastRace.order.join(' → ')}.` : latest?.message;

  useEffect(() => {
    if (trial.phase !== previousPhase.current) {
      if (trial.phase === 'verification') verificationHeading.current?.focus();
      else if (trial.phase === 'solved' || trial.phase === 'repaired') outcomeHeading.current?.focus();
    }
    previousPhase.current = trial.phase;
  }, [trial.phase]);

  function edit(change: Partial<SteedDraft>) {
    dispatch({ type: 'EDIT_STEED_DRAFT', target, draft: { ...draft, ...change } });
  }

  function setPlace(place: number, value: SteedId | '') {
    const answer: [SteedId | '', SteedId | '', SteedId | ''] = [...draft.answer];
    answer[place] = value;
    edit({ answer });
  }

  function feedback(area: 'race' | 'ranking') {
    const label = latest?.category === 'invalid-input' ? 'Invalid input: '
      : latest?.category === 'insufficient-evidence' ? 'Insufficient evidence: '
      : latest?.category === 'incorrect-answer' ? 'Incorrect answer: ' : '';
    return (
      <p id={`${area}-feedback`} className={feedbackArea === area && playing && message ? 'notice' : undefined} aria-live="polite" aria-atomic="true">
        {feedbackArea === area && playing && message && <>{label}{message}</>}
      </p>
    );
  }

  return (
    <div>
      <p>
        Twenty-five spectral steeds, A–Y, have fixed, distinct speeds. Find the
        fastest three in order using at most seven races. Your observed results
        must establish that ranking; a correct guess without proof does not pass.
      </p>
      <details>
        <summary>Full race rules</summary>
        <ul>
          <li>Choose two to five distinct steeds per race. A one-steed race provides no comparisons.</li>
          <li>Results reveal finishing order only, never times or unobserved global ranks.</li>
          <li>There are no ties, fatigue, or changes of speed. Selection order does not affect results.</li>
          <li>Repeated valid races consume quota. Invalid selections do not.</li>
          <li>After seven races you can still revise your ranking. Any evidence-sufficient strategy is accepted.</li>
          <li>AI and other tools are allowed. Both understanding questions must pass after ranking acceptance.</li>
        </ul>
      </details>

      <section className="trial-section" aria-labelledby="race-heading">
        <h3 id="race-heading">Spectral racecourse</h3>
        <p>Races used: {trial.observations.length} / {MAX_RACES}</p>
        <form aria-label="Steed race" onSubmit={(event) => {
          event.preventDefault();
          setFeedbackArea('race');
          dispatch({ type: 'RACE_STEEDS', target, at: new Date().toISOString() });
        }}>
          <fieldset disabled={racingClosed} aria-describedby="race-rules race-feedback">
            <legend>Race participants ({draft.participants.length} selected)</legend>
            <div className="choices fragment-grid">
              {STEED_IDS.map((id) => (
                <label key={id}>
                  <input type="checkbox" checked={draft.participants.includes(id)} onChange={(event) => edit({
                    participants: event.target.checked ? [...draft.participants, id] : draft.participants.filter((chosen) => chosen !== id),
                  })} />
                  {id}
                </label>
              ))}
            </div>
          </fieldset>
          <p id="race-rules">Select two to five steeds. Only their relative finishing order will be revealed.</p>
          <div className="choices">
            <button type="submit" disabled={racingClosed} aria-describedby="race-availability race-feedback">Race selected steeds</button>
            <button type="button" disabled={racingClosed || draft.participants.length === 0} onClick={() => edit({ participants: [] })}>Clear race selection</button>
          </div>
          <p id="race-availability">
            {!playing ? 'Races are frozen after ranking acceptance or restoration.'
              : racingClosed ? 'Seven races used. Ranking submission is still available below.' : 'Choose participants, then race.'}
          </p>
          {feedback('race')}
        </form>
        <h4>Race history</h4>
        {trial.observations.length === 0 ? <p>No races yet.</p> : (
          <ol className="history" aria-label="Race history">
            {trial.observations.map((race) => (
              <li key={race.number}>
                <strong>Race {race.number} — fastest first</strong>
                <ol className="race-order" aria-label={`Race ${race.number} finishing order`}>
                  {race.order.map((id) => <li key={id}>{id}</li>)}
                </ol>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="trial-section" aria-labelledby="ranking-heading">
        <h3 id="ranking-heading">Establish the fastest three</h3>
        <form aria-label="Top three ranking" onSubmit={(event) => {
          event.preventDefault();
          setFeedbackArea('ranking');
          dispatch({ type: 'SUBMIT_STEED_ANSWER', target, at: new Date().toISOString() });
        }}>
          <fieldset disabled={!playing} aria-describedby="ranking-feedback">
            <legend>Your ordered top three</legend>
            <div className="answer-fields">
              {(['First', 'Second', 'Third'] as const).map((label, place) => (
                <label key={label}>
                  {label} place
                  <select value={draft.answer[place]} onChange={(event) => {
                    const value = event.target.value;
                    if (value === '' || isSteedId(value)) setPlace(place, value);
                  }}>
                    <option value="">Choose a steed</option>
                    {STEED_IDS.map((id) => (
                      <option key={id} value={id} disabled={draft.answer.some((chosen, other) => other !== place && chosen === id) && draft.answer[place] !== id}>{id}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" disabled={!playing || trial.observations.length === 0} aria-describedby="ranking-availability ranking-feedback">Submit top three</button>
          <p id="ranking-availability">
            {!playing ? 'Ranking accepted or core restored. No more puzzle changes.'
              : trial.observations.length === 0 ? 'Complete at least one race before submitting.' : 'Your race observations must uniquely establish all three positions.'}
          </p>
          {feedback('ranking')}
        </form>
      </section>

      {trial.phase === 'verification' && <VerificationPanel session={session} headingRef={verificationHeading} />}
      <OutcomePanel session={session} headingRef={outcomeHeading} />
      <AttemptHistory events={session.history} />
    </div>
  );
}
