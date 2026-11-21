/**
 * The navigation is a guitar lying across the top of the page: the headstock is the home link, the neck holds
 * the steps and tools on its frets (ui/Layout.tsx), and the body carries the controls as knobs.
 *
 * The body is modelled on a classic triple single-coil solid body in gloss black: white pickguard, three white
 * single-coil pickups (the bridge one slanted), a two-point vibrato bridge, three cream hat knobs, a five-way switch
 * and an oval jack plate on the face. The neck stays unbound rosewood and the headstock a black 3 + 3. The outlines
 * are our own tracings, and the inlays stay the app's pearl dots (no maker's logo, sticker or inlays).
 *
 * The headstock is drawn to a 224 px row and the body to a taller 304 px one, both centred on the same neck line:
 * the neck is 64 px tall (y 80–144 in the headstock, 120–184 in the body), so the six strings run unbroken from the
 * tuners, over the frets, to the bridge.
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
export const HEADSTOCK_W = 228;

/**
 * Traced from the user's 3 + 3 reference photo at 0.8 px per photo pixel, so its neck matches our 64 px neck
 * (scripts/guitar-trace/headstock.py). Two pointed ears flare from the nut; the top and bottom edges run back to a
 * blunt tip that is concave above and nearly straight below.
 */
const HEAD_PATH =
  'M222.4 80.0 C221.1 80.1 219.7 80.4 218.4 80.2 C215.7 79.8 212.9 79.0 210.4 78.0 C207.6 76.8 204.9 75.3 202.4 73.6 C199.3 71.5 196.2 69.1 193.6 66.4 C191.1 63.8 189.2 60.6 187.2 57.6 C185.3 54.8 183.8 51.7 182.0 48.8 C180.9 47.1 179.6 45.6 178.4 44.0 C177.1 44.3 175.7 44.6 174.4 45.0 C170.4 46.1 166.3 47.0 162.4 48.4 C155.6 50.8 149.2 54.1 142.4 56.4 C137.2 58.2 131.8 59.5 126.4 60.8 C118.4 62.7 110.5 64.6 102.4 66.0 C94.5 67.4 86.4 68.3 78.4 69.2 C70.4 70.1 62.4 70.7 54.4 71.2 C46.4 71.7 38.4 71.9 30.4 72.2 C23.7 72.4 17.1 72.4 10.4 72.6 C7.7 72.7 5.0 72.6 2.4 73.0 C1.6 73.1 1.0 73.7 0.3 74.0 C1.5 75.7 2.8 77.5 4.0 79.2 C5.9 81.9 7.7 84.6 9.6 87.2 C11.6 89.9 13.9 92.4 15.7 95.2 C17.3 97.7 18.8 100.4 20.0 103.2 C21.1 105.8 21.8 108.5 22.4 111.2 C23.0 113.8 23.4 116.5 23.7 119.2 C24.0 121.9 24.0 124.5 24.0 127.2 C24.0 129.9 23.8 132.6 23.5 135.2 C23.1 137.9 22.5 140.5 21.9 143.2 C21.5 145.1 20.8 146.9 20.4 148.8 C20.1 150.0 19.9 151.2 19.7 152.4 C20.6 152.5 21.5 152.8 22.4 152.8 C27.7 153.1 33.1 153.1 38.4 153.3 C43.7 153.5 49.1 153.7 54.4 154.1 C62.4 154.6 70.4 155.2 78.4 156.0 C86.4 156.8 94.4 157.7 102.4 158.8 C110.4 159.9 118.5 161.1 126.4 162.8 C131.8 163.9 137.1 165.6 142.4 167.2 C147.8 168.8 153.1 170.6 158.4 172.4 C162.4 173.8 166.4 175.2 170.4 176.8 C173.1 177.9 175.7 179.2 178.4 180.4 C179.5 178.1 180.6 175.9 181.6 173.6 C183.0 170.2 183.9 166.5 185.6 163.2 C187.5 159.3 189.5 155.1 192.4 152.0 C195.1 149.1 198.8 146.9 202.4 145.2 C205.5 143.8 209.0 143.0 212.4 142.8 C215.7 142.6 219.1 143.6 222.4 144.0 L228 144 L228 80 Z';
/** Tuner posts: the rows converge toward the tip, and each string takes the post that keeps it clear of the others. */
const POSTS_TOP = [
  { x: 54.4, y: 96.6 },
  { x: 105.0, y: 87.2 },
  { x: 156.2, y: 77.8 },
] as const;
const POSTS_BOTTOM = [
  { x: 155.8, y: 146.4 },
  { x: 105.0, y: 137.8 },
  { x: 53.8, y: 129.0 },
] as const;
/** Tuner keys as boxes (x0, y0, x1, y1), top row then bottom row, each from the tip toward the nut. */
const KEYS = [
  [40.6, 44.6, 71.8, 65.8],
  [90.4, 36.6, 122.4, 58.4],
  [140.8, 27.2, 172.0, 49.6],
  [39.2, 153.6, 71.2, 179.2],
  [89.6, 159.2, 121.6, 186.4],
  [140.0, 171.2, 172.0, 196.0],
] as const;

/**
 * A gloss black 3 + 3 headstock with chrome tuners: boxy keys on short stems, big round bushings, a dark nut and
 * the CAGED Lab logo where a maker's signature would go.
 */
