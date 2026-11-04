import { useState } from 'react';
import { teams } from './content/teams';
import type { TeamId } from './content/teams';

type Mode = 'practice' | 'official';

export default function App() {
  const [activeTeam, setActiveTeam] = useState<TeamId>('experience');
  const [mode, setMode] = useState<Mode>('practice');
  const [officialAcknowledged, setOfficialAcknowledged] = useState(false);
  const [showAcknowledgment, setShowAcknowledgment] = useState(false);
  const team = teams[activeTeam];

  function selectMode(nextMode: Mode) {
    if (nextMode === 'official' && !officialAcknowledged) {
      setShowAcknowledgment(true);
      return;
    }

    setShowAcknowledgment(false);
    setMode(nextMode);
  }

  return (
    <main>
      <header>
        <p className="eyebrow">Two squads. Two cores. One companion.</p>
        <h1>Rehor's Restoration Console</h1>
        <p>Work together to restore Rehor's Memory and Judgment cores.</p>
      </header>

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
                  onChange={() => setActiveTeam(teamId)}
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
                  setOfficialAcknowledged(true);
                  setMode('official');
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

      <section className="panel" aria-labelledby="trial-heading">
        <p className="eyebrow" role="status">
          {team.name} · {mode === 'practice' ? 'Practice' : 'Official'} mode
        </p>
        <h2 id="trial-heading">{team.trial}</h2>
        <p><strong>Core: {team.core}</strong></p>
        <p>{team.description}</p>
        <p className="notice">
          Foundation preview: interactive trials and saved progress are not
          implemented yet. Team and mode selections reset on refresh.
        </p>
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
