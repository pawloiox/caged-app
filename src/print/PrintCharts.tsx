import { useSearchParams } from 'react-router';
import { usePrefs } from '../store/app';
import {
  MAJOR_NAMES,
  STRING_LABEL,
  barreFor,
  buildProgression,
  chordLabel,
  fingerOf,
  instances,
  notesOf,
  type ChordPlan,
  type Instance,
} from '../theory';
import { PageHead, Seg } from '../ui/controls';
import { useNavigate } from 'react-router';

/** A printable chord diagram: vertical, low E on the left, five frets from the shape's first fret. */
function ChordChart({
  inst,
  strings,
  title,
  sub,
}: {
  inst: Instance;
  strings?: readonly number[] | null;
  title: string;
  sub: string;
}) {
  const notes = notesOf(inst, strings);
  const fretted = notes.filter((n) => n.f > 0).map((n) => n.f);
  const barre = barreFor(inst, strings);
  const lo = inst.minF === 0 ? 1 : Math.min(...fretted);
  const rows = 5;
  const W = 134;
  const H = 150;
  const x = (s: number) => 18 + s * 17;
  const y = (f: number) => 30 + (f - lo + 0.5) * 22;
  return (
    <figure className="chart">
      <figcaption>
        <strong>{title}</strong> <span className="muted">{sub}</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: ${inst.frets.map((f, s) => (f == null || (strings && !strings.includes(s)) ? 'x' : f)).join(' ')}`}
      >
        {lo === 1 ? (
          <rect x={x(0) - 1} y={27} width={x(5) - x(0) + 2} height={4} fill="var(--ink)" />
        ) : (
          <text x={x(5) + 11} y={y(lo) + 4} fontSize="10" fill="var(--muted)">
            {lo}fr
          </text>
        )}
        {Array.from({ length: rows + 1 }, (_, i) => (
          <line key={i} x1={x(0)} x2={x(5)} y1={30 + i * 22} y2={30 + i * 22} stroke="var(--muted)" strokeWidth="1" />
        ))}
        {STRING_LABEL.map((_, s) => (
          <line key={s} x1={x(s)} x2={x(s)} y1={30} y2={30 + rows * 22} stroke="var(--muted)" strokeWidth="1" />
        ))}
        {inst.frets.map((f, s) => {
          const out = f == null || (strings && !strings.includes(s));
          if (out)
            return (
              <text key={s} x={x(s)} y={22} fontSize="11" textAnchor="middle" fill="var(--ink)">
                ×
              </text>
            );
          if (f === 0) return <circle key={s} cx={x(s)} cy={18} r={4} fill="none" stroke="var(--ink)" />;
          return null;
        })}
        {barre ? (
          <rect
            x={x(barre.s1) - 7.5}
            y={y(barre.f) - 7.5}
            width={x(barre.s2) - x(barre.s1) + 15}
            height={15}
            rx={7.5}
            fill="var(--ink)"
          />
        ) : null}
        {notes
          .filter((n) => n.f > 0)
          .map((n) => (
            <g key={n.s}>
              <circle cx={x(n.s)} cy={y(n.f)} r={7.5} fill={n.iv === 0 ? 'var(--accent)' : 'var(--ink)'} />
              <text x={x(n.s)} y={y(n.f) + 3.5} fontSize="9.5" textAnchor="middle" fill="var(--bg)">
                {fingerOf(inst, n.s, strings)}
              </text>
            </g>
          ))}
        {STRING_LABEL.map((l, s) => (
          <text key={s} x={x(s)} y={H - 4} fontSize="9" textAnchor="middle" fill="var(--muted)">
            {l}
          </text>
        ))}
      </svg>
    </figure>
  );
}

export default function PrintCharts() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const sp = usePrefs((p) => p.minorSpelling);
  const key = Math.max(0, Math.min(11, Number(params.get('key') ?? 7) || 0));
  const plans: Array<[string, ChordPlan[]]> = [
    ['Open zone', buildProgression(key, '145', 'open', 'top4', sp)],
    ['Frets 5–9', buildProgression(key, '145', 'z5', 'top4', sp)],
  ];
  return (
    <div className="print-sheet">
      <PageHead
        eyebrow="Chord charts"
        title={`${MAJOR_NAMES[key]} major: all five shapes`}
        lede="Root dots are filled in the accent colour; numbers are fingers. Print it or save it as a PDF from the print dialog."
      />
      <div className="actions no-print">
        <Seg
          value={key}
          options={MAJOR_NAMES.map((n, i) => [i, n] as const)}
          onChange={(k) => nav(`/print?key=${k}`, { replace: true })}
          label="Key"
          className="keys"
        />
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Print or save as PDF
        </button>
      </div>
      {(['major', 'minor'] as const).map((q) => (
        <section key={q}>
          <h2>{chordLabel(key, q, sp)}</h2>
          <div className="chart-grid">
            {instances(key, q).map((inst) => (
              <ChordChart
                key={inst.shape + inst.minF}
                inst={inst}
                title={`${inst.shape}-shape`}
                sub={`frets ${inst.minF}–${inst.maxF}`}
              />
            ))}
          </div>
        </section>
      ))}
      {plans.map(([zone, chords]) => (
        <section key={zone}>
          <h2>I – IV – V in {zone} (4 strings)</h2>
          <div className="chart-grid">
            {chords.map((c) => (
              <ChordChart
                key={c.roman}
                inst={c.inst}
                strings={c.strings}
                title={`${c.roman}: ${c.name}`}
                sub={c.inst.minF === 0 ? 'open' : `${c.inst.shape}-shape`}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
