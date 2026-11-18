# CAGED Lab

Learn the CAGED system on guitar in five guided steps, with a fretboard explorer, a 15-minute daily routine,
spaced-repetition drills, and a listening mode that hears what you play. Installable PWA; works offline.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run check        # typecheck + lint + unit/golden tests
npm run build        # production build into dist/ (with service worker)
npm run e2e          # Playwright: flows, axe, phone layout, offline, timing (builds must exist)
```

On WSL or a bare Linux box, Playwright's Chromium may miss system libraries. Either run
`sudo npx playwright install-deps chromium`, or point `LD_LIBRARY_PATH` at user-local copies of
`libnspr4`, `libnss3` and `libasound2` (download them with `apt-get download` and unpack with `dpkg-deb -x`).

## Layout

```
src/theory/      pure music logic (shapes, spelling, instances, voicings, pentatonic, planner, progressions)
src/audio/       engine (voices, buses), transport (Tone.js), ks (Karplus-Strong), mic/ (worklet, DSP, listener)
src/fretboard/   <Fretboard> SVG (horizontal + upright neck), legend, tab, CAGED ring, shapes table
src/lessons/     Steps 1–5 and the shared neck map + linking drill
src/explore/ src/practice/ src/train/ src/listen/ src/print/
src/store/       Zustand stores, ProgressRepository (Dexie), step criteria
tests/           Vitest: golden theory tests, DSP accuracy, store and Leitner
e2e/             Playwright specs
docs/adr/        decisions
```

Deploy: any static host. `vercel.json` handles SPA rewrites and the microphone permissions policy.
See `HANDOFF.md` for status, scores to aim for and what's next.
