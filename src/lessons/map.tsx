import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { engine, toPlayable } from '../audio/engine';
import { PICK_CLARITY } from '../audio/mic/dsp';
import { setLoopBpm, startLoop, stopLoop, usePlayer } from '../audio/transport';
import { COL, NEUTRAL_ROOT, barreSpec, isOptional, mapVisuals, noteRole, type MapState } from '../fretboard/build';
import { Legend, Pill } from '../fretboard/extras';
import { Fretboard } from '../fretboard/Fretboard';
import { MicToggle } from '../listen/MicControls';
import {
  announce,
  logDrill,
  logDrillMiss,
  logPivots,
  patchSeen,
  toast,
  usePrefs,
  useProgress,
  addXP,
} from '../store/app';
import {
  MAX_FRET,
  ORDER,
  chordLabel,
  chordLong,
  instances,
  midiAt,
  mod12,
  notesOf,
  posName,
  sharedRoots,
  stringsFor,
  VOICE_OPTS,
  type Instance,
  type Quality,
  type Voicing,
} from '../theory';
import { Check, FadeSeg, KeyPicker, Kbd, LabelSeg, Seg, ShapeAnswer } from '../ui/controls';
import { useHotkeys, useNeckDirection } from '../ui/hooks';
import { useMicEvents } from './useMicNotes';

export interface MapStore extends MapState {
  walking: boolean;
  revealed: Record<string, boolean>;
  predStage: string | null;
  predMsg: string;
  predOk: boolean;
}

export type MapStoreHook = UseBoundStore<StoreApi<MapStore>>;

export function createMapStore(init: Partial<MapStore>): MapStoreHook {
  return create<MapStore>(() => ({
    key: 0,
    q: 'major',
    idx: 0,
    focus: true,
    voicing: 'full',
    pent: false,
    rootsOnly: false,
    walking: false,
    revealed: {},
    predStage: null,
    predMsg: '',
    predOk: false,
    ...init,
  }));
}

export const LADDER = [50, 60, 80, 100] as const;

export interface MapBenchProps {
  store: MapStoreHook;
  keyLock?: boolean;
  qualities?: ReadonlyArray<readonly [Quality, string]>;
  voicings?: ReadonlyArray<readonly [Voicing, string]>;
  pent?: boolean;
  drill?: boolean;
  predict?: boolean;
  onPredict?: () => void;
  /** Extra keyboard handling (e.g. the shape check); return true if handled. */
  char?: (k: string) => boolean;
}

export function useMapList(store: MapStoreHook): Instance[] {
  const key = store((s) => s.key);
  const q = store((s) => s.q);
  return useMemo(() => instances(key, q), [key, q]);
}

