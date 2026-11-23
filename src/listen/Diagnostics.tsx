import { useEffect, useState } from 'react';
import { engine } from '../audio/engine';
import { useMic } from '../audio/mic/listener';
import { timingSelfTest } from '../audio/transport';
import { PageHead } from '../ui/controls';
import { announce, usePrefs } from '../store/app';

type Status = {
  supported: boolean;
  state: AudioContextState | 'not started';
  rate: number;
  latencyMs: number | null;
  refused: string;
};

function readStatus(): Status {
  const supported =
    typeof window !== 'undefined' &&
    !!(window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext);
  const ctx = engine.ctx;
  const lat = ctx ? ctx.outputLatency || ctx.baseLatency || 0 : 0;
  return {
    supported,
    state: ctx ? ctx.state : 'not started',
    rate: ctx?.sampleRate ?? 0,
    latencyMs: ctx && lat > 0 ? Math.round(lat * 1000) : null,
    refused: engine.refused,
  };
}

const STATE: Record<Status['state'], string> = {
  running: 'Running',
  suspended: 'Waiting: the browser has not let it start',
  closed: 'Closed',
  interrupted: 'Interrupted by the device',
  'not started': 'Not started yet (it starts on your first tap)',
};

/** What to do about the sound, from what this browser reports. */
function verdict(st: Status, muted: boolean, micOn: boolean): string {
  if (!st.supported) return 'This browser has no Web Audio, so the app cannot make sound here. Try another browser.';
  if (muted) return 'The Sound knob is off in this browser. Turn it on with the knob next to View.';
  if (st.state !== 'running')
    return 'The browser has not let sound start. In Chrome, tap the icon left of the address, open Site settings, allow Sound, and play the test note again.';
  if (micOn)
    return 'Sound is running, but the microphone is on. On Android that can send sound to the earpiece: stop the microphone with the Mic light and try again.';
  return 'Sound is running. If you heard nothing, turn up the media volume, and in Chrome check that Sound is allowed for this site: a muted site still reports running.';
}

export default function Diagnostics() {
  const [res, setRes] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [st, setSt] = useState(readStatus);
  const [check, setCheck] = useState('');
  const muted = usePrefs((p) => p.muted);
  const micOn = useMic((m) => m.status === 'on');

  // The audio state changes outside React (taps elsewhere, the device), so look again twice a second.
  useEffect(() => {
    const id = window.setInterval(() => setSt(readStatus()), 500);
    return () => window.clearInterval(id);
  }, []);

  const testNote = () => {
    engine.ensure();
    engine.playNote(64, 0, 0.85);
    window.setTimeout(() => {
      const now = readStatus();
      setSt(now);
      const m = verdict(now, usePrefs.getState().muted, useMic.getState().status === 'on');
      setCheck(m);
      announce(m);
    }, 400);
  };

  const rows: Array<[string, string]> = [
    ['Web Audio', st.supported ? 'Available' : 'Not available'],
    ['Audio engine', STATE[st.state] ?? st.state],
    ['Sample rate', st.rate ? `${st.rate.toLocaleString('en')} Hz` : 'Not known yet'],
    ['Output latency', st.latencyMs != null ? `${st.latencyMs} ms` : 'Not reported'],
    ['Sound knob', muted ? 'Off' : 'On'],
    ['Microphone', micOn ? 'On' : 'Off'],
  ];
  if (st.refused) rows.push(['Last refusal', st.refused]);

  return (
    <>
      <PageHead
        title="Audio check"
        lede="Why there is no sound on this device, and whether the timing holds. Everything here is what this browser reports; nothing is sent anywhere."
      />
      <section className="bench" aria-labelledby="sound-h">
        <h2 id="sound-h">Sound on this device</h2>
        <table className="tab audio-status">
          <caption className="sr-only">What this browser reports about sound</caption>
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k}>
                <th scope="row">{k}</th>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="actions">
          <button type="button" className="btn primary" onClick={testNote}>
            Play a test note
          </button>
        </div>
        <p data-testid="sound-check">{check}</p>
      </section>
      <section className="bench" aria-labelledby="timing-h">
        <h2 id="timing-h">Timing</h2>
        <p>
          Renders five minutes of a 140 BPM click track offline on the same Transport the drills use, and reports how
          far any beat lands from its ideal time.
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              engine.ensure();
              setBusy(true);
              const r = await timingSelfTest(140, 300);
              setBusy(false);
              const m = `${r.beats} beats in 5:00 at 140 BPM. Worst deviation: ${r.maxErrorMs.toFixed(3)} ms.`;
              setRes(m);
              announce(m);
            }}
          >
            {busy ? 'Rendering…' : 'Run the 5-minute test'}
          </button>
        </div>
        <p data-testid="timing-result">{res}</p>
        <p className="muted">Engine: physical-model guitar (Karplus-Strong).</p>
      </section>
    </>
  );
}
