import { useState } from 'react';
import { Link } from 'react-router';
import { engine } from '../audio/engine';
import { calibrateLatency } from '../audio/mic/calibration';
import { listener, useMic } from '../audio/mic/listener';
import { Fretboard } from '../fretboard/Fretboard';
import { announce, setPrefs, toast, usePrefs } from '../store/app';
import { BOTH_NAMES, OPEN, STRING_NAME, midiToFreq, posName, positionsOfMidi } from '../theory';
import { Card, Check, PageHead } from '../ui/controls';
import { MicLevel, MicPermissionDialog } from './MicControls';

const NOTE = (m: number) => `${BOTH_NAMES[m % 12]}${Math.floor(m / 12) - 1}`;

export default function Tuner() {
  const mic = useMic();
  const prefs = usePrefs();
  const [open, setOpen] = useState(false);
  const [cal, setCal] = useState<{ running: boolean; i: number; msg: string }>({ running: false, i: 0, msg: '' });
  const r = mic.reading;
  // Nearest open string, for tuning.
  const target = r
    ? OPEN.reduce(
        (best, m) => (Math.abs(m - (r.midi + r.cents / 100)) < Math.abs(best - (r.midi + r.cents / 100)) ? m : best),
        OPEN[0] as number,
      )
    : null;
  const centsOff = r && target != null ? Math.round(1200 * Math.log2(r.hz / midiToFreq(target))) : null;
  const tuning = centsOff != null && Math.abs(centsOff) <= 60;
  const shown = tuning ? centsOff! : (r?.cents ?? 0);
  const inTune = r && Math.abs(shown) <= 5;
  const where = mic.lastNote != null ? positionsOfMidi(mic.lastNote) : [];

  const calibrate = async () => {
    setCal({ running: true, i: 0, msg: '' });
    const lat = await calibrateLatency((i) => setCal((c) => ({ ...c, i })));
    const msg =
      lat == null
        ? "Couldn't hear enough strums. Turn the guitar up, strum a muted chord right on each click, and try again."
        : `Latency measured: ${Math.round(lat * 1000)} ms. Drills will allow for it.`;
    if (lat != null) {
      setPrefs({ micLatency: lat });
      toast('Latency saved.');
    }
    setCal({ running: false, i: 0, msg });
    announce(msg);
  };

  return (
    <>
      <PageHead
        eyebrow="Listening mode"
        title="Tuner and setup"
        lede="Turn on the mic once, tune up, and measure your latency. Then drills can hear what you play: single notes, pivots on the shared root, and whole strums."
      />
      <section className="bench" aria-label="Microphone">
        {mic.status === 'on' ? (
          <div className="actions">
            <span className="heard">
              <span className="tag ok">● Listening</span>
            </span>
            <button type="button" className="btn" onClick={() => listener.stop()}>
              Stop listening
            </button>
          </div>
        ) : (
          <div className="actions">
            <button type="button" className="btn primary big" onClick={() => setOpen(true)}>
              Turn on listening
            </button>
            <span className="muted">Analysed on this device only. Nothing is recorded or uploaded.</span>
          </div>
        )}
        <MicPermissionDialog open={open} onOpenChange={setOpen} />
        <div>
          <p className="muted">Input level</p>
          <MicLevel />
        </div>
        <Check checked={prefs.headphones} onChange={(v) => setPrefs({ headphones: v })}>
          I'm using headphones (recommended: the app can then play along while it listens)
        </Check>
      </section>
      <section className="bench" aria-label="Tuner">
        <h2>Tuner</h2>
        <div className="tuner" aria-live="off">
          <div className="note">{r ? (tuning ? NOTE(target!) : NOTE(r.midi)) : '–'}</div>
          <p className="muted">
            {r
              ? tuning
                ? `${STRING_NAME[OPEN.indexOf(target as 40)]} string · ${r.hz.toFixed(1)} Hz`
                : `${r.hz.toFixed(1)} Hz`
              : mic.status === 'on'
                ? 'Play a single open string.'
                : 'Turn on listening to tune.'}
          </p>
          <div
            className="cents"
            role="meter"
            aria-label="Tuning, in cents"
            aria-valuemin={-50}
            aria-valuemax={50}
            aria-valuenow={r ? shown : 0}
            aria-valuetext={
              r ? (inTune ? 'in tune' : shown < 0 ? `${-shown} cents flat` : `${shown} cents sharp`) : 'no note'
            }
          >
            <span className="zone" />
            <span className="mid" />
            {r ? <span className="needle" style={{ left: `${50 + Math.max(-50, Math.min(50, shown))}%` }} /> : null}
          </div>
          <p>
            <strong style={{ color: inTune ? 'var(--good)' : undefined }}>
              {r
                ? inTune
                  ? 'In tune'
                  : shown < 0
                    ? `${-shown} cents flat: tighten`
                    : `${shown} cents sharp: loosen`
                : ''}
            </strong>
          </p>
        </div>
        <div className="actions">
          <span className="muted">Reference tones:</span>
          {OPEN.map((m, s) => (
            <button
              key={s}
              type="button"
              className="btn small"
              onClick={() => engine.playNote(m, 0, 0.9, s, { s, f: 0 })}
            >
              {STRING_NAME[s]}
            </button>
          ))}
        </div>
      </section>
      <section className="bench" aria-label="Latency">
        <h2>Measure latency</h2>
        <p>
          You'll hear eight clicks. Strum a muted chord (or tap the strings) exactly on each one. The app times the gap
          between click and sound, so it can judge your timing fairly.
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            disabled={mic.status !== 'on' || cal.running}
            onClick={calibrate}
          >
            {cal.running ? `Click ${cal.i} of 8…` : 'Start the 8 clicks'}
          </button>
          <span className="muted">
            Saved latency: {prefs.micLatency != null ? `${Math.round(prefs.micLatency * 1000)} ms` : 'not measured yet'}
          </span>
        </div>
        {cal.msg ? <p className="muted">{cal.msg}</p> : null}
      </section>
      <section className="bench" aria-label="Note finder">
        <h2>What did I just play?</h2>
        <p className="muted">Play any single note: it shows every place on the neck where that exact note lives.</p>
        <p className="heard">
          {mic.lastNote != null ? (
            <>
              <span className="tag ok">{NOTE(mic.lastNote)}</span> {where.map((p) => posName(p.s, p.f)).join(' · ')}
            </>
          ) : (
            'Nothing yet.'
          )}
        </p>
        <Fretboard
          dots={where.map((p) => ({ s: p.s, f: p.f, colors: ['var(--accent)'], label: '', root: true }))}
          label="Where the last note you played can be found"
        />
      </section>
      <div className="cards">
        <Card title="Why headphones?">
          <p>
            Without them, the mic hears the app's guitar as well as yours. So in listening drills the app stays quiet
            and only clicks. With headphones it can play along.
          </p>
        </Card>
        <Card title="No mic? No problem">
          <p>
            Every drill still works without listening: you confirm what you played yourself. The mic just makes the
            checks honest.
          </p>
          <p>
            <Link to="/diagnostics">Audio timing self-test</Link>
          </p>
        </Card>
      </div>
    </>
  );
}