export function MapBench({
  store,
  keyLock,
  qualities,
  voicings,
  pent,
  drill,
  predict,
  onPredict,
  char,
}: MapBenchProps) {
  const st = store();
  const prefs = usePrefs();
  const list = useMapList(store);
  const idx = Math.max(0, Math.min(st.idx, list.length - 1));
  const inst = list[idx]!;
  const dir = useNeckDirection();
  const [pivotBeat, setPivotBeat] = useState(false);
  const playerId = usePlayer((p) => p.id);
  const walking = playerId === 'walk';
  // While the linking drill plays, the neck can fade to roots only, or to nothing (play from memory).
  const fade = playerId === 'drill' ? prefs.fade : 'shapes';
  const ctx = { labels: prefs.labels, sp: prefs.minorSpelling };
  const set = (p: Partial<MapStore>) => store.setState(p);
  const strOf = (i: Instance) => stringsFor(st.voicing, i);
  const play = (i = inst) => engine.strum(toPlayable(notesOf(i, strOf(i))));
  const pred = !!predict && !st.revealed[st.q + st.key];
  const barre = st.focus && fade === 'shapes' ? barreSpec(inst, stringsFor(st.voicing, inst), COL[inst.shape]) : null;
  const full = useMemo(() => mapVisuals({ ...st, idx }, list, ctx), [st, idx, list, ctx.labels, ctx.sp]); // eslint-disable-line react-hooks/exhaustive-deps
  const vis =
    fade === 'shapes'
      ? full
      : {
          ...full,
          dots: fade === 'roots' ? full.dots.filter((d) => (d.root && !d.dim) || d.cls === 'anchor') : [],
          ghosts: [],
          muted: [],
        };
  const next = list[idx + 1];
  const prev = list[idx - 1];
  const linkNext = next ? sharedRoots(inst, next) : [];
  const msgRef = useRef<HTMLDivElement>(null);

  const go = (i: number, sound = true) => {
    if (i < 0 || i >= list.length) return;
    set({ idx: i, focus: true });
    if (sound) play(list[i]);
  };

  const walk = () => {
    if (walking) {
      stopLoop();
      return;
    }
    set({ focus: true });
    void startLoop<number>({
      id: 'walk',
      label: `Walking ${chordLabel(st.key, st.q, ctx.sp)} up the neck`,
      bpm: 70,
      countIn: 0,
      beat: (time, n) => {
        if (n % 2) return null;
        const i = n / 2;
        if (i >= list.length) return 'end';
        engine.strum(toPlayable(notesOf(list[i]!, strOf(list[i]!))), { when: time });
        return i;
      },
      ui: (e) => {
        if (e.kind === 'beat') set({ idx: e.p });
      },
    });
  };

  useHotkeys({
    space: () => (pred ? undefined : play()),
    lower: () => go(idx - 1),
    higher: () => go(idx + 1),
    char: (k) => {
      if (char?.(k)) return true;
      if (k === 'a' && !pred) {
        engine.arpeggio(toPlayable(notesOf(inst, strOf(inst))));
        return true;
      }
      return false;
    },
  });

  const onCell = (s: number, f: number) => {
    engine.playOne(s, f);
    const { name, role } = noteRole(midiAt(s, f), st.key, st.q, ctx.sp);
    const inShapes = [...new Set(list.filter((i) => i.frets[s] === f).map((i) => i.shape + '-shape'))];
    announce(`${posName(s, f)}: ${name}, ${role}${inShapes.length ? `. Part of the ${inShapes.join(' and ')}` : ''}.`);
  };

  /* ---------- Step 4: predict the starting shape and its fret ---------- */
  const firstTime = !(useProgress.getState().seen.s4pred ?? []).length;
  const predict1 = (val: string) => {
    const ans = list[0]!.shape;
    if (val === ans) {
      set({ predStage: ans });
      announce(`Right shape. Now pick the fret where the ${ans}-shape starts.`);
      requestAnimationFrame(() =>
        document.querySelector<HTMLButtonElement>('[data-predf="0"]')?.focus({ preventScroll: true }),
      );
      return;
    }
    const msg =
      val === 'skip'
        ? `The loop for ${chordLong(st.key, st.q, ctx.sp)} starts with the ${ans}-shape at frets ${list[0]!.minF}–${list[0]!.maxF}.`
        : `Not quite: the ${ans}-shape starts lowest, at frets ${list[0]!.minF}–${list[0]!.maxF}. Compare it with the ${val}-shape on the coloured shape bars.`;
    set({
      revealed: { ...st.revealed, [st.q + st.key]: true },
      predStage: null,
      predOk: false,
      predMsg: msg,
      idx: 0,
      focus: true,
    });
    announce(msg);
    play(list[0]);
    requestAnimationFrame(() => msgRef.current?.focus({ preventScroll: true }));
  };
  const predict2 = (f: number) => {
    const first = list[0]!;
    let msg: string;
    let ok = false;
    if (f === first.minF) {
      ok = true;
      msg = `Spot on: the ${first.shape}-shape at frets ${first.minF}–${first.maxF} comes first, then ${list
        .slice(1, 5)
        .map((i) => i.shape)
        .join(', ')}.`;
      const seen = new Set(useProgress.getState().seen.s4pred ?? []);
      seen.add(st.q + st.key);
      addXP(10);
      patchSeen({ s4pred: [...seen] });
      onPredict?.();
    } else
      msg = `Right shape, wrong fret: the ${first.shape}-shape starts at fret ${first.minF} (frets ${first.minF}–${first.maxF}).`;
    set({
      revealed: { ...st.revealed, [st.q + st.key]: true },
      predStage: null,
      predOk: ok,
      predMsg: msg,
      idx: 0,
      focus: true,
    });
    announce(msg);
    play(list[0]);
    requestAnimationFrame(() => msgRef.current?.focus({ preventScroll: true }));
  };

  const changeKey = (key: number, q: Quality = st.q) => {
    stopLoop();
    set({ key, q, idx: 0, predMsg: '', predStage: null });
    if (!(predict && !st.revealed[q + key])) {
      const l = instances(key, q);
      engine.strum(toPlayable(notesOf(l[0]!, stringsFor(st.voicing, l[0]!))));
    }
  };

  const rule = (
    <p>
      A root at fret <em>r</em> on the low E string gives an E-shape barred at <em>r</em>, or a G-shape that starts at{' '}
      <em>r</em> − 3{st.q === 'minor' ? ' (− 4 in minor)' : ''}. On the A string it gives an A-shape at <em>r</em>, or a
      C-shape at <em>r</em> − 3. On the D string it gives a D-shape at <em>r</em>. The lowest start wins.
    </p>
  );

  const predictDots = () => {
    const dots = [];
    for (let s = 0; s < 3; s++)
      for (let f = 0; f <= MAX_FRET; f++)
        if (mod12(midiAt(s, f) - st.key) === 0)
          dots.push({ s, f, colors: [NEUTRAL_ROOT], root: true, label: 'R', text: '#14212b' });
    return dots;
  };

  // The linking drill needs a shared root at every change of shape. Major and minor chains always have one;
  // dominant-7th forms sometimes trade that root for the ♭7, so the drill isn't offered there.
  const dom7NoLinks = st.q === 'dom7' || list.some((a, i) => i > 0 && !sharedRoots(list[i - 1]!, a).length);

  return (
    <section className="bench" aria-label="Neck map">
      {keyLock ? null : (
        <div className="toolbar">
          <KeyPicker value={st.key} q={st.q} onChange={(k) => changeKey(k)} />
          <Seg
            value={st.q}
            options={
              qualities ?? [
                ['major', 'Major'],
                ['minor', 'Minor'],
              ]
            }
            onChange={(q) => changeKey(st.key, q)}
            label="Chord quality"
          />
        </div>
      )}
      <div className="toolbar">
        <Seg
          value={st.focus ? 'one' : 'all'}
          options={[
            ['one', 'One shape'],
            ['all', 'All shapes'],
          ]}
          onChange={(v) => set({ focus: v === 'one' })}
          label="Highlight"
        />
        <Seg
          value={st.voicing}
          options={voicings ?? VOICE_OPTS.slice(0, 2)}
          onChange={(v) => {
            set({ voicing: v });
            engine.strum(toPlayable(notesOf(inst, stringsFor(v, inst))));
          }}
          label="Strings to play"
        />
        <LabelSeg />
        <Check checked={st.rootsOnly} onChange={(v) => set({ rootsOnly: v })}>
          Roots only
        </Check>
        {pent ? (
          <Check
            checked={st.pent && st.focus}
            disabled={!st.focus}
            onChange={(v) => set({ pent: v })}
            title={st.focus ? '' : 'Choose One shape to see its scale box'}
          >
            Pentatonic box{st.focus ? '' : ' (pick one shape)'}
          </Check>
        ) : null}
      </div>
      {pred ? (
        <>
          <div className="callout">
            <p>
              <strong>
                {st.predStage
                  ? `Right: the ${st.predStage}-shape. Now, at which fret does it start?`
                  : `Predict first: which shape of ${chordLong(st.key, st.q, ctx.sp)} sits closest to the nut?`}
              </strong>
            </p>
            <p>
              Here are its roots on the three lowest strings.
              {st.predStage ? ' Count back from the root to where your index finger sits (0 = open position).' : ''}
            </p>
            {firstTime ? (
              rule
            ) : (
              <details>
                <summary>Show the rule</summary>
                {rule}
              </details>
            )}
          </div>
          <Fretboard
            dots={predictDots()}
            label={`Roots of ${chordLong(st.key, st.q, ctx.sp)} on the low E, A and D strings`}
          />
          <div className="quiz-row" role="group" aria-label="Your prediction">
            {st.predStage
              ? Array.from({ length: 13 }, (_, f) => (
                  <button
                    key={f}
                    type="button"
                    className="btn opt"
                    data-predf={f}
                    onClick={() => predict2(f)}
                    aria-label={`Fret ${f}`}
                  >
                    {f}
                  </button>
                ))
              : ORDER.map((o) => <ShapeAnswer key={o} shape={o} onClick={() => predict1(o)} />)}
            <button type="button" className="btn ghost" onClick={() => predict1('skip')}>
              Skip, just show me
            </button>
          </div>
        </>
      ) : (
        <>
          {st.predMsg ? (
            <div className={`callout${st.predOk ? ' good' : ''}`} ref={msgRef} tabIndex={-1}>
              <p>{st.predMsg}</p>
            </div>
          ) : null}
          {dir.vertical ? (
            <div className="shape-btns" role="group" aria-label="Jump to a shape">
              {list.map((inst, i) => (
                <button
                  key={`${inst.shape}${inst.minF}`}
                  type="button"
                  className="btn small shape-jump"
                  aria-pressed={st.focus && i === idx}
                  onClick={() => go(i)}
                >
                  {/* Name comes from the content: "C-shape, frets 0–3", with the visible text inside it. */}
                  <span className={`shape-pill ${inst.shape}`} style={{ ['--sc' as string]: COL[inst.shape] }}>
                    {inst.shape}
                  </span>
                  <span className="sr-only"> shape, frets</span>
                  {inst.minF}–{inst.maxF}
                </button>
              ))}
            </div>
          ) : null}
          <Fretboard
            id="map-board"
            dots={vis.dots}
            ghosts={vis.ghosts}
            zones={vis.zones}
            muted={vis.muted}
            barre={barre}
            cellLabel={vis.cellLabel}
            onCell={onCell}
            onZone={(i) => go(i)}
            pivot={pivotBeat}
            label={
              fade === 'shapes'
                ? `${chordLong(st.key, st.q, ctx.sp)} in its CAGED shapes`
                : `${chordLong(st.key, st.q, ctx.sp)}: ${inst.shape}-shape, frets ${inst.minF} to ${inst.maxF}, ${fade === 'roots' ? 'roots only' : 'from memory'}`
            }
          />
          <Legend
            keys={[
              'root',
              st.focus ? 'link' : 'split',
              st.focus ? 'dim' : 'tone',
              ...(barre ? ['barre'] : []),
              ...(st.focus && notesOf(inst, strOf(inst)).some((n) => isOptional(inst, n.s, n.f, strOf(inst)))
                ? ['opt']
                : []),
              ...(st.focus && st.voicing !== 'full' ? ['anchor'] : []),
              ...(st.focus ? ['mute'] : []),
              ...(st.pent && st.focus && pent ? ['pent'] : []),
            ]}
          />
          <div className="actions">
            <button type="button" className="btn" onClick={() => go(idx - 1)} disabled={idx === 0}>
              {dir.vertical ? '▲ Lower' : dir.lefty ? 'Lower ▶' : '◀ Lower'}
              <Kbd>{dir.lowerGlyph}</Kbd>
            </button>
            <button type="button" className="btn" onClick={() => go(idx + 1)} disabled={idx === list.length - 1}>
              {dir.vertical ? '▼ Higher' : dir.lefty ? '◀ Higher' : 'Higher ▶'}
              <Kbd>{dir.higherGlyph}</Kbd>
            </button>
            <div className="now">
              <Pill s={inst.shape} />
              <strong>{inst.shape}-shape</strong>
              <span>
                frets {inst.minF}–{inst.maxF}
              </span>
              <span className="muted">
                {idx + 1} of {list.length}
              </span>
            </div>
            <button type="button" className="btn primary" onClick={() => play()}>
              Strum<Kbd>Space</Kbd>
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => engine.arpeggio(toPlayable(notesOf(inst, strOf(inst))))}
            >
              Arpeggio<Kbd>A</Kbd>
            </button>
            <button type="button" className="btn" onClick={walk}>
              {walking ? 'Stop the walk' : 'Walk the chain'}
            </button>
          </div>
          <p className="muted">
            {next && linkNext.length
              ? `Dashed rings: the shared root${linkNext.length > 1 ? 's' : ''} with the next shape up (${next.shape}-shape) on the ${linkNext.map((n) => posName(n.s, n.f)).join(' and ')}. Keep a finger there and build the next shape around it.`
              : next && dom7NoLinks
                ? `The ${inst.shape}7 form trades an octave root for the ♭7, so it shares no root with the ${next.shape}7 form above. Link with the major shapes, then add the ♭7.`
                : prev
                  ? 'This is the top of the chain on this neck. Walk back down using the shared roots.'
                  : ''}{' '}
            Tap a coloured bar to jump to a shape, or any fret to hear it.
          </p>
          {drill && !dom7NoLinks ? (
            <LinkingDrill
              list={list}
              voicing={st.voicing}
              q={st.q}
              keyPc={st.key}
              onIdx={(i) => set({ idx: i, focus: true })}
              onPivotBeat={setPivotBeat}
            />
          ) : null}
        </>
      )}
    </section>
  );
}

