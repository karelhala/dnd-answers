import type { AttemptEvent } from '../state/types';

export function AttemptHistory({ events }: { events: readonly AttemptEvent[] }) {
  return (
    <details>
      <summary>Attempt history ({events.length})</summary>
      <p>Most recent 100 events. Complete observation evidence is retained separately.</p>
      {events.length === 0 ? <p>No attempts recorded.</p> : (
        <ol className="history">
          {events.map((event, index) => (
            <li key={`${event.at}-${index}`}>
              <time dateTime={event.at}>{event.at.slice(11, 19)} UTC</time>
              {' — '}{event.message}
            </li>
          ))}
        </ol>
      )}
    </details>
  );
}
