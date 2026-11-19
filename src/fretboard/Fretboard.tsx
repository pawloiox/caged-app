import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { engine } from '../audio/engine';
import { BOTH_NAMES, MAX_FRET, STRING_LABEL, pcAt, posName } from '../theory/tuning';
import { usePrefs } from '../store/app';
import { useMediaQuery, useVertical } from '../ui/hooks';

export interface DotSpec {
  s: number;
  f: number;
  colors: string[];
  root?: boolean;
  label?: string;
  text?: string;
  dim?: boolean;
  /** Dashed ring: shared root / keep this finger down. */
  ring?: boolean;
  third?: boolean;
  cls?: string;
  /** What this note is, for the cell's accessible name ("the 3rd of C, finger 2"). */
  desc?: string;
}
export interface GhostSpec {
  s: number;
  f: number;
  color: string;
  label?: string;
  r?: number;
  cls?: 'next' | 'anchor';
  desc?: string;
}
/** A small number badge at the top-right of a dot (e.g. the next chord's finger on a shared note). */
export interface BadgeSpec {
  s: number;
  f: number;
  label: string;
  color: string;
  desc?: string;
}
export interface ZoneSpec {
  id: number;
  lo: number;
  hi: number;
  label: string;
  color: string;
  active: boolean;
}
export interface BandSpec {
  lo: number;
  hi: number;
  label?: string;
}
export interface MutedSpec {
  s: number;
  f?: number;
}

export interface FretboardProps {
  from?: number;
  to?: number;
  cw?: number;
  dots?: DotSpec[];
  ghosts?: GhostSpec[];
  zones?: ZoneSpec[];
  band?: BandSpec | null;
  /** Index-finger barre, drawn as a solid bar under the dots. `color` defaults to a neutral bone colour. */
  barre?: { f: number; s1: number; s2: number; color?: string } | null;
  muted?: Array<number | MutedSpec>;
  label: string;
  cellLabel?: (s: number, f: number) => string;
  /** Leave pitch names out of cell labels (quizzes where the pitch would give the answer away). */
  hidePitch?: boolean;
  /** Label for cells with no dot, e.g. "not in the chord". */
  emptyLabel?: string;
  badges?: BadgeSpec[];
  onCell?: (s: number, f: number) => void;
  onZone?: (id: number) => void;
  clickable?: boolean;
  /** Beat 4 of the linking drill: shared roots pulse strongly. */
  pivot?: boolean;
  /** The next chord is about to come: next-chord ghosts pulse. */
  soon?: boolean;
  id?: string;
  children?: ReactNode;
}

const SW = [2.7, 2.2, 1.8, 1.4, 1.05, 0.85];
const DARK = '#2a1b00';
const NEUTRAL_BAR = '#ece5d6';
let seq = 0;

