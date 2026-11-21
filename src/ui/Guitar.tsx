/**
 * The navigation is a guitar lying across the top of the page: the headstock is the home link, the neck holds
 * the steps and tools on its frets (ui/Layout.tsx), and the body carries the controls as knobs.
 *
 * The body is modelled on a classic triple single-coil solid body in gloss black: white pickguard, three white
 * single-coil pickups (the bridge one slanted), a vintage vibrato with its arm, white hat knobs, a five-way switch
 * and an oval jack plate on the face. The neck stays unbound rosewood and the headstock a black 3 + 3. The outlines
 * are our own tracings, and the inlays stay the app's pearl dots (no maker's logo or inlays).
 *
 * Everything is drawn to one 224 px row in which the neck is 64 px tall and centred (y 80–144), so the six
 * strings run unbroken from the tuners, over the frets, to the bridge.
 */
import { useId } from 'react';

export const ROW_H = 224;
export const NECK_TOP = 80;
export const NECK_H = 64;
/** String positions across the neck, as a share of its height (high e at the top, low E at the bottom). */
export const STRING_AT = [0.12, 0.28, 0.44, 0.6, 0.76, 0.92] as const;
const stringY = (i: number) => NECK_TOP + NECK_H * STRING_AT[i]!;
/** Electric-guitar strings: wound (D, A, low E) nickel, a touch darker than the plain steel (e, B, G). */
const STRING_W = [0.9, 1.1, 1.3, 1.6, 1.9, 2.3] as const;

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
 * Traced from the reference photo's silhouette column by column, then mapped onto this guitar: along the neck at
 * 1.637 px per photo pixel, and across it so the neck is 64 px wide while the body keeps its own proportions outside
 * the neck band. A long bass horn, a shorter treble horn, deep rounded cutaways, a waist and a full lower bout.
 * Regenerate with scripts/guitar-trace (pixels.mjs, then outline_h.py).
 */
