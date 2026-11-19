import type { ReactNode } from 'react';
import { ORDER, STRING_LABEL, fingerOf, ordinal, sharedRoots, posName, type Instance, type Shape } from '../theory';
import { COL, textFor } from './build';

export function Pill({ s }: { s: Shape }) {
  return (
    <span className={`shape-pill ${s}`} style={{ ['--sc' as string]: COL[s] }} aria-hidden="true">
      {s}
    </span>
  );
}

const LEG: Record<string, [ReactNode, string]> = {
  root: [
    <>
      <circle cx="11" cy="11" r="7" fill="var(--muted)" />
      <circle cx="11" cy="11" r="9" fill="none" stroke="var(--ink)" strokeWidth="2" />
    </>,
    'Root (ringed)',
  ],
  tone: [<circle cx="11" cy="11" r="8" fill="var(--muted)" />, 'Chord tone'],
  mute: [
    <text x="11" y="16" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--ink)">
      ×
    </text>,
    "Don't play this string",
  ],
  link: [
    <>
      <circle cx="11" cy="11" r="6" fill="var(--muted)" />
      <circle cx="11" cy="11" r="9.5" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="3 2" />
    </>,
    'Shared root: your anchor to the next shape',
  ],
  split: [
    <>
      <path d="M11 11L11 3A8 8 0 0 1 11 19Z" fill="var(--e-shape)" />
      <path d="M11 11L11 19A8 8 0 0 1 11 3Z" fill="var(--d-shape)" />
    </>,
    'Note in two shapes',
  ],
  dim: [<circle cx="11" cy="11" r="8" fill="var(--muted)" opacity=".35" />, 'Other shapes'],
  pent: [
    <circle cx="11" cy="11" r="7" fill="#3a2216" stroke="var(--muted)" strokeWidth="2" />,
    'Scale note outside this shape',
  ],
  third: [
    <>
      <circle cx="11" cy="11" r="6" fill="var(--muted)" />
      <circle cx="11" cy="11" r="9.5" fill="none" stroke="#e0a526" strokeWidth="2" />
    </>,
    'The 3rd: the note that changes for minor',
  ],
  barre: [
    <rect x="7" y="2" width="8" height="18" rx="4" fill="none" stroke="var(--muted)" strokeWidth="1.6" />,
    'Index-finger barre',
  ],
  zone: [<rect x="2" y="4" width="18" height="14" rx="4" fill="none" stroke="#e0a526" strokeWidth="2" />, 'Your zone'],
  anchor: [
    <circle cx="11" cy="11" r="7.5" fill="#3a2216" stroke="var(--muted)" strokeWidth="2" />,
    'Root not in this voicing: still your anchor',
  ],
  keep: [
    <>
      <circle cx="11" cy="11" r="6" fill="var(--muted)" />
      <circle cx="11" cy="11" r="9.5" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeDasharray="3 2" />
    </>,
    'Common tone: keep this finger down',
  ],
  opt: [
    <circle
      cx="11"
      cy="11"
      r="7.5"
      fill="var(--muted)"
      fillOpacity=".25"
      stroke="var(--ink)"
      strokeWidth="1.4"
      strokeDasharray="3 2"
    />,
    'Optional: usually left out',
  ],
  next: [
    <circle cx="11" cy="11" r="7.5" fill="none" stroke="var(--muted)" strokeWidth="2.4" strokeDasharray="3 2" />,
    'Next chord (finger numbers)',
  ],
};

export type LegendKey = keyof typeof LEG;