export function Headstock() {
  const id = useId().replace(/:/g, '');
  const W = HEADSTOCK_W;
  const posts = [...POSTS_TOP, ...POSTS_BOTTOM];
  return (
    <svg className="headstock-art" width={W} height={ROW_H} viewBox={`0 0 ${W} ${ROW_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0.25" y2="1">
          <stop offset="0" stopColor="#2c2c2e" />
          <stop offset="0.45" stopColor="#1d1d1f" />
          <stop offset="1" stopColor="#141415" />
        </linearGradient>
        <clipPath id={`${id}-hclip`}>
          <path d={HEAD_PATH} />
        </clipPath>
        <radialGradient id={`${id}-bush`} cx="0.36" cy="0.3" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#d5d9da" />
          <stop offset="0.75" stopColor="#7d8386" />
          <stop offset="1" stopColor="#3c4143" />
        </radialGradient>
        <linearGradient id={`${id}-keyface`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#e4e3e0" />
          <stop offset="0.25" stopColor="#c9c7c3" />
          <stop offset="0.85" stopColor="#b3b1ad" />
          <stop offset="1" stopColor="#8d8b87" />
        </linearGradient>
        <radialGradient id={`${id}-recess`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2a2c2d" />
          <stop offset="0.8" stopColor="#3c3f41" />
          <stop offset="1" stopColor="#151617" />
        </radialGradient>
        <linearGradient id={`${id}-stem`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9a9278" />
          <stop offset="0.45" stopColor="#e6dfc6" />
          <stop offset="1" stopColor="#6f6a58" />
        </linearGradient>
        <filter id={`${id}-hsoft`} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>
      {/* Tuner keys, drawn first so their stems run in under the edge: polished chrome boxes whose inner end comes
          to a shallow point at the stem. The face toward the tip catches the light, the face toward the nut
          reflects the black, and a bright rim runs over the top and down the outer corner. */}
      {KEYS.map(([x0, y0, x1, y1], i) => {
        const top = i < 3;
        const apex = x0 + (x1 - x0) * 0.52;
        // Outer edge (away from the headstock) and inner edge (toward it), and the point at the stem.
        const yo = top ? y0 : y1;
        const yi = top ? y1 - 4 : y0 + 4;
        const yp = top ? y1 : y0;
        const r = 4;
        const ro = top ? r : -r;
        const outline =
          `M${x0} ${yi} V${yo + ro} Q${x0} ${yo} ${x0 + r} ${yo} H${x1 - r} Q${x1} ${yo} ${x1} ${yo + ro} ` +
          `V${yi} L${apex} ${yp} Z`;
        const light = `M${x0} ${yi} V${yo + ro} Q${x0} ${yo} ${x0 + r} ${yo} H${apex} V${yp} Z`;
        return (
          <g key={i} filter="drop-shadow(0 1.5px 1.5px rgba(0,0,0,0.6))">
            <rect x={apex - 2.6} y={top ? y1 - 1 : y0 - 7} width={5.2} height={8} fill={`url(#${id}-stem)`} />
            <rect
              x={apex - 3.6}
              y={top ? y1 + 0.6 : y0 - 3.4}
              width={7.2}
              height={2.8}
              rx={1}
              fill={`url(#${id}-stem)`}
            />
            <path d={outline} fill="#0d0d0e" />
            <path d={light} fill={`url(#${id}-keyface)`} />
            <path d={outline} fill="none" stroke="rgba(235,236,236,0.85)" strokeWidth={0.9} />
            <path d={`M${x0} ${yi} L${apex} ${yp} L${x1} ${yi}`} fill="none" stroke="#c9a56c" strokeWidth={0.9} />
          </g>
        );
      })}
      <g filter="drop-shadow(0 3px 4px rgba(0,0,0,0.5))">
        <path d={HEAD_PATH} fill={`url(#${id}-gloss)`} />
      </g>
      <g clipPath={`url(#${id}-hclip)`}>
        {/* Gloss: a broad soft reflection across the face, and the bevelled edge catching the light. */}
        <ellipse cx={120} cy={104} rx={70} ry={20} fill="rgba(255,255,255,0.05)" filter={`url(#${id}-hsoft)`} />
        <path d={HEAD_PATH} fill="none" stroke="rgba(150,150,154,0.35)" strokeWidth={2.4} />
      </g>
      {/* The top edge and the treble ear catch a thin line of light; the bass ear a warmer glint. */}
      <path
        d="M0.6 73.8 C30 72.2 80 69.5 126 60.8 C150 55 165 48 178.4 44 C186 55 196 70 212 78.6"
        fill="none"
        stroke="rgba(225,225,228,0.75)"
        strokeWidth={0.8}
      />
      <path d="M178.4 180.4 C181 175 183.5 168 186 162.5" fill="none" stroke="rgba(214,150,86,0.8)" strokeWidth={1} />
      {/* Logo along the centre line, between the strings: the five shape colours, then the name. */}
      {['--c-shape', '--a-shape', '--g-shape', '--e-shape', '--d-shape'].map((v, i) => (
        <circle
          key={v}
          cx={66 + i * 6.5}
          cy={112.6}
          r={2.6}
          opacity={0.9}
          fill={`var(${v})`}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth={0.5}
        />
      ))}
      <text x={98} y={117} className="headstock-name" textLength={52} lengthAdjust="spacingAndGlyphs">
        CAGED Lab
      </text>
      {/* The truss-rod access screw. */}
      <circle cx={156.2} cy={113.4} r={1.9} fill={`url(#${id}-post)`} stroke="rgba(0,0,0,0.6)" strokeWidth={0.4} />
      <Strings
        id={id}
        from={(i) => (i < 3 ? POSTS_TOP[2 - i]!.x : POSTS_BOTTOM[5 - i]!.x)}
        fromY={(i) => (i < 3 ? POSTS_TOP[2 - i]!.y + 3 : POSTS_BOTTOM[5 - i]!.y - 3)}
        to={W - 7}
      />
      {/* Tuner bushings: a bright chrome collar round a dark recess, a ring of light inside it, and the post with
          the string wound on. */}
      {posts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y + 0.9} r={10.5} fill="rgba(0,0,0,0.5)" />
          <circle cx={p.x} cy={p.y} r={10.2} fill={`url(#${id}-bush)`} />
          <circle cx={p.x} cy={p.y} r={8.1} fill={`url(#${id}-recess)`} />
          <circle cx={p.x} cy={p.y} r={5.6} fill="none" stroke="rgba(225,228,229,0.85)" strokeWidth={1.1} />
          <circle cx={p.x} cy={p.y} r={3.9} fill="none" stroke="#6b7174" strokeWidth={1.4} />
          <circle cx={p.x} cy={p.y} r={2.5} fill={`url(#${id}-post)`} />
          <circle cx={p.x + 0.4} cy={p.y + 0.3} r={0.9} fill="#151718" />
        </g>
      ))}
      {/* A dark nut. */}
      <rect
        x={W - 8}
        y={NECK_TOP - 1}
        width={8}
        height={NECK_H + 2}
        fill="#2b2b2c"
        stroke="#5c5d5f"
        strokeWidth={0.6}
      />
      <rect x={W - 7} y={NECK_TOP} width={1.4} height={NECK_H} fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}

/* ---------------- Body ---------------- */
/** The body is drawn larger than the row the headstock and neck sit in, so it keeps a guitar's proportions to them:
 * the guitar's row is BODY_H tall and the neck is centred in it. */
export const BODY_W = 414;
export const BODY_H = 304;
/** How far the body reaches back over the end of the neck: the neck runs on between the horns, under the fretboard
 * drawn here, so the nav's last fret items can sit between the horns. */
export const BODY_OVERLAP = 58;
const BODY_NECK_TOP = BODY_H / 2 - NECK_H / 2;
const bodyStringY = (i: number) => BODY_NECK_TOP + NECK_H * STRING_AT[i]!;

/**
 * Traced from the reference photo by scripts/guitar-trace/body.py: the silhouette and pickguard come off the photo's
 * pixels, then are mapped onto this guitar at 0.47 px per photo pixel along the neck and 0.441 across it, eased so the
 * fretboard is our 64 px neck. A long bass horn, a shorter treble horn, deep rounded cutaways, a waist and a full
 * lower bout.
 */
