import * as RadioGroup from '@radix-ui/react-radio-group';
import { useEffect, useMemo, useRef, useState } from 'react';
import { engine } from '../audio/engine';
import { DARK_TEXT, NEUTRAL, NEUTRAL_ROOT } from '../fretboard/build';
import { Legend } from '../fretboard/extras';
import { Fretboard, type DotSpec } from '../fretboard/Fretboard';
import {
  BOTH_NAMES,
  FIND_MIN_NOTES,
  MAJOR_NAMES,
  findScales,
  midiAt,
  mod12,
  pcAt,
  scaleLabel,
  scaleNoteName,
  scaleRootName,
  type Pos,
  type ScaleMatch,
} from '../theory';
import { announce } from '../store/app';
import { Check, Seg } from '../ui/controls';

/** The finder's neck: the first position up to the 15th fret, where the notes you'd pick out usually are. */
const FIND_LAST_FRET = 15;
/** Matches listed before "Show all". */
const FIRST_MATCHES = 8;
const ANY = -1;

const idOf = (m: ScaleMatch) => `${m.sc.id}:${m.key}`;

/** "A", "A and C", "A, C and E". */
const andList = (xs: string[]) => (xs.length < 2 ? (xs[0] ?? '') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six'] as const;

export interface FinderState {
  picked: Pos[];
  root: number;
}
export const EMPTY_FINDER: FinderState = { picked: [], root: ANY };

/**
 * The scale finder: pick notes on the neck and see every scale, in any key, that holds them all. One match at a
 * time is shown on the neck around the notes picked, and can be taken up into the pattern library.
 */
export function Finder({
  state,
  onState,
  onLearn,
}: {
  state: FinderState;
  onState: (s: FinderState) => void;
  onLearn: (m: ScaleMatch) => void;
}) {
  const { picked } = state;
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const [rest, setRest] = useState(true);

  const pcs = useMemo(() => [...new Set(picked.map((p) => pcAt(p.s, p.f)))].sort((a, b) => a - b), [picked]);
  // A root that is no longer among the notes picked falls back to any.
  const root = pcs.includes(state.root) ? state.root : ANY;
  const lowest = picked.length ? pcAt(...lowestOf(picked)) : null;
  const matches = useMemo(
    () => (pcs.length >= FIND_MIN_NOTES ? findScales(pcs, { root: root === ANY ? null : root, lowest }) : []),
    [pcs, root, lowest],
  );
  const chosen = matches.find((m) => idOf(m) === chosenId) ?? matches[0] ?? null;
  const shown = all ? matches : matches.slice(0, FIRST_MATCHES);
  // The chosen match stays in the list even when it is past the first few.
  if (chosen && !shown.includes(chosen)) shown.push(chosen);

  /** A note's name: spelled in the chosen scale when there is one, else the usual way. */
  const nameOf = (pc: number, m: ScaleMatch | null = chosen) => {
    if (m) {
      const i = m.sc.steps.indexOf(mod12(pc - m.key));
      if (i >= 0) return scaleNoteName(m.sc, scaleRootName(m.sc, m.key), i);
    }
    return MAJOR_NAMES[pc]!;
  };

  const toggle = (s: number, f: number) => {
    engine.playOne(s, f);
    const has = picked.some((p) => p.s === s && p.f === f);
    onState({ ...state, picked: has ? picked.filter((p) => p.s !== s || p.f !== f) : [...picked, { s, f }] });
    setAll(false);
  };

  /* ---------- the neck ---------- */
  const isPicked = (s: number, f: number) => picked.some((p) => p.s === s && p.f === f);
  const label = chosen ? scaleLabel(chosen.sc, chosen.key) : null;
  const dots: DotSpec[] = picked.map(({ s, f }) => {
    const pc = pcAt(s, f);
    const isRoot = chosen?.key === pc;
    return {
      s,
      f,
      colors: [isRoot ? NEUTRAL_ROOT : NEUTRAL],
      root: isRoot,
      label: nameOf(pc),
      text: DARK_TEXT,
      desc: `picked${isRoot && label ? `, the root of ${label}` : ''}`,
    };
  });
  if (chosen && rest)
    for (let s = 0; s < 6; s++)
      for (let f = 0; f <= FIND_LAST_FRET; f++) {
        const pc = pcAt(s, f);
        if (isPicked(s, f) || !chosen.sc.steps.includes(mod12(pc - chosen.key))) continue;
        dots.push({
          s,
          f,
          colors: [NEUTRAL],
          root: pc === chosen.key,
          dim: true,
          label: nameOf(pc),
          text: DARK_TEXT,
          desc: `in ${label}`,
        });
      }
  const cellLabel = (s: number, f: number) => {
    const pc = pcAt(s, f);
    const name = chosen?.sc.steps.includes(mod12(pc - chosen.key)) ? nameOf(pc) : BOTH_NAMES[pc]!;
    const d = dots.find((x) => x.s === s && x.f === f);
    return isPicked(s, f) ? `${name}, picked: tap to take it off` : d ? `${name}, ${d.desc}` : name;
  };

  /* ---------- what to say ---------- */
  // The notes named up from the chosen scale's root, or else from the lowest note picked.
  const from = chosen?.key ?? lowest ?? 0;
  const names = [...pcs].sort((a, b) => mod12(a - from) - mod12(b - from)).map((pc) => nameOf(pc));
  const need = FIND_MIN_NOTES - pcs.length;
  const status =
    pcs.length === 0
      ? 'Tap the notes you know on the neck. Pick three or more, and every scale that holds them all is listed below it.'
      : need > 0
        ? `You picked ${andList(names)}. Pick ${NUMBER[need]} more ${need === 1 ? 'note' : 'notes'} to narrow it down.`
        : matches.length === 0
          ? `No scale here holds ${andList(names)}${root === ANY ? '' : ` on a root of ${nameOf(root)}`}. Take a note off${root === ANY ? '' : ', or let the root be any of them'}.`
          : null;

  const nowText = chosen
    ? matches.length === 1
      ? `${label} is the only fit.`
      : chosen === matches[0]
        ? `${label} fits best, of the ${matches.length} scales listed below the neck.`
        : `Showing ${label}, one of the ${matches.length} scales listed below the neck.`
    : status!;
  // Said aloud as the notes change (the page's one live region), not on arriving.
  const said = useRef(nowText);
  useEffect(() => {
    if (said.current !== nowText) announce(nowText);
    said.current = nowText;
  }, [nowText]);

  return (
    <>
      <div className="toolbar">
        <Seg
          value={root}
          options={[
            [ANY, 'Any'] as const,
            ...[...pcs]
              .sort((a, b) => mod12(a - (lowest ?? 0)) - mod12(b - (lowest ?? 0)))
              .map((pc) => [pc, nameOf(pc)] as const),
          ]}
          onChange={(v) => onState({ ...state, root: v })}
          label="Root"
          className="keys"
        />
        <Check checked={rest} onChange={setRest}>
          The rest of the scale
        </Check>
        <button type="button" className="btn" onClick={() => onState(EMPTY_FINDER)} disabled={picked.length === 0}>
          Clear the notes
        </button>
      </div>
      {/* Where the answer is while picking, without scrolling down to the list (a phone's neck is long). */}
      <p className="finder-now">
        {chosen ? (
          <>
            {chosen === matches[0] || matches.length === 1 ? null : 'Showing '}
            <strong>{label}</strong>
            {nowText.slice(nowText.indexOf(label!) + label!.length)}
          </>
        ) : (
          nowText
        )}
      </p>
      <Fretboard
        id="find-board"
        to={FIND_LAST_FRET}
        dots={dots}
        onCell={toggle}
        cellLabel={cellLabel}
        label={`Scale finder: tap notes to pick them${pcs.length ? `, ${andList(names)} picked` : ''}`}
      />
      <Legend keys={['picked', 'root', ...(chosen && rest ? ['rest'] : [])]} />
      {chosen ? (
        <div className="finder-results">
          <h2 className="finder-head">
            {matches.length === 1 ? 'One scale' : `${matches.length} scales`} with {andList(names)}
          </h2>
          <RadioGroup.Root
            className="matches"
            value={chosen ? idOf(chosen) : ''}
            onValueChange={setChosenId}
            aria-label="Matching scales"
          >
            {shown.map((m) => {
              const root0 = scaleRootName(m.sc, m.key);
              const notes = m.sc.steps.map((st, i) => ({
                name: scaleNoteName(m.sc, root0, i),
                have: pcs.includes(mod12(m.key + st)),
              }));
              const adds = notes.filter((x) => !x.have).map((x) => x.name);
              return (
                <RadioGroup.Item key={idOf(m)} value={idOf(m)} className="match">
                  <span className="match-name">{scaleLabel(m.sc, m.key)}</span>
                  <span className="match-notes" aria-hidden="true">
                    {notes.map((x) => (
                      <span key={x.name} className={x.have ? 'have' : undefined}>
                        {x.name}
                      </span>
                    ))}
                  </span>
                  <span className="match-fit">{adds.length ? `Adds ${andList(adds)}` : 'Exactly these notes'}</span>
                </RadioGroup.Item>
              );
            })}
          </RadioGroup.Root>
          {matches.length > shown.length ? (
            <button type="button" className="tap-link" onClick={() => setAll(true)}>
              Show all {matches.length}
            </button>
          ) : null}
          {chosen ? (
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => onLearn(chosen)}>
                Learn the {label} patterns
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** The lowest-sounding of the notes picked. */
function lowestOf(ps: Pos[]): [number, number] {
  const p = ps.reduce((a, b) => (midiAt(b.s, b.f) < midiAt(a.s, a.f) ? b : a));
  return [p.s, p.f];
}
