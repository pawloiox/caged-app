# CAGED Lab: handoff to Claude Code

> **Status (2026-11-19): the critic phase is complete.** Phases 0–3 are built and tested. Six independent critic passes have run; critic 6 scored `round-6` **9 overall with no area below 8.5**, meeting the bar (scores in section 2, history in [section 13](#13-critic-rounds)). At the user's request there is no 7th critic round. `round-6.1` = `round-6` plus fixes for critic 6's findings; it passes every check (61 unit, 52 E2E tests) but has not had its own critic pass. See [section 11](#11-build-status-round-1) for what is done and not verified, and [section 12](#12-deferred-critic-pass-how-to-run-it) for how to run the next critic pass.

You are taking over **CAGED Lab**, an interactive app that teaches guitarists the CAGED system. It currently exists as a single self-contained HTML file (`caged-lab-v5-reference.html`, next to this document). It was built inside a sandboxed hosted page, so it had no microphone, no build step, no packages and no backend. Those limits are gone. Your job is to rebuild it as a production-grade app on the best stack for the job, **keeping everything that was verified** and adding what the sandbox made impossible. The most important new capability is **listening to the learner's guitar**.

Read this whole document before writing code. Treat the reference HTML as the source of truth for behaviour and music data. Treat this document as the source of truth for priorities and architecture.

---

## 1. Product in one paragraph

An intermediate-beginner guitarist, with the guitar in hand, learns the CAGED system in five guided steps:

1. Open chords C, A, G, E and D, and their roots.
2. Moving shapes with an index-finger barre.
3. C major in all five shapes up the neck, linked by shared roots.
4. Any chord in any key: the C-A-G-E-D loop starts at a different shape.
5. Making it musical: progressions inside one zone of the neck, partial shapes and arpeggios.

Around the steps sit a **fretboard explorer** (all 24 major/minor chords, five shapes each, pentatonic boxes), a **15-minute daily routine** with a timer, and **Train**: spaced-repetition drills for eye, hand and ear. Every step has explicit "to finish this step" criteria that require **doing**, not clicking.

## 2. Where the reference stands

It went through three independent review rounds. Each was scored 1–10 by a critic agent.

| Version                          | Music                                                                           | Pedagogy | UX  | A11y | Engineering | Overall |
| -------------------------------- | ------------------------------------------------------------------------------- | -------- | --- | ---- | ----------- | ------- |
| v2                               | 8                                                                               | 7        | 7   | 6    | 7           | 7       |
| v3                               | 8                                                                               | 7        | 7   | 7    | 7           | 7       |
| **v4/v5 (reference)**            | 8.5                                                                             | 8        | 7.5 | 7    | 7.5         | **8**   |
| Rebuild `round-1.1` (critic 1)   | 9                                                                               | 8.5      | 7.5 | 7.5  | 8           | 8       |
| Rebuild `round-2` (critic 2)     | 9                                                                               | 8.5      | 8   | 8    | 8.5         | 8.5     |
| Rebuild `round-3` (critic 3)     | 9                                                                               | 8.5      | 8   | 8    | 8           | 8.5     |
| Rebuild `round-4` (critic 4)     | 9.5                                                                             | 8.5      | 8.5 | 8    | 8           | 8.5     |
| Rebuild `round-5` (critic 5)     | 9.5                                                                             | 8.5      | 8.5 | 8.5  | 8.5         | 8.5     |
| **Rebuild `round-6` (critic 6)** | 9.5                                                                             | 9        | 9   | 8.5  | 9           | **9**   |
| Rebuild `round-6.1`              | not reviewed (round-6 + fixes for critic 6's findings; no 7th round by request) |          |     |      |             |         |

**The bar for the rebuild is 9+ overall, with no area below 8.** Reaching parity with the reference is phase 1, not the goal.

## 3. Recommended stack (decide quickly, then build)

The goals are a fast interactive SVG UI, sample-accurate audio, real-time microphone analysis, offline use on a phone, and strong testing. Use current stable versions, check them when you install, and commit the lockfile.

| Concern         | Choice                                                                                                                                                                   | Why                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| App             | **Vite + React + TypeScript (strict)**                                                                                                                                   | An SPA is enough (no SEO or SSR needs). It has the largest ecosystem and fast HMR.            |
| Routing         | TanStack Router (or React Router)                                                                                                                                        | Typed routes: `/learn/1…5`, `/explore`, `/practice`, `/train/:mode`.                          |
| State           | **Zustand** for UI and session state; domain logic stays pure                                                                                                            | Small and testable, with no provider sprawl.                                                  |
| Persistence     | **Dexie (IndexedDB)** behind a `ProgressRepository` interface                                                                                                            | Offline-first. An optional sync backend can replace it later without UI changes.              |
| UI primitives   | **Radix UI** (radio group, toggle group, dialog, tooltip, tabs)                                                                                                          | Correct keyboard and ARIA behaviour for free. The reference hand-rolled this.                 |
| Styling         | Tailwind CSS for layout plus **CSS-variable design tokens** (port the reference `:root` palette, with light and dark themes)                                             | Tokens keep the fretboard, shapes and themes consistent.                                      |
| Fretboard       | Custom **React SVG components** (no canvas)                                                                                                                              | Accessible, crisp, easy to animate. Port `board()` from the reference.                        |
| Audio engine    | **Tone.js** (Transport for scheduling, Sampler for playback)                                                                                                             | Replaces the hand-written lookahead clock. Gives tempo changes, count-ins and swing for free. |
| Guitar sound    | Multisampled steel-string guitar (properly licensed or CC0), one sample per string per few frets, with round-robin. **Keep Karplus-Strong as an AudioWorklet fallback.** | The reference's synthesised string is good but not commercial quality.                        |
| Microphone      | getUserMedia → **AudioWorklet** → pitch detection (**pitchy** / McLeod) for single notes; **chroma** (Meyda or your own FFT) for chord checks                            | This unlocks real "play it and the app checks you" drills (section 7).                        |
| PWA             | vite-plugin-pwa                                                                                                                                                          | Installable on a phone, works offline, practise anywhere.                                     |
| Tests           | **Vitest** (theory golden tests, store logic), **Playwright** (E2E flows), **@axe-core/playwright** (a11y)                                                               | The music data must never regress (section 6).                                                |
| Quality         | ESLint + Prettier, `tsc --noEmit` in CI, GitHub Actions                                                                                                                  |                                                                                               |
| Hosting         | Vercel (or Cloudflare Pages), static deploy                                                                                                                              | The user already has a Vercel connection available.                                           |
| Later, optional | Supabase (auth + Postgres) behind the same repository interface                                                                                                          | Cross-device progress. **Not in v1.** Ask the user before adding accounts.                    |

If you have a strong, evidence-based reason to deviate (for example SvelteKit), write a short ADR in `docs/adr/` and continue. Don't stall on it.

## 4. Architecture

```
src/
  theory/        # PURE TypeScript. No DOM, no audio. 100% unit-tested.
    tuning.ts      shapes.ts   fingers.ts   voicings.ts   spell.ts
    instances.ts   pentatonic.ts   planner.ts   progressions.ts
  audio/
    engine.ts      # Tone.js setup, master chain, mute, sampler + KS fallback
    transport.ts   # count-in, beat events → UI (replaces the reference clockStart/clockTick)
    mic/           # worklet, pitch.ts (McLeod), chroma.ts, calibration.ts
  fretboard/       # <Fretboard>, <Dot>, <ZoneBar>, <Ghost>, <Barre>, legend, keyboard nav hook
  lessons/step1…step5/
  explore/  practice/  train/   # train has modes + Leitner scheduler
  store/          # zustand slices; repository interfaces; dexie implementation
  ui/             # tokens, layout, Radix wrappers, toast, live region
tests/  e2e/  docs/adr/
```

Rules:

- **`theory/` is the crown jewel.** Port it first, line by line from the reference, and lock it with golden tests (section 6) before building UI.
- Components never compute music. They call `theory/`.
- Audio events come back to the UI through one event bus or store, scheduled on the audio clock. **Never use `setTimeout` for musical timing.**
- Each lesson owns a small state machine (idle → playing → asking → done). Use XState if it helps; otherwise a typed reducer.

## 5. Verified music data (port exactly)

Strings are indexed **0 = low E … 5 = high e**. Standard tuning in MIDI: `OPEN = [40, 45, 50, 55, 59, 64]`. Every shape is written **for a C chord** and transposed. `null` means a muted string.

```ts
SHAPES = {
  major: { C:[null,3,2,0,1,0], A:[null,3,5,5,5,3], G:[8,7,5,5,5,8], E:[8,10,10,9,8,8], D:[null,null,10,12,13,12] },
  minor: { C:[null,3,1,0,1,null], A:[null,3,5,5,4,3], G:[8,6,5,5,4,8], E:[8,10,10,8,8,8], D:[null,null,10,12,13,11] },
}
// Fingers 1–4, for the movable versions:
FINGERS = {
  major: { C:[null,4,3,1,2,1], A:[null,1,2,3,4,1], G:[3,2,1,1,1,4], E:[1,3,4,2,1,1], D:[null,null,1,2,4,3] },
  minor: { C:[null,4,2,1,3,null], A:[null,1,3,4,2,1], G:[null,null,2,3,1,null], E:[1,3,4,1,1,1], D:[null,null,1,3,4,2] },
} // the full minor G-shape is impractical: only its middle strings get fingers
// Open-position versions (0 = open string):
OPEN_FINGERS = {
  major: { C:[null,3,2,0,1,0], A:[null,0,1,2,3,0], G:[2,1,0,0,0,3], E:[0,2,3,1,0,0], D:[null,null,0,1,3,2] },
  minor: { C:[null,3,1,0,2,null], A:[null,0,2,3,1,0], G:[3,2,1,1,0,4] /* G♯m 4-2-1-1-0-4 */, E:[0,2,3,0,0,0], D:[null,null,0,2,3,1] },
}
// Fingers for partial voicings of movable shapes, keyed by the strings played:
PART_FINGERS = {
  major: { E:{'2345':[3,2,1,1], '345':[2,1,1]}, A:{'345':[2,3,1]}, C:{'2345':[3,1,2,1], '345':[1,2,1]}, G:{'234':[1,1,1]}, D:{'345':[1,3,2]} },
  minor: { E:{'2345':[3,1,1,1], '345':[1,1,1]}, A:{'2345':[3,4,2,1], '345':[3,2,1]}, C:{'234':[2,1,3]}, G:{}, D:{'345':[2,3,1]} },
}
// String sets. "easy" applies only to movable shapes (open chords stay full);
// "top4" keeps open chords full; "tri" is always a complete 3-note triad.
EASY = { major:{C:[1,2,3,4,5], A:[2,3,4,5], G:[2,3,4,5], E:[2,3,4,5], D:[3,4,5]},
         minor:{C:[1,2,3,4], A:[2,3,4,5], G:[2,3,4], E:[2,3,4,5], D:[3,4,5]} }
TOP4 = [2,3,4,5], except minor C → [1,2,3,4] and minor G → [2,3,4]
TRI  = { major:{C:[3,4,5], A:[3,4,5], G:[2,3,4], E:[3,4,5], D:[3,4,5]},
         minor:{C:[2,3,4], A:[3,4,5], G:[2,3,4], E:[3,4,5], D:[3,4,5]} }
HOME = { E:0, G:0, A:1, C:1, D:2 } // the string each shape's anchor root sits on
```

**Algorithms to port from the reference** (function names as in the file):

- `shapeFrets` / `normalize` / `instances(key, q)`: transpose by the key's pitch class. Shift down by octaves while the lowest fret is ≥ 12. Add copies 12 frets up while they fit in frets 0–15. Sort by lowest fret, then highest fret. Keep G♯m's G-shape at 4-2-1-1-0-4: it is a legitimate chord.
- `spell(rootName, interval)`: letter-correct spelling (E♯ in F♯ major, C♭ in E♭m's VI). Key names: major uses `C D♭ D E♭ E F F♯ G A♭ A B♭ B`; minor uses `C C♯ D E♭ E F F♯ G G♯ A B♭ B`. Chord roots in progressions are spelled from the tonic (`spell(tonic, interval)`), never taken from a fixed table.
- `sharedRoots(a, b)`: neighbouring shapes always share at least one root (C: A3, G5, E8/e8, D10, B13).
- `pentBox(inst)`: on each string, take the pair of neighbouring scale notes closest to the shape's centre. On an exact tie, pick the pair that keeps the box narrowest. **All 60 boxes in the explorer's range match the five standard boxes.** A minor's G-shape box must come out as B string 3/5, not 1/3.
- `planProgression(chords, zone, voicing)`: a **cyclic DP**. Fix the first chord's candidate, walk forward, close the loop. Each candidate's cost is:
  - out-of-zone frets × 2,
  - - 3 × max(0, fretted span − 3),
  - - a shape difficulty penalty `DIFF` (full: E 0, A 0, C .4, D .5, G 4; easy: 0, 0, .25, .2, .3; top4: 0, 0, .15, .15, .2; tri: 0, 0, 0, 0, .1; open chords 0),
  - - 0.05 × distance from the zone centre.

  Movement between neighbouring chords costs 0.25 × the distance between their centres, computed **from fretted notes only**.

- Zones: open 0–3, 3–7, 5–9, 7–11, 10–14. Progressions:
  - I–IV–V; I–V–vi–IV; I–vi–IV–V; ii–V–I.
  - 12-bar: I I I I | IV IV I I | V IV I V.
  - Minor key: i–iv–v, i–iv–V, i–VI–III–VII.
- Leitner spaced repetition: boxes 0–4 with intervals `[0, 1, 2, 4, 8]` days. A right answer moves the item up a box; a miss sends it back to 0. Weight due items about 3×, unseen items 1.5×, others 0.35×, scaled by error history.

## 6. Golden tests (write these first; they encode what the critics verified)

- For all 12 keys × major/minor, every instance contains only chord tones (R/3/5 or R/♭3/5).
- `instances(0,'major')` gives C@0, A@3, G@5, E@8, D@10, C@12, with shared roots A3, G5, E8+e8, D10, B13.
- Every voicing (full / easy / 4 strings / triads) of every instance has at least 3 notes and at least 3 distinct chord tones. Triads have exactly 3 notes.
- Every fretted note in every partial voicing has a finger number, except the full minor G-shape's outer strings, which are expected to have none.
- Spelling: D♭ major IV = G♭. F♯ major V = C♯, vi = D♯m, 3rd of F♯ = A♯. A minor's VI, III and VII = F, C and G. The 3rd of open E is G♯, never A♭.
- Pentatonic: the C major E-shape box is 0:8 0:10 1:7 1:10 2:7 2:10 3:7 3:9 4:8 4:10 5:8 5:10 (string:fret). The A minor G-shape box has B string 3 and 5. Every box has 2 notes per string and a span of at most 4 frets.
- Planner:
  - C–G–Am–F in the open zone with 4 strings gives open C, open G, **open Am** and an E-shape F.
  - ii–V–I in every key, zone and voicing never needs a fretted span over 3.
  - The full G-shape barre is rarely chosen.

## 7. What the sandbox blocked: build these

**7.1 Listening mode (the headline feature).**

- One permission prompt with a clear explanation, plus an input-level meter and a tuner screen. That screen doubles as calibration: measure the input latency once and store it.
- **Single-note recognition** using McLeod pitch with a confidence gate and about 60 ms stability. Map the detected MIDI note to every fret where it can be played; octave-aware where the drill needs it.
- **Chord recognition for strums:** take a chroma vector over about 150 ms after the onset and compare it with the expected pitch-class set. Tolerate a missing 5th and warn about a wrong 3rd.
- Drills that use it:
  - Step 1: play each root ("play every C you can find in the open C chord").
  - Step 3/4 linking drill: the app holds on beat 3 until it hears the shared root, then moves on. Score clean pivots per tempo. This **replaces the self-reported "Yes, clean"**.
  - Step 5: "land on the 3rd" judged from what you actually played, and strum checks for each bar.
  - Train ear and hand drills: name the chord, then play its root inside the zone.
- Always keep a **no-mic fallback**: the reference's self-check flows. Never block progress on mic access. Recommend headphones and explain why.

**7.2 Real guitar sound:** sampler with round-robin, strum direction, string damping when chords change, a separate metronome bus, and a count-in.

**7.3 Proper mobile experience:**

- A PWA with a vertical fretboard option on phones (headstock at the top).
- A sticky mini-player.
- 44 px minimum touch targets.
- Wake lock during practice.

**7.4 Downloads and sharing** (now allowed): export progress as JSON, print or save a PDF of chord charts for today's key.

## 8. Behaviour to preserve (the critics said "must keep")

- **Steps 3 and 4 default to the Full voicing.** In partial voicings, roots the voicing leaves out stay visible as solid-ring "R" anchors. Dashed rings mean only shared root / keep this finger down. _(v3 regressed by hiding the anchors. Don't repeat that.)_
- Step 1 completes only through the no-labels root test, and the answer is never shown on the same screen. Step 2 counts a challenge only after the shape rests on the target for about 650 ms or is strummed there; "Show me" doesn't count. The major/minor flip keeps the root.
- Step 3: a balanced 10-question shape check (pick the shape first, then its position; pass at 8/10), plus a linking drill with a tempo ladder of 50/60/80/100 BPM. Beat 4 pulses the shared root, and shape changes are announced.
- Step 4: predict the **starting shape and its fret** before the reveal. The rule is shown for the first key only, then collapses. Finish = 3 correct predictions + 1 clean drill in a key other than C.
- Step 5:
  - The planner's choices are summarised in a sentence ("C as an A-shape, F as a D-shape…").
  - Common-tone rings appear only when the same finger stays down.
  - Next-chord ghosts show finger numbers.
  - The zone band is labelled, and muted strings are shown.
  - The sticky now/next bar is sticky only while playing.
  - Count-in, strum-pattern display, and the arpeggio pattern derived from the real note sequence.
  - Finish = a confirmed loop in 2 zones.
- Explorer: zone bars you can click to jump, the CAGED ring diagram, a clickable shapes table, pentatonic box only in one-shape mode, label modes (intervals / notes / fingers / shape letters / blank).
- Train modes:
  - name the shape, name the chord, roots in a shape,
  - build a shape from its anchor root, every root on the neck,
  - major or minor by ear, shape order.

  Plus mastery bars and a "due for review" count.

- View settings: **left-handed mirror** and **low E on top**. Arrow keys, button labels and sliders must follow both.
- Accessibility:
  - Fret cells are focusable with a roving tabindex. Arrow keys walk frets and strings, and Enter plays.
  - Each cell has a meaningful label ("E, the 3rd of C, in the G- and E-shape").
  - Button groups are radio groups.
  - Focus is restored after re-renders and moves to the next action after each answer.
  - One polite live region, which never repeats the same message.
  - Shapes are never told apart by colour alone (letters are available).
  - Text and markings meet 3:1 contrast on the rosewood.
  - Reduced motion is respected.
  - Dark mode.
- Shape colours: C `#cc432d`, A `#f2a922` (dark text), G `#23864c`, E `#1f6fc4`, D `#7d47c9`, on a rosewood board (`#4a2c1c → #2c1910`).

## 9. Known gaps to close (from the final critique)

1. Unified **Review now** queue in Practice: run only the due items across all Train modes, stop at zero, and keep a review streak.
2. Step 5 ear/hand check after each loop: play a hidden chord, the learner names the roman numeral, then finds its root inside the zone. Feed the result into Leitner as `prog:<id>:<degree>`.
3. One line per chord card explaining the voicing choice ("open G: all six strings ring"), especially in 4-string mode.
4. Shape-check difficulty ramp: after passing, run it again without root hints, in other keys, with minor chords and partial voicings.
5. Dominant-7 CAGED shapes (E7, A7, C7, D7, G7 forms) for the 12-bar blues. Verify every voicing with golden tests first.
6. Offer D♯m spelling as a beginner-friendly option instead of E♭m (C♭, G♭ and D♭ confuse beginners). The spelling itself is already correct.

## 10. Plan and definition of done

- **Phase 0: scaffold (half a day).** Repo, CI, lint, strict TS, tokens, routing, an empty page for every route.
- **Phase 1: parity.** `theory/` plus golden tests, then fretboard components, then Steps 1–5, Explore, Practice and Train at feature parity with the reference. Progress goes in IndexedDB, and progress from the reference's localStorage keys (`caged-lab:progress`, `caged-lab:prefs`) is imported if present.
- **Phase 2: sound and listening.** Sampler, Tone Transport and the full mic pipeline with calibration. The drills from 7.1 come with no-mic fallbacks.
- **Phase 3: pedagogy and mobile.** The gaps in section 9, the PWA, the vertical neck, wake lock and exports.
- **Phase 4: optional.** Accounts and sync, **only after asking the user**.

**Done means:**

- Golden tests and E2E flows for every step pass in CI.
- axe reports zero serious or critical issues.
- Lighthouse scores 95+ on PWA, accessibility and best practices.
- Every step can be completed by keyboard only and on a 390 px touch screen.
- Audio timing is drift-free over 5 minutes at 140 BPM.
- Single-note mic recognition is at least 95% accurate on clean guitar input, and the app works without the mic.

**Working agreement (this is how the reference got from 6 to 8):**

- After each phase, run an **independent critic pass**: a fresh agent with no build context reviews the app with the same rubric (music correctness, pedagogy, UX, accessibility, engineering, overall) and compares it with the previous version. Fix its findings before moving on.
- Keep a snapshot or tag per round, and ship the best one, never just the latest.
- Never mark a step done on untested music data.
- Report to the user in plain language: what changed, the scores, what's next.

The user is an intermediate-beginner guitarist who practises with the app, so test flows with a real guitar in mind: hands are busy, so offer big targets, keyboard and foot-pedal-friendly shortcuts (Space plays and stops, arrow keys move), and minimal reading during play.

---

## 11. Build status (round 1)

Built 2026-11-18 on Vite 8, React 19, TypeScript 6.0 (strict), React Router 8, Zustand 5, Dexie 4, Radix, Tailwind 4,
Tone.js 15, pitchy 4 and vite-plugin-pwa 2. Deviations are recorded in `docs/adr/0001-stack-and-audio.md`. How to run
everything is in `README.md`. Local git repo, branch `main`; no remote, and nothing is deployed.

**Done**

- `src/theory/`: ported line by line, plus dominant-7 shapes (E7, A7, C7, D7, G7 forms) and the D♯m spelling option.
- Golden tests (section 6), all passing: chord tones in every key and quality, the C major chain and its shared roots,
  voicing note counts, fingers for every fretted note, the spelling cases, all five standard pentatonic boxes (≥60
  boxes), and the three planner cases. Dom7 voicings always contain the ♭7.
- Steps 1–5, Explorer (major, minor and 7th), Practice, Train (8 modes) and Review now, at parity with v5 and keeping
  every section 8 behaviour.
- Section 9 gaps:
  1. Review queue with a review streak.
  2. Step 5 ear and hand check, recorded as `prog:<id>:<degree>`.
  3. A one-line voicing explanation on each chord card.
  4. A five-level shape-check ramp.
  5. Dom7 shapes, plus a 12-bar blues with 7ths.
  6. D♯m spelling.
- Listening mode:
  - A permission dialog that explains itself.
  - A level meter, tuner and latency calibration (strum on 8 clicks).
  - Step 1 roots played into the mic.
  - A linking drill that holds until it hears the shared root and scores pivots per tempo.
  - Step 5 per-bar strum checks and land-on-the-3rd checks that confirm a zone automatically.
  - Train: "Roots in a shape" and "Ear + hand" listen to what you play.
  - Every drill also has the no-mic self-check.
- Sound and transport:
  - Tone.js Transport for all musical timing.
  - Count-ins and a separate metronome bus.
  - Strum direction, string damping and round-robin variants.
- Mobile and PWA:
  - Upright neck on phones (auto, or chosen under View).
  - 44 px touch targets and a sticky mini-player.
  - Wake lock while playing, listening or running the routine.
  - Installable, and works offline.
- Exports: progress as JSON (export and import), and printable chord charts for today's key (print or save as PDF).
- v5 localStorage progress and prefs are imported on first run.

**Test evidence (all passing at the end of round 1)**

- `npm run check`: typecheck, lint and 48 unit tests:
  - golden theory tests;
  - DSP accuracy: 100% single-note recognition over all 96 string × fret positions, clean and at 25 dB SNR;
  - chord and wrong-3rd detection;
  - Leitner, persistence and v5 import.
- `npm run e2e`: 38 Playwright tests:
  - every route renders with no console errors;
  - axe reports no serious or critical issues, in light and dark;
  - Steps 1–5 complete end to end;
  - Step 1 works keyboard-only;
  - 8 routes at 390 px: no horizontal scroll, upright neck, every target ≥44 px, axe clean;
  - the app works offline through the service worker;
  - v5 progress imports;
  - timing: 700 beats in 5 minutes at 140 BPM, with under 1 ms error (offline render on the drill Transport).

**Not verified yet (open items, in priority order)**

1. **Real-guitar accuracy.** The ≥95% figure is measured on synthesised (Karplus-Strong) guitar, not on recordings.
   Record about 100 clean single notes and 50 strums from a real guitar, add them as fixtures, and re-run
   `tests/dsp.test.ts`. Tune `PitchTracker` clarity and the `checkChord` thresholds if needed.
2. **Real-device listening drills.** Test the linking-drill hold/resume and the Step 5 bar windows with a real guitar,
   with and without headphones, after calibrating latency on the Tuner page.
3. **Guitar samples.** No licensed multisample set ships yet. Drop one into `public/samples/guitar/` (format in the ADR).
4. **Lighthouse.** Round 6, mobile defaults, preview build: performance 93, accessibility 100, best practices 100,
   SEO 100 on `/learn/1`, `/learn/5` and `/explore` (CLS 0.001, TBT 30–50 ms). Scores vary with machine load: a
   critic measured 67–89 on a busy WSL host. Lighthouse 12+ has no PWA category, so the
   "PWA 95+" target can't be scored; the manifest, icons and offline service worker are tested in E2E instead.
5. **Mic E2E covers single notes only.** `e2e/mic.spec.ts` feeds a synthesised WAV through Chromium's fake
   microphone (Step 1 roots, Tuner). Strum checks and the linking-drill hold aren't driven end to end, because a
   looped file can't be synchronised with the Transport.
6. **Dev-tool audit warnings.** `npm audit` reports advisories in build tooling (picomatch/tinyglobby under Vite);
   nothing in the shipped bundle.
7. **Phase 4** (accounts and sync): not started. Ask the user first.

## 12. Deferred critic pass: how to run it

The working agreement in section 10 calls for an independent critic pass after each phase. Round 1 skipped it at the
user's request. To run it later:

1. **Snapshot first.** Tag the build under review (`round-6` was the last one reviewed), so the best round can
   be shipped rather than the latest. Run Lighthouse from a temp folder, not the repo: under WSL it writes
   `C:\Users\…\lighthouse.*` profile folders into the current directory (now in `.gitignore`).
2. **Start a fresh agent with no build context** (a new Claude Code session, or a general-purpose subagent). Give it
   this repository, `caged-lab-v5-reference.html` and this document, and ask it to:
   - run `npm install`, `npm run check`, `npm run build`, `npm run e2e` and `npm run preview`;
   - use the app as an intermediate-beginner guitarist would: on desktop, keyboard-only, and at 390 px;
   - check the music data against sections 5 and 6;
   - score 1–10 on the same rubric as section 2 (music correctness, pedagogy, UX, accessibility, engineering,
     overall), with a short justification each;
   - compare the scores with v4/v5 (8.5 / 8 / 7.5 / 7 / 7.5 / 8);
   - list findings ranked by severity, each with a concrete reproduction.
3. **Also run Lighthouse** on the preview build (`npx lighthouse http://localhost:4173 --view`) and attach the PWA,
   accessibility and best-practices scores.
4. **Fix the findings**, re-run `npm run check` and `npm run e2e`, then tag `round-2`. Repeat until every area scores 8
   or more and overall is 9 or more (section 2).
5. **Record each round's scores** in the table in section 2.

## 13. Critic rounds

Each round: a fresh agent with no build context reviewed the tagged build with the section 2 rubric. The builder then
fixed every finding, added a test for it where possible, re-ran `npm run check` and `npm run e2e`, and tagged the
next round. Critics' screenshots and Lighthouse JSON are not kept in the repo.

**Round 1 (`round-1.1`): 8 overall.** Findings fixed in `round-2`:

- Broken card-list CSS (streak calendar 4,500 px tall, chip rows stacked).
- Focus dropped to `<body>` after starting the Step 1 test and in Ear + hand.
- Step 5 plain-arpeggio loops could never be confirmed with the mic.
- The mini-player covered Step 5's strum pattern on phones.
- A missed Step 1 test revealed the answer.
- Repeated feedback went silent for screen readers.
- Bare fret-cell labels.
- No finger badge when a shared note changes finger.
- The pivot check accepted a strum.
- Strum chroma included the previous chord.
- A 667 kB main chunk.
- A wrong tip for open C.
- Small targets, h1→h3 jumps, no error screen, Leitner promoting early, public source maps, smaller nits.

**Round 2 (`round-2`): 8.5 overall, every area ≥ 8.** Findings fixed in `round-3`:

- ii–V–I treated ii as the home chord in ear checks and labels. The tonic is now the I, and is tested.
- The phone layout shifted on load (CLS 0.31): the grid stretched the nav while a page chunk loaded.
- Step 5 lost its Stop control when scrolled; the mini-player now appears when the page's bar is off screen.
- Several extra live regions double-announced. Exactly one remains, tested on every page.
- Sub-44 px targets: upright-neck zone bars became 44 px jump buttons; Tuner and link targets fixed.
- Focus could hide under the sticky header (`scroll-padding`).
- Anchor roots were unlabelled.
- The minor G-shape's unreachable outer notes are now drawn and printed as optional (hollow).
- Mic hits are announced.
- Minor spelling in Step 2 labels.
- C minor counted as "another key" for Step 4.
- Explorer note on why open-position pentatonic boxes bend.

**Round 3 (`round-3`): 8.5 overall, every area ≥ 8.** Findings fixed in `round-4`:

- Lighthouse profile folders had been committed in `round-3`. They were removed from that commit (amended
  before any push; the tag moved), and `.gitignore` now excludes them.
- "Step N complete" was overwritten by the answer's own feedback. It is now announced just after it, and the step
  page shows a lasting "Step N complete, go on to Step N+1" callout (tested).
- The wake lock was never re-acquired after the app returned from the background.
- Phone Step 5 drew a 15-fret upright neck for a 4-fret zone. The upright neck now shows the zone ±1 fret (tested).
- Ear + hand: the "find the root" instruction now sits above the board, so Tab goes straight into it.
- Text fixes: the C7 form raises the 5th rather than lowering a root; the Explorer lists chord tones that sit
  outside the pentatonic box; the linking drill names beats 3–4 (pulse on 4).
- Routine block changes and background-stop messages are announced, not only toasted.
- Shapes-table row buttons and inline links reach 44 px (and the phone test now checks them).
- "Build a shape" no longer requires the minor G-shape's unreachable notes.
- Imported progress is validated field by field (tested).
- An independent additive-synthesis guitar model now tests note recognition at 44.1 and 48 kHz (≥95%), so the
  DSP isn't only tested against the app's own synth.

**Round 4 (`round-4`): 8.5 overall (Music 9.5).** Findings fixed in `round-5`:

- Focus fell to `<body>` after "Yes, clean" / "Not yet" (Steps 3–4) and "Yes, I did" / "Not yet" (Step 5). Focus
  now goes to the question when the drill ends and to the reply after answering (tested).
- Outcome-only toasts (routine finished, import, erase, v5 import) are now also announced.
- Train Ear + hand draws only the zone on the upright phone neck (tested).
- Mic E2E: a synthesised WAV through Chromium's fake microphone passes the Step 1 root test unaided and is
  identified by the Tuner.
- Save failures warn once and the Practice page shows a "not saving" notice, instead of failing silently.
- The pivot must be the shared root in its own octave; imported prefs reach the audio engine; level message
  casing; muted strings named in cell labels; chord cards say when a chord reaches outside the zone; wording
  fixes; `robots.txt`.
- The 5-minute timing test now runs the app's own beat handler (count-in, beats, UI events), not just Tone.

**Round 5 (`round-5`): 8.5 overall, every area ≥ 8.5 (Music 9.5).** Findings fixed in `round-6`:

- With the mic on, a linking drill could hold forever on a change with no shared root (7th-chord forms). Pivots
  without a shared root no longer hold, the drill is only offered when every change has one, and leaving the
  drill stops it (tested).
- After a missed Step 1 test, tapping a note announced its role ("the root of C"). The test now announces only
  "chord note" / "not in the chord" until it is passed (tested).
- Explore was slower than the steps. Dexie now loads in its own chunk (vendor chunk 283 → 187 kB); Explore's
  blocking time matches the steps.
- The Step 5 "Logged" reply was replaced by bar announcements; they now pause briefly after a reply.
- Mic "land on the 3rd" and arpeggio checks require the voicing's own 3rd (± an octave) at a fret inside the zone.
- Smaller: no stray comma in hidden-pitch cell labels (tested); no extra `role="alert"` regions (counted by the
  one-live-region test); "an E-shape"; a heading per Train mode; the mini-player shows now/next and never
  covers the last link; other-shape dots at higher contrast; the Explorer notes boxes cut off at fret 15.

**Round 6 (`round-6`): 9 overall, no area below 8.5. Bar met; the critic phase stopped here.** No critical or
high findings. Fixed afterwards in `round-6.1` (tested, not critic-reviewed):

- M1. Step 5: when a loop completes, focus moves to the question, and Tab reaches "Yes, I did" (tested).
- M2. Step 1 mic test: only roots are marked; any other note heard is "not a root", never marked and never named,
  so checking a string first can't fail the test (tested with a fake-mic WAV that plays E3 before the Cs).
- M3. Mic dialog: the start button stays focusable while busy, so a refused start keeps focus in the dialog and
  the reason is announced (tested with `--deny-permission-prompts`).
- Low: the mini-player and announcements cover bar 1 of a loop; Train Ear + hand names the key ("in G major"),
  not a chord (tested); the home chord is no longer offered as an answer (tested); the Step 4 hint points to
  "the coloured shape bars"; Step 3 level-1 root hints are labelled "root (hint)" (tested).

Still open from critic 6 (deliberately not changed):

- The planner can voice the same chord two ways in one loop (12-bar 7ths in G, frets 7–11: D7 as a G-shape in
  bar 9 and an E-shape in bar 12). It is legitimate voice leading; a penalty for re-voicing would change the
  golden planner outputs, so it needs a decision first.
- Step 5's no-mic finish is self-report, as section 7.1's fallback requires.

**Visual identity (after `round-6.1`, not critic-reviewed).** A design pass replaced the generic look with one
built from the subject: colour reserved for the five shapes, Archivo condensed for chord names and titles, a
rosewood neck as the navigation, and method-book margin notes instead of a card grid. See `docs/design.md`. All
checks pass (61 unit, 52 E2E tests, including axe in light and dark).

**Not fixable without hardware or assets** (all critics): real-guitar mic accuracy, live drill timing with a real
instrument, sampled guitar sound, and screen-reader output on a real device.

## 14. Learning-method upgrades (after the visual identity; not critic-reviewed, by request)

These upgrades move the method from recognising shapes toward fluent recall that lasts. They were built and tested,
but no 7th critic round was run, by request.

1. **Speed counts** (`src/train/leitner.ts`, `TARGET_MS` in `src/train/questions.ts`).
   - Every Train answer and the Step 3 shape check are timed from the moment the question appears.
   - A right answer slower than its mode's target is practice: the item keeps its box, its timer resets, and it
     comes back at the same interval. The feedback gives the time and the target.
   - Each item stores a running average of its right-answer times (`t`).
2. **Play from memory** (Train → "Play from memory", items `recall:<quality>:<shape>`).
   - The app names a shape and a chord. The neck is blank.
   - Mark the notes and press Check, or play them one string at a time with the mic on (exact pitch; it finishes
     itself when every note is heard).
   - Any of the shape's places on the neck counts (the open C-shape or the one at fret 12).
3. **Mastery that survives a day.**
   - Finishing a step schedules a re-test, `step:<n>`, for the next day (`STEP_MODE` and `makeStepQuestion` in
     `questions.ts`). The re-tests are: name the open chord; name a moved shape; name a shape of C; where a key
     starts; and ear + hand.
   - While a step's re-test is due, its pearl inlay on the neck dulls (no sheen, no motion), and its link reads
     "(completed, check due)".
   - A clean linking drill is a review item too, `link:<key>`. A clean run at or above the best tempo moves it up a
     box. A run that wasn't clean, at a tempo already played clean before, sends it back.
   - Review lists due drills beside the quiz queue, with links that open the drill at its key and best tempo
     (`/learn/4?key=7&q=major&bpm=80#drill`).
4. **Fading** (the saved preference `fade`; the "While it plays, show" control).
   - The linking drill and the Step 5 loop can show whole shapes, roots only, or nothing while they play.
   - Stopped, the neck always shows everything.
5. **Adaptive routine** (`src/practice/plan.ts`, pure). It is still fifteen minutes in four blocks, now chosen from
   the player's data, and each block says why:
   1. Review what is due, naming any step check, or open chords for a new player, or the weakest shape from memory.
   2. A linking drill that is due, else C until it is clean, else the slowest key one tempo step up, else a new key.
   3. The weakest shape by accuracy and speed (`/train/build?shape=G` and similar), or today's chord when there is
      no data yet.
   4. Your own song if you saved one, else the next zone you haven't played, with a rotating progression.

   The plan is fixed when the routine starts, so answering review items mid-routine doesn't reshuffle it.

6. **Your own song** (Step 5 → Progression → "Your own song"; `src/theory/song.ts`).
   - Type chords as on a chord chart: "G D Em C", "| Bb | F/A | Gm7 |", with % to repeat.
   - Major, minor and 7th chords play as typed. Richer chords play as the nearest of those, and the page says so.
     Diminished and augmented chords are reported as not playable here.
   - The song is planned through the zone with the same planner as the progressions (`planChords`).
   - It is saved in progress (`song`). The key picker and ear check are hidden for your own song.
7. **Learning record** (Practice; `src/practice/record.ts`). It shows three measures:
   - Mastered items, with the median days and answers from first try to mastered (box 2: right, on time, after at
     least a day).
   - Retention: right answers to learned items after 1–5 days of rest and after 6 days or more (`retention` in
     progress).
   - The share of timed items answered within their target.

**Data.** Stats gain the optional fields `t`, `first`, `mast` and `ma`, and progress gains `retention` and `song`.
All of them are validated field by field on load and import; older saves load unchanged.

**Tests.**

- `tests/learning.test.ts`: 24 unit tests covering the scheduler with timing, retention buckets, step re-tests,
  the recall judge, the chord parser and song planning, drill links, the routine planner and the learning record.
- `e2e/learning.spec.ts`: 5 tests covering play from memory, your own song (saved across a reload), fading, a due
  step check (dull inlay, routine reason, review question), and a due drill link that opens at its tempo.
- `/train/recall` was added to the axe route sweep.
- Totals: 89 unit and 61 E2E tests, all passing.

**Not verified.** The fluency targets are first guesses. Tune them once there are real answer times. The mic path
of "Play from memory" is tested in unit logic only, not with the fake-microphone WAV.

## 15. The guitar navigation (after section 14; not critic-reviewed)

The top bar and the neck strip became one guitar lying across the page (see `docs/design.md`, principle 4).
The header chips moved onto the guitar: Next up, review count and streak are sub-labels on their frets; XP,
Sound, View and the mic light are on the body. The header is no longer sticky. Tests: one E2E test checks the
alignment of headstock, neck and body, the fret status, both knobs and the home link; the phone test now
includes the knobs in its 44 px target check. Totals: 89 unit and 62 E2E tests, all passing.

Afterwards the guitar was redrawn to resemble the user's reference photo (a modern double-cutaway solid body in
satin charcoal): a larger body (224 px row) with a long bass horn, black open-pole humbuckers, a vibrato bridge and
arm, two dark knobs on the treble side, an unbound neck with upper frets closing toward the body, and a gloss
black 3 + 3 headstock. The maker's logo, bird inlays and exact outlines were deliberately not copied.

**Critic pass on the guitar (3 rounds).** At the user's request, a critic agent compared the headstock and body
with the reference photo using upright side-by-side images (`compare.mjs`: shoot the guitar, rotate it 90°, lay it
beside the photo). The fixes from each round were applied in full. Scores:

| Round | Headstock | Body   |
| ----- | --------- | ------ |
| 1     | 2/10      | 3/10   |
| 2     | 6/10      | 6/10   |
| 3     | 7/10      | 7/10   |
| 4     | 7.5/10    | 7.5/10 |
| 5     | 8/10      | 7.5/10 |

Rounds 4 and 5 were run at the user's request. Round 4 changed the wound strings to nickel (electric), added key
stems, brighter washers, pickup rings with corner screws, broad grain streaks and cutaway shading, and refined the
bass side and treble waist. Round 5 changed the washers and stems, gave the keys flatter outer faces, added
noise-based open-pore streaks, bright individual saddles in a dark channel, light pole slugs, and lower-bout
shading. Round 5's fixes were applied after its scoring and have not been re-rated.

The critic put the ceiling at about 8.5 for each, given the fixed limits:

- **Headstock:** the 172 px length makes it stubbier than the photo's, and the app's logo replaces the photo's
  signature.
- **Body:** it is compressed to 3.4 neck widths across against the photo's 6, so the bass cutaway is a slot rather
  than a broad U.
- **Finish:** a photographic satin finish would need a real wood-texture image clipped to the outline.

- **Headstock:** it is now narrow at a concave, asymmetric tip and widest at the tuners nearest the nut. The posts
  converge, the strings run nearly parallel, and the keys are large black kidneys lying along the head. It has a
  matte satin finish, a long truss-rod cover, and a quiet logo on the centreline.
- **Body:** it is pear-shaped, with a thick bass horn and deep U cutaway, a blunt short treble horn, and a wide
  lower bout. The finish is warm brown satin. Hardware: the pickups and vibrato sit where the photo has them, the
  knobs are on the photo's diagonal (black, with metal centres), and there is a brass mini switch.

What remains different by design: the body is compressed across the strings (3.5× the neck width rather than
about 6×) so it fits a header, and there are no maker's logo or inlays.

Afterwards, at the user's request, the two cutaways were made symmetrical: the bass horn and scoop now mirror the
treble ones across the neck's centre line, and both scoops cut about 10 px deeper into the body.
Then the joins were reshaped: each cutaway now rolls into the neck along its edge rather than meeting it square,
the carved top shades down into both cutaways (a soft lit ridge, then a shadowed edge), and the fretboard end
casts a soft shadow on the body.

**Traced body outline.** The body outline is now traced from the reference photo's silhouette instead of drawn by
hand (`scripts/guitar-trace/`):

- `rows.mjs` read each pixel row's dark runs on the white background (since removed; see below).
- `outline.py` followed the horn and outer edges, then maps them onto this guitar. Along the neck it uses
  1.257 px per photo pixel. Across the neck, the photo's 32 px neck becomes 64 px; outside the neck band the body
  keeps the photo's proportions (0.96×). The result is fitted with Catmull-Rom curves.
- The hardware was placed from the photo too: the dark pickups, the bright bridge, and the knob and switch
  centres. The finish colour was sampled from the photo (#594439 average) and the stain stops warmed to match.
- The reference photo itself is not in the repo; the scripts' constants (neck edges, centre line, horn-tip and
  butt rows) are for that 600×600 image.

This replaces the earlier symmetrical cutaways. The photo's bass horn is longer than its treble horn, while its
two cutaways have similar depth and both roll into the neck.

**S-style body (replaces the traced charcoal body).** At the user's request the body now follows a second
reference photo: a gloss black triple single-coil body. The headstock (3 + 3) and the rosewood neck were kept.

- Outline: `scripts/guitar-trace/pixels.mjs` dumps the photo's pixels and `outline_h.py` (since removed) traced the horizontal
  photo column by column (flood-filling the white background), then maps it with 1.637 px per photo pixel along
  the neck, the photo's 25 px neck band stretched to 64 px, and 1.28× outside it. The Catmull-Rom fit scales its
  tangents by chord length, so the stretched neck band does not make the curves overshoot. The same script maps
  the pickguard outline (points read off zoomed crops) and the hardware positions.
- Drawing: gloss black with a grey band along the rolled edge and a dark rim. On top: a white guard with a dark
  bevel line and nine screws, three white single-coil covers with pole pieces, a chrome vibrato plate with bent
  saddles, an arm with a white tip, a five-way switch, a decorative third knob, an oval jack plate and a rosewood
  fretboard end (to x 112.5).
- Controls: Sound is the volume knob (221, 62) with its label to its left, and View is the first tone knob
  (238.5, 40) with its label above. Both are white hat knobs (16 px) with dark labels, since they sit on the guard.
  XP and the mic light moved to the black lower bout. `KNOB_AT` in Guitar.tsx records the knob centres used by
  the CSS.
- The photo has a maple neck; ours stays rosewood to match the navigation neck.

**Headstock traced from a photo.** At the user's request the headstock now follows a 3 + 3 reference photo
(330×264, nut on the right). `scripts/guitar-trace/headstock.py` holds the outline points, read off brightened
crops, and maps them at 0.8 px per photo pixel, so the photo's 80 px neck becomes our 64 px. That makes the
headstock 228 px long (was 172), and the grid column grew to match.

- The headstock has two pointed ears at the nut, a long tapering top and bottom edge, and a blunt tip that is
  concave above and straight below.
- Tuners: chrome box keys whose inner end comes to a point at the stem (a light outer face, a dark face toward
  the nut, a bright rim and a brass line), on brass stems. The bushings are chrome round a dark recess.
- Finish and fittings: gloss black with a light line along the top edge, a truss-rod screw, and a dark nut.
- Not copied: the photo's signature, the "SE" and the "CE". The CAGED Lab logo sits where the signature is. The
  photo is mirrored (its lettering reads backwards), which does not affect the outline.
- To make room, the neck's fret labels use the laptop sizing (13 px, 6 px padding) up to 1535 px, and 12.5 px with
  4 px padding below 1366 px. Every item fits without scrolling from 1280 px up (checked on /, /learn/3 and
  /practice).

**Larger S-style body traced from a new photo.** At the user's request the body was matched to a third reference
(a gloss black S-style, 936×626, neck on the left) and made bigger, so the neck and headstock are in proportion.

- Size: the body is 414×304 (was 349×224), and the guitar row is 304 px tall. The headstock and nav neck stay
  64 px and sit centred in it, so the body now reaches well above and below the neck, like the real thing.
- Neck under the body: the body overlaps the neck by 58 px (`BODY_OVERLAP`). The nav neck runs on under the body
  between the horns, with a drawn rosewood fretboard end on top from x 53.5. The neck's right padding is 10 px, so
  the last fret item ends just before the drawn fretboard. Every item still fits without scrolling from 1280 px.
- Tracing: `scripts/guitar-trace/body.py` replaces `outline.py`, `outline_h.py` and `rows.mjs`, which were
  deleted. It flood-fills the grey background, traces the silhouette and the pickguard (bright pixels, closed
  morphologically so strings and screw notches do not dent it, then smoothed), and maps both at 0.47 px per photo
  pixel along the neck and 0.441 across it. Across the neck a tanh eases the photo's fretboard band to our 64 px,
  so there is no kink at the joint. The script also maps the hardware points read off zoomed crops.
- Drawing: the bridge is a two-point vibrato with no arm (the photo has none), with three cream hat knobs, a
  five-way switch with a white tip, an oval jack plate and a long reflection across the lower bout.
- Not drawn: the photo's model sticker on the guard (the guard runs on under where it was), and the maker's logo.
- The photo has a maple neck; ours stays rosewood to match the navigation neck.
- Crisp at 1x: Chrome draws clipped or masked SVG content without anti-aliasing, which stair-stepped the guard's
  edge on 1x screens. The guard is now three plain fills: its outline (the black middle ply), the outline inset
  0.8 px (the bevel) and inset 2 px (the face). `body.py` emits all three and keeps the guard 6 px inside the traced
  body, so nothing needs clipping. Masks remain only on soft, blurred shading.
- Sharp at 1x: the `.guitar` padding is rounded to whole pixels (`round(clamp(...), 1px)`), so the headstock and
  body SVGs land on the pixel grid at any width; a fractional offset blurred every edge. The strings, in the
  headstock, body and neck CSS alike, sit on whole-pixel rows (`STRING_MID`): 1 px plain, 2 px wound, each with a
  1 px shadow a pixel below. They are flat colours: a level `<line>` has a zero-height bounding box, and a gradient
  sized to it paints nothing (the body's strings had been showing only their shadows). Frets, saddles, poles, screws
  and the nut are snapped too, and the edge, guard and hardware blurs are tighter.
- The trace bridges the strap buttons' cut-outs with a smooth curve, so the outline has no dent there.

**Cropped and pinned.** At the user's request only the guitar's lower part shows, and the whole guitar is pinned.

- Cut: the header is `position: sticky` with `top` and `margin-top` both `-var(--neck-cut)` (16 px), so the
  window's top edge crops the neck and 48 px of it stays in view. A 29 px cut (just below the top row's tuner
  bushings, headstock y 108) was tried and dropped: the neck looked too slim for the menu items. The top row's
  tuners are cut by the edge; the user accepted that. The headstock
  art hangs at `top: -80px` and the body at `top: -120px`, out of a 64 px row (the neck). A 120 px margin below
  the row clears the body's hang. `--nav-clear` (174 px desktop, 72 px phone) drives `scroll-padding-top` and the
  routine timer's sticky top.
- Controls off the guitar: XP, the mic light, Sound and View are plain buttons in a dark pill under the neck, left
  of the body, not knobs on the art. On phones they stay in the top row as before (no cut, no pin).
- Frets: a step's 18 px pearl with its note beside it, and the label below (stacked, since the neck has no spare
  width for a single row).
- Pinned parts cover some page content near the top at narrower desktop widths while scrolling; the content
  scrolls under them by design.
- The E2E nav test now checks the cut, the art offsets, the strip's place below the neck and that the guitar stays
  put on scroll.