const BODY_PATH =
  'M100.0 118.1 C101.2 116.7 102.5 115.4 103.6 113.9 C104.5 112.8 105.3 111.6 105.9 110.3 C106.7 108.5 107.4 106.5 107.9 104.5 C108.4 102.4 108.7 100.2 108.9 98.0 C109.0 96.5 108.9 95.1 108.9 93.6 C108.9 92.2 109.0 90.7 108.9 89.3 C108.7 87.1 108.4 84.9 107.9 82.7 C107.4 80.8 106.7 78.8 105.9 77.0 C105.2 75.2 104.4 73.5 103.3 71.9 C102.0 70.0 100.5 68.3 98.9 66.7 C98.1 65.9 97.0 65.3 96.0 64.6 C95.1 64.0 94.1 63.4 93.1 62.9 C91.3 62.0 89.5 61.3 87.6 60.6 C86.1 60.0 84.5 59.6 82.9 59.2 C80.9 58.7 78.8 58.2 76.8 57.8 C75.5 57.6 74.3 57.5 73.0 57.3 C71.7 57.1 70.4 57.0 69.2 56.7 C67.0 56.2 64.7 55.7 62.6 54.9 C61.4 54.4 60.3 53.6 59.3 52.7 C58.7 52.2 58.1 51.4 57.7 50.7 C57.3 50.0 56.9 49.3 56.7 48.5 C56.3 47.1 56.0 45.6 56.0 44.1 C56.1 42.5 56.5 40.9 57.0 39.4 C57.3 38.5 58.0 37.7 58.5 36.9 C58.9 36.3 59.4 35.6 59.9 35.1 C60.6 34.4 61.3 33.8 62.1 33.2 C63.2 32.4 64.3 31.7 65.5 31.1 C67.2 30.3 68.9 29.5 70.7 28.9 C72.5 28.3 74.4 28.1 76.2 27.7 C78.1 27.3 79.9 26.8 81.8 26.5 C83.1 26.3 84.4 26.1 85.7 26.0 C87.0 25.8 88.4 25.7 89.7 25.6 C91.5 25.5 93.3 25.6 95.1 25.6 C96.9 25.6 98.6 25.5 100.4 25.6 C101.9 25.7 103.4 25.8 104.9 26.0 C106.4 26.1 107.8 26.3 109.3 26.5 C110.9 26.7 112.6 27.1 114.2 27.4 C115.8 27.7 117.5 28.0 119.1 28.4 C120.9 28.8 122.7 29.4 124.5 29.9 C126.3 30.4 128.1 30.9 129.9 31.4 C131.7 31.9 133.5 32.4 135.3 33.0 C137.6 33.8 139.8 34.7 142.0 35.5 C144.2 36.4 146.5 37.2 148.7 38.1 C149.9 38.6 151.0 39.1 152.2 39.6 C153.3 40.1 154.4 40.7 155.6 41.2 C156.9 41.7 158.2 42.1 159.5 42.5 C160.8 42.9 162.0 43.5 163.3 43.8 C164.7 44.1 166.2 44.3 167.6 44.5 C169.1 44.8 170.5 45.1 172.0 45.3 C174.2 45.6 176.3 45.8 178.5 45.8 C180.5 45.8 182.5 45.5 184.5 45.3 C185.7 45.1 187.0 44.8 188.2 44.6 C189.5 44.4 190.8 44.2 192.0 43.9 C194.4 43.3 196.7 42.5 199.0 41.7 C201.0 41.0 202.9 40.1 204.9 39.3 C206.9 38.5 208.9 37.8 210.9 37.0 C212.7 36.2 214.5 35.3 216.3 34.5 C218.1 33.7 220.0 32.8 221.8 32.0 C223.6 31.2 225.4 30.3 227.2 29.5 C229.0 28.7 230.8 27.8 232.6 27.0 C234.4 26.2 236.2 25.3 238.0 24.5 C240.1 23.6 242.3 22.8 244.4 22.0 C246.5 21.1 248.7 20.3 250.8 19.4 C252.9 18.6 255.1 17.7 257.2 16.9 C259.3 16.1 261.5 15.4 263.6 14.6 C265.8 13.8 267.9 12.9 270.1 12.2 C272.2 11.5 274.3 11.1 276.4 10.5 C278.5 9.9 280.6 9.4 282.7 8.8 C284.8 8.2 286.9 7.6 289.0 7.1 C290.7 6.7 292.5 6.5 294.2 6.2 C295.9 5.9 297.6 5.5 299.3 5.3 C301.7 5.0 304.2 4.8 306.6 4.6 C309.0 4.4 311.5 4.1 313.9 4.0 C316.3 3.9 318.7 4.0 321.1 4.0 C323.5 4.0 326.0 3.8 328.4 3.9 C329.9 4.0 331.5 4.2 333.0 4.4 C334.6 4.6 336.2 4.6 337.7 4.9 C339.4 5.2 341.1 5.7 342.8 6.1 C344.5 6.5 346.3 6.8 348.0 7.2 C349.4 7.6 350.7 8.1 352.0 8.5 C353.3 8.9 354.7 9.3 356.0 9.8 C358.0 10.6 359.9 11.4 361.8 12.3 C363.4 13.1 364.9 14.0 366.4 14.8 C367.9 15.6 369.5 16.4 371.0 17.3 C372.6 18.3 374.1 19.6 375.6 20.7 C377.1 21.8 378.7 22.9 380.2 24.1 C381.4 25.1 382.4 26.2 383.5 27.2 C384.6 28.2 385.8 29.2 386.8 30.3 C388.4 32.1 389.8 34.0 391.2 35.9 C392.0 37.0 392.9 38.2 393.6 39.4 C394.4 40.7 395.1 42.1 395.8 43.4 C396.6 44.8 397.4 46.1 398.1 47.5 C399.2 49.6 400.2 51.7 401.1 53.9 C401.6 55.1 402.0 56.4 402.4 57.6 C402.8 58.8 403.3 60.0 403.7 61.2 C404.2 62.7 404.6 64.3 405.0 65.8 C405.4 67.3 405.9 68.8 406.2 70.3 C406.7 72.6 407.1 74.8 407.5 77.1 C407.9 79.4 408.4 81.7 408.7 84.0 C409.0 85.9 409.1 87.9 409.2 89.8 C409.3 91.8 409.2 93.7 409.3 95.7 C409.4 96.8 409.7 97.8 409.7 98.9 C409.8 100.8 409.7 102.7 409.7 104.6 C409.7 106.6 409.7 108.5 409.7 110.5 C409.7 112.6 409.6 114.6 409.7 116.7 C409.8 118.2 410.1 119.6 410.2 121.1 C410.3 123.3 410.2 125.6 410.2 127.8 C410.2 130.2 410.2 132.7 410.2 135.1 C410.2 136.1 410.2 137.1 410.0 138.1 C409.9 138.4 409.7 138.6 409.5 138.8 C409.0 139.1 408.1 139.1 407.8 139.6 C407.4 140.1 407.4 141.1 407.4 141.8 C407.3 144.8 407.4 147.7 407.4 150.7 C407.4 153.7 407.4 156.6 407.4 159.6 C407.4 162.5 407.3 165.3 407.4 168.2 C407.4 168.7 407.5 169.3 407.8 169.7 C408.2 170.3 409.2 170.6 409.5 171.2 C409.8 171.8 409.7 172.7 409.7 173.4 C409.7 175.2 409.7 177.0 409.7 178.8 C409.7 180.5 409.8 182.3 409.7 184.0 C409.6 185.3 409.3 186.5 409.3 187.8 C409.2 190.1 409.3 192.4 409.3 194.7 C409.3 196.9 409.3 199.1 409.2 201.3 C409.1 202.4 408.9 203.5 408.8 204.6 C408.7 206.1 408.8 207.5 408.8 209.0 C408.8 210.4 408.9 211.9 408.8 213.3 C408.7 214.8 408.5 216.3 408.3 217.8 C408.0 220.0 407.5 222.1 407.1 224.3 C406.7 226.4 406.4 228.6 405.9 230.7 C405.6 232.1 405.0 233.4 404.6 234.8 C404.2 236.2 403.9 237.6 403.4 239.0 C402.9 240.4 402.3 241.8 401.8 243.2 C401.2 244.6 400.7 246.0 400.1 247.4 C399.5 248.8 398.8 250.1 398.2 251.4 C397.6 252.7 397.0 254.0 396.3 255.3 C395.4 257.0 394.5 258.6 393.5 260.2 C392.3 262.1 390.8 263.9 389.5 265.7 C388.2 267.5 386.9 269.4 385.5 271.2 C384.8 272.1 384.1 272.9 383.4 273.7 C382.3 274.8 381.2 275.8 380.1 276.9 C379.0 278.0 377.9 279.1 376.7 280.1 C375.7 281.0 374.6 281.8 373.5 282.6 C372.4 283.5 371.4 284.4 370.3 285.2 C369.3 285.9 368.2 286.5 367.1 287.2 C366.0 287.9 365.0 288.7 363.9 289.3 C362.1 290.4 360.2 291.5 358.3 292.4 C356.5 293.3 354.6 293.9 352.7 294.7 C350.8 295.4 349.0 296.2 347.1 296.9 C345.8 297.3 344.4 297.7 343.1 298.0 C341.7 298.4 340.4 298.8 339.0 299.0 C337.1 299.3 335.1 299.5 333.2 299.7 C331.3 300.0 329.3 300.3 327.4 300.5 C324.9 300.7 322.4 300.9 319.9 301.0 C318.1 301.1 316.2 301.0 314.4 300.9 C312.3 300.8 310.2 300.5 308.1 300.3 C306.0 300.1 304.0 299.9 301.9 299.7 C299.8 299.5 297.7 299.4 295.6 299.1 C293.9 298.9 292.2 298.5 290.5 298.2 C288.8 297.9 287.1 297.7 285.4 297.3 C283.4 296.9 281.5 296.4 279.5 295.9 C277.6 295.4 275.6 295.0 273.7 294.5 C272.0 294.0 270.4 293.5 268.7 293.0 C267.1 292.5 265.4 292.0 263.8 291.5 C262.1 291.0 260.5 290.5 258.8 290.0 C257.4 289.5 256.1 289.0 254.7 288.5 C253.3 288.0 252.0 287.6 250.6 287.1 C248.7 286.4 246.9 285.6 245.0 284.9 C243.1 284.1 241.3 283.4 239.4 282.6 C237.5 281.9 235.7 281.1 233.8 280.4 C231.9 279.7 230.1 279.0 228.2 278.2 C226.2 277.4 224.2 276.5 222.2 275.7 C220.2 274.9 218.2 274.0 216.2 273.2 C214.2 272.4 212.3 271.5 210.3 270.7 C208.3 269.9 206.3 269.0 204.3 268.2 C202.3 267.4 200.4 266.5 198.4 265.7 C196.4 264.9 194.4 263.9 192.4 263.2 C190.9 262.7 189.4 262.3 187.9 261.9 C186.4 261.5 185.0 260.9 183.5 260.6 C181.4 260.1 179.3 259.8 177.2 259.4 C175.1 259.0 173.0 258.4 170.9 258.2 C168.9 258.0 166.9 258.3 164.9 258.2 C164.1 258.2 163.3 257.8 162.5 257.8 C160.9 257.8 159.4 257.9 157.8 258.0 C156.3 258.1 154.7 258.0 153.2 258.2 C151.0 258.5 148.8 259.0 146.6 259.4 C144.4 259.8 142.2 260.0 140.1 260.5 C137.7 261.1 135.4 261.9 133.1 262.6 C130.8 263.3 128.4 263.9 126.1 264.6 C123.8 265.2 121.5 265.9 119.2 266.5 C116.9 267.1 114.5 267.7 112.2 268.3 C109.9 268.9 107.5 269.6 105.2 270.2 C102.9 270.8 100.6 271.4 98.3 272.0 C96.0 272.6 93.6 273.3 91.3 273.9 C89.4 274.4 87.6 274.8 85.7 275.2 C83.8 275.6 82.0 276.1 80.1 276.5 C78.3 276.9 76.5 277.2 74.7 277.5 C72.9 277.8 71.2 278.2 69.4 278.4 C67.8 278.6 66.3 278.8 64.7 278.9 C62.6 279.0 60.6 278.9 58.5 278.9 C56.4 278.9 54.3 278.9 52.2 278.9 C50.1 278.9 48.1 279.1 46.0 278.9 C43.7 278.7 41.3 278.3 39.0 277.9 C37.4 277.6 35.7 277.3 34.1 277.0 C32.5 276.7 30.8 276.5 29.2 276.1 C26.9 275.4 24.6 274.6 22.3 273.7 C20.2 272.8 18.1 271.9 16.1 270.8 C15.0 270.2 14.0 269.3 13.0 268.6 C12.0 267.9 10.8 267.2 9.9 266.4 C8.5 265.1 7.1 263.7 5.9 262.2 C4.8 260.7 3.6 258.9 3.0 257.2 C2.8 256.6 3.5 255.8 3.6 255.1 C3.8 253.5 3.7 251.9 3.7 250.3 C3.7 248.7 3.5 247.0 3.8 245.5 C3.9 245.1 4.3 244.7 4.7 244.6 C5.9 244.1 7.4 244.0 8.7 243.7 C10.0 243.4 11.4 243.0 12.7 242.8 C14.5 242.5 16.4 242.4 18.2 242.3 C19.6 242.2 21.1 242.3 22.5 242.3 C23.9 242.3 25.3 242.4 26.7 242.3 C27.8 242.2 28.9 242.0 30.0 241.9 C31.5 241.8 33.1 242.0 34.6 241.8 C36.0 241.6 37.4 241.1 38.8 240.8 C40.2 240.5 41.6 240.3 42.9 239.9 C45.2 239.1 47.6 238.2 49.8 237.1 C51.3 236.4 52.7 235.4 54.0 234.4 C55.6 233.2 57.2 231.8 58.7 230.4 C60.1 229.0 61.3 227.5 62.5 226.0 C63.2 225.0 63.8 223.9 64.4 222.9 C65.0 221.9 65.8 220.9 66.3 219.8 C66.9 218.5 67.1 217.1 67.5 215.8 C67.9 214.5 68.5 213.2 68.8 211.8 C69.2 210.0 69.4 208.2 69.4 206.4 C69.4 204.1 69.4 201.7 68.9 199.5 C68.4 197.3 67.4 195.1 66.6 193.0 C66.4 192.4 66.1 191.9 65.8 191.4 C65.3 190.7 64.8 190.1 64.2 189.5 C63.1 188.4 61.8 187.4 60.6 186.3 L55.5 184.0 L55.5 120.0 Z';