function slicePath(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const;
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${cx} ${cy}L${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z`;
}

export function Fretboard(props: FretboardProps) {
  const { dots = [], ghosts = [], zones, band, barre, muted = [], clickable = true } = props;
  const from = props.from ?? 0;
  const to = props.to ?? MAX_FRET;
  const first = from === 0 ? 1 : from;
  const cells = to - first + 1;
  const lefty = usePrefs((p) => p.lefty);
  const lowTop = usePrefs((p) => p.lowTop);
  const vertical = useVertical();
  const coarse = useMediaQuery('(pointer: coarse), (max-width: 600px)');
  const narrow = useMediaQuery('(max-width: 600px)');
  const [gid] = useState(() => 'fbw' + ++seq);
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  /* ---------- geometry: along the neck (a) and across the strings (b) ---------- */
  const g = useMemo(() => {
    const hasZones = !!zones?.length;
    if (!vertical) {
      const cw = props.cw ?? 54;
      const left = 64;
      const sp = coarse ? 44 : narrow ? 36 : 28;
      const top = 26 + (hasZones ? 36 : 0) + (band ? 8 : 0);
      const W = left + cells * cw + 14;
      const H = top + 5 * sp + 34;
      const B = (s: number) => top + (lowTop ? s : 5 - s) * sp;
      return {
        W,
        H,
        sp,
        vertical: false,
        A: (f: number) => (f === 0 ? left - 24 : left + (f - first + 0.5) * cw),
        cellA: (f: number): [number, number] =>
          f === 0 ? [left - 44, left - 5] : [left + (f - first) * cw, left + (f - first + 1) * cw],
        wireA: (f: number) => left + (f - first + 1) * cw,
        nutA: left,
        openA: left - 44,
        endA: left + cells * cw,
        B,
        bLo: Math.min(B(0), B(5)),
        bHi: Math.max(B(0), B(5)),
        zoneB: (i: number): [number, number] => [6 + (i % 2) * 18, 21 + (i % 2) * 18],
        zonePad: 3,
        slabel: (s: number) => [12, B(s) + 4] as [number, number],
        fnum: (f: number) => [left + (f - first + 0.5) * cw, Math.max(B(0), B(5)) + 30] as [number, number],
        bandLabel: (a0: number, a1: number) => [(a0 + a1) / 2, Math.min(B(0), B(5)) - 22] as [number, number],
      };
    }
    const fh = 46;
    const ss = 50;
    // Upright neck: zone bars are thin and decorative; MapBench shows 44 px jump buttons instead.
    const zoneW = hasZones ? 22 : 0;
    const leftPad = zoneW + 40;
    const rightPad = band ? 34 : 18;
    const openTop = 20;
    const nutY = 70;
    const W = leftPad + 5 * ss + rightPad;
    const H = nutY + cells * fh + 16;
    const B = (s: number) => leftPad + (lefty ? 5 - s : s) * ss;
    return {
      W,
      H,
      sp: ss,
      vertical: true,
      A: (f: number) => (f === 0 ? (openTop + nutY - 4) / 2 : nutY + (f - first + 0.5) * fh),
      cellA: (f: number): [number, number] =>
        f === 0 ? [openTop, nutY - 4] : [nutY + (f - first) * fh, nutY + (f - first + 1) * fh],
      wireA: (f: number) => nutY + (f - first + 1) * fh,
      nutA: nutY,
      openA: openTop,
      endA: nutY + cells * fh,
      B,
      bLo: leftPad,
      bHi: leftPad + 5 * ss,
      zoneB: (i: number): [number, number] => [3 + (i % 2) * 9, 10 + (i % 2) * 9],
      zonePad: 3,
      slabel: (s: number) => [B(s), 14] as [number, number],
      fnum: (f: number) => [leftPad - 26, nutY + (f - first + 0.5) * fh + 4] as [number, number],
      bandLabel: (a0: number, a1: number) => [(a0 + a1) / 2, leftPad + 5 * ss + 26] as [number, number],
    };
  }, [vertical, coarse, narrow, lowTop, lefty, cells, first, props.cw, zones?.length, band]);

  const flipA = !g.vertical && lefty;
  const ma = (a: number) => (flipA ? g.W - a : a);
  const pt = (a: number, b: number): [number, number] => (g.vertical ? [b, ma(a)] : [ma(a), b]);
  const box = (a0: number, a1: number, b0: number, b1: number) => {
    const [x0, y0] = pt(a0, b0);
    const [x1, y1] = pt(a1, b1);
    return {
      x: +Math.min(x0, x1).toFixed(2),
      y: +Math.min(y0, y1).toFixed(2),
      width: +Math.abs(x1 - x0).toFixed(2),
      height: +Math.abs(y1 - y0).toFixed(2),
    };
  };

  /* ---------- roving focus ---------- */
  const fMin = from === 0 ? 0 : first;
  const defaultFocus = useMemo(() => {
    const r = dots.find((d) => d.root && !d.dim) ?? dots[0];
    return r ? { s: r.s, f: r.f } : { s: 0, f: fMin };
  }, [dots, fMin]);
  const [focusCell, setFocusCell] = useState<{ s: number; f: number } | null>(null);
  const fc = focusCell && focusCell.f >= fMin && focusCell.f <= to ? focusCell : defaultFocus;

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const t = e.target as SVGElement;
    if (t.dataset.zone != null && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      e.stopPropagation();
      props.onZone?.(Number(t.dataset.zone));
      return;
    }
    if (!t.classList.contains('hit')) return;
    const s = Number(t.dataset.s);
    const f = Number(t.dataset.f);
    let ds = 0;
    let df = 0;
    if (g.vertical) {
      if (e.key === 'ArrowDown') df = 1;
      else if (e.key === 'ArrowUp') df = -1;
      else if (e.key === 'ArrowRight') ds = lefty ? -1 : 1;
      else if (e.key === 'ArrowLeft') ds = lefty ? 1 : -1;
    } else {
      if (e.key === 'ArrowRight') df = lefty ? -1 : 1;
      else if (e.key === 'ArrowLeft') df = lefty ? 1 : -1;
      else if (e.key === 'ArrowUp') ds = lowTop ? -1 : 1;
      else if (e.key === 'ArrowDown') ds = lowTop ? 1 : -1;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      cellPress(s, f);
      return;
    }
    if (!ds && !df) return;
    e.preventDefault();
    e.stopPropagation();
    const ns = s + ds;
    const nf = f + df;
    if (ns < 0 || ns > 5 || nf < fMin || nf > to) return;
    const el = svgRef.current?.querySelector<SVGElement>(`.hit[data-s="${ns}"][data-f="${nf}"]`);
    if (el) {
      t.setAttribute('tabindex', '-1');
      el.setAttribute('tabindex', '0');
      el.focus();
    }
    setFocusCell({ s: ns, f: nf });
  };

  const cellPress = (s: number, f: number) => {
    setFocusCell({ s, f });
    if (props.onCell) props.onCell(s, f);
    else engine.playOne(s, f);
  };

  /* ---------- note flashes on the audio clock ---------- */
  useEffect(
    () =>
      engine.onVisual(({ s, f }) => {
        svgRef.current?.querySelectorAll(`.dot[data-s="${s}"][data-f="${f}"]`).forEach((el) => {
          el.classList.remove('flash');
          void (el as SVGGElement).getBoundingClientRect();
          el.classList.add('flash');
        });
      }),
    [],
  );

  /* ---------- keep the taught shape in view on a scrolling horizontal neck ---------- */
  const scrollSig = useMemo(
    () =>
      band
        ? `b${band.lo}-${band.hi}`
        : dots
            .filter((d) => !d.dim)
            .map((d) => `${d.s}:${d.f}`)
            .join(','),
    [band, dots],
  );
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || g.vertical || wrap.scrollWidth <= wrap.clientWidth + 4) return;
    const els = band ? [...wrap.querySelectorAll('.band')] : [...wrap.querySelectorAll('.dot:not(.dim)')];
    if (!els.length) return;
    const wr = wrap.getBoundingClientRect();
    let lo = Infinity;
    let hi = -Infinity;
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      lo = Math.min(lo, r.left);
      hi = Math.max(hi, r.right);
    });
    wrap.scrollLeft = Math.max(0, (lo + hi) / 2 - wr.left + wrap.scrollLeft - wrap.clientWidth / 2);
  }, [scrollSig, g.vertical, band]);

  /* ---------- drawing ---------- */
  const out: ReactNode[] = [];
  const mid = (g.bLo + g.bHi) / 2;

  zones?.forEach((z, i) => {
    const a0 = z.lo === 0 ? g.openA + 4 : g.cellA(Math.max(z.lo, first))[0] + g.zonePad;
    const a1 = g.cellA(Math.min(z.hi, to))[1] - g.zonePad;
    const [b0, b1] = g.zoneB(i);
    const r = box(a0, a1, b0, b1);
    const [tx, ty] = pt((a0 + a1) / 2, (b0 + b1) / 2);
    if (g.vertical) {
      out.push(
        <rect
          key={`z${z.id}`}
          className={`zone-strip${z.active ? ' active' : ''}`}
          {...r}
          rx={3.5}
          style={{ fill: z.color }}
          aria-hidden="true"
        />,
      );
      return;
    }
    out.push(
      <g
        key={`z${z.id}`}
        className={`zone${z.active ? ' active' : ''}`}
        data-zone={z.id}
        tabIndex={0}
        role="button"
        aria-label={`${z.label}-shape, frets ${z.lo} to ${z.hi}`}
        aria-pressed={z.active}
        onClick={() => props.onZone?.(z.id)}
      >
        <rect {...r} rx={7.5} style={{ fill: z.color }} />
        <text x={tx} y={ty + 3.8} style={{ fill: z.label === 'A' ? DARK : '#fff' }}>
          {`${z.label}-shape`}
        </text>
      </g>,
    );
  });

  out.push(<rect key="wood" {...box(g.nutA, g.endA, g.bLo - 13, g.bHi + 13)} rx={3} fill={`url(#${gid})`} />);
  for (const f of [3, 5, 7, 9, 15, 17])
    if (f >= first && f <= to)
      out.push(<circle key={`in${f}`} cx={pt(g.A(f), mid)[0]} cy={pt(g.A(f), mid)[1]} r={4} className="inlay" />);
  if (12 >= first && 12 <= to) {
    const off = (g.bHi - g.bLo) / 5;
    for (const b of [mid - off, mid + off]) {
      const [x, y] = pt(g.A(12), b);
      out.push(<circle key={`in12${b}`} cx={x} cy={y} r={4} className="inlay" />);
    }
  }
  if (band) {
    const a0 = band.lo === 0 ? g.openA : g.cellA(Math.max(band.lo, first))[0];
    const a1 = g.cellA(Math.min(band.hi, to))[1];
    out.push(<rect key="band" className="band" {...box(a0, a1, g.bLo - 17, g.bHi + 17)} rx={8} />);
    const [lx, ly] = g.bandLabel(a0, a1);
    const [x, y] = g.vertical ? [ly, ma(lx)] : [ma(lx), ly];
    out.push(
      <text key="bandl" className="band-label" x={x} y={y} transform={g.vertical ? `rotate(90 ${x} ${y})` : undefined}>
        {band.label ?? 'Your zone'}
      </text>,
    );
  }
  for (let f = first; f <= to; f++) {
    const [x1, y1] = pt(g.wireA(f), g.bLo - 13);
    const [x2, y2] = pt(g.wireA(f), g.bHi + 13);
    out.push(<line key={`w${f}`} x1={x1} y1={y1} x2={x2} y2={y2} className="wire" />);
  }
  if (from === 0)
    out.push(<rect key="nut" className="nut" {...box(g.nutA - 5, g.nutA + 2, g.bLo - 15, g.bHi + 15)} rx={2} />);
  else {
    const [x1, y1] = pt(g.nutA, g.bLo - 13);
    const [x2, y2] = pt(g.nutA, g.bHi + 13);
    out.push(<line key="w0" x1={x1} y1={y1} x2={x2} y2={y2} className="wire" />);
  }
  for (let s = 0; s < 6; s++) {
    const [x1, y1] = pt(from === 0 ? g.openA : g.nutA, g.B(s));
    const [x2, y2] = pt(g.endA, g.B(s));
    out.push(<line key={`s${s}`} x1={x1} y1={y1} x2={x2} y2={y2} className="string" style={{ strokeWidth: SW[s] }} />);
    const [la, lb] = g.slabel(s);
    const [lx, ly] = g.vertical ? [la, lb] : [ma(la), lb];
    out.push(
      <text key={`sl${s}`} x={lx} y={ly} className="slabel" aria-hidden="true">
        {STRING_LABEL[s as 0]}
      </text>,
    );
  }
  for (let f = first; f <= to; f++) {
    const [na, nb] = g.fnum(f);
    const [x, y] = g.vertical ? [na, nb] : [ma(na), nb];
    out.push(
      <text
        key={`fn${f}`}
        x={x}
        y={y}
        className={`fnum${[3, 5, 7, 9, 12, 15].includes(f) ? ' mk' : ''}`}
        aria-hidden="true"
      >
        {f}
      </text>,
    );
  }
  const dotAt = new Map(dots.map((d) => [`${d.s}:${d.f}`, d]));
  const ghostAt = new Map(ghosts.map((d) => [`${d.s}:${d.f}`, d]));
  const badgeAt = new Map((props.badges ?? []).map((d) => [`${d.s}:${d.f}`, d]));
  const mutedStrings = new Set(muted.map((m) => (typeof m === 'object' ? m.s : m)));
  const defaultCellLabel = (s: number, f: number): string => {
    const k = `${s}:${f}`;
    const d = dotAt.get(k);
    const parts = [
      props.hidePitch ? null : BOTH_NAMES[pcAt(s, f)],
      d ? (d.desc ?? (d.dim ? 'note of another shape' : 'marked note')) : null,
      badgeAt.get(k)?.desc ?? null,
      ghostAt.get(k)?.desc ?? null,
    ].filter(Boolean);
    if (!d && !ghostAt.get(k) && props.emptyLabel) parts.push(props.emptyLabel);
    if (!d && mutedStrings.has(s)) parts.push("this string isn't played");
    return parts.join(', ');
  };
  if (clickable) {
    for (let s = 0; s < 6; s++)
      for (let f = fMin; f <= to; f++) {
        const [a0, a1] = g.cellA(f);
        const name = props.cellLabel ? props.cellLabel(s, f) : defaultCellLabel(s, f);
        out.push(
          <rect
            key={`h${s}-${f}`}
            className="hit"
            {...box(a0, a1, g.B(s) - g.sp / 2, g.B(s) + g.sp / 2)}
            data-s={s}
            data-f={f}
            role="button"
            tabIndex={fc.s === s && fc.f === f ? 0 : -1}
            aria-label={name ? `${posName(s, f)}, ${name}` : posName(s, f)}
            onClick={() => cellPress(s, f)}
          />,
        );
      }
  }
  if (barre) {
    const b0 = Math.min(g.B(barre.s1), g.B(barre.s2));
    const b1 = Math.max(g.B(barre.s1), g.B(barre.s2));
    out.push(
      <rect
        key="barre"
        className="barre"
        {...box(g.A(barre.f) - 10.5, g.A(barre.f) + 10.5, b0 - 12, b1 + 12)}
        rx={10.5}
        style={{ fill: barre.color ?? NEUTRAL_BAR }}
        pointerEvents="none"
        aria-hidden="true"
      />,
    );
  }
  muted.forEach((m) => {
    const ms = typeof m === 'object' ? m.s : m;
    const mf = typeof m === 'object' ? (m.f ?? 0) : 0;
    const [x, y] = pt(g.A(mf), g.B(ms));
    out.push(
      <text
        key={`m${ms}`}
        x={x}
        y={y + 5}
        className={`muted-x${mf ? ' onboard' : ''}`}
        pointerEvents="none"
        aria-hidden="true"
      >
        ×
      </text>,
    );
  });
  ghosts.forEach((gh) => {
    const r = gh.r ?? 8.5;
    const [x, y] = pt(g.A(gh.f), g.B(gh.s));
    out.push(
      <g key={`g${gh.s}-${gh.f}`} className="ghost-g" pointerEvents="none" aria-hidden="true">
        <circle cx={x} cy={y} r={r} className={`ghost${gh.cls ? ' ' + gh.cls : ''}`} style={{ stroke: gh.color }} />
        {gh.cls === 'next' || gh.cls === 'anchor' ? <circle cx={x} cy={y} r={r - 2.3} className="ghost-ring" /> : null}
        {gh.label ? (
          <text x={x} y={y + 3.4} className="glabel">
            {gh.label}
          </text>
        ) : null}
      </g>,
    );
  });
  [...dots]
    .sort((a, b) => (b.dim ? 1 : 0) - (a.dim ? 1 : 0))
    .forEach((d) => {
      const [cx, cy] = pt(g.A(d.f), g.B(d.s));
      const r = d.root ? 12 : 11;
      const step = (2 * Math.PI) / Math.max(1, d.colors.length);
      out.push(
        <g
          key={`d${d.s}-${d.f}`}
          className={`dot${d.root ? ' root' : ''}${d.dim ? ' dim' : ''}${d.cls ? ' ' + d.cls : ''}`}
          data-s={d.s}
          data-f={d.f}
          aria-hidden="true"
        >
          {d.ring ? <circle cx={cx} cy={cy} r={r + 5.5} className="link-ring" /> : null}
          {d.third ? <circle cx={cx} cy={cy} r={r + 4.5} className="third-ring" /> : null}
          {d.colors.length <= 1 ? (
            <circle cx={cx} cy={cy} r={r} className="dfill" style={{ fill: d.colors[0] }} />
          ) : (
            <g className="dfill">
              {d.colors.map((c, i) => (
                <path
                  key={i}
                  d={slicePath(cx, cy, r, -Math.PI / 2 + i * step, -Math.PI / 2 + (i + 1) * step)}
                  style={{ fill: c }}
                />
              ))}
            </g>
          )}
          {d.root ? <circle cx={cx} cy={cy} r={r + 1.6} className="rootring" /> : null}
          {d.label ? (
            <text x={cx} y={cy + 3.9} className="dlabel" style={{ fill: d.text ?? '#fff' }}>
              {d.label}
            </text>
          ) : null}
        </g>,
      );
    });

  (props.badges ?? []).forEach((b) => {
    const [cx, cy] = pt(g.A(b.f), g.B(b.s));
    const [bx, by] = [cx + 10, cy - 10];
    out.push(
      <g key={`bd${b.s}-${b.f}`} className="badge" pointerEvents="none" aria-hidden="true">
        <circle cx={bx} cy={by} r={7.5} style={{ fill: '#1b1009', stroke: b.color }} />
        <text x={bx} y={by + 3.4} className="glabel">
          {b.label}
        </text>
      </g>,
    );
  });

  const style = g.vertical
    ? { width: g.W, maxWidth: '100%' }
    : { width: '100%', maxWidth: Math.round(g.W * 1.3), minWidth: cells <= 6 ? 0 : Math.min(g.W, 720) };

  return (
    <div className={`board-wrap${g.vertical ? ' vertical' : ''}`} ref={wrapRef} id={props.id}>
      <svg
        ref={svgRef}
        className={`fb${props.pivot ? ' pivot' : ''}${props.soon ? ' soon' : ''}`}
        viewBox={`0 0 ${g.W} ${g.H}`}
        style={style}
        role="group"
        aria-label={props.label}
        onKeyDown={onKeyDown}
      >
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2={g.vertical ? '1' : '0'} y2={g.vertical ? '0' : '1'}>
            <stop offset="0" stopColor="#4a2c1c" />
            <stop offset=".5" stopColor="#3a2216" />
            <stop offset="1" stopColor="#2c1910" />
          </linearGradient>
        </defs>
        {out}
      </svg>
      {props.children}
    </div>
  );
}
