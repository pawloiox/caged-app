import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { engine } from '../audio/engine';
import { setLoopBpm, startLoop, stopLoop, usePlayer } from '../audio/transport';
import { COL, DARK_TEXT, NEUTRAL, NEUTRAL_ROOT, textFor } from '../fretboard/build';
import { Legend, Pill } from '../fretboard/extras';
import { Fretboard, type DotSpec } from '../fretboard/Fretboard';
import {
  BOTH_NAMES,
  SCALE_LAST_FRET,
  STRING_LABEL,
  degreeLabel,
  degreeName,
  mod12,
  npsOf,
  patternFingers,
  pcAt,
  scaleById,
  scaleLabel,
  scaleNoteName,
  scaleOnNeck,
  scalePatterns,
  scaleRootName,
  scalesFor,
  type Nps,
  type PatternNote,
} from '../theory';
import { Card, Check, Kbd, PageHead, Seg } from '../ui/controls';
import { useHotkeys, useNeckDirection } from '../ui/hooks';

type Labels = 'iv' | 'note' | 'finger' | 'none';
const LABELS: ReadonlyArray<readonly [Labels, string]> = [
  ['iv', 'Degrees'],
  ['note', 'Notes'],
  ['finger', 'Fingers'],
  ['none', 'Blank'],
];
const TEMPI = [60, 80, 100, 120, 140] as const;
const PLAYER = 'scale';

/** The library's state lives in the address, so any pattern can be linked to (and Back goes where you were). */
function useScaleParams() {
  const [params, setParams] = useSearchParams();
  const sc = scaleById(params.get('scale')) ?? scaleById('minor-pent')!;
  const nps = npsOf(sc);
  const k = Number(params.get('key'));
  const key = params.get('key') != null && Number.isInteger(k) ? mod12(k) : 9;
  const p = Number(params.get('p'));
  const n = Number.isInteger(p) && p >= 1 && p <= sc.steps.length ? p : 1;
  const set = (next: { scale?: string; key?: number; p?: number }) => {
    const q = new URLSearchParams(params);
    for (const [name, v] of Object.entries(next)) q.set(name, String(v));
    setParams(q, { replace: true });
  };
  return { sc, nps, key, n, set };
}