/** The two cutaway edges (neck joint to horn tip), for the shading where the top rolls into them. */
const CUT_TREBLE =
  'M100.0 118.1 C101.2 116.7 102.5 115.4 103.6 113.9 C104.5 112.8 105.3 111.6 105.9 110.3 C106.7 108.5 107.4 106.5 107.9 104.5 C108.4 102.4 108.7 100.2 108.9 98.0 C109.0 96.5 108.9 95.1 108.9 93.6 C108.9 92.2 109.0 90.7 108.9 89.3 C108.7 87.1 108.4 84.9 107.9 82.7 C107.4 80.8 106.7 78.8 105.9 77.0 C105.2 75.2 104.4 73.5 103.3 71.9 C102.0 70.0 100.5 68.3 98.9 66.7 C98.1 65.9 97.0 65.3 96.0 64.6 C95.1 64.0 94.1 63.4 93.1 62.9 C91.3 62.0 89.5 61.3 87.6 60.6 C86.1 60.0 84.5 59.6 82.9 59.2 C80.9 58.7 78.8 58.2 76.8 57.8 C75.5 57.6 74.3 57.5 73.0 57.3 C71.7 57.1 70.4 57.0 69.2 56.7 C67.0 56.2 64.7 55.7 62.6 54.9 C61.4 54.4 60.3 53.6 59.3 52.7 C58.7 52.2 58.1 51.4 57.7 50.7 C57.3 50.0 56.9 49.3 56.7 48.5 C56.3 47.1 56.2 45.6 56.0 44.1';
const CUT_BASS =
  'M3.0 257.2 C3.2 256.5 3.5 255.8 3.6 255.1 C3.8 253.5 3.7 251.9 3.7 250.3 C3.7 248.7 3.5 247.0 3.8 245.5 C3.9 245.1 4.3 244.7 4.7 244.6 C5.9 244.1 7.4 244.0 8.7 243.7 C10.0 243.4 11.4 243.0 12.7 242.8 C14.5 242.5 16.4 242.4 18.2 242.3 C19.6 242.2 21.1 242.3 22.5 242.3 C23.9 242.3 25.3 242.4 26.7 242.3 C27.8 242.2 28.9 242.0 30.0 241.9 C31.5 241.8 33.1 242.0 34.6 241.8 C36.0 241.6 37.4 241.1 38.8 240.8 C40.2 240.5 41.6 240.3 42.9 239.9 C45.2 239.1 47.6 238.2 49.8 237.1 C51.3 236.4 52.7 235.4 54.0 234.4 C55.6 233.2 57.2 231.8 58.7 230.4 C60.1 229.0 61.3 227.5 62.5 226.0 C63.2 225.0 63.8 223.9 64.4 222.9 C65.0 221.9 65.8 220.9 66.3 219.8 C66.9 218.5 67.1 217.1 67.5 215.8 C67.9 214.5 68.5 213.2 68.8 211.8 C69.2 210.0 69.4 208.2 69.4 206.4 C69.4 204.1 69.4 201.7 68.9 199.5 C68.4 197.3 67.4 195.1 66.6 193.0 C66.4 192.4 66.1 191.9 65.8 191.4 C65.3 190.7 64.8 190.1 64.2 189.5 C63.1 188.4 61.8 187.4 60.6 186.3';
