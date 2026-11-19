import * as Dialog from '@radix-ui/react-dialog';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { listener, useMic, type MicStatus } from '../audio/mic/listener';
import { announce, setPrefs, toast, usePrefs } from '../store/app';

/** One permission prompt with a clear explanation. Never blocks progress: every drill has a no-mic path. */
export function MicPermissionDialog({
  open,
  onOpenChange,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStarted?: (s: MicStatus) => void;
}) {
  const [busy, setBusy] = useState(false);
  const allow = async () => {
    setBusy(true);
    const s = await listener.start();
    setBusy(false);
    if (s === 'on') {
      setPrefs({ micWanted: true });
      onOpenChange(false);
      toast('Listening. Play a note to test it.');
      announce('Listening. Play a note to test it.');
    } else
      announce(
        s === 'denied'
          ? 'The browser blocked the microphone. Allow it in the site settings, then try again.'
          : s === 'unsupported'
            ? "This browser can't listen. The drills still work without the mic."
            : "The microphone couldn't start. The drills still work without it.",
      );
    onStarted?.(s);
  };
  const status = useMic((m) => m.status);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay" />
        <Dialog.Content className="dialog" aria-describedby="mic-desc">
          <Dialog.Title asChild>
            <h2>Let CAGED Lab hear your guitar</h2>
          </Dialog.Title>
          <div id="mic-desc" className="flex flex-col gap-3">
            <p>With the microphone on, drills check what you actually play instead of asking you to grade yourself.</p>
            <ul>
              <li>Sound is analysed on this device only. Nothing is recorded or uploaded.</li>
              <li>
                <strong>Headphones help:</strong> without them the mic also hears the app's own guitar, so the app stays
                quiet while it listens.
              </li>
              <li>Tune up and measure your latency once on the Tuner page for the most accurate timing.</li>
              <li>You can always use the drills without the mic.</li>
            </ul>
            {status === 'denied' ? (
              <p className="callout warn">
                The browser blocked the microphone. Allow it in the site settings (the icon left of the address bar),
                then try again.
              </p>
            ) : status === 'unsupported' ? (
              <p className="callout warn">
                This browser can't listen (it needs AudioWorklet and microphone access, over HTTPS). The no-mic versions
                of every drill still work.
              </p>
            ) : status === 'error' ? (
              <p className="callout warn">The microphone couldn't start: {useMic.getState().error}</p>
            ) : null}
          </div>
          <div className="actions">
            <button type="button" className="btn primary" onClick={allow} disabled={busy}>
              {busy ? 'Asking the browser…' : 'Turn on listening'}
            </button>
            <Dialog.Close asChild>
              <button type="button" className="btn ghost">
                Not now
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Inline control for a drill: shows mic state and offers to turn it on. */
export function MicToggle({ children }: { children?: ReactNode }) {
  const status = useMic((m) => m.status);
  const headphones = usePrefs((p) => p.headphones);
  const [open, setOpen] = useState(false);
  if (status === 'on')
    return (
      <span className="heard">
        <span className="tag ok">● Listening</span>
        {headphones ? (
          <span className="muted">Headphones on: the app plays along.</span>
        ) : (
          <span className="muted">The app stays quiet while it listens (no headphones).</span>
        )}
        <button type="button" className="btn small ghost" onClick={() => listener.stop()}>
          Stop listening
        </button>
        {children}
      </span>
    );
  return (
    <span className="heard">
      <button type="button" className="btn small" onClick={() => setOpen(true)}>
        Check me with the mic
      </button>
      <span className="muted">
        or carry on without it.{' '}
        <Link to="/tuner" className="tap-link">
          Tuner and setup
        </Link>
      </span>
      <MicPermissionDialog open={open} onOpenChange={setOpen} />
    </span>
  );
}

export function MicLevel() {
  const level = useMic((m) => m.level);
  const pct = Math.max(0, Math.min(100, ((level + 70) / 70) * 100));
  return (
    <div
      className="meter"
      role="meter"
      aria-label="Input level"
      aria-valuemin={-70}
      aria-valuemax={0}
      aria-valuenow={Math.round(level)}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}
