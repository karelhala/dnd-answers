import { dialogue, trailGuidance, trailLabels } from '../content/narrative';
import { deriveRestoration, restorationFacts } from '../domain/restoration';
import type { TrialSession } from '../state/types';

export function RestorationTrail({ session }: { session: TrialSession }) {
  const presentation = deriveRestoration(restorationFacts(session));
  return (
    <section aria-labelledby="trail-heading" className="restoration-trail">
      <h3 id="trail-heading">Restoration path{session.mode === 'practice' ? ' — training' : ''}</h3>
      <ol className="trail-steps" aria-label="Restoration steps">
        {trailLabels.map((label, index) => (
          <li key={label} aria-current={index === presentation.currentStep ? 'step' : undefined}>
            <strong>{label}</strong>
            <span>{presentation.bypassedSteps.includes(index) ? 'Bypassed through cooperative repair'
              : index === presentation.currentStep ? presentation.complete ? 'Complete' : 'Current task'
                : index < presentation.currentStep ? 'Complete' : 'Pending'}</span>
          </li>
        ))}
      </ol>
      <p>{session.mode === 'practice' && 'Training projection: '}{trailGuidance[presentation.guidance]}</p>
      {presentation.canSubmitEarly && <p>You may submit a finding whenever ready; using every observation is not required.</p>}
      <p className="rehor-dialogue"><strong>Rehor{session.mode === 'practice' ? ' · Training' : ''}:</strong> “{dialogue[presentation.dialogueKey]}”</p>
    </section>
  );
}
