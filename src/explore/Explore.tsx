import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { engine, toPlayable } from '../audio/engine';
import { CagedRing, ShapesTable, Tab } from '../fretboard/extras';
import { MapBench, createMapStore, useMapList } from '../lessons/map';
import { usePrefs } from '../store/app';
import { VOICE_OPTS, chordLong, shapeTip, notesOf, stringsFor, type Quality } from '../theory';
import { Card, PageHead } from '../ui/controls';

const useSX = createMapStore({ key: 9, q: 'minor', idx: 2, voicing: 'full', pent: true });

const QUALS: ReadonlyArray<readonly [Quality, string]> = [
  ['major', 'Major'],
  ['minor', 'Minor'],
  ['dom7', '7th'],
];

export default function Explore() {
  const st = useSX();
  const sp = usePrefs((p) => p.minorSpelling);
  const list = useMapList(useSX);
  const idx = Math.min(st.idx, list.length - 1);
  const inst = list[idx]!;
  const [params] = useSearchParams();

  useEffect(() => {
    const k = params.get('key');
    const q = params.get('q') as Quality | null;
    if (k != null && !Number.isNaN(Number(k)))
      useSX.setState({
        key: Number(k) % 12,
        q: q && ['major', 'minor', 'dom7'].includes(q) ? q : 'major',
        idx: 0,
        focus: true,
        pent: false,
      });
  }, [params]);

  return (
    <>
      <PageHead
        eyebrow="Fretboard explorer"
        title="Every chord, every shape"
        lede="All 12 major, minor and dominant-7th chords in their five shapes, with the pentatonic box around each shape for soloing. Tap any fret to hear it and see what it is."
      />
      <MapBench
        store={useSX}
        qualities={QUALS}
        voicings={st.q === 'dom7' ? VOICE_OPTS.map(([v, l]) => [v, v === 'tri' ? '4-note' : l] as const) : VOICE_OPTS}
        pent
        drill
      />
      <div className="cards">
        <Card title={chordLong(st.key, st.q, sp)}>
          <CagedRing list={list} idx={idx} />
        </Card>
        <Card title="This shape">
          <Tab inst={inst} strings={stringsFor(st.voicing, inst)} />
          <p className="tipbox">{shapeTip(inst, sp)}</p>
          <ShapesTable
            list={list}
            idx={idx}
            onPick={(i) => {
              useSX.setState({ idx: i, focus: true });
              engine.strum(toPlayable(notesOf(list[i]!, stringsFor(st.voicing, list[i]!))));
            }}
          />
        </Card>
        <Card title="Triads: the shapes on three strings">
          <p>
            On the G, B and high e strings, the major shapes give the three triad inversions: <strong>A-shape</strong> =
            root on the bottom (R-3-5), <strong>E-shape</strong> = 3rd on the bottom (3-5-R),{' '}
            <strong>C- and D-shapes</strong> = 5th on the bottom (5-R-3). The G-shape's triad sits on the D, G and B
            strings, and so does the minor C-shape's.
          </p>
          <p className="muted">
            Choose Triads above to see them. Seventh chords need four notes, so Triads shows their four-string forms.
          </p>
        </Card>
        <Card title="From chord to solo">
          <p>
            The outlined notes complete the {st.q === 'minor' ? 'minor' : 'major'} pentatonic box for this shape: two
            notes per string. The chord tones sit inside it, so aim for a coloured note, ideally the 3rd, when the chord
            changes.
          </p>
          {inst.minF <= 1 ? (
            <p className="muted">
              Next to the nut the box bends to use the open strings, so it won't match the five standard box diagrams
              exactly. Twelve frets up, the same shape gives the standard box.
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}