const BODY_PATH =
  'M98.6 80.0 C98.0 71.2 98.3 62.1 96.9 53.7 C96.7 52.2 94.7 51.6 93.7 50.5 C92.5 49.3 91.6 47.8 90.4 46.7 C89.4 45.8 88.2 45.1 87.1 44.4 C86.1 43.8 85.0 43.2 83.8 42.7 C82.8 42.2 81.7 41.8 80.6 41.4 C79.5 41.1 78.4 40.8 77.3 40.6 C76.2 40.3 75.1 40.1 74.0 39.9 C72.9 39.7 71.8 39.5 70.7 39.3 C69.6 39.1 68.6 38.8 67.5 38.6 C66.4 38.4 65.3 38.3 64.2 38.0 C63.1 37.8 62.0 37.5 60.9 37.2 C59.8 36.8 58.7 36.2 57.7 35.7 C56.6 35.3 55.0 35.2 54.4 34.3 C53.3 32.8 52.4 30.6 52.4 28.7 C52.4 26.8 53.4 24.7 54.4 23.1 C55.1 22.0 56.5 21.3 57.7 20.5 C58.7 19.8 59.8 19.0 60.9 18.4 C62.0 17.9 63.1 17.6 64.2 17.1 C65.3 16.7 66.4 16.2 67.5 15.9 C68.5 15.5 69.7 15.3 70.7 15.0 C71.8 14.7 72.9 14.4 74.0 14.1 C75.1 13.9 76.2 13.9 77.3 13.7 C78.4 13.5 79.5 13.0 80.6 12.9 C81.6 12.7 82.7 12.9 83.8 12.9 C84.9 12.9 86.0 12.9 87.1 12.9 C88.2 12.9 89.3 12.9 90.4 12.9 C91.5 12.9 92.6 12.9 93.7 12.9 C94.8 12.9 95.9 12.7 96.9 12.9 C98.0 13.0 99.1 13.5 100.2 13.7 C101.3 13.9 102.4 14.0 103.5 14.1 C104.6 14.3 105.7 14.4 106.8 14.6 C107.9 14.8 108.9 15.1 110.0 15.4 C111.1 15.7 112.2 16.0 113.3 16.3 C114.4 16.6 115.5 16.8 116.6 17.1 C117.7 17.4 118.8 17.7 119.8 18.0 C120.9 18.3 122.1 18.5 123.1 18.8 C124.2 19.2 125.3 19.7 126.4 20.1 C127.5 20.5 128.6 21.0 129.7 21.4 C130.7 21.7 131.9 21.9 132.9 22.2 C134.1 22.6 135.1 23.1 136.2 23.5 C137.3 24.0 138.4 24.4 139.5 24.8 C140.6 25.2 141.7 25.4 142.8 25.7 C143.9 25.9 144.9 26.3 146.0 26.5 C147.1 26.7 148.2 26.7 149.3 26.9 C150.4 27.2 151.5 27.6 152.6 27.8 C153.7 28.0 154.8 28.1 155.9 28.2 C156.9 28.3 158.0 28.2 159.1 28.2 C160.2 28.2 161.3 28.2 162.4 28.2 C163.5 28.2 164.6 28.3 165.7 28.2 C166.8 28.1 167.9 28.0 169.0 27.8 C170.1 27.6 171.1 27.2 172.2 26.9 C173.3 26.7 174.4 26.8 175.5 26.5 C176.6 26.2 177.7 25.6 178.8 25.2 C179.8 24.9 181.0 24.7 182.0 24.4 C183.1 24.1 184.3 23.9 185.3 23.5 C186.4 23.2 187.5 22.7 188.6 22.2 C189.7 21.8 190.8 21.4 191.9 21.0 C193.0 20.5 194.1 20.1 195.1 19.7 C196.2 19.3 197.3 18.8 198.4 18.4 C199.5 18.0 200.6 17.6 201.7 17.1 C202.8 16.7 203.9 16.3 205.0 15.9 C206.1 15.4 207.1 15.0 208.2 14.6 C209.3 14.1 210.4 13.7 211.5 13.3 C212.6 12.9 213.7 12.4 214.8 12.0 C215.9 11.7 217.0 11.4 218.1 11.2 C219.1 10.9 220.2 10.6 221.3 10.3 C222.4 10.0 223.5 9.7 224.6 9.5 C225.7 9.2 226.8 8.9 227.9 8.6 C229.0 8.3 230.1 8.0 231.2 7.8 C232.2 7.5 233.3 7.2 234.4 6.9 C235.5 6.6 236.6 6.3 237.7 6.0 C238.8 5.8 239.9 5.4 241.0 5.2 C242.0 5.0 243.2 5.0 244.2 4.8 C245.3 4.6 246.4 4.1 247.5 3.9 C248.6 3.7 249.7 3.7 250.8 3.5 C251.9 3.3 253.0 2.8 254.1 2.6 C255.1 2.5 256.3 2.8 257.3 2.6 C258.4 2.5 259.5 2.0 260.6 1.8 C261.7 1.6 262.8 1.4 263.9 1.4 C265.0 1.3 266.1 1.4 267.2 1.4 C268.3 1.4 269.3 1.4 270.4 1.4 C271.5 1.4 272.6 1.4 273.7 1.4 C274.8 1.4 275.9 1.4 277.0 1.4 C278.1 1.4 279.2 1.4 280.3 1.4 C281.3 1.4 282.4 1.4 283.5 1.4 C284.6 1.4 285.7 1.3 286.8 1.4 C287.9 1.4 289.0 1.6 290.1 1.8 C291.2 2.0 292.2 2.4 293.3 2.6 C294.4 2.8 295.5 2.9 296.6 3.1 C297.7 3.3 298.8 3.6 299.9 3.9 C301.0 4.2 302.1 4.4 303.2 4.8 C304.3 5.1 305.4 5.6 306.4 6.0 C307.5 6.5 308.6 6.9 309.7 7.3 C310.8 7.8 311.9 8.1 313.0 8.6 C314.1 9.1 315.2 9.7 316.3 10.3 C317.4 10.9 318.5 11.4 319.5 12.0 C320.7 12.7 321.8 13.4 322.8 14.1 C323.9 15.0 325.0 15.9 326.1 16.7 C327.2 17.6 328.3 18.3 329.4 19.3 C330.5 20.3 331.6 21.5 332.6 22.7 C333.8 23.9 334.8 25.2 335.9 26.5 C337.0 27.9 338.2 29.3 339.2 30.8 C340.4 32.8 342.2 34.8 342.5 37.2 C345.4 61.9 349.0 87.1 349.0 112.0 C349.0 129.2 345.2 146.4 342.5 163.4 C341.9 166.8 340.4 170.0 339.2 173.2 C338.2 175.7 337.1 178.1 335.9 180.4 C334.9 182.6 333.9 184.8 332.6 186.8 C331.7 188.4 330.4 189.7 329.4 191.1 C328.3 192.5 327.2 194.0 326.1 195.4 C325.0 196.7 323.9 197.9 322.8 199.2 C321.8 200.4 320.6 201.5 319.5 202.6 C318.4 203.7 317.4 205.0 316.3 206.0 C315.2 206.9 314.1 207.7 313.0 208.6 C311.9 209.4 310.8 210.3 309.7 211.1 C308.7 211.9 307.6 212.6 306.4 213.3 C305.4 213.9 304.3 214.4 303.2 215.0 C302.1 215.5 301.0 216.2 299.9 216.7 C298.8 217.2 297.7 217.5 296.6 218.0 C295.5 218.4 294.5 218.9 293.3 219.2 C292.3 219.6 291.2 219.8 290.1 220.1 C289.0 220.4 287.9 220.7 286.8 220.9 C285.7 221.1 284.6 221.3 283.5 221.4 C282.4 221.4 281.3 221.2 280.3 221.4 C279.1 221.5 278.1 222.0 277.0 222.2 C275.9 222.4 274.8 222.6 273.7 222.6 C272.6 222.7 271.5 222.6 270.4 222.6 C269.3 222.6 268.2 222.7 267.2 222.6 C266.1 222.6 265.0 222.4 263.9 222.2 C262.8 222.0 261.7 221.5 260.6 221.4 C259.5 221.2 258.4 221.4 257.3 221.4 C256.2 221.4 255.2 221.4 254.1 221.4 C253.0 221.3 251.9 221.1 250.8 220.9 C249.7 220.7 248.6 220.3 247.5 220.1 C246.4 219.9 245.3 219.9 244.2 219.7 C243.1 219.4 242.1 219.0 241.0 218.8 C239.9 218.6 238.8 218.6 237.7 218.4 C236.6 218.2 235.5 217.8 234.4 217.5 C233.3 217.2 232.2 217.0 231.2 216.7 C230.1 216.4 229.0 216.1 227.9 215.8 C226.8 215.5 225.7 215.3 224.6 215.0 C223.5 214.7 222.4 214.5 221.3 214.1 C220.2 213.8 219.2 213.2 218.1 212.8 C217.0 212.5 215.9 212.3 214.8 212.0 C213.7 211.6 212.6 211.1 211.5 210.7 C210.4 210.4 209.3 210.1 208.2 209.9 C207.1 209.6 206.0 209.3 205.0 209.0 C203.9 208.6 202.8 208.1 201.7 207.7 C200.6 207.3 199.5 206.8 198.4 206.4 C197.3 206.1 196.2 205.9 195.1 205.6 C194.0 205.2 193.0 204.7 191.9 204.3 C190.8 204.0 189.7 203.7 188.6 203.5 C187.5 203.2 186.4 203.0 185.3 202.6 C184.2 202.2 183.1 201.8 182.0 201.3 C181.0 200.9 179.9 200.4 178.8 200.0 C177.7 199.7 176.6 199.5 175.5 199.2 C174.4 198.9 173.3 198.6 172.2 198.3 C171.1 198.1 170.0 197.8 169.0 197.5 C167.9 197.2 166.8 196.9 165.7 196.6 C164.6 196.4 163.5 195.9 162.4 195.8 C161.3 195.6 160.2 195.9 159.1 195.8 C158.0 195.7 156.9 195.6 155.9 195.4 C154.8 195.1 153.7 194.7 152.6 194.5 C151.5 194.4 150.4 194.5 149.3 194.5 C148.2 194.5 147.1 194.4 146.0 194.5 C144.9 194.6 143.8 194.7 142.8 194.9 C141.7 195.2 140.6 195.6 139.5 195.8 C138.4 195.9 137.3 195.7 136.2 195.8 C135.1 195.9 134.0 196.0 132.9 196.2 C131.8 196.4 130.8 196.8 129.7 197.1 C128.6 197.3 127.5 197.3 126.4 197.5 C125.3 197.7 124.2 198.1 123.1 198.3 C122.0 198.6 120.9 198.9 119.8 199.2 C118.8 199.5 117.7 199.8 116.6 200.0 C115.5 200.3 114.4 200.6 113.3 200.9 C112.2 201.2 111.1 201.5 110.0 201.8 C108.9 202.0 107.8 202.3 106.8 202.6 C105.7 202.9 104.6 203.2 103.5 203.5 C102.4 203.7 101.3 204.0 100.2 204.3 C99.1 204.6 98.0 204.9 96.9 205.2 C95.8 205.4 94.8 205.8 93.7 206.0 C92.6 206.2 91.5 206.2 90.4 206.4 C89.3 206.7 88.2 207.0 87.1 207.3 C86.0 207.6 84.9 207.9 83.8 208.1 C82.8 208.4 81.6 208.4 80.6 208.6 C79.5 208.8 78.4 209.2 77.3 209.4 C76.2 209.6 75.1 209.8 74.0 209.9 C72.9 209.9 71.8 209.7 70.7 209.9 C69.6 210.0 68.6 210.5 67.5 210.7 C66.4 210.9 65.3 211.1 64.2 211.1 C63.1 211.2 62.0 211.1 60.9 211.1 C59.8 211.1 58.7 211.1 57.7 211.1 C56.6 211.1 55.5 211.1 54.4 211.1 C53.3 211.1 52.2 211.1 51.1 211.1 C50.0 211.1 48.9 211.1 47.8 211.1 C46.7 211.1 45.6 211.1 44.6 211.1 C43.5 211.1 42.4 211.1 41.3 211.1 C40.2 211.1 39.1 211.3 38.0 211.1 C36.9 211.0 35.8 210.5 34.7 210.3 C33.7 210.1 32.5 210.1 31.5 209.9 C30.4 209.6 29.3 209.3 28.2 209.0 C27.1 208.7 26.0 208.5 24.9 208.1 C23.8 207.8 22.7 207.3 21.6 206.9 C20.6 206.4 19.4 206.1 18.4 205.6 C17.2 205.0 16.2 204.2 15.1 203.5 C14.0 202.7 12.9 201.8 11.8 200.9 C10.7 199.9 9.3 199.1 8.5 197.9 C7.0 195.5 5.3 192.7 4.9 190.0 C4.7 188.3 5.8 185.8 6.9 184.7 C7.5 184.1 9.1 184.8 10.2 184.7 C11.3 184.6 12.4 184.1 13.5 183.9 C14.5 183.6 15.6 183.1 16.7 183.0 C17.8 182.9 18.9 183.0 20.0 183.0 C21.1 183.0 22.2 183.0 23.3 183.0 C24.4 183.0 25.5 183.1 26.6 183.0 C27.6 182.9 28.7 182.8 29.8 182.6 C30.9 182.4 32.0 181.9 33.1 181.7 C34.2 181.6 35.3 181.8 36.4 181.7 C37.5 181.6 38.6 181.6 39.6 181.3 C40.8 181.0 41.8 180.4 42.9 180.0 C44.0 179.6 45.1 179.2 46.2 178.7 C47.3 178.3 48.4 178.0 49.5 177.5 C50.6 176.9 51.7 176.1 52.7 175.3 C53.9 174.5 55.0 173.7 56.0 172.8 C57.1 171.8 58.5 171.0 59.3 169.8 C60.6 167.9 62.0 165.7 62.6 163.4 C64.2 157.1 64.7 150.5 65.8 144.0 L66 144 L70 80 Z';