/** The pickguard: one piece over the treble horn, round the pickups and up to the bridge, under the fretboard. */
const GUARD_PATH =
  'M305.8 17.4 C306.6 17.4 307.4 17.4 308.1 17.5 C308.9 17.7 309.6 17.9 310.3 18.3 C311.2 18.7 312.0 19.3 312.8 19.9 C313.4 20.4 314.2 21.0 314.5 21.7 C315.0 22.9 315.2 24.4 315.2 25.7 C315.3 28.1 315.4 30.7 314.8 33.0 C314.5 34.3 313.2 35.2 312.4 36.3 C311.6 37.4 310.9 38.6 310.1 39.7 C309.1 41.0 308.1 42.3 307.0 43.6 C306.0 44.9 304.9 46.2 303.8 47.4 C302.1 49.2 300.5 51.1 298.7 52.8 C296.8 54.6 294.5 55.9 292.8 57.8 C291.5 59.3 290.8 61.3 289.7 62.9 C288.2 65.1 286.2 67.0 284.8 69.3 C283.6 71.2 282.9 73.3 281.9 75.3 C281.0 77.3 279.8 79.2 279.1 81.3 C278.5 83.0 278.1 84.9 277.8 86.7 C277.4 89.3 277.1 91.9 276.9 94.5 C276.8 96.1 276.7 97.7 276.9 99.2 C277.0 100.0 277.3 101.0 277.8 101.6 C278.5 102.3 280.5 102.6 280.5 103.1 C280.5 103.6 278.7 103.8 277.9 104.4 C277.4 104.8 276.9 105.4 276.7 106.0 C276.3 107.4 276.3 109.0 276.3 110.5 C276.3 111.7 276.5 112.9 276.8 114.0 C276.9 114.5 277.2 114.9 277.6 115.2 C278.1 115.6 278.7 115.8 279.3 115.9 C281.1 116.0 283.0 116.1 284.8 115.8 C285.5 115.7 286.2 115.2 286.6 114.7 C287.3 113.8 287.5 112.4 288.2 111.4 C288.5 111.0 289.1 110.5 289.5 110.5 C289.9 110.5 290.5 110.9 290.7 111.3 C291.0 111.8 291.2 112.6 291.2 113.3 C291.2 114.1 291.2 115.1 290.7 115.6 C289.7 116.6 287.8 116.9 286.7 117.9 C286.1 118.5 285.6 119.4 285.5 120.3 C285.2 122.5 285.6 124.8 285.4 127.0 C285.2 129.3 284.4 131.5 284.4 133.8 C284.4 136.3 285.6 138.8 285.6 141.3 C285.6 142.7 284.6 144.0 284.3 145.4 C284.1 146.3 283.9 147.3 283.9 148.2 C283.9 151.0 284.6 153.8 284.5 156.5 C284.5 157.2 283.8 158.3 283.4 158.2 C282.9 158.1 281.8 156.7 281.8 155.8 C281.7 153.6 282.9 151.1 283.1 148.8 C283.2 147.6 283.0 146.4 282.8 145.2 C282.6 144.5 282.4 143.6 281.9 143.2 C281.2 142.6 280.0 142.2 279.0 142.0 C278.3 141.9 277.4 142.0 276.7 142.3 C275.8 142.6 275.0 143.5 274.3 143.7 C274.1 143.8 274.0 143.2 274.0 143.0 C274.0 141.7 273.8 139.5 274.4 139.0 C274.9 138.6 276.4 139.9 277.4 140.1 C278.3 140.2 279.3 140.2 280.1 139.9 C280.8 139.7 281.5 139.2 282.0 138.6 C282.5 138.0 282.8 137.2 282.9 136.5 C283.1 134.8 283.3 132.9 282.9 131.2 C282.5 129.7 280.9 128.6 280.5 127.1 C280.0 125.5 280.5 123.6 280.2 121.9 C280.1 121.1 279.9 120.2 279.3 119.7 C278.6 119.1 277.4 118.7 276.4 118.8 C274.6 119.0 272.7 119.7 271.1 120.6 C268.9 121.9 266.5 123.5 265.1 125.4 C264.2 126.6 264.2 128.5 264.1 130.1 C263.9 133.7 263.9 137.4 264.1 141.0 C264.2 142.5 264.3 144.2 264.8 145.6 C265.1 146.4 265.9 147.3 266.7 147.6 C268.1 148.2 271.2 148.1 271.3 148.4 C271.4 148.7 268.4 148.8 267.1 149.2 C266.5 149.4 265.8 149.7 265.4 150.2 C264.9 150.8 264.6 151.6 264.5 152.3 C264.2 153.7 264.2 155.2 264.1 156.7 C264.0 159.6 264.0 162.6 264.0 165.5 C264.0 168.3 263.9 171.1 263.9 173.9 C263.9 176.4 263.6 179.0 263.8 181.5 C263.9 182.4 264.3 183.4 264.9 184.0 C265.9 185.1 268.1 185.4 268.7 186.7 C269.8 189.0 269.2 192.2 269.9 194.7 C270.0 195.3 270.7 195.7 271.2 195.9 C271.9 196.2 272.7 196.4 273.5 196.4 C274.8 196.5 276.2 196.5 277.5 196.3 C278.3 196.2 279.2 195.9 279.9 195.4 C281.6 194.0 283.3 192.3 284.7 190.5 C285.1 190.0 285.2 189.3 285.3 188.6 C285.4 187.8 285.5 186.9 285.2 186.1 C284.9 185.4 284.4 184.4 283.7 184.1 C282.7 183.6 281.3 183.6 280.2 183.7 C279.4 183.8 278.4 184.1 277.8 184.7 C277.1 185.3 276.6 187.2 276.3 187.3 C276.1 187.4 276.1 185.7 276.4 185.1 C276.8 184.3 277.6 183.5 278.4 183.2 C280.5 182.4 283.0 181.8 285.2 181.7 C285.6 181.7 286.1 182.3 286.2 182.7 C286.5 185.1 286.0 187.7 286.4 190.1 C286.7 191.7 287.3 193.5 288.1 194.8 C288.5 195.5 289.4 195.9 290.2 196.1 C292.0 196.5 296.0 196.6 295.8 196.7 C295.6 196.8 291.2 196.8 288.9 196.9 C286.6 196.9 284.3 196.8 282.0 197.0 C281.0 197.1 279.9 197.3 279.0 197.8 C278.4 198.1 278.0 198.7 277.6 199.3 C277.1 200.1 276.6 201.0 276.4 201.9 C276.0 203.3 276.0 204.8 275.8 206.2 C275.6 207.6 275.7 209.1 275.2 210.4 C274.6 211.9 273.3 213.1 272.3 214.5 C271.3 215.8 270.6 217.4 269.4 218.5 C267.5 220.3 265.2 221.8 262.9 223.1 C261.2 224.1 259.4 224.9 257.5 225.5 C255.8 226.1 254.0 226.2 252.3 226.6 C250.6 227.0 248.9 227.5 247.1 227.7 C244.6 228.0 242.0 228.2 239.4 228.3 C237.4 228.3 235.3 228.1 233.3 228.0 C231.3 227.9 229.2 228.0 227.2 227.8 C224.9 227.6 222.5 227.1 220.2 226.7 C217.9 226.3 215.5 226.1 213.2 225.5 C210.7 224.9 208.2 224.0 205.7 223.2 C203.2 222.4 200.7 221.8 198.3 220.9 C195.9 220.0 193.6 218.9 191.2 217.9 C188.8 216.9 186.4 215.8 184.0 214.8 C181.7 213.9 179.3 213.1 176.9 212.3 C174.6 211.5 172.2 210.6 169.9 209.8 C167.4 209.0 165.0 208.0 162.5 207.4 C160.6 206.9 158.7 206.9 156.8 206.5 C155.1 206.1 153.4 205.3 151.7 205.0 C149.6 204.6 147.5 204.5 145.4 204.3 C143.3 204.1 141.1 203.8 139.0 203.7 C137.1 203.6 135.3 203.7 133.4 203.7 C131.5 203.7 129.7 203.6 127.8 203.7 C126.3 203.8 124.9 204.0 123.4 204.1 C122.0 204.2 120.5 204.2 119.1 204.4 C117.6 204.6 116.1 205.1 114.6 205.5 C113.1 205.9 111.7 206.5 110.2 206.7 C107.4 207.1 104.5 206.8 101.8 207.3 C100.0 207.6 98.3 208.8 96.5 209.1 C95.1 209.3 93.6 209.0 92.1 209.0 C90.6 209.0 89.0 209.4 87.7 209.0 C86.6 208.7 85.6 207.9 84.9 207.0 C84.1 206.0 83.7 204.6 83.4 203.4 C83.2 202.5 83.3 201.6 83.5 200.7 C83.9 199.0 84.8 197.5 85.3 195.8 C85.7 194.3 86.0 192.7 86.1 191.2 C86.2 190.2 86.2 189.2 85.9 188.3 C85.7 187.6 85.3 186.8 84.7 186.5 C83.7 186.0 82.4 185.8 81.2 185.7 C79.3 185.6 77.3 185.8 75.4 185.8 C73.5 185.8 71.5 185.6 69.7 185.9 C68.9 186.0 68.0 186.6 67.5 187.2 C66.7 188.1 66.7 190.6 65.9 190.6 C64.7 190.6 63.1 188.2 61.6 187.1 C60.9 186.6 60.1 186.1 59.3 186.0 C56.8 185.6 54.2 185.6 51.7 185.4 C49.2 185.2 44.2 185.4 44.2 184.8 C44.2 184.2 49.2 182.9 51.5 181.7 C51.9 181.5 52.3 181.0 52.5 180.6 C52.8 180.0 53.2 179.3 53.2 178.6 C53.4 175.5 53.2 172.3 53.2 169.1 C53.2 165.7 53.2 162.2 53.2 158.8 C53.2 155.2 53.2 151.7 53.2 148.1 C53.2 144.6 53.1 141.1 53.1 137.6 C53.1 134.4 53.4 131.1 53.1 128.0 C53.0 127.1 52.5 126.0 51.8 125.4 C49.7 123.7 47.2 121.9 44.6 121.0 C42.6 120.3 40.2 120.4 38.2 120.8 C36.8 121.1 35.6 123.2 34.3 123.1 C33.0 123.0 30.2 120.7 30.6 120.3 C31.1 119.7 34.7 120.2 36.8 120.2 C38.9 120.2 40.9 120.1 43.0 120.1 C45.1 120.0 47.1 120.0 49.2 119.9 C50.8 119.8 52.3 119.6 53.9 119.4 C55.5 119.2 57.1 119.0 58.7 118.9 C61.3 118.8 63.9 118.9 66.5 118.9 C69.1 118.9 71.7 118.8 74.3 118.8 C76.9 118.8 79.5 118.7 82.1 118.7 C84.7 118.7 87.4 118.6 90.0 118.6 C92.6 118.6 95.3 118.9 97.8 118.5 C99.0 118.3 100.1 117.6 101.0 116.8 C102.4 115.5 103.6 113.8 104.7 112.1 C105.6 110.6 106.3 109.0 106.9 107.4 C107.5 105.7 108.0 103.9 108.3 102.1 C108.7 99.7 108.9 97.2 108.9 94.8 C108.9 92.2 108.8 89.6 108.5 87.0 C108.3 85.2 107.9 83.4 107.5 81.7 C107.2 80.4 106.6 79.1 106.2 77.8 C105.8 76.5 105.1 75.2 104.9 73.9 C104.8 73.6 105.1 73.2 105.4 73.0 C106.2 72.5 107.3 72.2 108.2 71.7 C108.6 71.4 109.1 71.0 109.3 70.5 C109.6 69.8 109.6 68.9 109.5 68.1 C109.4 67.2 109.0 66.3 108.5 65.6 C107.4 64.3 106.0 63.3 104.7 62.1 C103.5 60.9 102.3 59.6 101.0 58.6 C99.0 57.0 96.9 55.6 94.7 54.3 C93.2 53.4 91.7 52.7 90.1 52.1 C87.6 51.2 85.1 50.5 82.5 49.9 C80.0 49.3 77.4 48.8 74.8 48.3 C72.2 47.8 69.5 47.5 67.0 46.8 C66.4 46.6 65.9 46.2 65.4 45.8 C65.1 45.5 64.8 45.1 64.7 44.7 C64.6 44.3 64.7 43.8 64.9 43.4 C65.1 43.0 65.3 42.5 65.7 42.3 C66.9 41.5 68.2 41.0 69.5 40.3 C70.7 39.6 71.9 38.8 73.2 38.3 C74.8 37.7 76.5 37.5 78.2 37.1 C79.9 36.7 81.6 36.2 83.3 35.9 C84.6 35.7 85.9 35.7 87.2 35.7 C89.4 35.8 91.6 36.0 93.8 36.2 C96.0 36.3 98.1 36.5 100.3 36.6 C102.5 36.8 104.7 36.8 106.9 37.1 C108.5 37.4 110.0 38.1 111.6 38.4 C113.7 38.9 115.9 39.0 118.0 39.5 C120.1 40.0 122.1 40.9 124.2 41.6 C126.3 42.3 128.4 43.0 130.4 43.8 C131.9 44.4 133.3 45.1 134.7 45.7 C136.1 46.3 137.5 47.1 139.0 47.6 C141.3 48.4 143.6 49.1 145.9 49.8 C148.2 50.5 150.5 51.3 152.8 52.0 C155.1 52.7 157.4 53.6 159.8 54.1 C162.4 54.7 165.0 55.0 167.6 55.4 C170.2 55.8 172.8 56.3 175.4 56.6 C176.4 56.7 177.3 56.7 178.3 56.6 C180.6 56.4 182.9 56.0 185.2 55.7 C187.5 55.4 189.9 55.3 192.2 54.7 C194.7 54.1 197.1 53.0 199.6 52.2 C202.1 51.4 204.6 50.7 207.1 49.8 C209.6 48.9 212.1 47.7 214.6 46.7 C217.1 45.6 219.6 44.6 222.1 43.5 C224.6 42.5 227.1 41.5 229.6 40.4 C231.6 39.5 233.5 38.6 235.4 37.7 C237.4 36.8 239.3 35.8 241.3 35.0 C243.4 34.1 245.5 33.4 247.6 32.6 C249.7 31.8 251.8 31.0 253.9 30.2 C256.0 29.4 258.2 28.5 260.3 27.7 C262.4 26.9 264.5 26.0 266.6 25.3 C268.5 24.7 270.4 24.3 272.3 23.8 C274.2 23.3 276.1 22.9 278.0 22.3 C279.7 21.7 281.2 20.8 282.9 20.3 C284.3 19.8 285.8 19.6 287.2 19.3 C288.6 19.0 290.0 18.4 291.5 18.3 C296.2 17.8 301.0 17.6 305.8 17.4 Z';

