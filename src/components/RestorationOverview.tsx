import { mission, readiness } from '../content/narrative';
import { teams } from '../content/teams';
import { deriveOverview } from '../domain/restoration';
import { useWorkshop } from '../state/WorkshopProvider';
import { OfficialSummary } from './OfficialSummary';

export function RestorationOverview() {
  const { state } = useWorkshop();
  const overview = deriveOverview(state);
  return (
    <section className="panel restoration-overview" aria-labelledby="restoration-heading">
      <h2 id="restoration-heading">{overview.simulation ? 'Training projection' : 'Official restoration status'}</h2>
      <p>{mission}</p>
      {overview.simulation && <p><strong>Practice simulation — Official cores unchanged.</strong></p>}
      <div className="restoration-system" role="group" aria-label="The shard connects to Rehor; Rehor connects to Memory and Judgment">
        <div className="system-node shard-node"><strong>Fullsend shard</strong><span>Signal unidentified</span></div>
        <span className="system-connector" aria-hidden="true" />
        <div className="system-node"><strong>{overview.simulation ? 'Rehor — training projection' : 'Rehor'}</strong><span>{overview.centralStatus}</span></div>
        <span className="system-connector" aria-hidden="true" />
        <ul className="core-nodes" aria-label="Displayed cores">
          {overview.cores.map((core) => (
            <li key={core.teamId} className={`system-node${core.active ? ' active-core' : ''}`}>
              <strong>{teams[core.teamId].core} core</strong>
              <span>{teams[core.teamId].name}{core.active ? ' · Active squad' : ''}</span>
              <span>{core.status}</span>
            </li>
          ))}
        </ul>
      </div>
      {overview.bothRestored && (
        <div className="notice" aria-labelledby="readiness-heading">
          <h3 id="readiness-heading">{overview.officialReady ? 'Rehor operational' : 'Training projection operational'}</h3>
          <p>“{readiness[overview.mode]}”</p>
          {overview.officialReady && <p>Ready for the shared final battle. The battle still lies ahead.</p>}
        </div>
      )}
      {overview.simulation && <OfficialSummary />}
    </section>
  );
}
