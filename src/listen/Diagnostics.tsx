import { useState } from 'react';
import { engine } from '../audio/engine';
import { timingSelfTest } from '../audio/transport';
import { PageHead } from '../ui/controls';

export default function Diagnostics() {
  const [res, setRes] = useState<string>('');
  const [busy, setBusy] = useState(false);
  return (
    <>
      <PageHead
        eyebrow="Diagnostics"
        title="Audio timing self-test"
        lede="Renders five minutes of a 140 BPM click track offline on the same Transport the drills use, and reports how far any beat lands from its ideal time."
      />
      <section className="bench" aria-label="Timing test">
        <div className="actions">
          <button
            type="button"
            className="btn primary"
            disabled={busy}
            onClick={async () => {
              engine.ensure();
              setBusy(true);
              const r = await timingSelfTest(140, 300);
              setBusy(false);
              setRes(`${r.beats} beats in 5:00 at 140 BPM. Worst deviation: ${r.maxErrorMs.toFixed(3)} ms.`);
            }}
          >
            {busy ? 'Rendering…' : 'Run the 5-minute test'}
          </button>
        </div>
        <p role="status" data-testid="timing-result">
          {res}
        </p>
        <p className="muted">Engine: {engine.sampled ? 'sampled guitar' : 'physical-model guitar (Karplus-Strong)'}.</p>
      </section>
    </>
  );
}
