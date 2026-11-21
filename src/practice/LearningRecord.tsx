import { useMemo } from 'react';
import { useProgress } from '../store/app';
import { Card } from '../ui/controls';
import { learningRecord, pct } from './record';

const days = (d: number) =>
  d < 1.5 ? `${Math.max(1, Math.round(d * 10) / 10)} day` : `${Math.round(d * 10) / 10} days`;

/** Is it working? Time to mastery, what survives a week, and how quick the answers are. */
export function LearningRecord() {
  const progress = useProgress();
  const rec = useMemo(() => learningRecord(progress), [progress]);
  return (
    <Card title="Your learning record" className="record-card">
      {rec.practised === 0 ? (
        <p>
          Nothing to measure yet. As you answer drills, this shows how long items take to stick, how much you still know
          after a week, and how quick your answers are.
        </p>
      ) : (
        <dl className="record">
          <div>
            <dt>Mastered</dt>
            <dd>
              <span className="stat">
                {rec.mastered}
                <small> of {rec.practised}</small>
              </span>
              <span className="muted">
                {rec.medianDays != null
                  ? `Typically ${days(rec.medianDays)} and ${Math.round(rec.medianAnswers ?? 0)} answers from first try to mastered.`
                  : 'An item is mastered when you get it right, quickly, after at least a day.'}
              </span>
            </dd>
          </div>
          <div>
            <dt>Still right after a week</dt>
            <dd>
              <span className="stat">{pct(rec.d7)}</span>
              <span className="muted">
                {rec.d7.n
                  ? `${rec.d7.ok} of ${rec.d7.n} answers to items rested 6 days or more. After a day or more: ${pct(rec.d1)} of ${rec.d1.n}.`
                  : rec.d1.n
                    ? `No item has rested a week yet. After a day or more: ${pct(rec.d1)} (${rec.d1.ok} of ${rec.d1.n}).`
                    : 'Items come back after 1, 2, 4 and 8 days; this fills in as they do.'}
              </span>
            </dd>
          </div>
          <div>
            <dt>Quick enough</dt>
            <dd>
              <span className="stat">{rec.timed ? `${Math.round((100 * rec.fluent) / rec.timed)}%` : '–'}</span>
              <span className="muted">
                {rec.timed
                  ? `${rec.fluent} of ${rec.timed} items are answered within their target time. A right but slow answer doesn't move an item up.`
                  : 'Drill answers are timed; a right but slow answer is practice, not mastery.'}
              </span>
            </dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
