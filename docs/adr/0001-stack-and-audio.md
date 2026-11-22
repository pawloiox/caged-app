# ADR 0001: Stack, routing and audio voices

Date: 2026-11-18 · Status: accepted

## Context

The handoff recommends Vite + React + TypeScript, Zustand, Dexie, Radix, Tailwind, Tone.js (Transport + Sampler),
pitchy, vite-plugin-pwa, Vitest and Playwright. We followed it, with three deliberate deviations.

## Decisions

1. **React Router 8 instead of TanStack Router.** The handoff allows either. React Router's data router gives typed
   params for the small route table (`/learn/:n`, `/explore`, `/practice`, `/train/:mode`, `/tuner`, `/print`) with
   less setup. Static SPA; `vercel.json` rewrites deep links to `index.html`.

2. **TypeScript 6.0, not 7.0.** TypeScript 7 is the latest, but `typescript-eslint` 8.x supports `<6.1`. We pin
   `~6.0.3` so lint runs in CI. Revisit when typescript-eslint supports 7.

3. **Voices: native buffer sources driven by Tone's Transport, playing a Karplus-Strong guitar.**
   - Tone.js is used for what it is best at here: the Transport (sample-accurate, lookahead scheduling, tempo changes)
     and Draw (UI callbacks at audio time). It is lazy-loaded in its own chunk.
   - Notes are played by a small native engine (`src/audio/engine.ts`) on the same `AudioContext`, which gives us
     per-string voices with damping, strum direction, velocity layers, round-robin variants, and separate guitar and
     metronome buses.
   - **No recorded samples.** The handoff asked for a multisampled guitar with Karplus-Strong as a fallback. The
     owner later decided (2026-11-22) that the synth sound is final, and the sample loader was removed. The engine uses
     an improved Karplus-Strong model
     (fractional-delay tuning, pick-position comb, velocity brightness) rendered to cached buffers. That replaces the
     handoff's "KS AudioWorklet fallback": rendering once per note/variant is cheaper than a live worklet and is
     unit-tested for tuning (within 6 cents across the neck).

## Consequences

- The sound needs no downloads or licences and works offline from the first visit.
- Listening tests (`tests/dsp.test.ts`) use the same KS renderer to synthesise guitar input. That proves the pipeline
  but is not a substitute for recordings of a real guitar (see HANDOFF.md, open items).