/** The two cutaway edges (neck joint to horn tip), for the shading where the top rolls into them. */
const CUT_TREBLE =
  'M98.6 80.0 C98.0 71.2 98.3 62.1 96.9 53.7 C96.7 52.2 94.7 51.6 93.7 50.5 C92.5 49.3 91.6 47.8 90.4 46.7 C89.4 45.8 88.2 45.1 87.1 44.4 C86.1 43.8 85.0 43.2 83.8 42.7 C82.8 42.2 81.7 41.8 80.6 41.4 C79.5 41.1 78.4 40.8 77.3 40.6 C76.2 40.3 75.1 40.1 74.0 39.9 C72.9 39.7 71.8 39.5 70.7 39.3 C69.6 39.1 68.6 38.8 67.5 38.6 C66.4 38.4 65.3 38.3 64.2 38.0 C63.1 37.8 62.0 37.5 60.9 37.2 C59.8 36.8 58.7 36.2 57.7 35.7 C56.6 35.3 55.0 35.2 54.4 34.3 C53.3 32.8 53.1 30.6 52.4 28.7';
const CUT_BASS =
  'M4.9 190.0 C5.6 188.3 5.8 185.8 6.9 184.7 C7.5 184.1 9.1 184.8 10.2 184.7 C11.3 184.6 12.4 184.1 13.5 183.9 C14.5 183.6 15.6 183.1 16.7 183.0 C17.8 182.9 18.9 183.0 20.0 183.0 C21.1 183.0 22.2 183.0 23.3 183.0 C24.4 183.0 25.5 183.1 26.6 183.0 C27.6 182.9 28.7 182.8 29.8 182.6 C30.9 182.4 32.0 181.9 33.1 181.7 C34.2 181.6 35.3 181.8 36.4 181.7 C37.5 181.6 38.6 181.6 39.6 181.3 C40.8 181.0 41.8 180.4 42.9 180.0 C44.0 179.6 45.1 179.2 46.2 178.7 C47.3 178.3 48.4 178.0 49.5 177.5 C50.6 176.9 51.7 176.1 52.7 175.3 C53.9 174.5 55.0 173.7 56.0 172.8 C57.1 171.8 58.5 171.0 59.3 169.8 C60.6 167.9 62.0 165.7 62.6 163.4 C64.2 157.1 64.7 150.5 65.8 144.0';
