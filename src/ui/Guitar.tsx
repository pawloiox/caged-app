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
      {/* Sampled from the reference: a cool grey-brown, palest on the carved treble side and darkest across the
          lower bass bout. */}
      <linearGradient id={`${id}-stain`} x1="0" y1="0" x2="0.12" y2="1">
        <stop offset="0" stopColor="#765b52" />
        <stop offset="0.35" stopColor="#664a42" />
        <stop offset="0.7" stopColor="#563c35" />
        <stop offset="1" stopColor="#45302a" />
      </linearGradient>
      {grain ? (
        // Stretched across the grain, so the streaks are wider and less regular than on the fretboard.
        <pattern id={`${id}-grain`} patternUnits="userSpaceOnUse" width={GRAIN_W} height={GRAIN_H * 1.6}>
          <image href={grain} width={GRAIN_W} height={GRAIN_H * 1.6} preserveAspectRatio="none" />
        </pattern>
      ) : null}
      <filter id={`${id}-soft`} colorInterpolationFilters="sRGB" x="-10%" y="-10%" width="120%" height="120%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      {/* Greys the rosewood grain almost to neutral, so it reads as fine open pores under a grey stain. */}
      <filter id={`${id}-grey`}>
        <feColorMatrix type="saturate" values="0.2" />
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
      {/* The figure: long, wavy, irregular dark streaks along the body's length. Noise stretched along x, bent by a
          slow second noise, and turned into a dark grey-brown alpha only where it dips. */}
      <filter id={`${id}-streak`} filterUnits="userSpaceOnUse" x={0} y={0} width={400} height={260}>
        <feTurbulence type="fractalNoise" baseFrequency="0.006 0.11" numOctaves={4} seed={11} result="n" />
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.03" numOctaves={2} seed={3} result="w" />
        <feDisplacementMap in="n" in2="w" scale={9} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0.17  0 0 0 0 0.11  0 0 0 0 0.075  -3 0 0 0 1.62" />
      </filter>
      {/* The pale side of the same figure: thinner light streaks where the noise peaks. */}
      <filter id={`${id}-pale`} filterUnits="userSpaceOnUse" x={0} y={0} width={400} height={260}>
        <feTurbulence type="fractalNoise" baseFrequency="0.009 0.2" numOctaves={3} seed={29} result="n" />
        <feTurbulence type="fractalNoise" baseFrequency="0.02 0.04" numOctaves={2} seed={5} result="w" />
        <feDisplacementMap in="n" in2="w" scale={6} xChannelSelector="R" yChannelSelector="G" result="d" />
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.49  0 0 0 0 0.42  3 0 0 0 -1.62" />
      </filter>
      {/* Fine pores: dense hairlines along the grain. */}
      <filter id={`${id}-pore`} filterUnits="userSpaceOnUse" x={0} y={0} width={400} height={260}>
        <feTurbulence type="fractalNoise" baseFrequency="0.03 0.9" numOctaves={2} seed={17} />
        <feColorMatrix type="matrix" values="0 0 0 0 0.12  0 0 0 0 0.08  0 0 0 0 0.06  -4 0 0 0 2.1" />
      </filter>
      <filter
        id={`${id}-bout`}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
        x={180}
        y={110}
        width={240}
        height={170}
      >
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
 * Traced from the reference photo's silhouette, row by row, then mapped onto this guitar: along the neck at
 * 1.257 px per photo pixel, and across it so the neck is 64 px wide (photo 32) while the body keeps its own
 * proportions outside the neck band. A long bass horn, a shorter treble horn, cutaways that roll into the neck,
 * a gentle waist and a full, round lower bout. Regenerate with scripts/guitar-trace (rows.mjs, then outline.py).
 */
