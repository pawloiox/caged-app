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
      <radialGradient id={`${id}-stain`} cx="0.5" cy="0.55" r="0.78">
        <stop offset="0" stopColor="#86705c" />
        <stop offset="0.55" stopColor="#67513f" />
        <stop offset="0.88" stopColor="#4e3d30" />
        <stop offset="1" stopColor="#34281f" />
      </radialGradient>
      {grain ? (
        // Stretched across the grain, so the streaks are wider and less regular than on the fretboard.
        <pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width={GRAIN_W} height={GRAIN_H * 1.6}>
          <image href={grain} width={GRAIN_W} height={GRAIN_H * 1.6} preserveAspectRatio="none" />
        </pattern>
      ) : null}
      <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
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

/**
 * Tuner posts. The rows converge toward the tip, so the strings run almost parallel to the nut (low E and high e
 * take the posts nearest the nut, so no string crosses a post).
 */
const POSTS_TOP = [
  { x: 117, y: 73 },
  { x: 79, y: 85 },
  { x: 41, y: 95 },
] as const;
const POSTS_BOTTOM = [
  { x: 117, y: 149 },
  { x: 79, y: 139 },
  { x: 41, y: 130 },
] as const;
/** Key centres: just off the edge, beside their posts. */
const KEYS_TOP = [
  { x: 117, y: 42 },
  { x: 79, y: 51 },
  { x: 40, y: 58 },
] as const;
const KEYS_BOTTOM = [
  { x: 117, y: 182 },
  { x: 79, y: 173 },
  { x: 40, y: 166 },
] as const;

/** A tuner key centred at (x, y); d = 1 when the headstock lies toward +y (treble keys), −1 for bass keys. */
const kidney = (x: number, y: number, d: number) => {
  const Y = (dy: number) => y + d * dy;
  return (
    `M${x - 14} ${y} C${x - 14} ${Y(-12)} ${x + 14} ${Y(-12)} ${x + 14} ${y} ` +
    `C${x + 14} ${Y(9)} ${x + 7} ${Y(12)} ${x} ${Y(8)} C${x - 7} ${Y(12)} ${x - 14} ${Y(9)} ${x - 14} ${y} Z`
  );
};

/**
 * A matte charcoal 3 + 3 headstock: widest at the tuners nearest the nut, narrowing to an asymmetric concave tip
 * (a sharp point on the bass side, a rounded corner on the treble side), with concave flares into the neck.
 */
