import { describe, expect, it } from 'vitest';
import { clampBpm, tapTempo } from '../src/audio/metronome';
import { normalizePrefs } from '../src/store/repository';

describe('metronome', () => {
  it('tap tempo: no tempo from one tap, then the average gap of the latest taps', () => {
    let r = tapTempo([], 1000);
    expect(r.bpm).toBeNull();
    r = tapTempo(r.taps, 1500);
    expect(r.bpm).toBe(120);
    r = tapTempo(r.taps, 2000);
    r = tapTempo(r.taps, 2520);
    expect(r.bpm).toBe(118);
    // It keeps only the latest five taps, so the slow first gap drops out.
    for (const t of [3020, 3520, 4020, 4520]) r = tapTempo(r.taps, t);
    expect(r.taps).toHaveLength(5);
    expect(r.bpm).toBe(120);
  });

  it('tap tempo: a long pause starts a new count', () => {
    const r = tapTempo([1000, 1500], 6000);
    expect(r).toEqual({ taps: [6000], bpm: null });
  });

  it('keeps the tempo inside 30–250 BPM', () => {
    expect(clampBpm(12)).toBe(30);
    expect(clampBpm(400)).toBe(250);
    expect(tapTempo([1000], 1100).bpm).toBe(250);
  });

  it('remembers its settings, and mends bad saved ones', () => {
    expect(normalizePrefs(undefined)).toMatchObject({ metroBpm: 80, metroBeats: 4 });
    expect(normalizePrefs({ metroBpm: 96, metroBeats: 3 })).toMatchObject({ metroBpm: 96, metroBeats: 3 });
    expect(normalizePrefs({ metroBpm: 999, metroBeats: 5 })).toMatchObject({ metroBpm: 250, metroBeats: 4 });
    expect(normalizePrefs({ metroBpm: 'fast' })).toMatchObject({ metroBpm: 80 });
  });
});
