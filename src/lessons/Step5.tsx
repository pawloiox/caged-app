import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { engine, toPlayable } from '../audio/engine';
import { checkChord, type ChordVerdict } from '../audio/mic/dsp';
import { setLoopBpm, startLoop, stopLoop, usePlayer } from '../audio/transport';
import { COL, barreSpec, mutedSpecs, noteDesc, textFor } from '../fretboard/build';
import { Legend, Pill } from '../fretboard/extras';
import { Fretboard, type BadgeSpec, type DotSpec, type GhostSpec } from '../fretboard/Fretboard';
import { MicToggle } from '../listen/MicControls';
import { addXP, announce, patchSeen, recordStat, toast, usePrefs, useProgress } from '../store/app';
import {
  BOTH_NAMES,
  CHORD_IVS,
  PATTERN,
  PROGS,
  STRING_LABEL,
  VOICE_OPTS,
  ZONES,
  arpSeq,
  buildProgression,
  dotLabel,
  explainChoice,
  fingerOf,
  mod12,
  notesOf,
  pcAt,
  planSummary,
  posName,
  positionsOfMidi,
  progById,
  spell,
  thirdOf,
  earDegrees,
  tonicOf,
  zoneById,
  type ChordPlan,
  type Voicing,
} from '../theory';
import { Card, Check, Head, KeyPicker, Kbd, LabelSeg, Seg } from '../ui/controls';
import { useHotkeys, useVertical } from '../ui/hooks';
import { useMicEvents } from './useMicNotes';
import { Link } from 'react-router';

interface S5 {
  key: number;
  prog: string;
  zone: string;
  voicing: Voicing;
  style: 'strum' | 'arp';
  bpm: number;
  click: boolean;
  third: boolean;
  cur: number;
}
const useS5 = create<S5>(() => ({
  key: 0,
  prog: '145',
  zone: 'z3',
  voicing: 'top4',
  style: 'strum',
  bpm: 84,
  click: true,
  third: false,
  cur: 0,
}));

type BarVerdict = { ok: boolean; text: string; kind: ChordVerdict | 'third' | 'not-third' };
interface Beat {
  ci: number;
  w: number;
  loopEnd: boolean;
}

