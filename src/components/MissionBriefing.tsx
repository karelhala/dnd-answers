import { briefings } from '../content/narrative';
import type { TeamId } from '../content/teams';

export function MissionBriefing({ teamId }: { teamId: TeamId }) {
  return (
    <details>
      <summary>Mission briefing</summary>
      {briefings[teamId].map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
    </details>
  );
}