/** The pickguard: one piece over the treble horn, round the pickups and the bridge, under the fretboard. */
const GUARD_PATH =
  'M67.5 25.7 C68.0 24.8 69.5 24.0 70.7 23.5 C72.3 22.8 74.0 22.5 75.7 22.2 C77.8 21.8 80.0 21.5 82.2 21.4 C85.5 21.2 88.7 21.1 92.0 21.2 C95.3 21.3 98.6 21.5 101.8 21.9 C104.0 22.2 106.2 22.7 108.4 23.2 C110.6 23.7 112.7 24.4 114.9 25.0 C117.1 25.6 119.3 26.0 121.5 26.6 C123.7 27.1 125.8 27.8 128.0 28.3 C130.2 28.9 132.4 29.3 134.6 29.9 C136.8 30.6 138.9 31.6 141.1 32.2 C143.3 32.8 145.5 33.2 147.7 33.7 C149.9 34.2 152.0 34.6 154.2 35.0 C156.4 35.4 158.6 35.7 160.8 36.0 C163.0 36.2 165.1 36.5 167.3 36.5 C168.9 36.5 170.6 36.2 172.2 36.0 C173.8 35.7 175.5 35.3 177.1 35.0 C179.3 34.6 181.5 34.2 183.7 33.7 C185.9 33.1 188.0 32.4 190.2 31.7 C192.4 31.0 194.6 30.2 196.8 29.4 C199.0 28.6 201.1 27.6 203.3 26.8 C205.5 26.0 207.7 25.3 209.9 24.5 C212.1 23.7 214.2 22.7 216.4 21.9 C218.6 21.0 220.8 20.2 223.0 19.4 C225.1 18.6 227.3 17.9 229.5 17.3 C231.7 16.7 233.9 16.2 236.1 15.6 C238.3 15.0 240.4 14.1 242.6 13.5 C245.3 12.8 248.1 12.2 250.8 11.7 C253.5 11.2 256.3 10.8 259.0 10.4 C261.2 10.1 263.3 9.8 265.5 9.7 C267.1 9.6 268.8 9.6 270.4 9.9 C271.8 10.2 273.2 10.8 274.5 11.5 C275.7 12.2 276.9 13.0 277.8 14.1 C278.5 15.0 279.3 16.2 279.3 17.3 C279.3 18.4 278.5 19.5 277.8 20.5 C277.1 21.5 276.1 22.2 275.3 23.1 C274.5 24.0 273.8 24.9 272.9 25.7 C271.6 26.9 270.2 27.8 268.8 28.9 C267.2 30.2 265.4 31.3 263.9 32.7 C262.4 34.1 261.2 35.7 259.8 37.2 C258.4 38.7 257.0 40.1 255.7 41.6 C254.5 43.0 253.4 44.5 252.4 46.1 C251.5 47.5 250.7 49.0 250.0 50.6 C249.3 52.2 248.8 54.0 248.3 55.7 C247.8 57.6 247.6 59.7 246.9 61.5 C246.2 63.3 245.2 64.9 244.2 66.6 C243.3 68.1 241.9 69.4 241.3 71.0 C240.6 72.6 240.3 74.4 240.3 76.2 C240.0 100.0 239.1 124.4 240.3 147.8 C240.4 149.7 243.2 150.6 244.2 152.3 C245.0 153.6 245.6 155.3 245.6 156.8 C245.5 158.5 244.8 160.4 243.9 161.9 C243.0 163.2 241.6 164.3 240.2 165.2 C238.7 166.2 236.9 167.1 235.2 167.8 C233.4 168.6 231.4 169.3 229.5 169.8 C227.4 170.4 225.2 170.8 223.0 171.1 C220.3 171.4 217.5 171.5 214.8 171.6 C212.1 171.6 209.3 171.6 206.6 171.4 C203.9 171.2 201.1 171.0 198.4 170.6 C196.2 170.3 194.0 169.8 191.9 169.3 C189.7 168.8 187.5 168.1 185.3 167.5 C183.1 166.9 181.0 166.2 178.8 165.5 C176.6 164.8 174.4 164.1 172.2 163.4 C170.0 162.8 167.9 162.2 165.7 161.6 C163.5 161.0 161.3 160.5 159.1 159.9 C156.9 159.4 154.8 158.7 152.6 158.3 C149.9 157.8 147.1 157.3 144.4 157.0 C141.1 156.7 137.9 156.5 134.6 156.4 C131.3 156.3 128.1 156.3 124.8 156.3 C121.5 156.4 118.2 156.5 114.9 156.7 C112.2 156.9 109.5 157.1 106.8 157.4 C104.1 157.7 101.3 158.0 98.6 158.4 C96.4 158.7 94.2 159.3 92.0 159.5 C90.4 159.7 88.6 160.0 87.1 159.6 C86.0 159.3 84.7 158.5 84.3 157.6 C83.8 156.5 83.9 154.9 84.2 153.6 C84.5 152.2 85.2 150.8 86.1 149.6 C87.0 148.3 88.2 147.0 89.6 146.3 C91.3 145.4 93.4 145.1 95.3 144.8 C98.5 144.3 104.7 146.9 105.1 144.0 C107.9 125.3 103.6 100.6 105.1 80.0 C105.2 78.0 108.9 77.8 110.0 76.2 C111.3 74.4 111.9 72.0 112.3 69.8 C112.7 67.3 112.5 64.7 112.3 62.1 C112.1 59.3 111.7 56.5 111.0 53.8 C110.4 51.6 109.5 49.4 108.4 47.4 C107.4 45.6 106.2 43.9 104.8 42.4 C103.5 41.0 101.8 39.7 100.2 38.6 C98.7 37.6 97.0 36.6 95.3 35.9 C93.2 35.0 91.0 34.3 88.8 33.6 C86.6 32.9 84.4 32.1 82.2 31.5 C80.1 30.9 77.9 30.5 75.7 30.0 C74.2 29.6 72.6 29.4 71.1 28.9 C70.2 28.6 69.2 28.2 68.5 27.6 C68.0 27.1 67.2 26.2 67.5 25.7 Z';