/** Six pole pieces under the strings, on a pickup running from (x1, y1) to (x2, y2). */
const along = (x1: number, y1: number, x2: number, y2: number, y: number) => x1 + ((x2 - x1) * (y - y1)) / (y2 - y1);

/** A single-coil pickup in a white cover with rounded ends, between its two mounting screws (x1, y1) and (x2, y2). */
function SingleCoil({ x1, y1, x2, y2, id }: { x1: number; y1: number; x2: number; y2: number; id: string }) {
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  const half = Math.hypot(x2 - x1, y2 - y1) / 2;
  const tilt = (Math.atan2(x2 - x1, y1 - y2) * 180) / Math.PI;
  const lenHalf = half - 3.4;
  const w = 15.3;
  return (
    <g>
      <g transform={`rotate(${tilt} ${cx} ${cy})`}>
        <rect
          x={cx - w / 2}
          y={cy - lenHalf}
          width={w}
          height={lenHalf * 2}
          rx={w / 2 - 0.3}
          ry={w / 2 + 0.8}
          fill={`url(#${id}-cover)`}
          stroke="rgba(70,68,62,0.5)"
          strokeWidth={0.6}
          filter={`url(#${id}-lift)`}
        />
        <rect
          x={cx - w / 2 + 1.5}
          y={cy - lenHalf + 1.6}
          width={w - 3}
          height={lenHalf * 2 - 3.2}
          rx={w / 2 - 1.8}
          ry={w / 2 - 0.8}
          fill="none"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={0.7}
        />
        {[cy - half, cy + half].map((sy) => (
          <Screw key={sy} x={cx} y={sy} id={id} r={2} />
        ))}
      </g>
      {STRING_AT.map((_, i) => (
        <circle
          key={i}
          cx={along(x1, y1, x2, y2, bodyStringY(i)) + 0.1}
          cy={bodyStringY(i) + 0.5}
          r={2.15}
          fill={`url(#${id}-pole)`}
          stroke="#2c2d2d"
          strokeWidth={0.45}
        />
      ))}
    </g>
  );
}

/** A chrome screw head with its slot. */
function Screw({ x, y, id, r = 2.2 }: { x: number; y: number; id: string; r?: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-post)`} stroke="rgba(0,0,0,0.45)" strokeWidth={0.45} />
      <line x1={x - r * 0.65} x2={x + r * 0.65} y1={y + r * 0.2} y2={y - r * 0.2} stroke="#4a4f52" strokeWidth={0.5} />
    </g>
  );
}

/** A white hat knob drawn in the art (the third knob, a second tone control, does nothing here): a cream skirt with its
 * scale of ticks round a domed cap. */
function HatKnob({ x, y, id }: { x: number; y: number; id: string }) {
  const r = KNOB_R;
  return (
    <g filter={`url(#${id}-lift)`}>
      <circle cx={x} cy={y} r={r} fill={`url(#${id}-skirt)`} stroke="rgba(60,58,52,0.5)" strokeWidth={0.6} />
      {Array.from({ length: 11 }, (_, k) => {
        const a = ((-150 + k * 30) * Math.PI) / 180;
        return (
          <circle
            key={k}
            cx={x + Math.sin(a) * (r - 1.6)}
            cy={y - Math.cos(a) * (r - 1.6)}
            r={0.45}
            fill="rgba(70,66,58,0.7)"
          />
        );
      })}
      <circle cx={x} cy={y} r={r * 0.68} fill={`url(#${id}-hat)`} stroke="rgba(120,116,106,0.55)" strokeWidth={0.5} />
      <line x1={x} x2={x} y1={y - r * 0.6} y2={y - r * 0.22} stroke="#3a3833" strokeWidth={1} strokeLinecap="round" />
    </g>
  );
}
const KNOB_R = 10.2;