export function Legend({ keys }: { keys: string[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {keys.map((k) => (
        <li key={k}>
          <svg width="22" height="22" aria-hidden="true">
            {LEG[k]![0]}
          </svg>
          {LEG[k]![1]}
        </li>
      ))}
    </ul>
  );
}

/** Tab and fingers, low E → high e. */
export function Tab({ inst, strings }: { inst: Instance; strings?: readonly number[] | null }) {
  const fr = inst.frets.map((f, s) => (f == null || (strings && !strings.includes(s)) ? 'x' : String(f)));
  const fg = inst.frets.map((_, s) => (fr[s] === 'x' ? '' : fingerOf(inst, s, strings) || '–'));
  return (
    <table className="tab">
      <caption className="sr-only">Tab and fingers, low E to high e: {fr.join(' ')}</caption>
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
          <th scope="row">Fret</th>
          {fr.map((f, i) => (
            <td key={i}>{f}</td>
          ))}
        </tr>
        <tr>
          <th scope="row">Finger</th>
          {fg.map((f, i) => (
            <td key={i} className="fg">
              {f}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );
}

export function CagedRing({ list, idx }: { list: readonly Instance[]; idx: number }) {
  const start = list[0]!.shape;
  const si = ORDER.indexOf(start);
  const active = list[idx]?.shape;
  const present = new Set(list.map((i) => i.shape));
  const cx = 110;
  const cy = 110;
  const R = 70;
  const pt = (i: number, r: number) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  };
  return (
    <svg
      className="ring"
      viewBox="0 0 220 220"
      role="img"
      aria-label={`The CAGED loop, starting at the ${start}-shape: ${[0, 1, 2, 3, 4].map((k) => ORDER[(si + k) % 5]).join(', ')}`}
    >
      <defs>
        <marker
          id="arr"
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
        </marker>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const a1 = ((-90 + i * 72 + 17) * Math.PI) / 180;
        const a2 = ((-90 + (i + 1) * 72 - 17) * Math.PI) / 180;
        return (
          <path
            key={i}
            d={`M${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)}A${R} ${R} 0 0 1 ${(cx + R * Math.cos(a2)).toFixed(1)} ${(cy + R * Math.sin(a2)).toFixed(1)}`}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1.6"
            markerEnd="url(#arr)"
          />
        );
      })}
      {ORDER.map((s, i) => {
        const [x, y] = pt(i, R);
        const [bx, by] = pt(i, R + 33);
        const k = ((i - si + 5) % 5) + 1;
        return (
          <g key={s}>
            {s === active ? <circle cx={x} cy={y} r="24" fill="none" stroke="var(--ink)" strokeWidth="2.5" /> : null}
            <circle cx={x} cy={y} r="19" style={{ fill: COL[s] }} opacity={present.has(s) ? 1 : 0.35} />
            <text x={x} y={y + 6.5} textAnchor="middle" fontSize="18" fontWeight="800" style={{ fill: textFor(s) }}>
              {s}
            </text>
            <text
              x={bx}
              y={by + 4}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight="600"
              style={{ fill: k === 1 ? 'var(--accent)' : 'var(--muted)' }}
            >
              {k === 1 ? 'start' : ordinal(k)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function ShapesTable({
  list,
  idx,
  onPick,
}: {
  list: readonly Instance[];
  idx: number;
  onPick: (i: number) => void;
}) {
  return (
    <div className="table-wrap">
      <table className="shapes">
        <caption className="sr-only">All shapes. Choose a row to show and play it.</caption>
        <thead>
          <tr>
            <th scope="col">Shape</th>
            {STRING_LABEL.map((s, i) => (
              <th scope="col" key={i}>
                {s}
              </th>
            ))}
            <th scope="col">Frets</th>
          </tr>
        </thead>
        <tbody>
          {list.map((inst, i) => (
            <tr key={`${inst.shape}${inst.minF}`} className={i === idx ? 'on' : ''} onClick={() => onPick(i)}>
              <td>
                <button
                  type="button"
                  className="rowbtn"
                  onClick={(e) => (e.stopPropagation(), onPick(i))}
                  aria-label={`${inst.shape}-shape, frets ${inst.minF} to ${inst.maxF}`}
                  aria-pressed={i === idx}
                >
                  <Pill s={inst.shape} />
                </button>
              </td>
              {inst.frets.map((f, s) => (
                <td key={s}>{f == null ? 'x' : f}</td>
              ))}
              <td>
                {inst.minF}–{inst.maxF}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkList({ list }: { list: readonly Instance[] }) {
  return (
    <ul className="links">
      {list.slice(0, -1).map((a, i) => {
        const b = list[i + 1]!;
        const sh = sharedRoots(a, b);
        return (
          <li key={i}>
            <Pill s={a.shape} /> → <Pill s={b.shape} />
            <span className="sr-only">
              {a.shape}-shape to {b.shape}-shape:
            </span>
            <span>{sh.length ? sh.map((n) => posName(n.s, n.f)).join(' and ') : 'no shared root'}</span>
          </li>
        );
      })}
    </ul>
  );
}