/** Six pole pieces under the strings, on a pickup running from (x1, y1) to (x2, y2). */
const along = (x1: number, y1: number, x2: number, y2: number, y: number) => x1 + ((x2 - x1) * (y - y1)) / (y2 - y1);

/** A single-coil pickup in a white cover with rounded ends; its two mounting screws sit just past the ends. */
function SingleCoil({ x1, y1, x2, y2, id }: { x1: number; y1: number; x2: number; y2: number; id: string }) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const half = Math.hypot(x2 - x1, y2 - y1) / 2;
  const tilt = (Math.atan2(x2 - x1, y1 - y2) * 180) / Math.PI;
  const lenHalf = half - 3.6;
  return (
    <g>
      <g transform={`rotate(${tilt} ${cx} ${cy})`}>
        <rect
          x={cx - 5.9}
          y={cy - lenHalf}
          width={11.8}
          height={lenHalf * 2}
          rx={5.6}
          ry={6.5}
          fill={`url(#${id}-cover)`}
          stroke="rgba(70,68,62,0.55)"
          strokeWidth={0.6}
          filter={`url(#${id}-lift)`}
        />
        <rect
          x={cx - 4.6}
          y={cy - lenHalf + 1.4}
          width={9.2}
          height={lenHalf * 2 - 2.8}
          rx={4.4}
          ry={5.2}
          fill="none"
          stroke="rgba(255,255,255,0.75)"
          strokeWidth={0.7}
        />
        {[cy - half, cy + half].map((sy) => (
          <Screw key={sy} x={cx} y={sy} id={id} />
        ))}
      </g>
      {STRING_AT.map((_, i) => (
        <circle
          key={i}
          cx={along(x1, y1, x2, y2, stringY(i)) + 0.1}
          cy={stringY(i) + 0.4}
          r={1.55}
          fill="#5c5d5c"
          stroke="#2c2d2d"
          strokeWidth={0.4}
        />
      ))}
    </g>
  );
}