/* ---------------- Ear + hand check ---------------- */
function EarCheck({
  chords,
  progId,
  zoneId,
  onClose,
}: {
  chords: ChordPlan[];
  progId: string;
  zoneId: string;
  onClose: () => void;
}) {
  const zone = zoneById(zoneId);
  const prog = progById(progId);
  // Answers: the chords that can be hidden. The home chord is played first as the reference, never hidden.
  const degrees = earDegrees(prog);
  const tonic = tonicOf(chords);
  const [target] = useState(() => {
    const hide = earDegrees(prog);
    const d = hide[Math.floor(Math.random() * hide.length)] ?? degrees[0]!;
    return chords.find((c) => c.roman === d.roman)!;
  });
  const [phase, setPhase] = useState<'name' | 'root' | 'done'>('name');
  const [nameOk, setNameOk] = useState<boolean | null>(null);
  const [rootMsg, setRootMsg] = useState('');
  const [rootOk, setRootOk] = useState<boolean | null>(null);
  const [tried, setTried] = useState<Array<{ s: number; f: number; ok: boolean }>>([]);
  const headRef = useRef<HTMLHeadingElement>(null);
  const vertical = useVertical();
  const findRef = useRef<HTMLParagraphElement>(null);

  const playIt = () => {
    const t = engine.now();
    engine.strum(toPlayable(tonic.notes), { when: t + 0.05, vel: 0.6 });
    engine.strum(toPlayable(target.notes), { when: t + 1.3, vel: 0.8 });
  };
  useEffect(() => {
    playIt();
    headRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (ok: boolean) => {
    const both = !!nameOk && ok;
    recordStat(`prog:${progId}:${target.roman}`, both);
    if (both) addXP(10);
    setPhase('done');
  };
  const tryRoot = (s: number, f: number, heard = false) => {
    if (phase !== 'root') return;
    if (!heard) engine.playOne(s, f);
    const isRoot = pcAt(s, f) === target.pc;
    const inZone = f >= zone.lo && f <= zone.hi;
    setTried((t) => [...t, { s, f, ok: isRoot && inZone }]);
    if (isRoot && inZone) {
      setRootOk(true);
      setRootMsg(`Yes: ${target.rootName} on the ${posName(s, f)}, inside your zone.`);
      announce(`Yes: ${target.rootName}, inside your zone.`);
      finish(true);
    } else {
      const m = isRoot
        ? `That's ${target.rootName}, but outside frets ${zone.lo}–${zone.hi}. Find one inside the zone.`
        : `That's ${BOTH_NAMES[pcAt(s, f)]}. Look for ${target.rootName}.`;
      setRootMsg(m);
      announce(m);
      if (tried.length >= 2) {
        setRootOk(false);
        finish(false);
      }
    }
  };
  useMicEvents((e) => {
    if (e.type !== 'note' || phase !== 'root') return;
    const ps = positionsOfMidi(e.midi, zone.lo, zone.hi);
    const p = ps.find((x) => pcAt(x.s, x.f) === target.pc) ?? ps[0];
    if (p) tryRoot(p.s, p.f, true);
  }, phase === 'root');

  useHotkeys({
    space: playIt,
    char: (k) => {
      if (phase === 'name' && /^[1-9]$/.test(k) && degrees[Number(k) - 1]) {
        pickName(degrees[Number(k) - 1]!.roman);
        return true;
      }
      return false;
    },
  });

  const pickName = (roman: string) => {
    const ok = roman === target.roman;
    setNameOk(ok);
    announce(
      ok
        ? `Right: ${target.roman}, ${target.name}. Now find its root inside your zone.`
        : `It was ${target.roman}, ${target.name}. Now find its root inside your zone.`,
    );
    setPhase('root');
    requestAnimationFrame(() => findRef.current?.focus({ preventScroll: true }));
  };

  const dots: DotSpec[] =
    phase === 'done'
      ? notesOf(target.inst, target.strings).map((n) => ({
          s: n.s,
          f: n.f,
          colors: [COL[target.inst.shape]],
          root: n.iv === 0,
          label: n.iv === 0 ? 'R' : '',
          text: textFor(target.inst.shape),
        }))
      : tried.map((t) => ({
          s: t.s,
          f: t.f,
          colors: [t.ok ? 'var(--good)' : 'var(--bad)'],
          label: t.ok ? '✓' : '✗',
          text: '#fff',
        }));

  return (
    <section className="bench" aria-label="Ear and hand check">
      <h2 ref={headRef} tabIndex={-1}>
        Ear + hand check
      </h2>
      {phase === 'name' ? (
        <>
          <p>
            You'll hear the home chord ({tonic.roman}, {tonic.name}), then a hidden chord from this progression. Which
            one is it? <span className="muted">Space plays it again.</span>
          </p>
          <div className="answers" role="group" aria-label="Roman numerals">
            {degrees.map((d, i) => (
              <button key={d.roman} type="button" className="btn opt" onClick={() => pickName(d.roman)}>
                {d.roman}
                <Kbd>{i + 1}</Kbd>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <p className={`feedback ${nameOk ? 'ok' : 'no'}`}>
            {nameOk ? 'Right' : 'Not quite'}: it was <strong>{target.roman}</strong>, {target.name}.
          </p>
          {phase === 'root' ? (
            <p ref={findRef} tabIndex={-1}>
              <strong>Now find its root inside your zone</strong> (frets {zone.lo}–{zone.hi}): tap it on the fretboard,
              or play it on your guitar with the mic on.
            </p>
          ) : null}
          <MicToggle />
          <Fretboard
            {...(vertical ? { from: Math.max(0, zone.lo - 1), to: Math.min(15, zone.hi + 1) } : {})}
            band={{ lo: zone.lo, hi: zone.hi, label: 'Your zone' }}
            dots={dots}
            barre={phase === 'done' ? barreSpec(target.inst, target.strings, COL[target.inst.shape]) : null}
            onCell={(s, f) => tryRoot(s, f)}
            label={`Find the root of ${target.name} inside frets ${zone.lo} to ${zone.hi}`}
          />
          {rootMsg ? <p className={`feedback ${rootOk ? 'ok' : rootOk === false ? 'no' : ''}`}>{rootMsg}</p> : null}
          {phase === 'done' ? (
            <div className="actions">
              <p>
                {nameOk && rootOk
                  ? 'Ear and hand both right · +10 XP. It comes back less often now.'
                  : 'Shown above: the chord as you played it. It will come back for review soon.'}
              </p>
              <button type="button" className="btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

/* ---------------- The player ---------------- */
export default function Step5() {
  const s = useS5();
  const prefs = usePrefs();
  const seen = useProgress((p) => p.seen.s5);
  const zonesDone = useMemo(() => new Set(seen ?? []), [seen]);
  const set = (p: Partial<S5>) => useS5.setState(p);
  const playing = usePlayer((p) => p.id === 'loop');
  const prog = progById(s.prog);
  const zone = zoneById(s.zone);
  const chords = useMemo(
    () => buildProgression(s.key, s.prog, s.zone, s.voicing, prefs.minorSpelling),
    [s.key, s.prog, s.zone, s.voicing, prefs.minorSpelling],
  );
  const planRef = useRef(chords);
  planRef.current = chords;
  const [beat, setBeat] = useState(-1);
  const [count, setCount] = useState<number | null>(null);
  const [soon, setSoon] = useState(false);
  const [ask, setAsk] = useState<string | null>(null);
  const [askMsg, setAskMsg] = useState('');
  const askMsgRef = useRef<HTMLParagraphElement>(null);
  const askQRef = useRef<HTMLParagraphElement>(null);
  /** False until the first bar of a run has been announced (bar 1 isn't a "change", but needs now/next too). */
  const announcedFirst = useRef(false);
  // The answered question unmounts its buttons: move focus to the reply, never to <body>.
  const focusAskMsg = () =>
    requestAnimationFrame(() => requestAnimationFrame(() => askMsgRef.current?.focus({ preventScroll: true })));
  /** Bar-by-bar chord announcements pause briefly after a reply, so the reply is heard, not replaced. */
  const quietUntil = useRef(0);
  const sayAsk = (m: string) => {
    setAskMsg(m);
    if (m) {
      announce(m);
      quietUntil.current = performance.now() + 3500;
    }
  };
  /** A heard note counts only if it can be played at a fret inside the zone. */
  const inZone = (midi: number) => positionsOfMidi(midi, zone.lo, zone.hi).length > 0;
  const [verdicts, setVerdicts] = useState<Record<number, BarVerdict>>({});
  const [loops, setLoops] = useState(0);
  const [ear, setEar] = useState(false);
  const valid = useRef(true);
  const windows = useRef<Array<{ ci: number; start: number; end: number; done: boolean }>>([]);
  const loopVerdicts = useRef<Record<number, BarVerdict>>({});
  const ctx = { labels: prefs.labels, sp: prefs.minorSpelling };
  const cur = Math.min(s.cur, chords.length - 1);
  const c = chords[cur]!;
  const nx = chords[(cur + 1) % chords.length]!;

  // Changing anything mid-loop means the loop no longer counts.
  useEffect(() => {
    valid.current = false;
    setAsk(null);
  }, [s.key, s.prog, s.zone, s.voicing]);

  const judging = useMicEvents((e) => {
    if (!playing) return;
    const w = windows.current.find((x) => !x.done && e.t >= x.start && e.t <= x.end);
    if (!w) return;
    const ch = planRef.current[w.ci]!;
    if (s.style === 'arp' && s.third && e.type === 'note') {
      w.done = true;
      const th = thirdOf(ch);
      // The voicing's own 3rd (or its octave), at a fret inside the zone: not just any note with that name.
      const isThird = !!th && (e.midi === th.midi || Math.abs(e.midi - th.midi) === 12);
      const reachable = inZone(e.midi);
      const ok = isThird && reachable;
      const name = spell(ch.rootName, mod12(e.midi - ch.pc));
      loopVerdicts.current[w.ci] = {
        ok,
        kind: ok ? 'third' : 'not-third',
        text: ok ? `3rd ✓` : isThird ? `3rd, but outside your zone` : `${name}, not the 3rd`,
      };
      setVerdicts({ ...loopVerdicts.current });
    } else if (s.style === 'arp' && !s.third && e.type === 'note') {
      // Plain arpeggio: the first note of the bar must belong to the chord.
      w.done = true;
      const iv = mod12(e.midi - ch.pc);
      const tone = CHORD_IVS[ch.q].includes(iv);
      const ok = tone && inZone(e.midi);
      loopVerdicts.current[w.ci] = {
        ok,
        kind: ok ? 'match' : 'wrong',
        text: ok
          ? `${spell(ch.rootName, iv)} ✓`
          : tone
            ? `${spell(ch.rootName, iv)}, but outside your zone`
            : `${spell(ch.rootName, iv)}, not in ${ch.name}`,
      };
      setVerdicts({ ...loopVerdicts.current });
    } else if (s.style === 'strum' && e.type === 'strum') {
      w.done = true;
      const pcs = CHORD_IVS[ch.q].map((iv) => mod12(ch.pc + iv));
      const third = mod12(ch.pc + (ch.q === 'minor' ? 3 : 4));
      const r = checkChord(e.chroma, pcs, ch.pc, third);
      const ok = r.verdict === 'match' || r.verdict === 'no-fifth';
      loopVerdicts.current[w.ci] = {
        ok,
        kind: r.verdict,
        text: ok ? 'heard ✓' : r.verdict === 'wrong-third' ? 'wrong 3rd' : 'not this chord',
      };
      setVerdicts({ ...loopVerdicts.current });
    }
  }, playing);

  const markZone = (z: string) => {
    const first = !zonesDone.has(z);
    patchSeen({ s5: [...new Set([...zonesDone, z])] });
    if (first) {
      addXP(10);
      toast('Zone logged · +10 XP');
    }
  };

  const start = () => {
    announcedFirst.current = false;
    valid.current = true;
    windows.current = [];
    loopVerdicts.current = {};
    setVerdicts({});
    setAsk(null);
    sayAsk('');
    const judged = judging;
    void startLoop<Beat>({
      id: 'loop',
      label: `${prog.name} in ${tonicOf(chords).name}`,
      bpm: s.bpm,
      beat: (t, n, spb) => {
        const plan = planRef.current;
        const st = useS5.getState();
        const len = plan.length;
        const ci = Math.floor(n / 4) % len;
        const w = n % 4;
        const ch = plan[ci]!;
        const audible = !judged || usePrefs.getState().headphones;
        if (audible) {
          if (st.style === 'strum') {
            engine.strum(toPlayable(ch.notes), { when: t, vel: w === 0 ? 0.85 : 0.6 });
            if (w === 1 || w === 3)
              engine.strum(toPlayable(ch.notes), { when: t + spb / 2, down: false, vel: 0.42, gap: 0.02, damp: false });
          } else {
            const seq = arpSeq(ch);
            for (let e = 0; e < 2; e++) {
              let nn = seq[(w * 2 + e) % seq.length]!;
              const th = thirdOf(ch);
              if (st.third && w === 0 && e === 0 && th) nn = th;
              engine.playNote(nn.midi, t + (e * spb) / 2, st.third && w === 0 && e === 0 ? 0.95 : 0.75, nn.s, {
                s: nn.s,
                f: nn.f,
              });
            }
          }
        }
        if (st.click || (judged && !audible)) engine.click(t, w === 0);
        if (judged && w === 0) {
          windows.current = windows.current.filter((x) => x.end > t - 4 * spb * len);
          windows.current.push({
            ci,
            start: t - 0.12,
            end: t + spb * (st.style === 'strum' ? 1.5 : 0.75),
            done: false,
          });
        }
        return { ci, w, loopEnd: w === 3 && ci === len - 1 };
      },
      ui: (e) => {
        if (e.kind === 'count') {
          setCount(e.n);
          return;
        }
        if (e.kind !== 'beat') return;
        setCount(null);
        const { ci, w, loopEnd } = e.p;
        if (ci !== useS5.getState().cur || !announcedFirst.current) {
          announcedFirst.current = true;
          set({ cur: ci });
          const ch = planRef.current[ci]!;
          if (performance.now() > quietUntil.current)
            announce(`${ch.name}, ${ch.inst.minF === 0 ? 'open' : ch.inst.shape + '-shape'}`);
          const nxt = planRef.current[(ci + 1) % planRef.current.length]!;
          usePlayer.setState({ detail: `now ${ch.name}, next ${nxt.name}` });
        }
        setBeat(w);
        setSoon(w === 3);
        if (w === 0 && ci === 0) {
          loopVerdicts.current = {};
          setVerdicts({});
        }
        if (loopEnd) {
          setLoops((l) => l + 1);
          const z = useS5.getState().zone;
          if (judged) {
            const v = Object.values(loopVerdicts.current);
            const len = planRef.current.length;
            const ok = v.filter((x) => x.ok).length;
            if (valid.current && ok / len >= 0.75) {
              sayAsk(`Loop heard in ${zoneById(z).name}: ${ok} of ${len} bars clean.`);
              if (!useProgress.getState().seen.s5?.includes(z)) markZone(z);
            } else {
              sayAsk(`${ok} of ${len} bars clean this time. Keep looping: aim for three in four.`);
            }
          } else if (valid.current && !useProgress.getState().seen.s5?.includes(z)) {
            setAsk(z);
            announce('Loop complete. Did you play along and stay in the zone?');
            quietUntil.current = performance.now() + 3500;
            // Focus the question so Tab reaches "Yes, I did" next (Space still stops the loop).
            requestAnimationFrame(() => requestAnimationFrame(() => askQRef.current?.focus({ preventScroll: false })));
          }
          valid.current = true;
        }
      },
      onStop: () => {
        setBeat(-1);
        setCount(null);
        setSoon(false);
      },
    });
  };

  const toggle = () => (playing ? stopLoop() : start());

  // While the loop plays, the floating mini-player appears only when this bar is scrolled out of view.
  const barRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => usePlayer.setState({ inlineBarVisible: !!e?.isIntersecting }), {
      threshold: 0.6,
    });
    io.observe(el);
    return () => {
      io.disconnect();
      usePlayer.setState({ inlineBarVisible: false });
    };
  }, []);

  const step = (d: number) => {
    if (playing) return;
    const n = (cur + d + chords.length) % chords.length;
    set({ cur: n });
    engine.strum(toPlayable(chords[n]!.notes));
  };
  useHotkeys({ space: ear ? undefined : toggle, lower: () => step(-1), higher: () => step(1) });

  const nxSet = new Set(nx.notes.map((n) => `${n.s}:${n.f}`));
  const keepsFinger = (n: { s: number; f: number }) => {
    const fg = fingerOf(c.inst, n.s, c.strings);
    return nx !== c && n.f > 0 && nxSet.has(`${n.s}:${n.f}`) && fg !== '' && fg === fingerOf(nx.inst, n.s, nx.strings);
  };
  const dots: DotSpec[] = c.notes.map((n) => {
    const fg = fingerOf(c.inst, n.s, c.strings);
    return {
      s: n.s,
      f: n.f,
      colors: [COL[c.inst.shape]],
      root: n.iv === 0,
      label: dotLabel(ctx.labels, n.iv, c.inst, n.s, c.strings, ctx.sp),
      text: textFor(c.inst.shape),
      third: s.third && (n.iv === 3 || n.iv === 4),
      // Common-tone rings only when the same finger stays down (never on open strings: no finger there).
      ring: nx !== c && n.f > 0 && nxSet.has(`${n.s}:${n.f}`) && fg !== '' && fg === fingerOf(nx.inst, n.s, nx.strings),
      desc:
        noteDesc(c.inst, n.s, n.iv, c.strings, ctx.sp) +
        (keepsFinger(n) ? '; keep this finger down for ' + nx.name : ''),
    };
  });
  // Shared notes where the next chord uses a different finger: show the new finger as a badge.
  const badges: BadgeSpec[] =
    nx === c
      ? []
      : c.notes
          .filter((n) => n.f > 0 && nxSet.has(`${n.s}:${n.f}`) && !keepsFinger(n))
          .map((n) => {
            const nf = fingerOf(nx.inst, n.s, nx.strings);
            return { s: n.s, f: n.f, label: nf, color: COL[nx.inst.shape], desc: `${nx.name} uses finger ${nf} here` };
          })
          .filter((b) => b.label && b.label !== '○');
  const own = new Set(c.notes.map((n) => `${n.s}:${n.f}`));
  const ghosts: GhostSpec[] =
    nx === c || nx.name + nx.inst.minF === c.name + c.inst.minF
      ? []
      : nx.notes
          .filter((n) => !own.has(`${n.s}:${n.f}`))
          .map((n) => ({
            s: n.s,
            f: n.f,
            color: COL[nx.inst.shape],
            r: 10.5,
            cls: 'next' as const,
            label: fingerOf(nx.inst, n.s, nx.strings),
            desc: `next chord ${nx.name}: ${fingerOf(nx.inst, n.s, nx.strings) === '○' ? 'open string' : 'finger ' + fingerOf(nx.inst, n.s, nx.strings)}`,
          }));
  const outside = chords.some((ch) => ch.lo < zone.lo || ch.hi > zone.hi + 1);
  /** How far a planned chord reaches past the zone (the planner allows it when nothing fits inside). */
  const outBy = (ch: ChordPlan) => Math.max(0, zone.lo - ch.lo, ch.hi - zone.hi);
  // Upright phone neck: draw only the zone (±1 fret, widened to any chord that reaches outside it), so the
  // zone fills the screen instead of a 15-fret neck you have to scroll.
  const vertical = useVertical();
  const neckWindow = {
    from: Math.max(0, Math.min(zone.lo, ...chords.map((ch) => ch.lo)) - 1),
    to: Math.min(15, Math.max(zone.hi, ...chords.map((ch) => ch.hi)) + 1),
  };

  const cells = ['1', '&', '2', '&', '3', '&', '4', '&'];
  const on = beat >= 0 ? beat * 2 : -1;
  let body: string[];
  if (s.style === 'strum') body = [...PATTERN];
  else {
    const seq = arpSeq(c);
    body = cells.map((_, i) => STRING_LABEL[seq[i % seq.length]!.s as 0]);
    if (s.third && thirdOf(c)) body[0] = '3rd';
  }
  const patAria =
    s.style === 'strum'
      ? 'Strum pattern: down, down up, down, down up'
      : `Picking pattern by string: ${body.join(' ')}`;

  return (
    <>
      <Head
        n={5}
        title="Make it musical"
        lede="Shapes become music when you stay in one area of the neck and let each chord use whichever shape sits closest. Pick a progression and a zone, then play along on your guitar."
      />
      <section className={`bench${playing ? ' playing' : ''}`} aria-label="Progression player">
        <div className="toolbar">
          <label className="field" htmlFor="prog">
            Progression
            <select
              id="prog"
              value={s.prog}
              onChange={(e) => {
                set({ prog: e.target.value, cur: 0 });
              }}
            >
              {PROGS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name}
                </option>
              ))}
            </select>
          </label>
          <span className="muted">Key:</span>
          <KeyPicker value={s.key} q={prog.minor ? 'minor' : 'major'} onChange={(k) => set({ key: k })} />
        </div>
        <div className="toolbar">
          <Seg
            value={s.zone}
            options={ZONES.map((z) => [z.id, z.name] as const)}
            onChange={(z) => set({ zone: z })}
            label="Neck zone"
          />
        </div>
        <div className="toolbar">
          <Seg
            value={s.voicing}
            options={
              prog.id === 'blues7' ? VOICE_OPTS.map(([v, l]) => [v, v === 'tri' ? '4-note' : l] as const) : VOICE_OPTS
            }
            onChange={(v) => set({ voicing: v })}
            label="Strings to play"
          />
          <Seg
            value={s.style}
            options={[
              ['strum', 'Strum'],
              ['arp', 'Arpeggio'],
            ]}
            onChange={(v) => set({ style: v })}
            label="Play style"
          />
          {s.style === 'arp' ? (
            <Check checked={s.third} onChange={(v) => set({ third: v })}>
              Land on the 3rd
            </Check>
          ) : null}
          <LabelSeg />
        </div>
        <div className="toolbar">
          <label className="field" htmlFor="bpm">
            Tempo
            <input
              type="range"
              id="bpm"
              min={50}
              max={140}
              step={2}
              value={s.bpm}
              onChange={(e) => {
                const b = Number(e.target.value);
                set({ bpm: b });
                if (playing) setLoopBpm(b);
              }}
            />
            <output htmlFor="bpm">{s.bpm} BPM</output>
          </label>
          <Check checked={s.click} onChange={(v) => set({ click: v })}>
            Metronome click
          </Check>
        </div>
        <div className="toolbar">
          <MicToggle>
            <span className="muted">
              {s.style === 'strum'
                ? 'Each bar, strum the chord on beat 1.'
                : s.third
                  ? 'Each bar, pick the 3rd on beat 1.'
                  : 'Each bar, pick a note of the chord on beat 1 (turn on “Land on the 3rd” to aim for the 3rd).'}
            </span>
          </MicToggle>
        </div>
        <p>
          In this zone: <strong>{planSummary(chords)}</strong>.
          {outside ? (
            <span className="muted">
              {' '}
              This key has few shapes inside this zone, so some chords reach just outside it.
            </span>
          ) : null}
        </p>
        <div className="chord-row" role="group" aria-label="Chords">
          {chords.map((ch, i) => {
            const v = verdicts[i];
            return (
              <button
                key={i}
                type="button"
                className="chord-card"
                style={{ ['--sc' as string]: COL[ch.inst.shape] }}
                aria-pressed={i === cur}
                onClick={() => {
                  set({ cur: i });
                  if (!playing) engine.strum(toPlayable(ch.notes));
                }}
              >
                <span className="roman">{ch.roman}</span>
                <strong>{ch.name}</strong>
                <span className="meta">
                  <Pill s={ch.inst.shape} /> {ch.inst.minF === 0 ? 'open' : `${ch.inst.shape}-shape`}, frets {ch.lo}–
                  {ch.hi}
                  {outBy(ch) ? ` · ${outBy(ch)} fret${outBy(ch) > 1 ? 's' : ''} outside your zone` : ''}
                </span>
                <span className="why">{explainChoice(ch)}</span>
                {v ? (
                  <span
                    className="verdict"
                    style={{ color: v.ok ? 'var(--good)' : v.kind === 'wrong-third' ? 'var(--warn)' : 'var(--bad)' }}
                  >
                    {v.text}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <Fretboard
          id="p5-board"
          dots={dots}
          ghosts={ghosts}
          badges={badges}
          muted={mutedSpecs(c.inst, c.strings)}
          barre={barreSpec(c.inst, c.strings, COL[c.inst.shape])}
          {...(vertical ? neckWindow : {})}
          band={{ lo: zone.lo, hi: zone.hi, label: 'Your zone' }}
          soon={soon}
          label={`${c.name} with the ${c.inst.shape}-shape; dashed circles show the next chord, ${nx.name}`}
        />
        <Legend
          keys={[
            'root',
            'keep',
            'next',
            'zone',
            'mute',
            ...(barreSpec(c.inst, c.strings) ? ['barre'] : []),
            ...(s.third ? ['third'] : []),
          ]}
        />
        {ask ? (
          <div className="callout">
            <p ref={askQRef} tabIndex={-1}>
              Loop complete in {zoneById(ask).name}. Did you play along on your guitar and stay inside the zone?
            </p>
            <div className="actions">
              <button
                type="button"
                className="btn small primary"
                onClick={() => {
                  markZone(ask);
                  setAsk(null);
                  sayAsk('Logged. Try another zone, or raise the tempo.');
                  focusAskMsg();
                }}
              >
                Yes, I did
              </button>
              <button
                type="button"
                className="btn small"
                onClick={() => {
                  setAsk(null);
                  sayAsk(
                    'Keep looping. Slow the tempo down, use 4-string shapes, and watch the dashed circles for where the next chord goes.',
                  );
                  focusAskMsg();
                }}
              >
                Not yet
              </button>
            </div>
          </div>
        ) : askMsg ? (
          <p className="muted" ref={askMsgRef} tabIndex={-1}>
            {askMsg}
          </p>
        ) : null}
        {loops > 0 && !playing && !ear ? (
          <div className="callout">
            <p>
              <strong>Ear + hand check:</strong> hear a hidden chord from this progression, name its numeral, then find
              its root inside your zone.
            </p>
            <div>
              <button type="button" className="btn small primary" onClick={() => setEar(true)}>
                Take the check
              </button>
            </div>
          </div>
        ) : null}
        <div className="p5-bar" ref={barRef}>
          <button type="button" className="btn primary" onClick={toggle}>
            {playing ? 'Stop' : 'Play the loop'}
            <Kbd>Space</Kbd>
          </button>
          <span className="p5-now" aria-live="off">
            Now <strong>{c.name}</strong> <Pill s={c.inst.shape} /> · next {nx.name}
          </span>
          <div className="beats">
            <span className="countin" aria-hidden="true">
              {count ?? ''}
            </span>
            <div className="pattern" role="img" aria-label={patAria}>
              {cells.map((x, i) => (
                <span key={'c' + i} className={`c${i === on ? ' on' : ''}`}>
                  {x}
                </span>
              ))}
              {body.map((x, i) => (
                <span key={'b' + i} className={i === on ? 'on' : ''}>
                  {x}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
      {ear ? <EarCheck chords={chords} progId={s.prog} zoneId={s.zone} onClose={() => setEar(false)} /> : null}
      <div className="cards">
        <Card title="To finish this step">
          <p>
            Play along with a full loop in two different zones. With the mic on, the app checks each bar and confirms
            the loop for you; without it, confirm you stayed inside the box. You get a four-click count-in, and each
            chord lasts one bar.
          </p>
          <ul className="pchips" aria-label="Zones confirmed">
            {ZONES.map((z) => (
              <li key={z.id} className={`pchip${zonesDone.has(z.id) ? ' done' : ''}`}>
                {z.name}
                <span className="sr-only">{zonesDone.has(z.id) ? ', confirmed' : ''}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Stay in one zone">
          <p>
            Play every chord without leaving the boxed frets. You'll end up mixing shapes, and that's the point: the
            shape that's closest wins. Notes with a dashed ring are shared with the next chord and use the same finger:
            leave those fingers down.
          </p>
        </Card>
        <Card title="Partial shapes are normal">
          <p>
            Strum only 4 strings or play the triads. These small chords sound great, leave room for other instruments
            and are how most players actually use CAGED.
          </p>
        </Card>
        <Card title="Arpeggiate and aim">
          <p>
            Pick each chord's notes one at a time. Turn on “Land on the 3rd” and the first note of every bar becomes the
            chord's 3rd: the note that tells the ear the chord changed. Then try it yourself.
          </p>
        </Card>
        <Card title="The 12-bar blues with 7ths">
          <p>
            Choose “12-bar blues with 7th chords”: every chord becomes a dominant 7th (E7, A7, C7, D7 and G7 forms).
            Four of the forms move one root down two frets to make the ♭7 (E7, A7, D7, G7). The C7 form instead raises
            the 5th on the G string by three frets, and leaves out the high e.
          </p>
        </Card>
      </div>
      <div className="next">
        <Link className="btn" to="/practice">
          Next: start your daily routine →
        </Link>
      </div>
    </>
  );
}