const BODY_PATH =
  'M78.7 80.0 C78.3 76.7 77.4 64.6 76.2 60.1 C74.9 55.6 72.8 54.8 71.1 52.8 C69.5 50.9 67.8 49.4 66.1 48.2 C64.4 47.0 62.8 46.4 61.1 45.5 C59.4 44.7 57.7 43.9 56.1 43.0 C54.4 42.1 51.9 41.8 51.0 40.2 C50.2 38.6 50.2 35.3 51.0 33.5 C51.9 31.6 54.4 30.3 56.1 29.2 C57.7 28.0 59.4 27.3 61.1 26.7 C62.8 26.0 64.4 25.6 66.1 25.3 C67.8 25.0 69.5 25.0 71.1 25.1 C72.8 25.2 74.5 25.4 76.2 25.7 C77.9 26.0 79.5 26.4 81.2 26.8 C82.9 27.3 84.6 27.7 86.2 28.2 C87.9 28.7 89.6 29.2 91.3 29.7 C92.9 30.3 94.6 31.0 96.3 31.7 C98.0 32.3 99.6 33.0 101.3 33.6 C103.0 34.2 104.7 34.8 106.4 35.3 C108.0 35.8 109.7 36.2 111.4 36.7 C113.1 37.1 114.7 37.6 116.4 38.0 C118.1 38.4 119.8 38.7 121.4 39.0 C123.1 39.2 124.8 39.5 126.5 39.6 C128.1 39.6 129.8 39.4 131.5 39.2 C133.2 39.0 134.8 38.7 136.5 38.4 C138.2 38.1 139.9 37.7 141.6 37.2 C143.2 36.8 144.9 36.3 146.6 35.7 C148.3 35.1 149.9 34.5 151.6 33.8 C153.3 33.1 155.0 32.4 156.6 31.7 C158.3 30.9 160.0 30.2 161.7 29.3 C163.3 28.5 165.0 27.6 166.7 26.7 C168.4 25.8 170.1 24.9 171.7 24.0 C173.4 23.1 175.1 22.1 176.8 21.3 C178.4 20.4 180.1 19.6 181.8 18.8 C183.5 18.0 185.1 17.2 186.8 16.4 C188.5 15.7 190.2 15.0 191.8 14.3 C193.5 13.7 195.2 13.0 196.9 12.4 C198.5 11.8 200.2 11.1 201.9 10.5 C203.6 9.9 205.3 9.4 206.9 8.9 C208.6 8.4 210.3 7.8 212.0 7.4 C213.6 6.9 215.3 6.6 217.0 6.2 C218.7 5.9 220.3 5.4 222.0 5.1 C223.7 4.7 225.4 4.4 227.0 4.1 C228.7 3.9 230.4 3.7 232.1 3.5 C233.8 3.3 235.4 3.1 237.1 3.0 C238.8 2.9 240.5 3.1 242.1 3.0 C243.8 2.8 245.5 2.4 247.2 2.2 C248.8 2.0 250.5 1.9 252.2 2.0 C253.9 2.1 255.5 2.4 257.2 2.6 C258.9 2.7 260.6 2.8 262.2 3.0 C263.9 3.1 265.6 3.3 267.3 3.5 C269.0 3.8 270.6 4.2 272.3 4.5 C274.0 4.9 275.7 5.2 277.3 5.7 C279.0 6.1 280.7 6.5 282.4 7.0 C284.0 7.5 285.7 7.9 287.4 8.5 C289.1 9.2 290.7 9.9 292.4 10.7 C294.1 11.4 295.8 12.0 297.5 13.0 C299.1 13.9 300.8 15.2 302.5 16.3 C304.2 17.3 305.8 18.1 307.5 19.3 C309.2 20.6 310.9 22.1 312.5 23.6 C314.2 25.1 315.9 26.7 317.6 28.4 C319.2 30.1 320.9 31.9 322.6 34.0 C324.3 36.1 326.0 38.1 327.6 40.9 C329.3 43.7 331.0 46.4 332.7 50.5 C334.3 54.6 335.0 55.3 337.7 65.6 C340.4 75.8 348.8 97.7 349.0 112.0 C349.2 126.3 341.5 141.7 338.9 151.5 C336.4 161.3 335.6 165.9 333.9 170.8 C332.2 175.6 330.6 177.9 328.9 180.8 C327.2 183.6 325.5 185.8 323.9 187.9 C322.2 190.1 320.5 191.9 318.8 193.7 C317.1 195.5 315.5 197.2 313.8 198.7 C312.1 200.2 310.4 201.4 308.8 202.7 C307.1 204.1 305.4 205.5 303.7 206.6 C302.1 207.7 300.4 208.6 298.7 209.5 C297.0 210.4 295.4 211.2 293.7 212.0 C292.0 212.8 290.3 213.5 288.7 214.1 C287.0 214.7 285.3 215.3 283.6 215.8 C281.9 216.4 280.3 216.9 278.6 217.4 C276.9 217.8 275.2 218.1 273.6 218.5 C271.9 218.9 270.2 219.4 268.5 219.7 C266.9 220.0 265.2 220.0 263.5 220.3 C261.8 220.5 260.2 220.9 258.5 221.0 C256.8 221.2 255.1 221.0 253.4 221.0 C251.8 221.0 250.1 221.0 248.4 221.0 C246.7 221.0 245.1 221.1 243.4 221.0 C241.7 221.0 240.0 220.8 238.4 220.7 C236.7 220.5 235.0 220.3 233.3 220.1 C231.7 219.8 230.0 219.6 228.3 219.3 C226.6 219.0 225.0 218.5 223.3 218.1 C221.6 217.8 219.9 217.4 218.2 217.0 C216.6 216.6 214.9 216.3 213.2 215.8 C211.5 215.4 209.9 215.0 208.2 214.5 C206.5 213.9 204.8 213.2 203.2 212.6 C201.5 212.0 199.8 211.4 198.1 210.8 C196.5 210.2 194.8 209.6 193.1 208.9 C191.4 208.2 189.7 207.4 188.1 206.6 C186.4 205.8 184.7 205.1 183.0 204.3 C181.4 203.5 179.7 202.6 178.0 201.8 C176.3 200.9 174.7 200.1 173.0 199.3 C171.3 198.5 169.6 197.8 168.0 197.0 C166.3 196.2 164.6 195.3 162.9 194.5 C161.3 193.7 159.6 192.8 157.9 192.1 C156.2 191.5 154.5 191.0 152.9 190.4 C151.2 189.8 149.5 189.2 147.8 188.7 C146.2 188.1 144.5 187.6 142.8 187.1 C141.1 186.7 139.5 186.2 137.8 185.8 C136.1 185.4 134.4 185.0 132.8 184.6 C131.1 184.3 129.4 183.9 127.7 183.7 C126.0 183.5 124.4 183.5 122.7 183.5 C121.0 183.4 119.3 183.5 117.7 183.5 C116.0 183.5 114.3 183.4 112.6 183.5 C111.0 183.6 109.3 183.8 107.6 184.1 C105.9 184.3 104.3 184.5 102.6 184.8 C100.9 185.1 99.2 185.4 97.6 185.8 C95.9 186.1 94.2 186.5 92.5 186.9 C90.8 187.4 89.2 188.0 87.5 188.5 C85.8 189.0 84.1 189.5 82.5 190.0 C80.8 190.6 79.1 191.4 77.4 192.0 C75.8 192.5 74.1 193.0 72.4 193.5 C70.7 194.0 69.1 194.6 67.4 195.0 C65.7 195.5 64.0 196.0 62.3 196.4 C60.7 196.8 59.0 197.0 57.3 197.3 C55.6 197.7 54.0 198.1 52.3 198.3 C50.6 198.6 48.9 198.8 47.3 198.9 C45.6 199.0 43.9 198.9 42.2 198.9 C40.6 198.9 38.9 199.0 37.2 198.9 C35.5 198.8 33.9 198.7 32.2 198.5 C30.5 198.3 28.8 198.0 27.1 197.5 C25.5 197.1 23.8 196.6 22.1 196.0 C20.4 195.4 18.8 194.9 17.1 193.9 C15.4 192.8 13.7 192.5 12.1 189.6 C10.4 186.8 8.7 177.7 7.0 176.9 C5.4 176.1 2.8 184.4 2.0 184.8 C1.2 185.1 0.3 180.1 2.0 179.0 C3.7 177.9 9.5 178.5 12.1 178.3 C14.6 178.1 15.4 177.8 17.1 177.7 C18.8 177.6 20.4 177.8 22.1 177.7 C23.8 177.6 25.5 177.3 27.1 177.1 C28.8 176.9 30.5 176.8 32.2 176.5 C33.9 176.3 35.5 175.8 37.2 175.4 C38.9 175.0 40.6 174.7 42.2 174.0 C43.9 173.4 45.6 172.4 47.3 171.5 C48.9 170.6 50.6 169.7 52.3 168.7 C54.0 167.6 55.6 166.6 57.3 165.2 C59.0 163.7 60.7 163.5 62.3 160.0 C64.0 156.5 66.5 146.7 67.4 144.0 L67 144 L70 80 Z';