/** A small chrome screw head with its slot. */
function Screw({ x, y, id, r = 1.7 }: { x: number; y: number; id: string; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-post)`} stroke="rgba(0,0,0,0.45)" strokeWidth={0.4} />
      <line x1={x - r * 0.65} x2={x + r * 0.65} y1={y + r * 0.2} y2={y - r * 0.2} stroke="#4a4f52" strokeWidth={0.45} />
    </g>
  );
}

/** A white hat knob drawn in the art (the third knob, a second tone control, does nothing here). */
function HatKnob({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g filter={`url(#${id}-lift)`}>
      <circle cx={x} cy={y} r={7.9} fill="#d9d7cf" stroke="rgba(60,58,52,0.6)" strokeWidth={0.6} />
      <circle cx={x} cy={y} r={5.6} fill={`url(#${id}-hat)`} stroke="rgba(120,116,106,0.6)" strokeWidth={0.5} />
      <line x1={x} x2={x} y1={y - 4.6} y2={y - 1.6} stroke="#3a3833" strokeWidth={0.9} strokeLinecap="round" />
    </g>
  );
}

/** Pickguard screws, read off the photo. */
const GUARD_SCREWS = [
  [77.3, 26.3],
  [114.1, 75.5],
  [90.4, 155.5],
  [164.9, 158.1],
  [175.5, 39.7],
  [217.2, 31.4],
  [242.6, 71.7],
  [242.6, 158.1],
  [272.1, 16.1],
] as const;
/** Pickups as their mounting-screw ends: neck and middle square to the strings, the bridge one slanted. */
const PICKUPS = [
  [128.9, 74.2, 128.9, 151.0],
  [174.7, 74.2, 174.7, 151.0],
  [221.3, 74.2, 211.5, 151.0],
] as const;
/** Where the two working knobs sit (Layout places the buttons over these): Volume, then Tone. */
export const KNOB_AT = {
  sound: [221.3, 62.1],
  view: [238.5, 40.4],
} as const;

/**
 * The body: gloss black with a white pickguard, three single-coil pickups, a vintage vibrato bridge with its arm,
 * a five-way switch, a third knob, an oval jack plate on the face and two strap buttons.
 */
