import { useEffect, useRef, useState } from 'react';
import { COIN_IDS, MAX_WEIGHINGS, isCoinId } from '../domain/coins';
import type { BalanceOutcome, CoinId } from '../domain/coins';
import { useWorkshop } from '../state/WorkshopProvider';
import type { CoinDraft, CoinSession } from '../state/types';
import { AttemptHistory } from './AttemptHistory';
import { OutcomePanel } from './OutcomePanel';
import { VerificationPanel } from './VerificationPanel';

const outcomeText: Record<BalanceOutcome, string> = {
  'left-heavy': 'Left heavier', balanced: 'Balanced', 'right-heavy': 'Right heavier',
};

export function CoinTrial({ session }: { session: CoinSession }) {
  const { dispatch } = useWorkshop();
  const { trial, draft } = session;
  const target = { teamId: session.teamId, mode: session.mode, caseId: session.caseId };
  const playing = trial.phase === 'playing';
  const weighingClosed = !playing || trial.observations.length >= MAX_WEIGHINGS;
  const previousPhase = useRef(trial.phase);
  const verificationHeading = useRef<HTMLHeadingElement>(null);
  const outcomeHeading = useRef<HTMLHeadingElement>(null);
  const latest = session.history.at(-1);
  const [feedbackArea, setFeedbackArea] = useState<'weighing' | 'answer' | null>(null);

  useEffect(() => {
    if (trial.phase !== previousPhase.current) {
      if (trial.phase === 'verification') verificationHeading.current?.focus();
      else if (trial.phase === 'solved' || trial.phase === 'repaired') outcomeHeading.current?.focus();
    }
    previousPhase.current = trial.phase;
  }, [trial.phase]);

  function edit(change: Partial<CoinDraft>) {
    dispatch({ type: 'EDIT_COIN_DRAFT', target, draft: { ...draft, ...change } });
  }

  function toggle(pan: 'left' | 'right', id: CoinId, checked: boolean) {
    edit({ [pan]: checked ? [...draft[pan], id] : draft[pan].filter((chosen) => chosen !== id) });
  }

  const lastWeighing = trial.observations.at(-1);
  const message = latest?.kind === 'observation' && lastWeighing
    ? `Weighing ${lastWeighing.number}: ${outcomeText[lastWeighing.outcome]}. Left: ${lastWeighing.left.join(', ')}. Right: ${lastWeighing.right.join(', ')}.`
    : latest?.message;
  const feedback = (area: 'weighing' | 'answer') => (
    <p id={`${area}-feedback`} className={feedbackArea === area && playing && message ? 'notice' : undefined} aria-live="polite" aria-atomic="true">
      {feedbackArea === area && playing && message && (
        <>{latest?.category === 'invalid-input' ? 'Invalid input: ' : latest?.category === 'incorrect-answer' ? 'Incorrect answer: ' : ''}{message}</>
      )}
    </p>
  );

  return (
    <div>
      <p>
        Twelve fragments, A–L, look identical. Eleven weigh the same; one is heavier
        or lighter. Identify that fragment and its weight direction in at most three weighings.
      </p>
      <p>
        This trial checks one observed case plus two understanding questions, not a
        complete strategy across all 24 possible cases. AI and other tools are allowed.
      </p>
      <details>
        <summary>Full balance rules</summary>
        <ul>
          <li>Use equal counts, with one to six fragments on each pan. This avoids assumptions about the size of the weight difference.</li>
          <li>No fragment may appear twice or on both pans.</li>
          <li>The balance reports left heavier, right heavier, or balanced. Invalid inputs consume no weighings.</li>
          <li>Complete at least one weighing before identification. A wrong answer grants no extra weighings.</li>
          <li>After three weighings you may still revise and submit your identification.</li>
        </ul>
      </details>

      <section className="trial-section" aria-labelledby="balance-heading">
        <h3 id="balance-heading">Ancient balance</h3>
        <p>Weighings used: {trial.observations.length} / {MAX_WEIGHINGS}</p>
        <form aria-label="Balance weighing" onSubmit={(event) => {
          event.preventDefault();
          setFeedbackArea('weighing');
          dispatch({ type: 'WEIGH_COINS', target, at: new Date().toISOString() });
        }}>
          <div className="pan-layout">
            {(['left', 'right'] as const).map((pan) => {
              const other = pan === 'left' ? 'right' : 'left';
              return (
                <fieldset key={pan} disabled={weighingClosed} aria-describedby="pan-rules weighing-feedback">
                  <legend>{pan === 'left' ? 'Left pan' : 'Right pan'} ({draft[pan].length} selected)</legend>
                  <div className="choices fragment-grid">
                    {COIN_IDS.map((id) => (
                      <label key={id}>
                        <input
                          type="checkbox" checked={draft[pan].includes(id)}
                          disabled={draft[other].includes(id) && !draft[pan].includes(id)}
                          onChange={(event) => toggle(pan, id, event.target.checked)}
                        />
                        {id}
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>
          <p id="pan-rules">Equal counts, one to six per pan. Choices on the other pan are unavailable.</p>
          <button type="submit" disabled={weighingClosed} aria-describedby="weighing-availability weighing-feedback">Weigh fragments</button>
          <p id="weighing-availability">
            {!playing ? 'Weighings are frozen after answer acceptance or restoration.'
              : weighingClosed ? 'Three weighings used. Identification is still available below.' : 'Choose fragments on both pans, then weigh.'}
          </p>
          {feedback('weighing')}
        </form>
        <h4>Weighing history</h4>
        {trial.observations.length === 0 ? <p>No weighings yet.</p> : (
          <ol className="history" aria-label="Weighing history">
            {trial.observations.map((observation) => (
              <li key={observation.number}>
                <strong>Weighing {observation.number}: {outcomeText[observation.outcome]}.</strong>
                {' '}Left: {observation.left.join(', ')}. Right: {observation.right.join(', ')}.
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="trial-section" aria-labelledby="identification-heading">
        <h3 id="identification-heading">Identify the corrupted fragment</h3>
        <form aria-label="Fragment identification" onSubmit={(event) => {
          event.preventDefault();
          setFeedbackArea('answer');
          dispatch({ type: 'SUBMIT_COIN_ANSWER', target, at: new Date().toISOString() });
        }}>
          <fieldset disabled={!playing} aria-describedby="answer-feedback">
            <legend>Your identification</legend>
            <div className="answer-fields">
              <label htmlFor="odd-fragment">Corrupted fragment</label>
              <select id="odd-fragment" value={draft.coin} onChange={(event) => {
                if (event.target.value === '' || isCoinId(event.target.value)) edit({ coin: event.target.value });
              }}>
                <option value="">Choose a fragment</option>
                {COIN_IDS.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
              <label htmlFor="weight-direction">Weight direction</label>
              <select id="weight-direction" value={draft.difference} onChange={(event) => {
                const value = event.target.value;
                if (value === '' || value === 'heavier' || value === 'lighter') edit({ difference: value });
              }}>
                <option value="">Choose a direction</option>
                <option value="heavier">Heavier</option>
                <option value="lighter">Lighter</option>
              </select>
            </div>
          </fieldset>
          <button type="submit" disabled={!playing || trial.observations.length === 0} aria-describedby="answer-availability answer-feedback">Submit identification</button>
          <p id="answer-availability">
            {!playing ? 'Identification accepted or core restored. No more puzzle changes.'
              : trial.observations.length === 0 ? 'Complete at least one weighing before submitting.' : 'Choose a fragment and whether it is heavier or lighter.'}
          </p>
          {feedback('answer')}
        </form>
      </section>

      {trial.phase === 'verification' && <VerificationPanel session={session} headingRef={verificationHeading} />}
      <OutcomePanel session={session} headingRef={outcomeHeading} />
      <AttemptHistory events={session.history} />
    </div>
  );
}
