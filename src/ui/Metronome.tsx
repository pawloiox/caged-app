import * as Popover from '@radix-ui/react-popover';
import { useRef } from 'react';
import { engine } from '../audio/engine';
import { setMetroBpm, tapTempo, toggleMetronome, useMetroBeat, useMetronomePlaying } from '../audio/metronome';
import { setPrefs, usePrefs } from '../store/app';
import { METRO_MAX, METRO_MIN, type MetroBeats } from '../store/types';
import { Seg } from './controls';

const BEATS: ReadonlyArray<readonly [MetroBeats, string]> = [
  [1, '1'],
  [2, '2'],
  [3, '3'],
  [4, '4'],
  [6, '6'],
];

/**
 * A little pyramid metronome: the knob strip's button for it. While it plays, the pendulum swings in time, reaching
 * each side on a click (it is moved by the beats themselves, so it never drifts from the sound).
 */
function MetronomeIcon({ swing, spb }: { swing: number; spb: number }) {
  return (
    <svg className="metro-icon" width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
      <path d="M7 1.5h8l5.5 22.5h-19z" fill="#3a2317" stroke="currentColor" strokeOpacity="0.55" />
      <path d="M8.6 3.6h4.8l3.3 15.4h-11.4z" fill="#ded6c6" />
      {[7, 10, 13].map((y) => (
        <rect key={y} x="10.2" y={y} width="1.6" height="0.7" fill="#3a2317" opacity="0.5" />
      ))}
      <rect x="1.5" y="21.6" width="19" height="2.9" rx="0.8" fill="#24160d" />
      <g className="metro-arm" style={{ transform: `rotate(${swing}deg)`, transitionDuration: `${spb}s` }}>
        <rect x="10.4" y="3" width="1.2" height="17.5" rx="0.6" fill="#2d2a26" />
        <rect x="8.9" y="7.4" width="4.2" height="3.2" rx="0.6" fill="#a7b0b5" stroke="#2d2a26" strokeWidth="0.5" />
      </g>
      <circle cx="11" cy="20" r="1.3" fill="#2d2a26" />
    </svg>
  );
}

export function MetronomeMenu() {
  const playing = useMetronomePlaying();
  const bpm = usePrefs((p) => p.metroBpm);
  const beats = usePrefs((p) => p.metroBeats);
  const clickVol = usePrefs((p) => p.clickVol);
  const muted = usePrefs((p) => p.muted);
  const { beat, side } = useMetroBeat();
  const taps = useRef<number[]>([]);
  const spb = 60 / bpm;
  const lights = beats > 1 ? beats : 1;
  return (
    <Popover.Root>
      <Popover.Trigger
        className={`knob-btn metro${playing ? ' playing' : ''}`}
        aria-label={playing ? `Metronome, playing at ${bpm} BPM` : 'Metronome'}
      >
        <MetronomeIcon swing={playing ? side * 18 : 0} spb={playing ? spb : 0.3} />
        <span className="knob-label">{playing ? `${bpm} BPM` : 'Metronome'}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="menu metro-menu"
          sideOffset={6}
          align="end"
          collisionPadding={12}
          aria-label="Metronome"
        >
          <h2 className="card-title">Metronome</h2>
          <div className="metro-tempo">
            <button
              type="button"
              className="btn metro-step"
              onClick={() => setMetroBpm(bpm - 1)}
              disabled={bpm <= METRO_MIN}
              aria-label="Slower"
            >
              −
            </button>
            <output className="metro-bpm" aria-live="polite">
              <b>{bpm}</b> BPM
            </output>
            <button
              type="button"
              className="btn metro-step"
              onClick={() => setMetroBpm(bpm + 1)}
              disabled={bpm >= METRO_MAX}
              aria-label="Faster"
            >
              +
            </button>
          </div>
          <input
            type="range"
            min={METRO_MIN}
            max={METRO_MAX}
            step={1}
            value={bpm}
            onChange={(e) => setMetroBpm(Number(e.target.value))}
            aria-label="Tempo"
            aria-valuetext={`${bpm} BPM`}
          />
          <button
            type="button"
            className="btn"
            onClick={() => {
              const r = tapTempo(taps.current, performance.now());
              taps.current = r.taps;
              if (r.bpm != null) setMetroBpm(r.bpm);
            }}
          >
            Tap tempo
          </button>
          <Seg
            value={beats}
            options={BEATS}
            onChange={(v) => setPrefs({ metroBeats: v })}
            label="Beats per bar"
            className="beats"
          />
          {/* One light per beat of the bar, the first bigger; the one just clicked is lit. */}
          <div className="metro-lights" aria-hidden="true">
            {Array.from({ length: lights }, (_, i) => (
              <span key={i} className={`${i === 0 && lights > 1 ? 'one' : ''}${beat === i ? ' on' : ''}`} />
            ))}
          </div>
          <label className="field">
            <span className="field-label">Click volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={clickVol}
              onChange={(e) => setPrefs({ clickVol: Number(e.target.value) })}
              aria-label="Click volume"
            />
          </label>
          {muted ? (
            <p className="menu-note muted">
              The sound is off.{' '}
              <button
                type="button"
                className="tap-link"
                onClick={() => {
                  engine.ensure();
                  setPrefs({ muted: false });
                }}
              >
                Turn it on
              </button>
            </p>
          ) : null}
          <button type="button" className="btn primary" onClick={toggleMetronome}>
            {playing ? 'Stop' : 'Start'}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