export function GuitarBody() {
  const id = useId().replace(/:/g, '');
  const plateX = 238.5;
  const plateY = 67.2;
  const plateH = 150.4 - 67.2;
  const anchorX = 265.6;
  return (
    <svg className="body-art" width={BODY_W} height={ROW_H} viewBox={`0 0 ${BODY_W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <clipPath id={`${id}-clip`}>
          <path d={BODY_PATH} />
        </clipPath>
        <clipPath id={`${id}-guardclip`}>
          <path d={GUARD_PATH} />
        </clipPath>
        {/* Gloss black: the top is near black; the rounded edge catches a grey band of light, brightest along the
            upper edges, and the very edge falls back to black. */}
        <linearGradient id={`${id}-black`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#141415" />
          <stop offset="0.5" stopColor="#0a0a0b" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id={`${id}-roll`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={ROW_H}>
          <stop offset="0" stopColor="rgba(200,200,205,0.8)" />
          <stop offset="0.35" stopColor="rgba(150,150,156,0.48)" />
          <stop offset="0.65" stopColor="rgba(110,110,116,0.34)" />
          <stop offset="1" stopColor="rgba(150,150,156,0.48)" />
        </linearGradient>
        <linearGradient id={`${id}-guard`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#f6f6f4" />
          <stop offset="0.55" stopColor="#e9e9e7" />
          <stop offset="1" stopColor="#d6d6d3" />
        </linearGradient>
        <linearGradient id={`${id}-cover`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e4e2da" />
          <stop offset="0.4" stopColor="#fbfaf6" />
          <stop offset="1" stopColor="#d8d6cd" />
        </linearGradient>
        <radialGradient id={`${id}-hat`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#f1efe8" />
          <stop offset="1" stopColor="#cfccc2" />
        </radialGradient>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f8f8" />
          <stop offset="0.35" stopColor="#c4c9cb" />
          <stop offset="0.55" stopColor="#8e9497" />
          <stop offset="0.8" stopColor="#d9dcdd" />
          <stop offset="1" stopColor="#8a9093" />
        </linearGradient>
        <linearGradient id={`${id}-dish`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b5053" />
          <stop offset="0.6" stopColor="#9aa0a3" />
          <stop offset="1" stopColor="#d8dbdc" />
        </linearGradient>
        <linearGradient id={`${id}-saddle`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f3f2" />
          <stop offset="0.5" stopColor="#b9bdbe" />
          <stop offset="1" stopColor="#7c8285" />
        </linearGradient>
        <linearGradient id={`${id}-rosewood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f1d13" />
          <stop offset="0.55" stopColor="#24160e" />
          <stop offset="1" stopColor="#1a0f09" />
        </linearGradient>
        <filter
          id={`${id}-roll-blur`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={-10}
          y={-10}
          width={BODY_W + 20}
          height={ROW_H + 20}
        >
          <feGaussianBlur stdDeviation="2.2" />
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
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
        <filter id={`${id}-sheen`} colorInterpolationFilters="sRGB" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={`${id}-lift`} colorInterpolationFilters="sRGB" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0.4" dy="1" stdDeviation="0.8" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="drop-shadow(0 6px 8px rgba(0,0,0,0.55))">
        <path d={BODY_PATH} fill={`url(#${id}-black)`} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        {/* A broad, soft reflection across the lower bout, as gloss shows under room light. */}
        <ellipse cx={300} cy={176} rx={44} ry={16} fill="rgba(255,255,255,0.05)" filter={`url(#${id}-sheen)`} />
        {/* The rolled edge: a band of light just inside the outline, then the outline itself in shadow. */}
        <path d={BODY_PATH} fill="none" stroke={`url(#${id}-roll)`} strokeWidth={11} filter={`url(#${id}-roll-blur)`} />
        <path d={BODY_PATH} fill="none" stroke="#020202" strokeWidth={3.6} filter={`url(#${id}-rim)`} />
        {[CUT_TREBLE, CUT_BASS].map((d) => (
          <path key={d} d={d} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={3} filter={`url(#${id}-rim)`} />
        ))}
      </g>
      <path d={BODY_PATH} fill="none" stroke="rgba(70,70,74,0.9)" strokeWidth={0.7} />
      {/* Strap buttons: the tip of the bass horn and the end of the body. */}
      {[
        [4.6, 187.4],
        [347.2, 112.6],
      ].map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={3.3} fill="#1b1b1c" />
          <circle cx={cx} cy={cy} r={2.5} fill={`url(#${id}-post)`} />
        </g>
      ))}
      {/* The pickguard: white, with the black middle ply showing as a thin line on its bevelled edge. */}
      <g filter="drop-shadow(0 1px 1.2px rgba(0,0,0,0.7))">
        <path d={GUARD_PATH} fill={`url(#${id}-guard)`} />
      </g>
      <g clipPath={`url(#${id}-guardclip)`}>
        <path d={GUARD_PATH} fill="none" stroke="rgba(120,120,118,0.55)" strokeWidth={3.4} />
        <path d={GUARD_PATH} fill="none" stroke="#2b2b2b" strokeWidth={1.5} />
      </g>
      {GUARD_SCREWS.map(([x, y]) => (
        <Screw key={`${x}-${y}`} x={x} y={y} id={id} />
      ))}
      {/* The oval jack plate on the face, angled along the treble edge. */}
      <g transform="rotate(-45.5 289.3 39.1)" filter={`url(#${id}-lift)`}>
        <ellipse cx={289.3} cy={39.1} rx={26} ry={9.4} fill={`url(#${id}-chrome)`} stroke="#3d4144" strokeWidth={0.6} />
        <ellipse
          cx={290.3}
          cy={39.1}
          rx={14}
          ry={4.4}
          fill={`url(#${id}-dish)`}
          stroke="rgba(30,32,34,0.7)"
          strokeWidth={0.5}
        />
        <ellipse cx={293} cy={39.1} rx={3.4} ry={2.6} fill="#202325" stroke="#a9aeb0" strokeWidth={0.8} />

        <circle cx={268} cy={39.1} r={1.5} fill="#6f7578" stroke="#2f3436" strokeWidth={0.4} />
        <circle cx={310.6} cy={39.1} r={1.5} fill="#6f7578" stroke="#2f3436" strokeWidth={0.4} />
      </g>
      {/* The five-way switch: a slot in the guard with its white tip. */}
      <g transform="rotate(-39.9 208.3 38.1)">
        <rect x={199.6} y={36.8} width={17.4} height={2.6} rx={1.3} fill="#2d2c2a" />
        <rect
          x={204.4}
          y={35.3}
          width={7.6}
          height={5.6}
          rx={2.4}
          fill={`url(#${id}-hat)`}
          filter={`url(#${id}-lift)`}
        />
      </g>
      <HatKnob x={263.1} y={19.3} id={id} />
      {/* The fretboard runs on over the body, under the guard's edge, with its last frets. */}
      <rect
        x={70}
        y={NECK_TOP}
        width={112.5 - 70}
        height={NECK_H}
        fill={`url(#${id}-rosewood)`}
        filter="drop-shadow(0.5px 0 1.5px rgba(0,0,0,0.6))"
      />
      {[78, 87, 96, 105].map((x) => (
        <rect key={x} x={x} y={NECK_TOP} width={1.2} height={NECK_H} fill="#c9cdcf" opacity={0.8} />
      ))}
      <rect x={111.5} y={NECK_TOP} width={1} height={NECK_H} fill="rgba(0,0,0,0.5)" />
      {PICKUPS.map(([x1, y1, x2, y2]) => (
        <SingleCoil key={x1} x1={x1} y1={y1} x2={x2} y2={y2} id={id} />
      ))}
      {/* Vintage vibrato: a chrome plate with six pivot screws along its front edge, a bent-steel saddle per
          string with its two height screws, and the strings through the body behind them. */}
      <g filter={`url(#${id}-lift)`}>
        <rect
          x={plateX}
          y={plateY}
          width={31}
          height={plateH}
          rx={2}
          fill={`url(#${id}-chrome)`}
          stroke="#3d4144"
          strokeWidth={0.6}
        />
      </g>
      {Array.from({ length: 6 }, (_, k) => (
        <Screw key={k} x={plateX + 2.8} y={plateY + 4 + ((plateH - 8) * k) / 5} id={id} r={1.4} />
      ))}
      {STRING_AT.map((_, i) => {
        const y = stringY(i);
        return (
          <g key={i}>
            <rect
              x={244.5}
              y={y - 4.4}
              width={15.5}
              height={8.8}
              rx={1.2}
              fill={`url(#${id}-saddle)`}
              stroke="#4c5255"
              strokeWidth={0.5}
            />
            <rect x={246.5} y={y - 0.9} width={11.5} height={1.8} fill="rgba(40,44,46,0.55)" />
            <circle cx={248} cy={y - 2.7} r={0.9} fill="#2c3032" />
            <circle cx={248} cy={y + 2.7} r={0.9} fill="#2c3032" />
            <path d={`M260 ${y - 1.4} l1.2 2.8 l1.2 -2.8 l1.2 2.8`} fill="none" stroke="#3b3f41" strokeWidth={0.7} />
            <rect x={264.4} y={y - 2.3} width={3.6} height={4.6} rx={0.8} fill="#2a2d2f" />
          </g>
        );
      })}
      <Strings id={id} from={0} to={anchorX} />
      {/* The vibrato arm: from the bridge's treble corner, bent up and back over the guard, with a white tip. */}
      <g filter={`url(#${id}-lift)`}>
        <circle cx={249.2} cy={65.9} r={2.6} fill={`url(#${id}-post)`} stroke="#3d4144" strokeWidth={0.5} />
        <path
          d="M249.2 65.9 L216.4 47.3 Q213.1 45.5 209 45.6 L196 46"
          fill="none"
          stroke="#dfe2e3"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <path
          d="M249.2 65.9 L216.4 47.3"
          fill="none"
          stroke="#7d8487"
          strokeWidth={0.6}
          transform="translate(0.4 0.8)"
        />
        <line x1={193} y1={46.1} x2={210} y2={45.6} stroke="#cfccc3" strokeWidth={4.6} strokeLinecap="round" />
        <line x1={193} y1={45.5} x2={210} y2={45} stroke="#f8f7f2" strokeWidth={2.6} strokeLinecap="round" />
      </g>
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
