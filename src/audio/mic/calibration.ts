import { engine } from '../engine';
import { listener } from './listener';

/**
 * Latency calibration: eight clicks at 90 BPM; the player strums a muted chord on each. The median gap
 * between click and heard onset (from the 3rd click on) is the round-trip latency the drills correct for.
 * Works with headphones (the player's strum is heard) and without (the click itself may be heard).
 */
export async function calibrateLatency(onProgress?: (i: number) => void): Promise<number | null> {
  const ctx = engine.ensure();
  if (!ctx) return null;
  const prev = listener.latency;
  listener.latency = 0;
  // The clicks must be heard even with "Sound off": unmute for the measurement, then restore.
  const wasMuted = engine.muted;
  if (wasMuted) engine.setMuted(false);
  const spb = 60 / 90;
  const t0 = ctx.currentTime + 0.5;
  const clicks = Array.from({ length: 8 }, (_, i) => t0 + i * spb);
  clicks.forEach((t, i) => engine.click(t, i === 0));
  const onsets: number[] = [];
  const off = listener.on((e) => {
    if (e.type === 'onset') onsets.push(e.t);
  });
  await new Promise<void>((resolve) => {
    const end = clicks[clicks.length - 1]! + 0.6;
    const tick = () => {
      onProgress?.(clicks.filter((c) => c <= ctx.currentTime).length);
      if (ctx.currentTime >= end) resolve();
      else requestAnimationFrame(tick);
    };
    tick();
  });
  off();
  if (wasMuted) engine.setMuted(true);
  const gaps: number[] = [];
  clicks.slice(2).forEach((c) => {
    const hit = onsets.find((o) => o >= c - 0.12 && o <= c + 0.35);
    if (hit != null) gaps.push(hit - c);
  });
  if (gaps.length < 3) {
    listener.latency = prev;
    return null;
  }
  gaps.sort((a, b) => a - b);
  const med = gaps[Math.floor(gaps.length / 2)]!;
  const lat = Math.max(0, Math.min(0.3, med));
  listener.latency = lat;
  return lat;
}
