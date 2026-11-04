import { teams } from '../content/teams';
import type { TeamId } from '../content/teams';
import type { Phase } from '../domain/types';
import { useWorkshop } from '../state/WorkshopProvider';

const statusText: Record<Phase, string> = {
  playing: 'Not restored', verification: 'Verification incomplete',
  solved: 'Puzzle verified', repaired: 'Restored through cooperation',
};

export function OfficialSummary() {
  const { state } = useWorkshop();
  return (
    <section aria-labelledby="official-summary-heading" className="official-status-line">
      <h3 id="official-summary-heading">Official cores</h3>
      <ul>
        {(Object.keys(teams) as TeamId[]).map((teamId) => (
          <li key={teamId}>
            {teams[teamId].name} — {teams[teamId].core}: {statusText[state.sessions[teamId].official.trial.phase]}
          </li>
        ))}
      </ul>
    </section>
  );
}
