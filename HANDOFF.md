# CAGED Lab: handoff to Claude Code

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

| Version | Music | Pedagogy | UX | A11y | Engineering | Overall |
|---|---|---|---|---|---|---|
| v2 | 8 | 7 | 7 | 6 | 7 | 7 |
| v3 | 8 | 7 | 7 | 7 | 7 | 7 |
| **v4/v5 (reference)** | 8.5 | 8 | 7.5 | 7 | 7.5 | **8** |

**The bar for the rebuild is 9+ overall, with no area below 8.** Reaching parity with the reference is phase 1, not the goal.

## 3. Recommended stack (decide quickly, then build)

The goals are a fast interactive SVG UI, sample-accurate audio, real-time microphone analysis, offline use on a phone, and strong testing. Use current stable versions, check them when you install, and commit the lockfile.

| Concern | Choice | Why |
|---|---|---|
| App | **Vite + React + TypeScript (strict)** | An SPA is enough (no SEO or SSR needs). It has the largest ecosystem and fast HMR. |
| Routing | TanStack Router (or React Router) | Typed routes: `/learn/1…5`, `/explore`, `/practice`, `/train/:mode`. |
| State | **Zustand** for UI and session state; domain logic stays pure | Small and testable, with no provider sprawl. |
| Persistence | **Dexie (IndexedDB)** behind a `ProgressRepository` interface | Offline-first. An optional sync backend can replace it later without UI changes. |
| UI primitives | **Radix UI** (radio group, toggle group, dialog, tooltip, tabs) | Correct keyboard and ARIA behaviour for free. The reference hand-rolled this. |
| Styling | Tailwind CSS for layout plus **CSS-variable design tokens** (port the reference `:root` palette, with light and dark themes) | Tokens keep the fretboard, shapes and themes consistent. |
| Fretboard | Custom **React SVG components** (no canvas) | Accessible, crisp, easy to animate. Port `board()` from the reference. |
| Audio engine | **Tone.js** (Transport for scheduling, Sampler for playback) | Replaces the hand-written lookahead clock. Gives tempo changes, count-ins and swing for free. |
| Guitar sound | Multisampled steel-string guitar (properly licensed or CC0), one sample per string per few frets, with round-robin. **Keep Karplus-Strong as an AudioWorklet fallback.** | The reference's synthesised string is good but not commercial quality. |
| Microphone | getUserMedia → **AudioWorklet** → pitch detection (**pitchy** / McLeod) for single notes; **chroma** (Meyda or your own FFT) for chord checks | This unlocks real "play it and the app checks you" drills (section 7). |
| PWA | vite-plugin-pwa | Installable on a phone, works offline, practise anywhere. |
| Tests | **Vitest** (theory golden tests, store logic), **Playwright** (E2E flows), **@axe-core/playwright** (a11y) | The music data must never regress (section 6). |
| Quality | ESLint + Prettier, `tsc --noEmit` in CI, GitHub Actions | |
| Hosting | Vercel (or Cloudflare Pages), static deploy | The user already has a Vercel connection available. |
| Later, optional | Supabase (auth + Postgres) behind the same repository interface | Cross-device progress. **Not in v1.** Ask the user before adding accounts. |

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
  - + 3 × max(0, fretted span − 3),
  - + a shape difficulty penalty `DIFF` (full: E 0, A 0, C .4, D .5, G 4; easy: 0, 0, .25, .2, .3; top4: 0, 0, .15, .15, .2; tri: 0, 0, 0, 0, .1; open chords 0),
  - + 0.05 × distance from the zone centre.

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

- **Steps 3 and 4 default to the Full voicing.** In partial voicings, roots the voicing leaves out stay visible as solid-ring "R" anchors. Dashed rings mean only shared root / keep this finger down. *(v3 regressed by hiding the anchors. Don't repeat that.)*
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
