import { useEffect, useRef, useState } from 'react';
import { teams } from './content/teams';
import type { TeamId } from './content/teams';
import { useWorkshop } from './state/WorkshopProvider';
import type { Mode } from './state/types';
import { CoinTrial } from './components/CoinTrial';
import { SteedTrial } from './components/SteedTrial';
import { RestorationOverview } from './components/RestorationOverview';
import { RestorationTrail } from './components/RestorationTrail';
import { MissionBriefing } from './components/MissionBriefing';
import { RepairPanel } from './components/RepairPanel';
import { ResetControls } from './components/ResetControls';

export default function App() {
  const { state, dispatch, storageStatus, resetSavedProgress } = useWorkshop();
  const { activeTeam, activeMode: mode, officialAcknowledged } = state;
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);
  const [confirmRecovery, setConfirmRecovery] = useState(false);
  const recoveryTrigger = useRef<HTMLButtonElement>(null);
  const recoveryConfirmation = useRef<HTMLButtonElement>(null);
  const recoveryWasOpen = useRef(false);
  const team = teams[activeTeam];
  const session = state.sessions[activeTeam][mode];

  useEffect(() => {
    if (confirmRecovery) recoveryConfirmation.current?.focus();
    else if (recoveryWasOpen.current) recoveryTrigger.current?.focus();
    recoveryWasOpen.current = confirmRecovery;
  }, [confirmRecovery]);

  function selectMode(nextMode: Mode) {
    if (nextMode === 'official' && !officialAcknowledged) {
      setShowAcknowledgment(true);
      return;
    }

    setShowAcknowledgment(false);
    dispatch({ type: 'SELECT_MODE', mode: nextMode });
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Two squads. Two cores. One companion.</p>
        <h1>Rehor's Restoration Console</h1>
        <p>Work together to restore Rehor's Memory and Judgment cores.</p>
      </header>

      {storageStatus === 'unavailable' && (
        <p className="notice" role="alert">
          Progress cannot be saved in this browser. Keep this tab open.
        </p>
      )}
      {storageStatus === 'recovery' && (
        <section className="notice" aria-labelledby="recovery-heading">
          <h2 id="recovery-heading">Saved progress needs recovery</h2>
          <p role="alert">
            Saved progress could not be read. The original record has not been
            changed. You can continue in memory without saving, or reset it.
          </p>
          {confirmRecovery ? (
            <div>
              <p>
                Reset both squads, Practice and Official, and the presenter
                acknowledgment? This replaces all saved and current progress.
                Resetting is not another reward grant in an ongoing battle.
              </p>
              <div className="choices">
                <button type="button" ref={recoveryConfirmation} onClick={() => {
                  resetSavedProgress();
                  setConfirmRecovery(false);
                  setShowAcknowledgment(false);
                }}>
                  Confirm reset of all progress
                </button>
                <button type="button" onClick={() => setConfirmRecovery(false)}>Cancel reset</button>
              </div>
            </div>
          ) : (
            <button type="button" ref={recoveryTrigger} onClick={() => setConfirmRecovery(true)}>Reset saved progress</button>
          )}
        </section>
      )}

      <section className="panel" aria-label="Workshop controls">
        <fieldset>
          <legend>Squad</legend>
          <div className="choices">
            {(Object.keys(teams) as TeamId[]).map((teamId) => (
              <label key={teamId}>
                <input
                  type="radio"
                  name="team"
                  value={teamId}
                  checked={activeTeam === teamId}
                  onChange={() => dispatch({ type: 'SELECT_TEAM', teamId })}
                />
                {teams[teamId].name}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Session mode</legend>
          <div className="choices">
            {(['practice', 'official'] as const).map((nextMode) => (
              <label key={nextMode}>
                <input
                  type="radio"
                  name="mode"
                  value={nextMode}
                  checked={mode === nextMode}
                  onChange={() => selectMode(nextMode)}
                  aria-describedby="mode-note"
                />
                {nextMode === 'practice' ? 'Practice' : 'Official'}
              </label>
            ))}
          </div>
        </fieldset>
        <p id="mode-note">
          {mode === 'practice'
            ? 'Practice only. No official rewards are granted.'
            : 'Presenter record only. Players supply actions verbally.'}
        </p>

        {showAcknowledgment && (
          <section className="notice" aria-labelledby="official-heading">
            <h2 id="official-heading">Presenter acknowledgment</h2>
            <p>
              Official mode is this browser's local presenter record, not a login
              or protected session. Other browsers cannot submit actions here.
            </p>
            <div className="choices">
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: 'ACKNOWLEDGE_OFFICIAL' });
                  setShowAcknowledgment(false);
                }}
              >
                Acknowledge and enter Official
              </button>
              <button type="button" onClick={() => setShowAcknowledgment(false)}>
                Cancel
              </button>
            </div>
          </section>
        )}
      </section>

      <RestorationOverview />

      <section className="panel" aria-labelledby="trial-heading">
        <p className="eyebrow" role="status">
          {team.name} · {mode === 'practice' ? 'Practice' : 'Official'} mode
        </p>
        <h2 id="trial-heading">{team.trial}</h2>
        <p><strong>Core: {team.core}</strong></p>
        <p>{team.description}</p>
        <p>Selections and progress are retained locally when storage is available.</p>
        <MissionBriefing key={activeTeam} teamId={activeTeam} />
        <RestorationTrail session={session} />
        {activeTeam === 'experience' ? (
          <CoinTrial key={`trial-${session.caseId}`} session={state.sessions.experience[mode]} />
        ) : (
          <SteedTrial key={`trial-${session.caseId}`} session={state.sessions.framework[mode]} />
        )}
        <RepairPanel key={`repair-${session.caseId}`} session={session} />
        <ResetControls key={`${activeTeam}-${mode}`} session={session} />
      </section>

      <footer>
        <p>
          Local workshop tool. No cross-browser synchronization or AI authorship
          detection. Client-side code is inspectable.
        </p>
      </footer>
    </main>
  );
}
