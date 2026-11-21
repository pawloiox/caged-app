import { Link } from 'react-router';
import { useProgress, usePrefs } from '../store/app';
import { chordLabel } from '../theory';
import { drillHref, parseDrillKey } from './drills';

/** The linking drills due for review, each with its tempo and a way to it. */
export function DueDrills({ keys }: { keys: readonly string[] }) {
  const drills = useProgress((p) => p.drills);
  const sp = usePrefs((p) => p.minorSpelling);
  return (
    <div className="callout">
      <p>
        <strong>Linking drills due.</strong> Run each one at your best clean tempo; a clean run sends it further out.
      </p>
      <ul className="due-drills">
        {keys.map((k) => {
          const key = k.slice(5);
          const d = parseDrillKey(key);
          if (!d) return null;
          const bpm = drills[key];
          return (
            <li key={k}>
              <Link className="btn small" to={drillHref(key, bpm)}>
                {chordLabel(d.pc, d.q, sp)} linking drill{bpm ? ` at ${bpm} BPM` : ''}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
