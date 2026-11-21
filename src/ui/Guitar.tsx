/**
 * The navigation is a guitar lying across the top of the page: the headstock is the home link, the neck holds
 * the steps and tools on its frets (ui/Layout.tsx), and the body carries the controls as knobs.
 *
 * Everything here is drawn to one 152 px tall row in which the neck is 68 px tall and centred (y 42–110), so the
 * six strings run unbroken from the tuners, over the frets, to the bridge.
 */
import { useEffect, useId, useState } from 'react';
import { GRAIN_H, GRAIN_W, grainReady, loadGrain } from '../fretboard/materials';

export const ROW_H = 152;
export const NECK_TOP = 42;
export const NECK_H = 68;
/** String positions across the neck, as a share of its height (high e at the top, low E at the bottom). */
export const STRING_AT = [0.12, 0.28, 0.44, 0.6, 0.76, 0.92] as const;
const stringY = (i: number) => NECK_TOP + NECK_H * STRING_AT[i]!;
/** Wound strings (D, A, low E) are bronze; plain ones (e, B, G) steel. Width grows toward low E. */
const STRING_W = [0.9, 1.1, 1.3, 1.6, 1.9, 2.3] as const;

function useGrain(): string | null {
  const [grain, setGrain] = useState<string | null>(grainReady);
  useEffect(() => {
    if (grain) return;
    let live = true;
    void loadGrain().then((u) => live && setGrain(u));
    return () => {
      live = false;
    };
  }, [grain]);
  return grain;
}

/** The six strings from x1 (optionally starting at a tuner post's height) to x2, each with its shadow. */
function Strings({
  from,
  to,
  fromY,
  id,
}: {
  from: number | ((i: number) => number);
  to: number;
  fromY?: (i: number) => number;
  id: string;
}) {
  return (
    <g>
      {STRING_AT.map((_, i) => {
        const x1 = typeof from === 'number' ? from : from(i);
        const y = stringY(i);
        const y1 = fromY ? fromY(i) : y;
        const wound = i >= 3;
        return (
          <g key={i}>
            <line x1={x1} x2={to} y1={y1 + 1.6} y2={y + 1.6} stroke="rgba(0,0,0,0.45)" strokeWidth={STRING_W[i]} />
            <line
              x1={x1}
              x2={to}
              y1={y1}
              y2={y}
              stroke={wound ? `url(#${id}-bronze)` : `url(#${id}-steel)`}
              strokeWidth={STRING_W[i]}
            />
          </g>
        );
      })}
    </g>
  );
}

