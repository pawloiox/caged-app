# CAGED Lab visual identity

Who it is for: an intermediate-beginner guitarist with the guitar in hand, the screen on a desk or music stand,
often a phone. The interface has one job: show the neck and what to play next, readable at arm's length.

## Principles

1. **Colour means a shape.** The five CAGED colours (C `#cc432d`, A `#f2a922`, G `#23864c`, E `#1f6fc4`,
   D `#7d47c9`) are the only colour in the interface. Actions are ink, never a hue that could be read as a shape.
   Green, red and amber appear only as correctness feedback, always with ✓ ! ✗ or words.
2. **The instrument's own materials.** Everything that isn't a shape uses the guitar's materials. Wood appears only
   where wood actually is: the fretboard and the neck navigation.
3. **Type at arm's length.** Chord names and page titles are the largest things on screen, set condensed and
   heavy like the chord symbol on a chord chart.
4. **One bold element: the guitar.** The navigation is a guitar lying across the top of the page
   (`src/ui/Guitar.tsx`, `Layout.tsx`):
   - The headstock is the home link: a 3 + 3 headstock with a scooped tip, nickel tuners and the logo.
   - The neck holds the steps and tools. Steps 1–5 are fret positions with inlay dots (a pearl inlay means the
     step is done), and a 12th-fret double inlay separates the lessons from the tools beyond them. Status sits on
     the frets themselves: "Next up" under the next step, "3 due" under Train, and the routine timer or streak
     under Routine. Frets close up toward the body.
   - The body is stained wood with cream binding, two humbuckers, a bridge and a stop tailpiece. Its two knobs
     are the controls: Sound (the pointer turns between 0 and 10) and View. XP and the live-mic light sit beside
     them.
   - The strings run unbroken from the tuners to the tailpiece: everything is drawn on one 152 px row with the
     68 px neck centred.
   - Between 861 and about 1200 px the neck scrolls sideways between headstock and body. At 860 px and below
     the brand and knobs share a top row and the neck runs full width below.
   - Everything else stays quiet.
5. **Pearl inlays.** The position markers on every fretboard (frets 3, 5, 7, 9, 12, 15) and the neck's step
   inlays are mother-of-pearl: a cool nacre base, soft pastel iridescent bands that slowly slide across (as when
   the guitar tilts in the light; neighbouring inlays move on opposite diagonals), a glint that travels up the
   neck, and a dark seam where pearl meets wood. It is the only ambient motion in the app and stops entirely
   with reduced motion (tested). The coloured note dots never shimmer: they carry information. A finished step
   whose next-day check is due shows a dulled pearl (desaturated, still, with a faint ring) until it is checked.
6. **A real fretboard.** Every board is built like the instrument:
   - Frets close up toward the body (equal-temperament spacing, softened and floored at 40 px, or 44 px on
     phones, so notes and touch targets still fit).
   - Rosewood grain with open pores, generated once when the browser is idle and shared by every board.
   - The board darkens toward its edges.
   - Nickel-silver fret wire with a lit crown and a shadow, and a bone nut.
   - Phosphor-bronze wound strings (low E, A, D, G) with visible winding, and plain steel B and e, each casting
     a shadow on the wood.
7. **A method-book page, not a dashboard.** Sections are divided by a heavy ink rule (the edge of a case), and
   supporting notes sit in margin columns under nickel rules. There are no boxed cards and no drop shadows; the
   one shadow is on floating menus, which do float.

## Tokens (`src/ui/styles.css`)

The default theme is **wood**: the page is rosewood with the same grain as the fretboards (a seamless tile on
a fixed layer behind the content), and the fretboard sits in a darker recessed tray. **Light** (the pearl page)
and **Match device** are under View. Printing always uses the light tokens on white paper.

| Token | Light | Wood | Use |
|---|---|---|---|
| Pearl `--bg` | `#f2f4f3` | rosewood `#2b1a10` + grain | page |
| Case ink `--ink` | `#1f2a33` | pearl `#eef1f0` | text, primary buttons, focus ring |
| Graphite `--muted` | `#5b6770` | `#cbbdb1` | secondary text, group names |
| Nickel `--rule` | `#a7b0b5` | `#8b7363` | rules and underlines only, like fret wire (never text) |
| Tray `--surface-2` | `#e7ebec` | `#170d07` | the recess the fretboard sits in |
| Rosewood | `#3a2317` | `#120b07` | the neck strip and the board |

`--accent` is an alias of ink, kept so that existing components follow the identity.

## Type

Archivo (variable width 62–125%, weight 100–900), self-hosted, Latin subset. One family at two widths:

- `h1`, chord names, the routine timer: `font-stretch: 68%` (`--condensed`), weight 820–840.
- `h2`: 80% width, weight 760. Note titles (`.card-title`): 86%, weight 720.
- Body: 16 px, normal width, line-height 1.55, lines kept under about 70 characters.
- Numbers: tabular figures everywhere (`font-variant-numeric: tabular-nums`). No monospace.

## Controls

- Choice groups (radio groups) are a row of words, and the chosen one is ink with a 3 px underline. Each group
  shows its name (for example "Strings to play"), because underlines alone don't show where a group ends.
- Buttons: an ink fill for the main action, an outlined surface for the others, 8 px radius.
- Shape buttons keep their shape colour and letter, so shapes are never told apart by colour alone.

## Copy

- Sentence case everywhere. No all-caps labels, no "·"-joined meta strings, no arrows appended to links.
- A button says what happens. The step number is shown by the neck, not repeated as a label above each title.