/* ================= Linking drill ================= */
interface DrillBeat {
  idx: number;
  beat: number;
  hold?: boolean;
}

export function LinkingDrill({
  list,
  voicing,
  q,
  keyPc,
  onIdx,
  onPivotBeat,
}: {
  list: Instance[];
  voicing: Voicing;
  q: Quality;
  keyPc: number;
  onIdx: (i: number) => void;
  onPivotBeat: (on: boolean) => void;
}) {
  const sp = usePrefs((p) => p.minorSpelling);
  const headphones = usePrefs((p) => p.headphones);
  const drills = useProgress((p) => p.drills);
  const pivots = useProgress((p) => p.pivots);
  const drillKey = q + keyPc;
  // A review link brings the tempo along (?bpm=80): start there.
  const [params] = useSearchParams();
  const [bpm, setBpm] = useState<number>(() => {
    const b = Number(params.get('bpm'));
    return (LADDER as readonly number[]).includes(b) ? b : 60;
  });
  const [playAlong, setPlayAlong] = useState(true);
  const [beat, setBeat] = useState(-1);
  const [count, setCount] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState('');
  /** Visible message and the one live region, together. */
  const msgRef = useRef<HTMLParagraphElement>(null);
  const askRef = useRef<HTMLParagraphElement>(null);
  /** Move focus to the next thing to read or do, once React has rendered it (focus never falls to <body>). */
  const focusSoon = (r: React.RefObject<HTMLElement | null>) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r.current?.focus({ preventScroll: true })));
  const say = (m: string) => {
    setMsg(m);
    if (m) announce(m);
  };
  const [hold, setHold] = useState('');
  const [score, setScore] = useState<{ clean: number; total: number } | null>(null);
  const running = usePlayer((p) => p.id === 'drill');
  const cur = useRef({
    k: 0,
    w: 0,
    results: [] as boolean[],
    pv: null as null | {
      start: number;
      midis: number[];
      heard: boolean;
      held: boolean;
      held_announced?: boolean;
      text: string;
    },
  });
  const lastIdx = useRef(-1);
  // Arriving from a review link: bring the drill into view.
  useEffect(() => {
    if (params.get('bpm')) document.getElementById('drill')?.scrollIntoView({ block: 'start' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // A pivot counts when the shared root is PICKED as a single note. A strummed chord also contains the
  // root, but its pitch clarity is far lower, so it doesn't count.
  const micOn = useMicEvents((e) => {
    const pv = cur.current.pv;
    if (e.type !== 'note' || !pv || pv.heard || e.t < pv.start) return;
    if (e.reading.clarity < PICK_CLARITY) return;
    // Exact pitch: the shared root at that string and fret, not the same note in another octave.
    if (pv.midis.includes(e.midi)) {
      pv.heard = true;
      setHold('');
    }
  }, running);

  // Leaving the drill (another key or quality, another page) stops it: a hidden drill must never keep holding.
  useEffect(
    () => () => {
      onPivotBeat(false);
      if (usePlayer.getState().id === 'drill') stopLoop();
    },
    [onPivotBeat],
  );

  const start = () => {
    const ids = list.map((_, i) => i);
    const path = ids.concat(ids.slice(0, -1).reverse());
    const judged = micOn;
    cur.current = { k: 0, w: 0, results: [], pv: null };
    lastIdx.current = -1;
    setAsk(false);
    say('');
    setScore(null);
    setHold('');
    onIdx(0);
    const c = cur.current;
    void startLoop<DrillBeat>({
      id: 'drill',
      label: `Linking drill in ${chordLabel(keyPc, q, sp)} at ${bpm} BPM`,
      bpm,
      beat: (time) => {
        if (c.k >= path.length) return 'end';
        // Listening: the shape doesn't change until the shared root has been heard.
        if (judged && c.w === 0 && c.k > 0 && c.pv && !c.pv.heard) {
          c.pv.held = true;
          engine.click(time, false, 0.45);
          return { idx: path[c.k - 1]!, beat: 3, hold: true };
        }
        if (c.w === 0 && c.k > 0 && c.pv) {
          c.results.push(!c.pv.held);
          c.pv = null;
        }
        engine.click(time, c.w === 0);
        const inst = list[path[c.k]!]!;
        if (c.w === 0 && playAlong && (!judged || headphones))
          engine.strum(toPlayable(notesOf(inst, stringsFor(voicing, inst))), { when: time, vel: 0.55 });
        if (judged && c.w === 2 && c.k < path.length - 1) {
          const nx = list[path[c.k + 1]!]!;
          const sh = sharedRoots(inst, nx);
          // Never hold on a pivot with nothing to play: only listen when there is a shared root.
          if (sh.length)
            c.pv = {
              start: time - 0.3,
              midis: sh.map((n) => n.midi),
              heard: false,
              held: false,
              text: sh.map((n) => posName(n.s, n.f)).join(' or '),
            };
        }
        const p = { idx: path[c.k]!, beat: c.w };
        c.w++;
        if (c.w === 4) {
          c.w = 0;
          c.k++;
        }
        return p;
      },
      ui: (e) => {
        if (e.kind === 'count') {
          setCount(e.n);
          return;
        }
        if (e.kind === 'end') {
          setBeat(-1);
          setCount(null);
          onPivotBeat(false);
          if (judged) {
            const clean = c.results.filter(Boolean).length;
            const total = c.results.length;
            setScore({ clean, total });
            logPivots(drillKey, bpm, clean, total);
            if (total && clean / total >= 0.9) {
              logDrill(drillKey, bpm);
              toast(`Clean drill heard at ${bpm} BPM, +20 XP`);
              const up = LADDER.find((b) => b > bpm);
              say(
                `${clean} of ${total} pivots clean. ${up ? `Next time, try ${up} BPM.` : 'Top of the ladder: try another key.'}`,
              );
            } else {
              logDrillMiss(drillKey, bpm);
              say(
                `${clean} of ${total} pivots clean. Aim for 9 in 10: slow down a step, or switch to Easy shapes, and keep a finger on the shared root.`,
              );
            }
          } else {
            setAsk(true);
            announce(`Drill finished. Were all your changes clean at ${bpm} BPM?`);
            focusSoon(askRef);
          }
          if (judged) focusSoon(msgRef);
          return;
        }
        setCount(null);
        setBeat(e.p.beat);
        onPivotBeat(e.p.beat === 3);
        if (e.p.hold && c.pv && !c.pv.held_announced) {
          c.pv.held_announced = true;
          announce(`Holding: play the shared root, ${c.pv.text}, to move on.`);
        }
        if (e.p.hold) setHold(c.pv?.text ?? '');
        if (e.p.idx !== lastIdx.current) {
          lastIdx.current = e.p.idx;
          onIdx(e.p.idx);
          const inst = list[e.p.idx]!;
          announce(`${inst.shape}-shape, frets ${inst.minF} to ${inst.maxF}`);
        }
      },
      onStop: () => {
        setBeat(-1);
        setCount(null);
        onPivotBeat(false);
      },
    });
  };

  const best = drills[drillKey];
  const heardScores = pivots[drillKey];

  return (
    <div className="drill" id="drill">
      <div>
        <h2 className="card-title">Linking drill</h2>
        <span className="muted">
          Four beats per shape, up the neck and back down. Keep a finger on the shared root while you change.
          {micOn
            ? ' On beat 3 or 4, pick the shared root (the dashed ring; it pulses on 4): the app waits until it hears it.'
            : ''}
        </span>
      </div>
      <MicToggle />
      <div className="toolbar">
        <Seg
          value={bpm}
          options={LADDER.map((b) => [b, `${b} BPM`] as const)}
          onChange={(b) => {
            setBpm(b);
            if (running) setLoopBpm(b);
          }}
          label="Drill tempo"
        />
        <FadeSeg />
        <Check checked={playAlong} onChange={setPlayAlong}>
          Play each chord with me{micOn && !headphones ? ' (with headphones)' : ''}
        </Check>
        <button
          type="button"
          className={`btn${running ? '' : ' primary'}`}
          onClick={() => (running ? stopLoop() : start())}
        >
          {running ? 'Stop drill' : 'Start drill'}
        </button>
        <span className="countin" aria-hidden="true">
          {count ?? ''}
        </span>
        <div className="beats" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`b${i === beat ? ' on' : ''}`} />
          ))}
        </div>
      </div>
      {hold ? (
        <div className="callout warn">
          <p>
            <strong>Holding:</strong> play the shared root ({hold}) to move on.
          </p>
        </div>
      ) : null}
      {ask ? (
        <div className="callout">
          <p ref={askRef} tabIndex={-1}>
            Were all your changes clean at {bpm} BPM?
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn small primary"
              onClick={() => {
                logDrill(drillKey, bpm);
                const up = LADDER.find((b) => b > bpm);
                setAsk(false);
                say(
                  up ? `Logged. Next time, try ${up} BPM.` : 'Logged at the top of the ladder. Try it in another key.',
                );
                toast('Clean drill logged, +20 XP');
                focusSoon(msgRef);
              }}
            >
              Yes, clean
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => {
                setAsk(false);
                logDrillMiss(drillKey, bpm);
                say(
                  'No problem. Drop one step on the tempo ladder or switch to Easy shapes, and watch the shared root rather than your whole hand.',
                );
                focusSoon(msgRef);
              }}
            >
              Not yet
            </button>
          </div>
        </div>
      ) : null}
      {score ? (
        <p className="heard">
          <span className={`tag ${score.total && score.clean / score.total >= 0.9 ? 'ok' : 'warn'}`}>
            {score.clean}/{score.total} pivots heard on time
          </span>
        </p>
      ) : null}
      {msg ? (
        <p className="muted" ref={msgRef} tabIndex={-1}>
          {msg}
        </p>
      ) : null}
      <p className="muted">
        Best clean tempo in {chordLabel(keyPc, q, sp)}: <strong>{best ? `${best} BPM` : 'none yet'}</strong>
        {heardScores
          ? `. Heard pivots: ${Object.entries(heardScores)
              .map(([b, s]) => `${b} BPM ${s.clean}/${s.total}`)
              .join(', ')}`
          : ''}
      </p>
    </div>
  );
}

export const shapeColor = COL;