function MetalDefs({ id }: { id: string }) {
  return (
    <>
      <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f4f4f2" />
        <stop offset="1" stopColor="#9da3a6" />
      </linearGradient>
      <linearGradient id={`${id}-bronze`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f0d6a6" />
        <stop offset="1" stopColor="#9c7a47" />
      </linearGradient>
      <linearGradient id={`${id}-nickel`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbfbf9" />
        <stop offset="0.45" stopColor="#c9cdcf" />
        <stop offset="1" stopColor="#7d8487" />
      </linearGradient>
      <radialGradient id={`${id}-post`} cx="0.38" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.5" stopColor="#c3c8ca" />
        <stop offset="1" stopColor="#6f7578" />
      </radialGradient>
    </>
  );
}

/** Wood: a stained base that darkens toward the edges (a soft burst), with the shared grain on top. */
function WoodDefs({ id, grain, light, dark }: { id: string; grain: string | null; light: string; dark: string }) {
  return (
    <>
      <radialGradient id={`${id}-burst`} cx="0.55" cy="0.5" r="0.62">
        <stop offset="0" stopColor={light} />
        <stop offset="0.7" stopColor={dark} />
        <stop offset="1" stopColor="#0d0704" />
      </radialGradient>
      {grain ? (
        <pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width={GRAIN_W / 2} height={GRAIN_H / 2}>
          <image href={grain} width={GRAIN_W / 2} height={GRAIN_H / 2} preserveAspectRatio="none" />
        </pattern>
      ) : null}
      <linearGradient id={`${id}-satin`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="rgba(255,240,220,0.16)" />
        <stop offset="0.35" stopColor="rgba(255,240,220,0)" />
        <stop offset="1" stopColor="rgba(0,0,0,0.25)" />
      </linearGradient>
    </>
  );
}

/* ---------------- Headstock ---------------- */
export const HEADSTOCK_W = 150;

/** Tuner posts: x along the headstock, and which strings they take (low E nearest the nut, so none cross). */
const POSTS_TOP = [
  { x: 110, y: 39 },
  { x: 76, y: 33 },
  { x: 42, y: 28 },
] as const;
const POSTS_BOTTOM = [
  { x: 110, y: 113 },
  { x: 76, y: 120 },
  { x: 42, y: 125 },
] as const;
/** How far a tuner key sticks out from its post. */
const KEY_REACH = 25;

/** A 3 + 3 headstock with a scooped tip, the CAGED Lab logo, tuners and a bone nut. */
export function Headstock() {
  const id = useId().replace(/:/g, '');
  const grain = useGrain();
  // Flares from the nut, rises gently toward the tip, and ends in a shallow scoop.
  const outline =
    'M150 42 C138 40 126 33 112 30 C86 25 48 18 18 14 C9 13 3 18 4 27 C20 58 18 96 9 124 ' +
    'C8 133 16 139 27 138 C60 135 90 128 112 122 C126 119 138 112 150 110 Z';
  const W = HEADSTOCK_W;
  return (
    <svg className="headstock-art" width={W} height={ROW_H} viewBox={`0 0 ${W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <WoodDefs id={id} grain={grain} light="#3b2215" dark="#1d100a" />
        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      {/* Tuner keys stick out past the edges, so they are drawn first. */}
      {[
        ...POSTS_TOP.map((p) => ({ x: p.x, y: p.y, d: -1 })),
        ...POSTS_BOTTOM.map((p) => ({ x: p.x, y: p.y, d: 1 })),
      ].map((k, i) => {
        const ky = k.y + k.d * KEY_REACH;
        return (
          <g key={i}>
            <rect x={k.x - 2} y={Math.min(k.y, ky)} width={4} height={KEY_REACH} fill={`url(#${id}-nickel)`} />
            <ellipse cx={k.x} cy={ky} rx={7.5} ry={6} fill={`url(#${id}-post)`} stroke="#4e5457" strokeWidth={0.6} />
            <ellipse cx={k.x - 2} cy={ky - 2} rx={2.5} ry={1.6} fill="rgba(255,255,255,0.7)" />
          </g>
        );
      })}
      <g filter="drop-shadow(0 3px 4px rgba(0,0,0,0.45))">
        <path d={outline} fill={`url(#${id}-burst)`} />
        {grain ? (
          <path d={outline} fill={`url(#${id}-grain)`} opacity={0.55} style={{ mixBlendMode: 'multiply' }} />
        ) : null}
        <path d={outline} fill={`url(#${id}-satin)`} />
        <path d={outline} fill="none" stroke="#e9dfc8" strokeWidth={1.6} opacity={0.85} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        {/* Logo: the five shape colours, and the name. */}
        {['--c-shape', '--a-shape', '--g-shape', '--e-shape', '--d-shape'].map((v, i) => (
          <circle
            key={v}
            cx={40 + i * 11}
            cy={66}
            r={4.6}
            fill={`var(${v})`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.6}
          />
        ))}
        <text x={36} y={91} className="headstock-name">
          CAGED Lab
        </text>
      </g>
      {/* Strings from the nut to their posts. */}
      <Strings
        id={id}
        from={(i) => (i < 3 ? POSTS_TOP[i]!.x : POSTS_BOTTOM[5 - i]!.x)}
        fromY={(i) => (i < 3 ? POSTS_TOP[i]!.y + 3 : POSTS_BOTTOM[5 - i]!.y - 3)}
        to={W - 6}
      />
      {[...POSTS_TOP, ...POSTS_BOTTOM].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={7.5} fill="#0c0807" opacity={0.55} />
          <circle cx={p.x} cy={p.y} r={5} fill={`url(#${id}-post)`} />
          <circle cx={p.x} cy={p.y} r={1.4} fill="#4e5457" />
        </g>
      ))}
      {/* Bone nut. */}
      <rect
        x={W - 7}
        y={NECK_TOP - 1}
        width={7}
        height={NECK_H + 2}
        fill="#efe7d4"
        stroke="#b8ad95"
        strokeWidth={0.6}
      />
    </svg>
  );
}

/* ---------------- Body ---------------- */
export const BODY_W = 340;
/** How far the body reaches back over the end of the neck (the neck pocket). */
export const BODY_OVERLAP = 56;

/** An original double-cutaway outline. The neck enters on the left between the horns (y 42–110). */
const BODY_PATH =
  'M56 42 C46 34 28 27 14 24 C2 21 0 10 12 7 C52 -1 108 4 152 10 C204 17 250 2 296 5 C332 8 340 42 339 76 ' +
  'C340 110 332 146 296 148 C250 151 204 136 152 142 C108 147 64 151 36 144 C24 140 20 131 29 126 ' +
  'C40 120 48 115 56 110 Z';

