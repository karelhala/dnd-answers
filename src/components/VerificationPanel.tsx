import type { Ref } from 'react';
import { coinQuestions } from '../content/questions';
import { isCoinId } from '../domain/coins';
import { gradeQuestion } from '../domain/verification';
import { useWorkshop } from '../state/WorkshopProvider';
import type { CoinSession } from '../state/types';

export function VerificationPanel({ session, headingRef }: { session: CoinSession; headingRef: Ref<HTMLHeadingElement> }) {
  const { dispatch } = useWorkshop();
  const target = { teamId: session.teamId, mode: session.mode, caseId: session.caseId };
  const [countQuestion, candidatesQuestion] = coinQuestions;
  const candidates = session.verification[candidatesQuestion.id] ?? [];
  const directions = candidatesQuestion.options.filter((option) => !isCoinId(option.id));

  function setAnswer(questionId: string, answer: readonly string[]) {
    dispatch({ type: 'EDIT_VERIFICATION', target, answers: { ...session.verification, [questionId]: answer } });
  }

  function feedback(questionId: string) {
    const question = coinQuestions.find((item) => item.id === questionId)!;
    return session.verificationSubmitted && (
      <p id={`${questionId}-feedback`}>
        <strong>{gradeQuestion(question, session.verification[question.id]) ? 'Correct.' : 'Not yet.'}</strong>
        {' '}{question.explanation}
      </p>
    );
  }

  return (
    <section aria-labelledby="verification-heading" className="trial-section">
      <h3 id="verification-heading" ref={headingRef} tabIndex={-1}>Verify your understanding</h3>
      <p>
        Identification accepted. Weighings and identification are now frozen.
        Answer both questions correctly to finish this trial. Corrections are unlimited.
      </p>
      <form onSubmit={(event) => {
        event.preventDefault();
        dispatch({ type: 'SUBMIT_VERIFICATION', target, at: new Date().toISOString() });
      }}>
        <fieldset aria-describedby={session.verificationSubmitted ? `${countQuestion.id}-feedback` : undefined}>
          <legend>{countQuestion.prompt}</legend>
          <div className="choices">
            {countQuestion.options.map((option) => (
              <label key={option.id}>
                <input
                  type="radio" name={countQuestion.id}
                  checked={(session.verification[countQuestion.id] ?? []).includes(option.id)}
                  onChange={() => setAnswer(countQuestion.id, [option.id])}
                />
                {option.label}
              </label>
            ))}
          </div>
          {feedback(countQuestion.id)}
        </fieldset>

        <fieldset aria-describedby={session.verificationSubmitted ? `${candidatesQuestion.id}-feedback` : undefined}>
          <legend>{candidatesQuestion.prompt}</legend>
          <p>{candidatesQuestion.scenario}</p>
          <fieldset>
            <legend>Possible corrupted fragments — select every candidate</legend>
            <div className="choices fragment-grid">
              {candidatesQuestion.options.filter((option) => isCoinId(option.id)).map((option) => (
                <label key={option.id}>
                  <input
                    type="checkbox" checked={candidates.includes(option.id)}
                    onChange={(event) => setAnswer(candidatesQuestion.id, event.target.checked
                      ? [...candidates, option.id] : candidates.filter((id) => id !== option.id))}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend>Possible weight direction</legend>
            <div className="choices">
              {directions.map((option) => (
                <label key={option.id}>
                  <input
                    type="radio" name="hypothetical-direction" checked={candidates.includes(option.id)}
                    onChange={() => setAnswer(candidatesQuestion.id, [
                      ...candidates.filter((id) => !directions.some((direction) => direction.id === id)), option.id,
                    ])}
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          {feedback(candidatesQuestion.id)}
        </fieldset>
        <button type="submit">Check understanding</button>
        <p aria-live="polite" aria-atomic="true">
          {session.verificationSubmitted && 'Verification incomplete. Review the feedback and try again.'}
        </p>
      </form>
    </section>
  );
}