/** The two cutaway edges (neck joint to horn tip), for the carve shading. */
const CUT_TREBLE =
  'M78.7 80.0 C78.3 76.7 77.4 64.6 76.2 60.1 C74.9 55.6 72.8 54.8 71.1 52.8 C69.5 50.9 67.8 49.4 66.1 48.2 C64.4 47.0 62.8 46.4 61.1 45.5 C59.4 44.7 57.7 43.9 56.1 43.0 C54.4 42.1 51.9 40.7 51.0 40.2';
const CUT_BASS =
  'M2.0 179.0 C3.7 178.9 9.5 178.5 12.1 178.3 C14.6 178.1 15.4 177.8 17.1 177.7 C18.8 177.6 20.4 177.8 22.1 177.7 C23.8 177.6 25.5 177.3 27.1 177.1 C28.8 176.9 30.5 176.8 32.2 176.5 C33.9 176.3 35.5 175.8 37.2 175.4 C38.9 175.0 40.6 174.7 42.2 174.0 C43.9 173.4 45.6 172.4 47.3 171.5 C48.9 170.6 50.6 169.7 52.3 168.7 C54.0 167.6 55.6 166.6 57.3 165.2 C59.0 163.7 60.7 163.5 62.3 160.0 C64.0 156.5 66.5 146.7 67.4 144.0';

