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
/** Electric-guitar strings: wound (D, A, low E) nickel, a touch darker than the plain steel (e, B, G). */
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
              stroke={wound ? `url(#${id}-wound)` : `url(#${id}-steel)`}
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
      <linearGradient id={`${id}-wound`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9dbd9" />
        <stop offset="1" stopColor="#7e8382" />
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
        <feGaussianBlur stdDeviation="0.5" />
      </filter>
      {/* Coarse open-pore streaks along the body's length: noise stretched along x, turned into a brown alpha. */}
      <filter id={`${id}-streak`} filterUnits="userSpaceOnUse" x={0} y={0} width={400} height={260}>
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.35" numOctaves={3} seed={7} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.16  0 0 0 0 0.11  0 0 0 0 0.07  0 0 0 -1.4 1.1" />
      </filter>
      <filter id={`${id}-bout`} filterUnits="userSpaceOnUse" x={180} y={110} width={240} height={170}>
        <feGaussianBlur stdDeviation="14" />
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
  { x: 117, y: 39 },
  { x: 79, y: 48 },
  { x: 40, y: 55 },
] as const;
const KEYS_BOTTOM = [
  { x: 117, y: 185 },
  { x: 79, y: 176 },
  { x: 40, y: 169 },
] as const;

/** A tuner key centred at (x, y); d = 1 when the headstock lies toward +y (treble keys), −1 for bass keys. */
const kidney = (x: number, y: number, d: number) => {
  const Y = (dy: number) => y + d * dy;
  return (
    `M${x - 14} ${y} C${x - 14} ${Y(-8)} ${x - 11} ${Y(-12)} ${x} ${Y(-12)} ` +
    `C${x + 11} ${Y(-12)} ${x + 14} ${Y(-8)} ${x + 14} ${y} ` +
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
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(255,255,255,0.04)" />
          <stop offset="0.5" stopColor="rgba(255,255,255,0)" />
          <stop offset="1" stopColor="rgba(255,255,255,0.03)" />
        </linearGradient>
        <linearGradient id={`${id}-matte`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#393735" />
          <stop offset="1" stopColor="#232120" />
        </linearGradient>
        <clipPath id={`${id}-hclip`}>
          <path d={outline} />
        </clipPath>
        <radialGradient id={`${id}-washer`} cx="0.38" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#f2f3f3" />
          <stop offset="0.55" stopColor="#b4b9bb" />
          <stop offset="1" stopColor="#6f7578" />
        </radialGradient>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a8f91" />
          <stop offset="1" stopColor="#4a4f52" />
        </linearGradient>
        <radialGradient id={`${id}-key`} cx="0.38" cy="0.32" r="0.8">
          <stop offset="0" stopColor="#3e3e40" />
          <stop offset="0.5" stopColor="#1e1e1f" />
          <stop offset="1" stopColor="#0c0c0c" />
        </radialGradient>
      </defs>
      {/* Tuner keys, drawn first so they sit behind the edge: black kidney-shaped buttons on short collars. */}
      {[...KEYS_TOP.map((k) => ({ ...k, d: 1 })), ...KEYS_BOTTOM.map((k) => ({ ...k, d: -1 }))].map((k, i) => (
        <g key={i}>
          {/* One kidney-shaped button, long axis along the headstock, pinched on the side facing it; its inner
              edge tucks under the face. */}
          {/* A short metal stem between the key and the headstock edge. */}
          <rect x={k.x - 2} y={k.d > 0 ? k.y + 8 : k.y - 15} width={4} height={7} fill={`url(#${id}-stem)`} />
          <path d={kidney(k.x, k.y, k.d)} fill={`url(#${id}-key)`} stroke="rgba(0,0,0,0.6)" strokeWidth={0.6} />
          <ellipse cx={k.x - 5} cy={k.y - 5 * k.d} rx={4} ry={2.5} fill="rgba(255,255,255,0.07)" />
        </g>
      ))}
      <g filter="drop-shadow(0 3px 4px rgba(0,0,0,0.5))">
        <path d={outline} fill={`url(#${id}-matte)`} />
        <path d={outline} fill={`url(#${id}-sheen)`} />
        <path d={outline} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth={1} />
      </g>
      {/* Satin: soft light along the edges. */}
      <path d={outline} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={6} clipPath={`url(#${id}-hclip)`} />
      {/* Logo along the centre line, between the strings: the five shape colours, then the name. */}
      {['--c-shape', '--a-shape', '--g-shape', '--e-shape', '--d-shape'].map((v, i) => (
        <circle
          key={v}
          cx={11 + i * 7}
          cy={112}
          r={3}
          opacity={0.9}
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
        fill="#141414"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth={0.6}
      />
      <circle cx={127} cy={112} r={1.4} fill="#9aa0a3" />
      <Strings
        id={id}
        from={(i) => (i < 3 ? POSTS_TOP[i]!.x : POSTS_BOTTOM[5 - i]!.x)}
        fromY={(i) => (i < 3 ? POSTS_TOP[i]!.y + 2.5 : POSTS_BOTTOM[5 - i]!.y - 2.5)}
        to={W - 6}
      />
      {[...POSTS_TOP, ...POSTS_BOTTOM].map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={8} fill={`url(#${id}-washer)`} stroke="#2a2d2f" strokeWidth={0.5} />
          {/* The string coiled round the post. */}
          <circle cx={p.x} cy={p.y} r={4.6} fill="none" stroke="#3d4245" strokeWidth={1.6} />
          <circle cx={p.x} cy={p.y} r={2.8} fill="#7d8487" />
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
 * Double cutaway with matching horns: the two scoops are mirror images across the neck's centre line, cut deep
 * into the body. A narrow upper body widens into a full round lower bout. The neck enters on the left between
 * the horns (y 80–144).
 */
const BODY_PATH =
  // Each cutaway rolls into the neck along its edge (tangent to it), not square onto it.
  'M60 80 C74 80 86 76 90 66 C94 56 88 46 76 42 C64 38 52 36 50 29 C48 21 55 16 63 17 C75 18 85 21 97 26 C109 31 118 34 130 34 ' +
  'C152 33 182 13 224 4 C262 0 302 6 325 27 C342 42 349 76 349 112 C349 150 340 186 318 204 ' +
  'C302 218 278 222 248 222 C206 222 164 192 130 190 ' +
  // The bass horn and cutaway mirror the treble ones across the neck's centre line (y = 112).
  'C118 190 109 193 97 198 C85 203 75 206 63 207 C55 208 48 203 50 195 C52 188 64 186 76 182 ' +
  'C88 178 94 168 90 158 C86 148 74 144 60 144 L70 144 L70 80 Z';
/** The two cutaway edges, for the carve shading (mirror images across y = 112). */
const CUT_TREBLE = 'M60 80 C74 80 86 76 90 66 C94 56 88 46 76 42 C64 38 52 36 50 29';
const CUT_BASS = 'M50 195 C52 188 64 186 76 182 C88 178 94 168 90 158 C86 148 74 144 60 144';

/** An uncovered humbucker: black, two rows of poles (screws and slugs), in a black mounting ring. */
function Humbucker({ x, id }: { x: number; id: string }) {
  const top = NECK_TOP - 8;
  const h = NECK_H + 16;
  return (
    <g>
      <rect x={x - 5} y={top - 4} width={34} height={h + 8} rx={5} fill="#0e0d0d" stroke="#4a4643" strokeWidth={1} />
      <line x1={x - 2} x2={x + 26} y1={top - 3.2} y2={top - 3.2} stroke="rgba(255,255,255,0.12)" strokeWidth={0.6} />
      {[
        [x - 2, top - 1],
        [x + 26, top - 1],
        [x - 2, top + h + 1],
        [x + 26, top + h + 1],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.3} fill="#8d9396" />
      ))}
      <rect x={x} y={top + 2} width={24} height={h - 4} rx={3} fill="#060606" />
      <line x1={x + 12} x2={x + 12} y1={top + 4} y2={top + h - 4} stroke="#1c1a19" strokeWidth={0.8} />
      {STRING_AT.map((_, i) => (
        <g key={i}>
          <circle cx={x + 6} cy={stringY(i)} r={2.3} fill={`url(#${id}-post)`} />
          <circle cx={x + 6} cy={stringY(i)} r={0.6} fill="#3d4245" />
          <circle cx={x + 18} cy={stringY(i)} r={2.3} fill={`url(#${id}-post)`} opacity={0.75} />
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
        <filter id={`${id}-band`} filterUnits="userSpaceOnUse" x={-20} y={-20} width={BODY_W + 40} height={ROW_H + 40}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={`${id}-carve`} filterUnits="userSpaceOnUse" x={0} y={0} width={160} height={ROW_H}>
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id={`${id}-edge`} filterUnits="userSpaceOnUse" x={0} y={0} width={160} height={ROW_H}>
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <linearGradient id={`${id}-saddle`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ece9e2" />
          <stop offset="1" stopColor="#9d998f" />
        </linearGradient>
        <linearGradient id={`${id}-rear`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b5b1a9" />
          <stop offset="1" stopColor="#7a766e" />
        </linearGradient>
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
            opacity={0.35}
            style={{ mixBlendMode: 'multiply' }}
          />
        ) : null}
        <rect
          width={BODY_W}
          height={ROW_H}
          filter={`url(#${id}-streak)`}
          opacity={0.5}
          style={{ mixBlendMode: 'multiply' }}
        />
        {/* The top darkens toward the lower bass bout and the butt. */}
        <ellipse cx={300} cy={190} rx={70} ry={40} fill="rgba(30,20,14,0.18)" filter={`url(#${id}-bout)`} />
        {/* Broad, irregular darker streaks along the grain, beside the pickups and the bridge. */}
        <g filter={`url(#${id}-band)`}>
          <rect x={0} y={150} width={BODY_W} height={14} fill="rgba(38,26,18,0.22)" />
          <rect x={0} y={54} width={BODY_W} height={8} fill="rgba(38,26,18,0.22)" />
          <rect x={0} y={188} width={BODY_W} height={12} fill="rgba(38,26,18,0.15)" />
          <path d="M90 120 C160 116 240 126 350 122" fill="none" stroke="rgba(38,26,18,0.12)" strokeWidth={8} />
        </g>
        <rect width={BODY_W} height={ROW_H} fill={`url(#${id}-satin)`} />
        {/* The carved top rolls down into both cutaways: a soft lit ridge just inside each edge, then the edge
            itself falling into shadow. */}
        {[CUT_TREBLE, CUT_BASS].map((d) => (
          <g key={d}>
            <path d={d} fill="none" stroke="rgba(255,240,222,0.11)" strokeWidth={22} filter={`url(#${id}-carve)`} />
            <path d={d} fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth={6} filter={`url(#${id}-edge)`} />
          </g>
        ))}
        {/* Light along the carved upper bass bout and horn. */}
        <path
          d="M58 198 C90 200 130 202 200 208"
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
      <circle cx={49} cy={200} r={4} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
      <circle cx={345} cy={112} r={4} fill={`url(#${id}-post)`} stroke="#3d4245" strokeWidth={0.5} />
      {/* The fretboard runs on over the body almost to the neck pickup, with its last frets. */}
      {/* The fretboard stands proud of the top, so it casts a soft shadow onto the body. */}
      <rect
        x={70}
        y={NECK_TOP}
        width={20}
        height={NECK_H}
        fill={`url(#${id}-rosewood)`}
        filter="drop-shadow(0 0 2.5px rgba(0,0,0,0.55))"
      />
      {[80, 86].map((x) => (
        <rect key={x} x={x} y={NECK_TOP} width={1.2} height={NECK_H} fill="#c9cdcf" opacity={0.8} />
      ))}
      <rect x={89} y={NECK_TOP} width={1} height={NECK_H} fill="rgba(0,0,0,0.5)" />
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
        {/* The saddle channel, so the gaps between saddles read, and a plainer rear plate. */}
        <rect x={204} y={NECK_TOP - 8} width={12} height={NECK_H + 16} fill="#2a2826" />
        <rect x={216} y={NECK_TOP - 9} width={13} height={NECK_H + 18} rx={3} fill={`url(#${id}-rear)`} />
        {Array.from({ length: 6 }, (_, k) => (
          <circle
            key={k}
            cx={plateX + 1.6}
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
            x={205 + i * 0.6}
            y={stringY(i) - 2.6}
            width={9}
            height={5.2}
            rx={1.3}
            fill={`url(#${id}-saddle)`}
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
