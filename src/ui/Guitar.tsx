/**
 * The navigation is a guitar lying across the top of the page: the headstock is the home link, the neck holds
 * the steps and tools on its frets (ui/Layout.tsx), and the body carries the controls as knobs.
 *
 * Modelled on a modern double-cutaway solid body in a satin, open-grain charcoal finish: unbound rosewood neck,
 * black 3 + 3 headstock, two black open-pole humbuckers, a vibrato bridge with its arm, and two knobs on the
 * treble side. The outlines are our own, and the inlays stay the app's pearl dots (no maker's logo or inlays).
 *
 * Everything is drawn to one 224 px row in which the neck is 64 px tall and centred (y 80–144), so the six
 * strings run unbroken from the tuners, over the frets, to the bridge.
 */
import { useEffect, useId, useState } from 'react';
import { GRAIN_H, GRAIN_W, grainReady, loadGrain } from '../fretboard/materials';

export const ROW_H = 224;
export const NECK_TOP = 80;
export const NECK_H = 64;
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

/**
 * Satin charcoal: a grey-brown stain that the open grain shows through, pale where the wood is worn
 * and darker toward the edges, with no binding.
 */
function CharcoalDefs({ id, grain }: { id: string; grain: string | null }) {
  return (
    <>
      <radialGradient id={`${id}-stain`} cx="0.58" cy="0.45" r="0.66">
        <stop offset="0" stopColor="#83776c" />
        <stop offset="0.55" stopColor="#62564c" />
        <stop offset="0.88" stopColor="#433930" />
        <stop offset="1" stopColor="#29221c" />
      </radialGradient>
      {grain ? (
        <pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width={GRAIN_W / 2} height={GRAIN_H / 2}>
          <image href={grain} width={GRAIN_W / 2} height={GRAIN_H / 2} preserveAspectRatio="none" />
        </pattern>
      ) : null}
      {/* Greys the rosewood grain, so it reads as stained open-pore wood. */}
      <filter id={`${id}-grey`}>
        <feColorMatrix type="saturate" values="0.4" />
      </filter>
      <linearGradient id={`${id}-satin`} x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="rgba(255,255,255,0.13)" />
        <stop offset="0.4" stopColor="rgba(255,255,255,0)" />
        <stop offset="1" stopColor="rgba(0,0,0,0.22)" />
      </linearGradient>
    </>
  );
}

/* ---------------- Headstock ---------------- */
export const HEADSTOCK_W = 172;

/** Tuner posts, following the flare of the headstock (low E and high e nearest the nut, so no strings cross). */
const POSTS_TOP = [
  { x: 142, y: 74 },
  { x: 106, y: 62 },
  { x: 70, y: 55 },
] as const;
const POSTS_BOTTOM = [
  { x: 142, y: 150 },
  { x: 106, y: 162 },
  { x: 70, y: 169 },
] as const;
/** How far a tuner key sticks out from its post. */
const KEY_REACH = 26;

