/**
 * Listening mode: getUserMedia → AudioWorklet → pitch (McLeod via pitchy), onsets and chroma.
 * Events carry audio-clock times (the same clock as the Transport), corrected by the measured latency.
 */
import { create } from 'zustand';
import workletUrl from './capture.worklet.js?url';
import { engine } from '../engine';
import { NoteStabilizer, OnsetDetector, PitchTracker, addChroma, chromaOf, rms, toDb, type PitchReading } from './dsp';

export type MicStatus = 'off' | 'starting' | 'on' | 'denied' | 'unsupported' | 'error';

export type MicEvent =
  | { type: 'note'; midi: number; t: number; reading: PitchReading }
  | { type: 'onset'; t: number }
  | { type: 'strum'; t: number; chroma: Float32Array };

interface MicState {
  status: MicStatus;
  /** dBFS of the input, about −90…0 */
  level: number;
  reading: PitchReading | null;
  lastNote: number | null;
  error: string;
}

export const useMic = create<MicState>(() => ({ status: 'off', level: -90, reading: null, lastNote: null, error: '' }));

type Sub = (e: MicEvent) => void;

const FRAME = 2048;
const CHROMA_FRAME = 4096;
const RING = 8192;
const STRUM_WINDOW = 0.15;

class Listener {
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private subs = new Set<Sub>();
  private ring = new Float32Array(RING);
  private w = 0;
  private filled = 0;
  private tracker = new PitchTracker(FRAME);
  private stab = new NoteStabilizer(60);
  private onsets = new OnsetDetector();
  private strum: { start: number; acc: Float32Array; hops: number } | null = null;
  private lastUi = 0;
  /** Seconds between a sound happening and its arrival here (set by calibration). */
  latency = 0;

  on(fn: Sub): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  get supported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioWorkletNode !== 'undefined'
    );
  }

  async start(): Promise<MicStatus> {
    if (useMic.getState().status === 'on') return 'on';
    if (!this.supported) {
      useMic.setState({ status: 'unsupported' });
      return 'unsupported';
    }
    const ctx = engine.ensure();
    if (!ctx) {
      useMic.setState({ status: 'unsupported' });
      return 'unsupported';
    }
    useMic.setState({ status: 'starting', error: '' });
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
      });
    } catch (e) {
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
      useMic.setState({ status: denied ? 'denied' : 'error', error: e instanceof Error ? e.message : String(e) });
      return denied ? 'denied' : 'error';
    }
    try {
      await ctx.audioWorklet.addModule(workletUrl);
      this.source = ctx.createMediaStreamSource(this.stream);
      this.node = new AudioWorkletNode(ctx, 'caged-capture', { numberOfInputs: 1, numberOfOutputs: 0 });
      this.node.port.onmessage = (ev: MessageEvent<{ samples: Float32Array; t: number }>) =>
        this.block(ev.data.samples, ev.data.t, ctx.sampleRate);
      this.source.connect(this.node);
    } catch (e) {
      this.stop();
      useMic.setState({ status: 'error', error: e instanceof Error ? e.message : String(e) });
      return 'error';
    }
    useMic.setState({ status: 'on' });
    return 'on';
  }

  stop(): void {
    this.node?.port.close();
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.node = null;
    this.source = null;
    this.stream = null;
    this.filled = 0;
    if (useMic.getState().status === 'on' || useMic.getState().status === 'starting')
      useMic.setState({ status: 'off', level: -90, reading: null });
  }

  private emit(e: MicEvent): void {
    this.subs.forEach((s) => s(e));
  }

  private frame(n: number): Float32Array {
    const out = new Float32Array(n);
    const start = (this.w - n + RING) % RING;
    for (let i = 0; i < n; i++) out[i] = this.ring[(start + i) % RING]!;
    return out;
  }

  private block(samples: Float32Array, tEnd: number, sr: number): void {
    for (let i = 0; i < samples.length; i++) {
      this.ring[this.w] = samples[i]!;
      this.w = (this.w + 1) % RING;
    }
    this.filled = Math.min(RING, this.filled + samples.length);
    const t = tEnd - this.latency;
    const tMs = t * 1000;
    const level = rms(samples);

    if (this.onsets.push(level, tMs)) {
      const onsetT = t - samples.length / sr / 2;
      this.emit({ type: 'onset', t: onsetT });
      this.stab.rearm();
      this.strum = { start: onsetT, acc: new Float32Array(12), hops: 0 };
    }

    let reading: PitchReading | null = null;
    if (this.filled >= FRAME && level > 0.002) reading = this.tracker.read(this.frame(FRAME), sr);
    const stable = this.stab.push(reading ? reading.midi : null, tMs);
    if (stable != null && reading) {
      this.emit({ type: 'note', midi: stable, t: t - 0.06, reading });
      useMic.setState({ lastNote: stable });
    }

    if (this.strum) {
      const s = this.strum;
      if (t - s.start >= 0.03 && this.filled >= CHROMA_FRAME && s.hops++ % 2 === 0)
        addChroma(s.acc, chromaOf(this.frame(CHROMA_FRAME), sr));
      if (t - s.start >= STRUM_WINDOW) {
        this.emit({ type: 'strum', t: s.start, chroma: s.acc });
        this.strum = null;
      }
    }

    const now = performance.now();
    if (now - this.lastUi > 60) {
      this.lastUi = now;
      useMic.setState({ level: toDb(level), reading: reading ?? useMic.getState().reading });
    }
  }
}

export const listener = new Listener();

export const micOn = (): boolean => useMic.getState().status === 'on';
