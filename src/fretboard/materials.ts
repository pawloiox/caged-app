/**
 * Rosewood grain, generated once per session on a canvas and shared by every fretboard as a pattern.
 * Seeded, so the board always looks the same. Grain runs along the neck (x); the upright neck rotates it.
 *
 * It is made when the browser is idle after first paint and encoded with the asynchronous toBlob, so it never
 * blocks loading: the board appears at once and the grain arrives a moment later.
 */
import { mulberry32 } from '../audio/ks';

export const GRAIN_W = 1200;
export const GRAIN_H = 240;

let url: string | null = null;
let pending: Promise<string | null> | null = null;

/** The grain if it is ready, or null. */
export const grainReady = (): string | null => url;

/** Make the grain (once), when the browser is idle. Resolves to an object URL, or null if canvas is unavailable. */
export function loadGrain(): Promise<string | null> {
  if (url) return Promise.resolve(url);
  if (pending) return pending;
  pending = new Promise((resolve) => {
    if (typeof document === 'undefined') return resolve(null);
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    const run = () => {
      const c = drawGrain();
      if (!c) return resolve(null);
      c.toBlob(
        (blob) => {
          url = blob ? URL.createObjectURL(blob) : null;
          resolve(url);
        },
        'image/webp',
        0.9,
      );
    };
    if (idle) idle(run, { timeout: 2500 });
    else setTimeout(run, 300);
  });
  return pending;
}

function drawGrain(): HTMLCanvasElement | null {
  const c = document.createElement('canvas');
  c.width = GRAIN_W;
  c.height = GRAIN_H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const rnd = mulberry32(1981);
  const r = (a: number, b: number) => a + (b - a) * rnd();

  // Wide, soft figure bands: darker and lighter runs in the wood.
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = rnd() < 0.6 ? `rgba(18, 8, 3, ${r(0.08, 0.16)})` : `rgba(150, 92, 58, ${r(0.05, 0.1)})`;
    ctx.lineWidth = r(6, 20);
    wavyLine(ctx, r(0, GRAIN_H), r(0.8, 3.5), r(500, 1300), r(0, Math.PI * 2));
  }
  // Fine grain lines, batched by tone so there are only a few strokes.
  const tones = [
    { style: 'rgba(20, 9, 3, 0.3)', n: 90, w: [0.5, 1.8] },
    { style: 'rgba(20, 9, 3, 0.16)', n: 140, w: [0.35, 2.2] },
    { style: 'rgba(170, 110, 70, 0.1)', n: 60, w: [0.35, 1.1] },
  ];
  for (const t of tones) {
    ctx.strokeStyle = t.style;
    for (let i = 0; i < t.n; i++) {
      ctx.lineWidth = r(t.w[0]!, t.w[1]!);
      wavyLine(ctx, r(-4, GRAIN_H + 4), r(0.4, 2.6), r(280, 900), r(0, Math.PI * 2));
    }
  }
  // Open pores: short dark dashes along the grain, filled in two batches.
  for (const alpha of [0.32, 0.55]) {
    ctx.fillStyle = `rgba(14, 6, 2, ${alpha})`;
    ctx.beginPath();
    for (let i = 0; i < 1100; i++) {
      const x = r(0, GRAIN_W);
      const y = r(0, GRAIN_H);
      const rx = r(1, 4.5);
      const ry = r(0.35, 0.75);
      ctx.moveTo(x + rx, y);
      ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  return c;
}

function wavyLine(ctx: CanvasRenderingContext2D, y: number, amp: number, wave: number, phase: number) {
  ctx.beginPath();
  for (let x = -10; x <= GRAIN_W + 10; x += 16) {
    const yy =
      y + amp * Math.sin((x / wave) * Math.PI * 2 + phase) + (amp / 3) * Math.sin((x / (wave / 3.7)) * Math.PI * 2);
    if (x === -10) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();
}
