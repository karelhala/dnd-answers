import { useState } from 'react';
import { teams } from '../content/teams';
import { createSession } from '../state/createWorkshop';
import { useWorkshop } from '../state/WorkshopProvider';
import type { TrialSession } from '../state/types';
import { ConfirmDialog } from './ConfirmDialog';

type Scope = 'case' | 'team' | 'workshop';

export function ResetControls({ session }: { session: TrialSession }) {
  const { dispatch, resetSavedProgress } = useWorkshop();
  const [pending, setPending] = useState<{ scope: Scope; caseId: string } | null>(null);
  const team = teams[session.teamId];
  const mode = session.mode === 'practice' ? 'Practice' : 'Official';
  const scope = pending?.caseId === session.caseId ? pending.scope : null;

  function confirm() {
    setPending(null);
    if (scope === 'case') {
      dispatch({
        type: 'START_NEW_CASE', target: { teamId: session.teamId, mode: session.mode, caseId: session.caseId },
        replacement: createSession(session.teamId, session.mode), confirmed: true,
      });
    } else if (scope === 'team') {
      dispatch({ type: 'RESET_TEAM', teamId: session.teamId, confirmed: true, replacements: [
        createSession(session.teamId, 'practice'), createSession(session.teamId, 'official'),
      ] });
    } else if (scope === 'workshop') resetSavedProgress();
  }

  return (
    <section className="trial-section" aria-label="Reset controls">
      <h3>Start over</h3>
      <div className="choices">
        <button type="button" onClick={() => setPending({ scope: 'case', caseId: session.caseId })}>Start new case</button>
        <button type="button" onClick={() => setPending({ scope: 'team', caseId: session.caseId })}>Reset team</button>
        <button type="button" onClick={() => setPending({ scope: 'workshop', caseId: session.caseId })}>Reset workshop</button>
      </div>
      {scope && (
        <ConfirmDialog
          title={scope === 'case' ? 'Start a new case?' : scope === 'team' ? `Reset ${team.name}?` : 'Reset entire workshop?'}
          confirmLabel={scope === 'case' ? 'Confirm new case' : scope === 'team' ? 'Confirm team reset' : 'Confirm workshop reset'}
          onCancel={() => setPending(null)} onConfirm={confirm}
        >
          <p>{scope === 'case'
            ? `Replace ${team.name}'s ${mode} case? This clears its observations, answers, verification, and outcome. Other sessions are unchanged.`
            : scope === 'team'
              ? `Reset both Practice and Official for ${team.name}? All progress and outcomes for this squad will be lost. The other squad is unchanged.`
              : 'Reset both squads, both Practice and Official, and presenter acknowledgment? This replaces the entire local workshop record.'}</p>
          {(scope !== 'case' || session.mode === 'official') && (
            <p>Official progress will be lost. Resetting replaces the local record; it does not grant another reward in an ongoing battle.</p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