export default function Scales() {
  const { sc, nps, key, n, set } = useScaleParams();
  const [labels, setLabels] = useState<Labels>('iv');
  const [whole, setWhole] = useState(true);
  const [bpm, setBpm] = useState<number>(80);
  const [loop, setLoop] = useState(false);
  const playing = usePlayer((p) => p.id === PLAYER);
  const dir = useNeckDirection();

  const root = scaleRootName(sc, key);
  const name = scaleLabel(sc, key);
  const patterns = useMemo(() => scalePatterns(sc, key, nps), [sc, key, nps]);
  const pat = patterns[n - 1]!;
  const fingers = patternFingers(pat);
  const noteName = (x: PatternNote) => scaleNoteName(sc, root, x.i);
  // Along the neck, the patterns in the order they sit: the arrows step to the next one up or down.
  const byPlace = [...patterns].sort((a, b) => a.lo - b.lo || a.n - b.n);
  const place = byPlace.indexOf(pat);
  const go = (i: number) => {
    const to = byPlace[i];
    if (to) set({ p: to.n });
  };

  /* ---------- the board ---------- */
  const inPat = new Map(pat.notes.map((x, k) => [`${x.s}:${x.f}`, k]));
  const colour = pat.shape ? COL[pat.shape] : NEUTRAL;
  const text = pat.shape ? textFor(pat.shape) : DARK_TEXT;
  const label = (x: PatternNote, finger?: string) =>
    labels === 'iv'
      ? degreeLabel(sc, x.i)
      : labels === 'note'
        ? noteName(x)
        : labels === 'finger'
          ? (finger ?? '')
          : '';
  const dots: DotSpec[] = pat.notes.map((x, k) => ({
    s: x.s,
    f: x.f,
    colors: [x.i === 0 && !pat.shape ? NEUTRAL_ROOT : colour],
    root: x.i === 0,
    label: label(x, fingers[k]),
    text,
    desc: `the ${degreeName(sc, x.i)} of ${name}, pattern ${pat.n}${fingers[k] === '○' ? ', open string' : `, finger ${fingers[k]}`}`,
  }));
  const rest = whole ? scaleOnNeck(sc, key, SCALE_LAST_FRET).filter((x) => !inPat.has(`${x.s}:${x.f}`)) : [];
  for (const x of rest)
    dots.push({
      s: x.s,
      f: x.f,
      colors: [NEUTRAL],
      root: x.i === 0,
      dim: true,
      label: labels === 'finger' ? '' : label(x),
      text: DARK_TEXT,
      desc: `the ${degreeName(sc, x.i)} of ${name}, in another pattern`,
    });
  const cellLabel = (s: number, f: number) => {
    const d = dots.find((x) => x.s === s && x.f === f);
    const i = sc.steps.indexOf(mod12(pcAt(s, f) - key));
    if (i < 0) return `${BOTH_NAMES[pcAt(s, f)]}, not in ${name}`;
    return `${scaleNoteName(sc, root, i)}, ${d?.desc ?? `the ${degreeName(sc, i)} of ${name}`}`;
  };

  /* ---------- playing it: up and down in eighth notes, on the click ---------- */
  const seq = useRef<PatternNote[]>([]);
  seq.current = [...pat.notes, ...pat.notes.slice(0, -1).reverse()];
  const play = () => {
    if (playing) {
      stopLoop();
      return;
    }
    void startLoop({
      id: PLAYER,
      label: `${name}, pattern ${pat.n}`,
      bpm,
      countIn: 4,
      beat: (time, b, spb) => {
        const notes = seq.current;
        for (const h of [0, 1]) {
          const k = b * 2 + h;
          if (!loop && k >= notes.length) return h ? null : 'end';
          const x = notes[k % notes.length]!;
          engine.playNote(x.midi, time + h * (spb / 2), h ? 0.7 : 0.82, x.s, { s: x.s, f: x.f });
        }
        return null;
      },
      ui: () => {},
    });
  };
  // Leaving the page stops the pattern; so does choosing another scale (its notes would no longer be on the board).
  useEffect(() => () => void (usePlayer.getState().id === PLAYER && stopLoop()), []);
  useEffect(() => void (usePlayer.getState().id === PLAYER && stopLoop()), [sc.id, key]);
  useEffect(() => void (usePlayer.getState().id === PLAYER && setLoopBpm(bpm)), [bpm]);

  useHotkeys({ space: play, lower: () => go(place - 1), higher: () => go(place + 1) });

  // 2NPS: the hand moved up a fret when a top string's lower note takes the index finger above the box's start.
  const shift = nps === 2 && pat.notes.some((x, k) => x.s >= 4 && fingers[k] === '1' && x.f > Math.max(1, pat.lo));
  const where = (p: typeof pat) => (p.lo === 0 ? `open position to fret ${p.hi}` : `frets ${p.lo}–${p.hi}`);

  return (
    <>
      <PageHead
        title="Scale patterns"
        lede="Every scale in every key, as the patterns guitarists learn it by: two notes per string for the pentatonic scales, three per string for the seven-note scales. Each pattern starts from a different note on the low E string, and together they cover the neck."
      />
      <section className="bench" aria-label="Scale patterns">
        <div className="toolbar">
          <Seg<Nps>
            value={nps}
            options={[
              [2, 'Two (pentatonic)'],
              [3, 'Three (seven-note)'],
            ]}
            onChange={(v) => v !== nps && set({ scale: scalesFor(v)[0]!.id, p: 1 })}
            label="Notes per string"
          />
          <Seg
            value={sc.id}
            options={scalesFor(nps).map((s) => [s.id, s.name] as const)}
            onChange={(id) => set({ scale: id, p: 1 })}
            label="Scale"
          />
        </div>
        <div className="toolbar">
          <Seg
            value={key}
            options={Array.from({ length: 12 }, (_, pc) => [pc, scaleRootName(sc, pc)] as const)}
            onChange={(k) => set({ key: k })}
            label="Key"
            className="keys"
          />
        </div>
        <div className="toolbar">
          <Seg
            value={pat.n}
            options={patterns.map(
              (p) =>
                [
                  p.n,
                  <span className="pattern-opt" key={p.n}>
                    {p.shape ? (
                      <>
                        <span aria-hidden="true">{p.n}</span>
                        <Pill s={p.shape} />
                        <span className="sr-only">{`${p.n}, ${p.shape}-shape`}</span>
                      </>
                    ) : (
                      p.n
                    )}
                  </span>,
                ] as const,
            )}
            onChange={(v) => set({ p: v })}
            label="Pattern"
            className="patterns"
          />
          <Seg value={labels} options={LABELS} onChange={setLabels} label="Dot labels" />
          <Check checked={whole} onChange={setWhole}>
            The rest of the neck
          </Check>
        </div>
        <Fretboard
          id="scale-board"
          to={SCALE_LAST_FRET}
          dots={dots}
          band={{ lo: pat.lo, hi: pat.hi, label: `Pattern ${pat.n}` }}
          cellLabel={cellLabel}
          label={`${name}, pattern ${pat.n}, ${where(pat)}`}
        />
        <Legend keys={['root', ...(whole ? ['other'] : [])]} />
        <div className="actions">
          <button type="button" className="btn" onClick={() => go(place - 1)} disabled={place === 0}>
            {dir.vertical ? '▲ Lower' : dir.lefty ? 'Lower ▶' : '◀ Lower'}
            <Kbd>{dir.lowerGlyph}</Kbd>
          </button>
          <button type="button" className="btn" onClick={() => go(place + 1)} disabled={place === byPlace.length - 1}>
            {dir.vertical ? '▼ Higher' : dir.lefty ? '◀ Higher' : 'Higher ▶'}
            <Kbd>{dir.higherGlyph}</Kbd>
          </button>
          <div className="now">
            {pat.shape ? <Pill s={pat.shape} /> : null}
            <strong>Pattern {pat.n}</strong>
            <span>{where(pat)}</span>
          </div>
          <button type="button" className="btn primary" onClick={play}>
            {playing ? 'Stop' : 'Play it up and down'}
            <Kbd>Space</Kbd>
          </button>
        </div>
        <div className="toolbar">
          <Seg
            value={bpm}
            options={TEMPI.map((t) => [t, String(t)] as const)}
            onChange={setBpm}
            label="Tempo (BPM, eighth notes)"
          />
          <Check checked={loop} onChange={setLoop}>
            Keep going round
          </Check>
        </div>
      </section>
      <div className="cards">
        <Card title={`Pattern ${pat.n}${pat.shape ? `, around the ${pat.shape}-shape` : ''}`}>
          <PatternTab notes={pat.notes} fingers={fingers} />
          <p>
            It starts on the {degreeName(sc, pat.notes[0]!.i)}, {noteName(pat.notes[0]!)}, at{' '}
            {pat.notes[0]!.f === 0 ? 'the open low E string' : `fret ${pat.notes[0]!.f} of the low E string`}, and
            climbs {nps === 2 ? 'two' : 'three'} notes on every string to {noteName(pat.notes[pat.notes.length - 1]!)}{' '}
            on the high e.
          </p>
          <p className="muted">
            {nps === 2
              ? `Play it in position, one finger per fret.${shift ? ' The B string is tuned a 3rd from the G, not a 4th, so the hand moves up a fret for the top two strings.' : ''} The ${pat.shape}-shape ${sc.minor ? 'minor' : 'major'} chord sits inside it: the box is that chord's scale.`
              : 'Most strings hold one of three grips: whole-whole (fingers 1-2-4, a stretch), half-whole (1-2-4) or whole-half (1-3-4). The B string shifts the grips up a fret, so the pattern leans up the neck.'}
          </p>
        </Card>
        <Card title={name}>
          <p>{sc.sound}</p>
          <table className="tab scale-notes">
            <caption className="sr-only">Notes of {name}</caption>
            <tbody>
              <tr>
                <th scope="row">Note</th>
                {sc.steps.map((_, i) => (
                  <td key={i}>{scaleNoteName(sc, root, i)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">Degree</th>
                {sc.steps.map((_, i) => (
                  <td key={i}>{degreeLabel(sc, i)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </Card>
        <Card title="Two or three notes per string">
          <p>
            <strong>Two per string</strong> fits the five-note scales: each string holds two notes a whole step or a
            minor 3rd apart, so the hand stays in one position. The five patterns are the five pentatonic boxes, one
            around each CAGED shape, in the same order up the neck: E, D, C, A, G.
          </p>
          <p>
            <strong>Three per string</strong> fits the seven-note scales: two and a half octaves with the same picking
            on every string, which is why it is the pattern for fast alternate picking and legato. Seven patterns, one
            from each note of the scale.
          </p>
        </Card>
        <Card title="Practising the patterns">
          <p>
            Learn one pattern up and down at 60 with the click, saying the degrees, until it plays itself. Then take the
            next one up the neck: the top half of one pattern is the bottom half of the next, so you already know half
            of it.
          </p>
          <p className="muted">
            Use Lower and Higher (or the arrow keys) to walk the patterns along the neck, and keep the rest of the neck
            showing to see where each one joins the next.
          </p>
        </Card>
      </div>
    </>
  );
}

/** The pattern as tab, low E to high e: each string's frets and fingers. */
function PatternTab({ notes, fingers }: { notes: PatternNote[]; fingers: string[] }) {
  const per = STRING_LABEL.map((_, s) => notes.map((x, k) => ({ ...x, k })).filter((x) => x.s === s));
  return (
    <table className="tab pattern-tab">
      <caption className="sr-only">
        The pattern string by string, low E to high e:{' '}
        {per.map((xs, s) => `${STRING_LABEL[s]} frets ${xs.map((x) => x.f).join(' ')}`).join('; ')}
      </caption>
      <thead>
        <tr>
          <th scope="col">String</th>
          {STRING_LABEL.map((s, i) => (
            <th scope="col" key={i}>
              {s}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Frets</th>
          {per.map((xs, s) => (
            <td key={s}>{xs.map((x) => x.f).join(' ')}</td>
          ))}
        </tr>
        <tr>
          <th scope="row">Fingers</th>
          {per.map((xs, s) => (
            <td key={s} className="fg">
              {xs.map((x) => fingers[x.k]).join(' ')}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}