/** Pickguard screws, read off the photo. */
const GUARD_SCREWS = [
  [75.6, 43.2],
  [127.3, 48.0],
  [210.4, 54.0],
  [255.1, 34.8],
  [306.6, 26.4],
  [271.3, 105.3],
  [274.8, 207.8],
  [223.8, 221.4],
  [178.3, 206.9],
  [89.9, 202.5],
  [117.2, 112.3],
] as const;
/** Pickups as their mounting screws (top, bottom): neck and middle square to the strings, the bridge one slanted. */
const PICKUPS = [
  [
    [135.0, 109.0],
    [135.0, 196.7],
  ],
  [
    [187.9, 109.5],
    [187.9, 197.0],
  ],
  [
    [242.9, 110.0],
    [233.0, 197.0],
  ],
] as const;
/** Where the knobs sit, read off the photo: Volume and the first Tone are the two working controls (styles.css places
 * the buttons over them); the second Tone is only drawn. */
export const KNOB_AT = {
  sound: [245.7, 94.8],
  view: [265.0, 62.8],
  tone2: [292.5, 33.5],
} as const;
const SWITCH = [
  [218.0, 67.2],
  [230.9, 56.2],
] as const;
const SWITCH_SCREWS = [
  [212.6, 71.2],
  [239.8, 48.5],
] as const;
const JACK = [
  [302.6, 90.7],
  [353.8, 34.1],
] as const;
const JACK_SCREWS = [
  [309.6, 86.2],
  [349.6, 37.9],
] as const;
const JACK_SOCKET = [323.7, 69.5] as const;
const BRIDGE = {
  x0: 264.0,
  x1: 301.2,
  top: 111.5,
  tabx: 279.1,
  taby: 102.2,
  bottom: 197.4,
  saddles: [273.2, 290.8],
  studs: [
    [266.8, 120.6],
    [267.3, 188.6],
  ],
  arm_hole: [289.6, 112.5],
} as const;
const FRETBOARD = { x0: 53.5, x1: 116.9, frets: [59.3, 71.6, 82.4, 92.9, 102.8, 112.2], dots: [77.0, 98.1] } as const;
const STRAPS = [
  [0.8, 245.8],
  [407.8, 154.5],
] as const;

/**
 * The body: gloss black with a white pickguard, three single-coil pickups, a two-point vibrato bridge, three hat knobs,
 * a five-way switch, an oval jack plate on the face and two strap buttons.
 */