/** A black 3 + 3 headstock that flares from the nut, with dark tuner keys, a truss-rod cover and a bone nut. */
export function Headstock() {
  const id = useId().replace(/:/g, '');
  const outline =
    'M172 80 C160 76 147 67 132 59 C110 48 72 41 32 39 C17 38 8 45 8 57 C3 92 3 132 8 167 ' +
    'C8 179 17 186 32 185 C72 183 110 176 132 165 C147 157 160 148 172 144 Z';
  const W = HEADSTOCK_W;
  return (
    <svg className="headstock-art" width={W} height={ROW_H} viewBox={`0 0 ${W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2a2c" />
          <stop offset="0.35" stopColor="#0f0f10" />
          <stop offset="0.6" stopColor="#151516" />
          <stop offset="1" stopColor="#060606" />
        </linearGradient>
        <radialGradient id={`${id}-key`} cx="0.35" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#6a6a6c" />
          <stop offset="0.45" stopColor="#222224" />
          <stop offset="1" stopColor="#080808" />
        </radialGradient>
        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      {/* Tuner keys stick out past the edges, so they are drawn first: a chrome shaft and a dark button. */}
      {[
        ...POSTS_TOP.map((p) => ({ x: p.x, y: p.y, d: -1 })),
        ...POSTS_BOTTOM.map((p) => ({ x: p.x, y: p.y, d: 1 })),
      ].map((k, i) => {
        const ky = k.y + k.d * KEY_REACH;
        return (
          <g key={i}>
            <rect x={k.x - 2.5} y={Math.min(k.y, ky)} width={5} height={KEY_REACH} fill={`url(#${id}-nickel)`} />
            <rect
              x={k.x - 6}
              y={ky - 7}
              width={12}
              height={14}
              rx={4}
              fill={`url(#${id}-key)`}
              stroke="#000"
              strokeWidth={0.6}
            />
          </g>
        );
      })}
      <g filter="drop-shadow(0 3px 4px rgba(0,0,0,0.5))">
        <path d={outline} fill={`url(#${id}-gloss)`} />
        <path d={outline} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        {/* A soft reflection across the gloss. */}
        <path d="M20 40 L70 40 L30 190 L-20 190 Z" fill="rgba(255,255,255,0.05)" />
        {/* Logo: the five shape colours, and the name. */}
        {['--c-shape', '--a-shape', '--g-shape', '--e-shape', '--d-shape'].map((v, i) => (
          <circle
            key={v}
            cx={34 + i * 12}
            cy={101}
            r={5}
            fill={`var(${v})`}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth={0.6}
          />
        ))}
        <text x={28} y={128} className="headstock-name">
          CAGED Lab
        </text>
        {/* Truss-rod cover, just behind the nut. */}
        <path
          d="M150 103 L164 106 L164 118 L150 121 C145 117 145 107 150 103 Z"
          fill="#050505"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth={0.7}
        />
      </g>
      {/* Strings from their posts to the nut. */}
      <Strings
        id={id}
        from={(i) => (i < 3 ? POSTS_TOP[i]!.x : POSTS_BOTTOM[5 - i]!.x)}
        fromY={(i) => (i < 3 ? POSTS_TOP[i]!.y + 3 : POSTS_BOTTOM[5 - i]!.y - 3)}
        to={W - 6}
      />
      {[...POSTS_TOP, ...POSTS_BOTTOM].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={6.5} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
          <circle cx={p.x} cy={p.y} r={2.6} fill="#9aa0a3" stroke="#4e5457" strokeWidth={0.5} />
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
export const BODY_W = 350;
/** How far the body reaches back over the end of the neck (the neck pocket). */
export const BODY_OVERLAP = 70;

/**
 * Double cutaway: a long bass horn (bottom, pointing toward the headstock), a shorter treble horn (top), a
 * gentle waist and a full lower bout. The neck enters on the left between the horns (y 80–144).
 */
const BODY_PATH =
  'M70 80 C66 62 54 48 40 42 C30 38 20 34 22 24 C24 14 40 10 60 10 C100 10 130 18 165 16 ' +
  'C215 13 265 2 305 10 C338 18 350 64 349 112 C350 160 338 206 305 214 C265 222 215 211 165 208 ' +
  'C125 206 80 222 40 218 C18 216 2 206 6 194 C10 182 26 178 42 172 C58 166 67 156 70 144 Z';

/** An uncovered humbucker: black, two rows of poles (screws and slugs), in a black mounting ring. */
function Humbucker({ x, id }: { x: number; id: string }) {
  const top = NECK_TOP - 8;
  const h = NECK_H + 16;
  return (
    <g>
      <rect x={x - 5} y={top - 4} width={34} height={h + 8} rx={5} fill="#0e0d0d" stroke="#2c2927" strokeWidth={0.8} />
      {[top, top + h].map((y) => (
        <circle key={y} cx={x + 12} cy={y} r={1.3} fill="#5d6265" />
      ))}
      <rect x={x} y={top + 2} width={24} height={h - 4} rx={3} fill="#060606" />
      <line x1={x + 12} x2={x + 12} y1={top + 4} y2={top + h - 4} stroke="#1c1a19" strokeWidth={0.8} />
      {STRING_AT.map((_, i) => (
        <g key={i}>
          <circle cx={x + 6} cy={stringY(i)} r={2.3} fill={`url(#${id}-post)`} />
          <circle cx={x + 6} cy={stringY(i)} r={0.6} fill="#3d4245" />
          <circle cx={x + 18} cy={stringY(i)} r={2.3} fill="#3a3a3a" />
        </g>
      ))}
    </g>
  );
}

/** The body: satin charcoal, two humbuckers, a vibrato bridge with its arm, and strap buttons. */
export function GuitarBody() {
  const id = useId().replace(/:/g, '');
  const grain = useGrain();
  const plateX = 186;
  const anchorX = 208;
  return (
    <svg className="body-art" width={BODY_W} height={ROW_H} viewBox={`0 0 ${BODY_W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <CharcoalDefs id={id} grain={grain} />
        <clipPath id={`${id}-clip`}>
          <path d={BODY_PATH} />
        </clipPath>
      </defs>
      <g filter="drop-shadow(0 6px 8px rgba(0,0,0,0.55))">
        <path d={BODY_PATH} fill={`url(#${id}-stain)`} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        {grain ? (
          <>
            <rect
              width={BODY_W}
              height={ROW_H}
              fill={`url(#${id}-grain)`}
              filter={`url(#${id}-grey)`}
              opacity={0.85}
              style={{ mixBlendMode: 'multiply' }}
            />
            {/* Worn, pale fibres in the open grain. */}
            <rect
              width={BODY_W}
              height={ROW_H}
              fill={`url(#${id}-grain)`}
              filter={`url(#${id}-grey)`}
              opacity={0.16}
              transform={`translate(0 ${ROW_H}) scale(1 -1)`}
              style={{ mixBlendMode: 'screen' }}
            />
          </>
        ) : null}
        <rect width={BODY_W} height={ROW_H} fill={`url(#${id}-satin)`} />
        {/* The carved edge: a soft lighter bevel just inside the outline. */}
        <path d={BODY_PATH} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={14} />
        <path d={BODY_PATH} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={4} />
      </g>
      <path d={BODY_PATH} fill="none" stroke="rgba(10,8,6,0.8)" strokeWidth={1} />
      {/* Strap buttons: the tip of the bass horn and the end of the body. */}
      <circle cx={11} cy={197} r={4} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
      <circle cx={345} cy={112} r={4} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
      {/* The neck heel's shadow where it enters the body. */}
      <rect x={70} y={NECK_TOP} width={7} height={NECK_H} fill="rgba(0,0,0,0.4)" />
      <Humbucker x={98} id={id} />
      <Humbucker x={142} id={id} />
      {/* Vibrato bridge: a chrome base plate with six pivot screws in front and a saddle per string. */}
      <rect
        x={plateX}
        y={NECK_TOP - 9}
        width={26}
        height={NECK_H + 18}
        rx={3}
        fill={`url(#${id}-nickel)`}
        stroke="#4e5457"
        strokeWidth={0.6}
      />
      {Array.from({ length: 6 }, (_, k) => (
        <circle
          key={k}
          cx={plateX + 4}
          cy={NECK_TOP - 4 + ((NECK_H + 8) * k) / 5}
          r={1.8}
          fill="#5d6265"
          stroke="#2f3436"
          strokeWidth={0.4}
        />
      ))}
      {STRING_AT.map((_, i) => (
        <rect
          key={i}
          x={plateX + 8 + i * 0.8}
          y={stringY(i) - 2.8}
          width={10}
          height={5.6}
          rx={1.5}
          fill={`url(#${id}-nickel)`}
          stroke="#555b5e"
          strokeWidth={0.5}
        />
      ))}
      <Strings id={id} from={0} to={anchorX} />
      {STRING_AT.map((_, i) => (
        <circle key={i} cx={anchorX} cy={stringY(i)} r={1.5} fill="#3d4245" />
      ))}
      {/* The vibrato arm, swung back along the treble side toward the neck. */}
      <g filter="drop-shadow(0 2px 1.5px rgba(0,0,0,0.6))">
        <circle
          cx={plateX + 21}
          cy={NECK_TOP - 11}
          r={4}
          fill={`url(#${id}-post)`}
          stroke="#4e5457"
          strokeWidth={0.5}
        />
        <path
          d={`M${plateX + 21} ${NECK_TOP - 11} C${plateX + 10} ${NECK_TOP - 24} 170 ${NECK_TOP - 27} 112 ${NECK_TOP - 25}`}
          fill="none"
          stroke="#d9dcdd"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <ellipse cx={110} cy={NECK_TOP - 25} rx={5} ry={3.4} fill="#f2f2f2" stroke="#8f969a" strokeWidth={0.6} />
      </g>
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