export function Headstock() {
  const id = useId().replace(/:/g, '');
  const outline =
    'M172 80 C165 74 154 64 140 57 C130 53 120 51 110 52 C88 55 52 66 26 69 C19 70 12 71 12 75 ' +
    'C17 90 22 104 15 120 C11 132 6 142 0 152 C10 153 30 154 50 157 C78 161 100 168 114 172 ' +
    'C126 174 138 168 148 160 C157 153 164 147 172 144 Z';
  const W = HEADSTOCK_W;
  return (
    <svg className="headstock-art" width={W} height={ROW_H} viewBox={`0 0 ${W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <linearGradient id={`${id}-matte`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#393735" />
          <stop offset="1" stopColor="#232120" />
        </linearGradient>
        <clipPath id={`${id}-hclip`}>
          <path d={outline} />
        </clipPath>
        <radialGradient id={`${id}-washer`} cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#d4d8d9" />
          <stop offset="0.55" stopColor="#8a9093" />
          <stop offset="1" stopColor="#5d6265" />
        </radialGradient>
        <radialGradient id={`${id}-key`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#4a4a4c" />
          <stop offset="0.45" stopColor="#1b1b1c" />
          <stop offset="1" stopColor="#050505" />
        </radialGradient>
      </defs>
      {/* Tuner keys, drawn first so they sit behind the edge: black kidney-shaped buttons on short collars. */}
      {[...KEYS_TOP.map((k) => ({ ...k, d: 1 })), ...KEYS_BOTTOM.map((k) => ({ ...k, d: -1 }))].map((k, i) => (
        <g key={i}>
          {/* One kidney-shaped button, long axis along the headstock, pinched on the side facing it; its inner
              edge tucks under the face. */}
          <path d={kidney(k.x, k.y, k.d)} fill={`url(#${id}-key)`} />
          <ellipse cx={k.x - 5} cy={k.y - 5 * k.d} rx={4} ry={2.5} fill="rgba(255,255,255,0.14)" />
        </g>
      ))}
      <g filter="drop-shadow(0 3px 4px rgba(0,0,0,0.5))">
        <path d={outline} fill={`url(#${id}-matte)`} />
        <path d={outline} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      </g>
      {/* Satin: soft light along the edges. */}
      <path d={outline} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} clipPath={`url(#${id}-hclip)`} />
      {/* Logo along the centre line, between the strings: the five shape colours, then the name. */}
      {['--c-shape', '--a-shape', '--g-shape', '--e-shape', '--d-shape'].map((v, i) => (
        <circle
          key={v}
          cx={10 + i * 8}
          cy={112}
          r={3.5}
          fill={`var(${v})`}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={0.5}
        />
      ))}
      <text x={50} y={117} className="headstock-name" textLength={66} lengthAdjust="spacingAndGlyphs">
        CAGED Lab
      </text>
      {/* Truss-rod cover, just behind the nut. */}
      <rect
        x={122}
        y={105.5}
        width={40}
        height={13}
        rx={6.5}
        fill="#0b0b0b"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth={0.6}
      />
      <circle cx={127} cy={112} r={1.4} fill="#9aa0a3" />
      <Strings
        id={id}
        from={(i) => (i < 3 ? POSTS_TOP[i]!.x : POSTS_BOTTOM[5 - i]!.x)}
        fromY={(i) => (i < 3 ? POSTS_TOP[i]!.y : POSTS_BOTTOM[5 - i]!.y)}
        to={W - 6}
      />
      {[...POSTS_TOP, ...POSTS_BOTTOM].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={7} fill={`url(#${id}-washer)`} stroke="#2a2d2f" strokeWidth={0.5} />
          {/* The string wrap round the post. */}
          <circle cx={p.x} cy={p.y} r={4.5} fill="none" stroke="#4e5457" strokeWidth={0.8} />
          <circle cx={p.x} cy={p.y} r={3.2} fill="#a9aeb0" />
          <circle cx={p.x} cy={p.y} r={1.5} fill="#2a2d2f" />
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
 * Pear-shaped double cutaway: a narrow upper body, a thick bass horn pointing straight at the headstock with a
 * deep U cutaway, a short treble horn with a shallow scoop, and a wide round lower bout. The neck enters on the
 * left between the horns (y 80–144).
 */
const BODY_PATH =
  'M74 80 C80 66 74 52 62 46 C54 42 48 38 47 31 C46 22 54 17 62 18 C74 19 84 24 96 28 C108 32 116 36 124 36 ' +
  'C146 35 180 12 224 4 C262 0 302 6 325 27 C342 42 349 76 349 112 C349 150 340 186 318 204 ' +
  'C300 217 276 222 250 222 C215 222 170 216 131 209 C108 205 82 202 60 201 C40 201 24 202 14 200 ' +
  'C4 197 0 189 1 182 C2 174 8 168 17 169 C30 175 48 172 58 166 C66 161 69 153 70 144 L70 80 Z';

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

/** The body: satin charcoal, two humbuckers, a vibrato bridge with its arm, a mini switch and strap buttons. */
export function GuitarBody() {
  const id = useId().replace(/:/g, '');
  const grain = useGrain();
  const plateX = 203;
  const anchorX = 226;
  return (
    <svg className="body-art" width={BODY_W} height={ROW_H} viewBox={`0 0 ${BODY_W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <CharcoalDefs id={id} grain={grain} />
        <clipPath id={`${id}-clip`}>
          <path d={BODY_PATH} />
        </clipPath>
        <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id={`${id}-bridge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e4e0d8" />
          <stop offset="0.5" stopColor="#a8a49c" />
          <stop offset="1" stopColor="#6e6a62" />
        </linearGradient>
        <radialGradient id={`${id}-brass`} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#c9b27a" />
          <stop offset="1" stopColor="#6b5630" />
        </radialGradient>
        <linearGradient id={`${id}-rosewood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f1d13" />
          <stop offset="0.55" stopColor="#24160e" />
          <stop offset="1" stopColor="#1a0f09" />
        </linearGradient>
      </defs>
      <g filter="drop-shadow(0 6px 8px rgba(0,0,0,0.55))">
        <path d={BODY_PATH} fill={`url(#${id}-stain)`} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        {grain ? (
          <rect
            width={BODY_W}
            height={ROW_H}
            fill={`url(#${id}-grain)`}
            filter={`url(#${id}-grey)`}
            opacity={0.6}
            style={{ mixBlendMode: 'multiply' }}
          />
        ) : null}
        <rect width={BODY_W} height={ROW_H} fill={`url(#${id}-satin)`} />
        {/* Light along the carved upper bass bout and horn. */}
        <path
          d="M20 186 C60 192 120 200 200 208"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={14}
          strokeLinecap="round"
          filter={`url(#${id}-glow)`}
        />
        {/* The rounded edge falls off into shadow. */}
        <path d={BODY_PATH} fill="none" stroke="rgba(0,0,0,0.1)" strokeWidth={20} filter={`url(#${id}-soft)`} />
      </g>
      <path d={BODY_PATH} fill="none" stroke="rgba(10,8,6,0.8)" strokeWidth={1} />
      {/* Strap buttons: the tip of the bass horn and the end of the body. */}
      <circle cx={2} cy={180} r={4} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
      <circle cx={345} cy={112} r={4} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
      {/* The fretboard runs on over the body almost to the neck pickup, with its last frets. */}
      <rect x={70} y={NECK_TOP} width={20} height={NECK_H} fill={`url(#${id}-rosewood)`} />
      {[80, 86].map((x) => (
        <rect key={x} x={x} y={NECK_TOP} width={1.2} height={NECK_H} fill="#c9cdcf" opacity={0.8} />
      ))}
      <Humbucker x={98} id={id} />
      <Humbucker x={162} id={id} />
      {/* Vibrato bridge: a warm nickel base plate with six pivot screws in front and a saddle per string. */}
      <g filter="drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.6))">
        <rect
          x={plateX}
          y={NECK_TOP - 9}
          width={26}
          height={NECK_H + 18}
          rx={3}
          fill={`url(#${id}-bridge)`}
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
            y={stringY(i) - 2.3}
            width={8}
            height={4.6}
            rx={1.3}
            fill="#b9b5ad"
            stroke="#5a574f"
            strokeWidth={0.5}
          />
        ))}
      </g>
      <Strings id={id} from={0} to={anchorX} />
      {STRING_AT.map((_, i) => (
        <circle key={i} cx={anchorX} cy={stringY(i)} r={1.5} fill="#3d4245" />
      ))}
      {/* The vibrato arm: thin and nearly straight, lying back along the treble side of the pickups. */}
      <g filter="drop-shadow(0 1.5px 1px rgba(0,0,0,0.6))">
        <circle cx={224} cy={69} r={3.5} fill={`url(#${id}-post)`} stroke="#4e5457" strokeWidth={0.5} />
        <path d="M224 69 C205 64 160 61 114 59" fill="none" stroke="#d9dcdd" strokeWidth={2.5} strokeLinecap="round" />
        <ellipse cx={114} cy={59} rx={4} ry={2.6} fill="#f2f2f2" stroke="#8f969a" strokeWidth={0.5} />
      </g>
      {/* Mini switch. */}
      <circle cx={280} cy={68} r={6} fill="#141110" />
      <circle cx={280} cy={68} r={4.5} fill={`url(#${id}-brass)`} />
    </svg>
  );
}

export function KnobFace({ angle }: { angle: number }) {
  return (
    <span className="knob-face" aria-hidden="true">
      <span className="knob-pointer" style={{ transform: `rotate(${angle}deg)` }} />
    </span>
  );
}