export function GuitarBody() {
  const id = useId().replace(/:/g, '');
  const B = BRIDGE;
  const r = 2.6;
  const plate = [
    `M${B.x0 + r} ${B.top}`,
    `H${B.tabx - r}`,
    `Q${B.tabx} ${B.top} ${B.tabx} ${B.top - r}`,
    `V${B.taby + r}`,
    `Q${B.tabx} ${B.taby} ${B.tabx + r} ${B.taby}`,
    `H${B.x1 - r}`,
    `Q${B.x1} ${B.taby} ${B.x1} ${B.taby + r}`,
    `V${B.bottom - r}`,
    `Q${B.x1} ${B.bottom} ${B.x1 - r} ${B.bottom}`,
    `H${B.x0 + r}`,
    `Q${B.x0} ${B.bottom} ${B.x0} ${B.bottom - r}`,
    `V${B.top + r}`,
    `Q${B.x0} ${B.top} ${B.x0 + r} ${B.top}`,
    'Z',
  ].join(' ');
  const [[jx1, jy1], [jx2, jy2]] = JACK;
  const jcx = (jx1 + jx2) / 2;
  const jcy = (jy1 + jy2) / 2;
  const jlen = Math.hypot(jx2 - jx1, jy2 - jy1);
  const jang = (Math.atan2(jy2 - jy1, jx2 - jx1) * 180) / Math.PI;
  const [[sx1, sy1], [sx2, sy2]] = SWITCH;
  const anchorX = B.x1 - 2.5;
  const NT = BODY_NECK_TOP;
  return (
    <svg className="body-art" width={BODY_W} height={BODY_H} viewBox={`0 0 ${BODY_W} ${BODY_H}`} aria-hidden="true">
      <defs>
        <MetalDefs id={id} />
        <clipPath id={`${id}-clip`}>
          <path d={BODY_PATH} />
        </clipPath>
        <clipPath id={`${id}-guardclip`}>
          <path d={GUARD_PATH} />
        </clipPath>
        <clipPath id={`${id}-plateclip`}>
          <path d={plate} />
        </clipPath>
        {/* Gloss black: the top is near black; the rounded edge catches a grey band of light, brightest along the
            upper edges, and the very edge falls back to black. */}
        <linearGradient id={`${id}-black`} x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stopColor="#121213" />
          <stop offset="0.5" stopColor="#09090a" />
          <stop offset="1" stopColor="#050505" />
        </linearGradient>
        <linearGradient id={`${id}-roll`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={BODY_H}>
          <stop offset="0" stopColor="rgba(205,205,210,0.85)" />
          <stop offset="0.35" stopColor="rgba(150,150,156,0.45)" />
          <stop offset="0.65" stopColor="rgba(110,110,116,0.32)" />
          <stop offset="1" stopColor="rgba(165,165,170,0.55)" />
        </linearGradient>
        {/* The long reflection across the lower bout, brightest toward the bottom edge. */}
        <linearGradient id={`${id}-streak`} gradientUnits="userSpaceOnUse" x1={401.3} y1={162.9} x2={288.5} y2={291.3}>
          <stop offset="0" stopColor="rgba(150,150,155,0)" />
          <stop offset="0.3" stopColor="rgba(150,150,155,0.35)" />
          <stop offset="1" stopColor="rgba(175,175,180,0.62)" />
        </linearGradient>
        <linearGradient id={`${id}-guard`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#f4f6f2" />
          <stop offset="0.55" stopColor="#eaede8" />
          <stop offset="1" stopColor="#d9dcd7" />
        </linearGradient>
        <linearGradient id={`${id}-cover`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e6e7e2" />
          <stop offset="0.4" stopColor="#fbfbf8" />
          <stop offset="1" stopColor="#dadbd5" />
        </linearGradient>
        <radialGradient id={`${id}-pole`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#c9cccd" />
          <stop offset="0.55" stopColor="#7c8183" />
          <stop offset="1" stopColor="#3e4244" />
        </radialGradient>
        <radialGradient id={`${id}-skirt`} cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#f4f1e8" />
          <stop offset="0.7" stopColor="#e2ddcf" />
          <stop offset="1" stopColor="#c9c3b3" />
        </radialGradient>
        <radialGradient id={`${id}-hat`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#f3f0e7" />
          <stop offset="1" stopColor="#d6d1c4" />
        </radialGradient>
        <linearGradient id={`${id}-chrome`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f7f8f8" />
          <stop offset="0.35" stopColor="#c4c9cb" />
          <stop offset="0.55" stopColor="#8e9497" />
          <stop offset="0.8" stopColor="#d9dcdd" />
          <stop offset="1" stopColor="#8a9093" />
        </linearGradient>
        <linearGradient id={`${id}-dish`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3f42" />
          <stop offset="0.55" stopColor="#8f9598" />
          <stop offset="1" stopColor="#e0e3e4" />
        </linearGradient>
        <linearGradient id={`${id}-saddle`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2f3f2" />
          <stop offset="0.5" stopColor="#b9bdbe" />
          <stop offset="1" stopColor="#6f7578" />
        </linearGradient>
        <linearGradient id={`${id}-rosewood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2f1d13" />
          <stop offset="0.55" stopColor="#24160e" />
          <stop offset="1" stopColor="#1a0f09" />
        </linearGradient>
        <radialGradient id={`${id}-pearl`} cx="0.38" cy="0.32" r="0.7">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.35" stopColor="#f6f3ea" />
          <stop offset="0.7" stopColor="#e1e6e3" />
          <stop offset="1" stopColor="#a7b2b0" />
        </radialGradient>
        <filter
          id={`${id}-roll-blur`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={-10}
          y={-10}
          width={BODY_W + 20}
          height={BODY_H + 20}
        >
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter
          id={`${id}-rim`}
          colorInterpolationFilters="sRGB"
          filterUnits="userSpaceOnUse"
          x={-10}
          y={-10}
          width={BODY_W + 20}
          height={BODY_H + 20}
        >
          <feGaussianBlur stdDeviation="0.9" />
        </filter>
        <filter id={`${id}-soft`} colorInterpolationFilters="sRGB" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
        <filter id={`${id}-lift`} colorInterpolationFilters="sRGB" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0.4" dy="1.1" stdDeviation="0.9" floodColor="#000" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="drop-shadow(0 7px 9px rgba(0,0,0,0.55))">
        <path d={BODY_PATH} fill={`url(#${id}-black)`} />
      </g>
      <g clipPath={`url(#${id}-clip)`}>
        <path
          d={'M403.6 162.9 L391.9 162.9 L279.1 291.3 L302.6 291.3 Z'}
          fill={`url(#${id}-streak)`}
          filter={`url(#${id}-soft)`}
        />
        {/* The rolled edge: a band of light just inside the outline, then the outline itself in shadow. */}
        <path d={BODY_PATH} fill="none" stroke={`url(#${id}-roll)`} strokeWidth={13} filter={`url(#${id}-roll-blur)`} />
        <path d={BODY_PATH} fill="none" stroke="#020202" strokeWidth={4.2} filter={`url(#${id}-rim)`} />
        {[CUT_TREBLE, CUT_BASS].map((d) => (
          <path key={d} d={d} fill="none" stroke="rgba(0,0,0,0.5)" strokeWidth={3.4} filter={`url(#${id}-rim)`} />
        ))}
      </g>
      <path d={BODY_PATH} fill="none" stroke="rgba(70,70,74,0.9)" strokeWidth={0.7} />
      {/* Strap buttons: the tip of the bass horn and the end of the body. */}
      {STRAPS.map(([cx, cy]) => (
        <g key={cx}>
          <circle cx={cx} cy={cy} r={3.9} fill="#1b1b1c" />
          <circle cx={cx} cy={cy} r={3} fill={`url(#${id}-post)`} />
        </g>
      ))}
      {/* The pickguard: white, with the black middle ply showing as a thin line on its bevelled edge. Kept inside the
          body, as its traced edge runs on under the fretboard past the neck joint. */}
      <g clipPath={`url(#${id}-clip)`}>
        <g filter="drop-shadow(0 1px 1.4px rgba(0,0,0,0.7))">
          <path d={GUARD_PATH} fill={`url(#${id}-guard)`} />
        </g>
        <g clipPath={`url(#${id}-guardclip)`}>
          <path d={GUARD_PATH} fill="none" stroke="rgba(120,122,118,0.5)" strokeWidth={4} />
          <path d={GUARD_PATH} fill="none" stroke="#2b2b2b" strokeWidth={1.6} />
        </g>
      </g>
      {GUARD_SCREWS.map(([x, y]) => (
        <Screw key={`${x}-${y}`} x={x} y={y} id={id} />
      ))}
      {/* The oval jack plate on the face, angled along the treble edge, dished round the socket. */}
      <g filter={`url(#${id}-lift)`}>
        <ellipse
          cx={jcx}
          cy={jcy}
          rx={jlen / 2}
          ry={12.4}
          transform={`rotate(${jang} ${jcx} ${jcy})`}
          fill={`url(#${id}-chrome)`}
          stroke="#3d4144"
          strokeWidth={0.6}
        />
      </g>
      <ellipse
        cx={jcx - 1}
        cy={jcy + 1.2}
        rx={jlen / 2 - 11}
        ry={12.4 - 3.6}
        transform={`rotate(${jang} ${jcx} ${jcy})`}
        fill={`url(#${id}-dish)`}
        stroke="rgba(30,32,34,0.7)"
        strokeWidth={0.5}
      />
      <circle cx={JACK_SOCKET[0]} cy={JACK_SOCKET[1]} r={4.6} fill="#c9cdcf" stroke="#3a3e40" strokeWidth={0.6} />
      <circle cx={JACK_SOCKET[0]} cy={JACK_SOCKET[1]} r={2.6} fill="#1c1f21" />
      {JACK_SCREWS.map(([x, y]) => (
        <Screw key={x} x={x} y={y} id={id} r={1.9} />
      ))}
      {/* The five-way switch: a slot in the guard, its lever and white tip, and its two screws. */}
      <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke="#1f1e1c" strokeWidth={2.6} strokeLinecap="round" />
      <line x1={sx1 + 2} y1={sy1 - 1.7} x2={sx2 + 3} y2={sy2 - 3.4} stroke="#8d9294" strokeWidth={1.3} />
      <ellipse
        cx={sx2 + 4}
        cy={sy2 - 4.6}
        rx={3.6}
        ry={2.9}
        transform={`rotate(-40 ${sx2 + 4} ${sy2 - 4.6})`}
        fill={`url(#${id}-hat)`}
        filter={`url(#${id}-lift)`}
      />
      {SWITCH_SCREWS.map(([x, y]) => (
        <Screw key={x} x={x} y={y} id={id} />
      ))}
      <HatKnob x={KNOB_AT.tone2[0]} y={KNOB_AT.tone2[1]} id={id} />
      {/* The fretboard runs on over the body, under the guard's edge, with its last frets and two pearl dots. */}
      <rect
        x={FRETBOARD.x0}
        y={NT}
        width={FRETBOARD.x1 - FRETBOARD.x0}
        height={NECK_H}
        rx={3}
        fill={`url(#${id}-rosewood)`}
        filter="drop-shadow(0.8px 0 1.6px rgba(0,0,0,0.6))"
      />
      <rect x={FRETBOARD.x0} y={NT} width={6} height={NECK_H} fill={`url(#${id}-rosewood)`} />
      {FRETBOARD.frets.map((x) => (
        <rect key={x} x={x} y={NT} width={1.3} height={NECK_H} fill="#c9cdcf" opacity={0.85} />
      ))}
      {FRETBOARD.dots.map((x) => (
        <circle key={x} cx={x} cy={NT + NECK_H / 2} r={3.6} fill={`url(#${id}-pearl)`} stroke="rgba(28,14,6,0.5)" />
      ))}
      {PICKUPS.map(([[x1, y1], [x2, y2]]) => (
        <SingleCoil key={x1} x1={x1} y1={y1} x2={x2} y2={y2} id={id} />
      ))}
      {/* Two-point vibrato: a chrome plate with a raised tab for the arm, two pivot studs at its front corners, a
          bent-steel saddle per string with its height screws, and the intonation screws behind. */}
      <g filter={`url(#${id}-lift)`}>
        <path d={plate} fill={`url(#${id}-chrome)`} stroke="#3d4144" strokeWidth={0.6} />
      </g>
      <g clipPath={`url(#${id}-plateclip)`}>
        <rect x={B.x0} y={B.taby} width={B.x1 - B.x0} height={B.bottom - B.taby} fill="rgba(60,64,66,0.18)" />
      </g>
      <circle cx={B.arm_hole[0]} cy={B.arm_hole[1]} r={2.3} fill="#26292b" stroke="#9aa0a3" strokeWidth={0.6} />
      {B.studs.map(([x, y]) => (
        <g key={y}>
          <circle cx={x} cy={y} r={3.3} fill={`url(#${id}-post)`} stroke="#3d4144" strokeWidth={0.5} />
          <circle cx={x} cy={y} r={1.3} fill="none" stroke="#5b6164" strokeWidth={0.5} />
        </g>
      ))}
      {STRING_AT.map((_, i) => {
        const y = bodyStringY(i);
        const [s0, s1] = B.saddles;
        return (
          <g key={i}>
            <rect
              x={s0}
              y={y - 4.4}
              width={s1 - s0}
              height={8.8}
              rx={1.2}
              fill={`url(#${id}-saddle)`}
              stroke="#4c5255"
              strokeWidth={0.5}
            />
            <rect x={s0 + 2} y={y - 0.9} width={s1 - s0 - 4} height={1.8} fill="rgba(40,44,46,0.5)" />
            <circle cx={s0 + (s1 - s0) * 0.6} cy={y - 2.6} r={1} fill="#25292b" />
            <circle cx={s0 + (s1 - s0) * 0.6} cy={y + 2.6} r={1} fill="#25292b" />
            <path
              d={`M${s1 + 0.6} ${y - 1.5} l1.3 3 l1.3 -3 l1.3 3 l1.3 -3 l1.3 3`}
              fill="none"
              stroke="#3b3f41"
              strokeWidth={0.75}
            />
            <rect x={anchorX - 2.6} y={y - 2.3} width={3.6} height={4.6} rx={0.8} fill="#2a2d2f" />
          </g>
        );
      })}
      <g transform={`translate(0 ${NT - NECK_TOP})`}>
        <Strings id={id} from={FRETBOARD.x0} to={anchorX} />
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
