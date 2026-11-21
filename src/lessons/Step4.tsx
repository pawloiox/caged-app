import { CagedRing, ShapesTable } from '../fretboard/extras';
import { engine, toPlayable } from '../audio/engine';
import { usePrefs, useProgress } from '../store/app';
import { PRED_NEED, drillKeysOtherThanC } from '../store/criteria';
import { chordLabel, chordLong, notesOf, stringsFor } from '../theory';
import { Card, Criteria, Head, NextLink } from '../ui/controls';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { MapBench, createMapStore, useMapList } from './map';

const useS4 = createMapStore({ key: 7, q: 'major', voicing: 'full' });

export default function Step4() {
  const [params] = useSearchParams();
  // A link from the review queue or the routine names a key (?key=2&q=major): open the map there. A drill
  // review (?bpm=…) skips the prediction, which was already made for that key.
  useEffect(() => {
    const k = Number(params.get('key'));
    const q = params.get('q');
    if (!params.has('key') || !Number.isInteger(k) || k < 0 || k > 11) return;
    const qq = q === 'minor' ? 'minor' : 'major';
    const st = useS4.getState();
    useS4.setState({
      key: k,
      q: qq,
      idx: 0,
      predMsg: '',
      predStage: null,
      revealed: params.has('bpm') ? { ...st.revealed, [qq + k]: true } : st.revealed,
    });
  }, [params]);
  const st = useS4();
  const sp = usePrefs((p) => p.minorSpelling);
  const list = useMapList(useS4);
  const progress = useProgress();
  const preds = (progress.seen.s4pred ?? []).length;
  const otherKeys = drillKeysOtherThanC(progress);
  const pred = !st.revealed[st.q + st.key];
  const idx = Math.min(st.idx, list.length - 1);
  const loop = list
    .slice(0, 5)
    .map((i) => i.shape)
    .join(' → ');

  const finish = (
    <Card title="To finish this step">
      <Criteria
        items={[
          [
            preds >= PRED_NEED,
            `Predict the starting shape and its fret correctly in ${PRED_NEED} keys (${Math.min(preds, PRED_NEED)}/${PRED_NEED})`,
          ],
          [otherKeys >= 1, 'Finish a clean linking drill in a key other than C major'],
        ]}
      />
    </Card>
  );
  const minorCard = (
    <Card title="Major or minor">
      <p>Switch to Minor and watch: every shape keeps its roots, and only the 3rd drops one fret.</p>
      <ul>
        <li>E-shape: 3rd on the G string</li>
        <li>A-shape: B string</li>
        <li>C-shape: D string (high e is left out in minor)</li>
        <li>G-shape: A and B strings</li>
        <li>D-shape: high e string</li>
      </ul>
    </Card>
  );

  return (
    <>
      <Head
        n={4}
        title="Any chord, any key"
        lede="The order C-A-G-E-D loops forever. To play a different chord you enter the loop at a different point. For each new key, work out where the loop starts before the app shows you."
      />
      <MapBench store={useS4} drill predict />
      <div className="cards">
        {pred ? (
          <>
            <Card title="How to predict">
              <p>Find the lowest root on the low E, A and D strings. Each string anchors certain shapes:</p>
              <ul>
                <li>
                  Low E string: E-shape (root under your barre) or G-shape (root under finger 3, three frets above your
                  index).
                </li>
                <li>
                  A string: A-shape (root under your barre) or C-shape (root under finger 4, three frets above your
                  index).
                </li>
                <li>D string: D-shape (root under your index).</li>
              </ul>
            </Card>
            {finish}
            {minorCard}
          </>
        ) : (
          <>
            <Card title="Where the loop starts">
              <CagedRing list={list} idx={idx} />
              <p>
                For {chordLong(st.key, st.q, sp)} the loop starts with the {list[0]!.shape}-shape:{' '}
                <strong>{loop}</strong>.
              </p>
              {list.some((i) => i.shape === 'G') ? null : (
                <p className="muted">This chord has no playable G-shape below fret 15, so the loop skips it here.</p>
              )}
            </Card>
            <Card title={`All shapes of ${chordLabel(st.key, st.q, sp)}`}>
              <ShapesTable
                list={list}
                idx={idx}
                onPick={(i) => {
                  useS4.setState({ idx: i, focus: true });
                  engine.strum(toPlayable(notesOf(list[i]!, stringsFor(st.voicing, list[i]!))));
                }}
              />
            </Card>
            {finish}
            {minorCard}
          </>
        )}
      </div>
      <NextLink to="/learn/5">make it musical</NextLink>
    </>
  );
}