function Humbucker({ x, id }: { x: number; id: string }) {
  return (
    <g>
      <rect x={x - 3} y={NECK_TOP - 6} width={26} height={NECK_H + 12} rx={4} fill="#120d0b" stroke="#2b2320" />
      <rect x={x} y={NECK_TOP - 2} width={20} height={NECK_H + 4} rx={2.5} fill="#0b0909" />
      <line x1={x + 10} x2={x + 10} y1={NECK_TOP} y2={NECK_TOP + NECK_H} stroke="#1f1a18" strokeWidth={0.8} />
      {STRING_AT.map((_, i) => (
        <g key={i}>
          <circle cx={x + 5} cy={stringY(i)} r={2} fill={`url(#${id}-post)`} />
          <circle cx={x + 15} cy={stringY(i)} r={2} fill="#2a2523" />
        </g>
      ))}
    </g>
  );
}

/** The body: stained wood with cream binding, two humbuckers, a bridge and a stop tailpiece. */
export function GuitarBody() {
  const id = useId().replace(/:/g, '');
  const grain = useGrain();
  const bridgeX = 160;
  const tailX = 184;
  return (
    <svg className="body-art" width={BODY_W} height={ROW_H} viewBox={`0 0 ${BODY_W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <WoodDefs id={id} grain={grain} light="#7a4a2c" dark="#3a2114" />
      </defs>
      <g filter="drop-shadow(0 5px 7px rgba(0,0,0,0.5))">
        <path d={BODY_PATH} fill={`url(#${id}-burst)`} />
        {grain ? (
          <path d={BODY_PATH} fill={`url(#${id}-grain)`} opacity={0.6} style={{ mixBlendMode: 'multiply' }} />
        ) : null}
        <path d={BODY_PATH} fill={`url(#${id}-satin)`} />
        <path d={BODY_PATH} fill="none" stroke="#e9dfc8" strokeWidth={2} opacity={0.9} />
      </g>
      {/* The neck heel's shadow where it enters the body. */}
      <rect x={56} y={NECK_TOP} width={6} height={NECK_H} fill="rgba(0,0,0,0.35)" />
      <Humbucker x={82} id={id} />
      <Humbucker x={122} id={id} />
      {/* Bridge with a saddle under each string, and the stop tailpiece the strings end at. */}
      <rect
        x={bridgeX - 2}
        y={NECK_TOP - 7}
        width={7}
        height={NECK_H + 14}
        rx={2}
        fill="#8f969a"
        stroke="#4e5457"
        strokeWidth={0.6}
      />
      {[NECK_TOP - 9, NECK_TOP + NECK_H + 9].map((y) => (
        <g key={y}>
          <circle cx={bridgeX + 1.5} cy={y} r={4} fill={`url(#${id}-post)`} stroke="#4e5457" strokeWidth={0.5} />
          <circle cx={bridgeX + 1.5} cy={y} r={1.3} fill="#3d4245" />
        </g>
      ))}
      {STRING_AT.map((_, i) => (
        <rect
          key={i}
          x={bridgeX - 1 + (i % 2)}
          y={stringY(i) - 2.5}
          width={4}
          height={5}
          rx={1}
          fill="#e7eaeb"
          stroke="#6f7578"
          strokeWidth={0.4}
        />
      ))}
      <rect
        x={tailX - 7}
        y={NECK_TOP - 4}
        width={15}
        height={NECK_H + 8}
        rx={7}
        fill={`url(#${id}-post)`}
        stroke="#4e5457"
        strokeWidth={0.6}
      />
      {[NECK_TOP - 10, NECK_TOP + NECK_H + 10].map((y) => (
        <circle key={y} cx={tailX + 0.5} cy={y} r={4.5} fill={`url(#${id}-post)`} stroke="#4e5457" strokeWidth={0.5} />
      ))}
      <Strings id={id} from={0} to={tailX} />
      {STRING_AT.map((_, i) => (
        <circle key={i} cx={tailX} cy={stringY(i)} r={1.6} fill="#4e5457" />
      ))}
    </svg>
  );
}

/** A control knob face: knurled edge, a cap, and a pointer turned to `angle` degrees. */
export function KnobFace({ angle }: { angle: number }) {
  return (
    <span className="knob-face" aria-hidden="true">
      <span className="knob-pointer" style={{ transform: `rotate(${angle}deg)` }} />
    </span>
  );
}