/** An uncovered humbucker: black, two rows of poles (screws and slugs), in a black mounting ring. */
function Humbucker({ x, id }: { x: number; id: string }) {
  const top = NECK_TOP - 8;
  const h = NECK_H + 16;
  return (
    <g>
      <rect x={x - 5} y={top - 4} width={34} height={h + 8} rx={5} fill="#0d0c0c" stroke="#24211f" strokeWidth={1} />
      <line x1={x - 2} x2={x + 26} y1={top - 3.2} y2={top - 3.2} stroke="rgba(255,255,255,0.12)" strokeWidth={0.6} />
      {[
        [x - 2, top - 1],
        [x + 26, top - 1],
        [x - 2, top + h + 1],
        [x + 26, top + h + 1],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={1.1} fill="#55595b" />
      ))}
      <rect x={x} y={top + 2} width={24} height={h - 4} rx={3} fill="#060606" />
      <line x1={x + 12} x2={x + 12} y1={top + 4} y2={top + h - 4} stroke="#1c1a19" strokeWidth={0.8} />
      {STRING_AT.map((_, i) => (
        <g key={i}>
          <circle cx={x + 6} cy={stringY(i)} r={2.3} fill={`url(#${id}-post)`} />
          <circle cx={x + 6} cy={stringY(i)} r={0.6} fill="#3d4245" />
          <circle cx={x + 18} cy={stringY(i)} r={1.9} fill={`url(#${id}-post)`} opacity={0.85} />
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
        <filter
          id={`${id}-band`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={-20}
          y={-20}
          width={BODY_W + 40}
          height={ROW_H + 40}
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter
          id={`${id}-carve`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={160}
          height={ROW_H}
        >
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter
          id={`${id}-edge`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={0}
          y={0}
          width={160}
          height={ROW_H}
        >
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <filter
          id={`${id}-rim`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={-10}
          y={-10}
          width={BODY_W + 20}
          height={ROW_H + 20}
        >
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
        <filter id={`${id}-glow`} colorInterpolationFilters="sRGB" x="-20%" y="-50%" width="140%" height="200%">
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
            opacity={0.2}
            style={{ mixBlendMode: 'multiply' }}
          />
        ) : null}
        <rect width={BODY_W} height={ROW_H} filter={`url(#${id}-pore)`} opacity={0.45} />
        <rect width={BODY_W} height={ROW_H} filter={`url(#${id}-streak)`} opacity={0.8} />
        <rect width={BODY_W} height={ROW_H} filter={`url(#${id}-pale)`} opacity={0.16} />
        {/* The worn, paler treble horn and upper bout, where the carve catches the light. */}
        <g filter={`url(#${id}-band)`}>
          <ellipse cx={100} cy={42} rx={44} ry={13} fill="rgba(215,190,178,0.2)" />
          <ellipse cx={262} cy={34} rx={66} ry={20} fill="rgba(215,190,178,0.1)" />
        </g>
        {/* The top darkens toward the lower bass bout and the butt. */}
        <ellipse cx={300} cy={190} rx={70} ry={40} fill="rgba(24,16,12,0.22)" filter={`url(#${id}-bout)`} />
        {/* Broad darker streaks along the grain: one behind the bridge to the butt, one across the lower bout. */}
        <g filter={`url(#${id}-band)`}>
          <path d="M228 114 C262 110 300 119 350 113" fill="none" stroke="rgba(40,25,16,0.28)" strokeWidth={14} />
          <path d="M60 156 C140 150 230 162 345 152" fill="none" stroke="rgba(40,25,16,0.2)" strokeWidth={10} />
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
          d="M30 180 C80 186 130 196 200 206"
          fill="none"
          stroke="rgba(255,255,255,0.10)"
          strokeWidth={14}
          strokeLinecap="round"
          filter={`url(#${id}-glow)`}
        />
        {/* The rounded edge falls off into shadow. */}
        <path d={BODY_PATH} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth={20} filter={`url(#${id}-soft)`} />
        <path d={BODY_PATH} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={5} filter={`url(#${id}-rim)`} />
      </g>
      <path d={BODY_PATH} fill="none" stroke="rgba(10,8,6,0.8)" strokeWidth={1} />
      {/* Strap buttons: the tip of the bass horn and the end of the body. */}
      {[
        [5, 179],
        [346, 112],
      ].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={3.2} fill="#2b2826" />
          <circle cx={cx} cy={cy} r={2.4} fill={`url(#${id}-post)`} opacity={0.85} />
        </g>
      ))}
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
        <circle cx={221} cy={72} r={3.5} fill={`url(#${id}-post)`} stroke="#4e5457" strokeWidth={0.5} />
        <path d="M221 72 C202 68 160 66 116 66" fill="none" stroke="#d9dcdd" strokeWidth={2.5} strokeLinecap="round" />
        <rect x={111} y={64} width={11} height={4} rx={2} fill="#151312" />
        <line x1={112.5} x2={120.5} y1={65} y2={65} stroke="rgba(255,255,255,0.25)" strokeWidth={0.6} />
      </g>
      {/* Mini switch. */}
      <circle cx={276} cy={68} r={5.2} fill="#1a1716" />
      <circle cx={276} cy={68} r={4.2} fill={`url(#${id}-post)`} opacity={0.55} />
      <circle cx={275.4} cy={67.4} r={2.4} fill="#121010" stroke="#000" strokeWidth={0.4} />
      <circle cx={274.8} cy={66.8} r={0.8} fill="rgba(255,255,255,0.35)" />
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
