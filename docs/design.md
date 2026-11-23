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
   (`src/ui/Guitar.tsx`, `Layout.tsx`). The body follows the user's reference photo of a classic triple
   single-coil solid body in gloss black; the headstock and neck are our own. The outlines are our own tracings,
   and there is no maker's logo or inlays.
   - The headstock is the home link, traced from the user's second reference photo: gloss black, 3 + 3, with two
     pointed ears flaring from the nut and a blunt tip that is concave above and nearly straight below. It has
     polished chrome box keys, big chrome bushings, a truss-rod screw, a dark nut, and the CAGED Lab logo where a
     maker's signature would go.
   - The neck is unbound rosewood holding the steps and tools. Steps 1–5 are fret positions with inlay dots (a
     pearl inlay means the step is done), and a 12th-fret double inlay separates the lessons from the tools
     beyond them. Status sits on the frets: "Next up" under the next step, "3 due" under Train, and the routine
     timer or streak under Routine. Past the tools, the upper frets close up toward the body (decorative; they
     fill only the space the items leave).
   - The body is gloss black, with a band of light along its rolled edge. It has a long bass horn, a shorter
     treble horn and deep cutaways. On it sit a white pickguard with a thin dark bevel line, three white
     single-coil pickups (the bridge one slanted), a two-point vibrato bridge with six saddles, a
     five-way switch and an oval jack plate on the face (no strap buttons).
   - Only the guitar's lower part shows, and it stays pinned while the page scrolls under it: the window's top
     edge touches the spike at the headstock's tip (its upper corner), 6 px above the neck, so the whole neck
     shows. The tuners above the spike are cut by the edge, and the knobs and switch are above the window. The strip
     between the edge and the neck is the page's wood, so scrolled text never shows above the neck. XP, the live-mic light, Sound and View sit in a small dark
     strip below the neck, left of the body, not on the art.
   - When the site opens, the guitar drops in from above the window: the body end lands first, it bounces once and
     settles (under a second). The page waits hidden while it falls, and as the body touches down the page settles
     in under it: the title, then the lede, then each section, dropping a few pixels into place with the same
     small bounce, 85 ms apart (the cascade is timed from the guitar's own animation, so they never drift apart).
     This is the app's one entrance moment: it plays once per page load, not on page changes, and not at all with
     reduced motion. At rest the header and the page carry no transform.
   - The guitar's row is 304 px tall with the 64 px neck centred, so the strings run unbroken from the tuners to
     the bridge. The body fills the row, so it keeps a guitar's proportions to the neck, and the neck runs on
     under it between the horns.
   - Every item fits from 1280 px up (fret labels tighten below 1600, and again below 1440 in a narrower width of
     Archivo). Narrower, the neck scrolls sideways
     between headstock and body.
   - At 860 px and below in landscape (tablets on their side, narrow windows) the brand and the knobs share a top
     row and the neck runs full width under it, scrolling sideways.
   - Any screen taller than wide (phones, tablets held upright, tall windows), and phones of any shape (600 px wide
     and below, or a touch screen under 500 px tall) stand the guitar up in a drawer instead. A top row holds the
     brand, the knobs and, at its right end, Menu (a little fretboard icon). Menu slides the drawer in from the right
     over a dimmed page, and the whole guitar stands in it, the wide screen's drawings turned a quarter turn and drawn
     a little smaller so the body fits the drawer's width: the headstock, the neck running down with each step's pearl
     on its fret and the label beside it (the current page underlined like a chosen word), the 12th-fret double inlay,
     the tools, the upper frets closing up, and the body. It opens on the frets, readable at once, with only the foot
     of the headstock showing above them; the full headstock and the body are there for whoever scrolls. Close stays
     at the top right throughout. The headstock is the home link here too; at 480 px and below it is the only one, as
     the brand leaves the top row. Escape, Close, tapping the page or choosing a fret closes the drawer, and Tab stays
     inside it while it is open.
   - On touch screens every choice is at least 44 px each way, taps never double-tap zoom, menus are 16 px so iOS
     does not zoom to them, and with the phone on its side the page, the top row and the drawer stay clear of the
     notch.
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
7. **Scales keep the same colour rule.** The scale library (Scales, after Explorer on the neck) shows 2NPS
   pentatonic boxes and 3NPS seven-note patterns. Each pentatonic box is a CAGED shape's box, so its dots take
   that shape's colour and its pattern button carries the shape's pill. The 3NPS patterns are not CAGED shapes, so
   their dots are neutral, with the root picked out the way the other neutral boards do it. The rest of the scale
   shows as dim dots, so the pattern stays the one bright thing on the neck.
8. **A method-book page, not a dashboard.** Sections are divided by a heavy ink rule (the edge of a case). Each
   step opens with a numbered "What to do" list, and supporting notes ("Good to know") sit after the workbench in
   columns under nickel rules. There are no boxed cards and no drop shadows; the one shadow is on floating menus,
   which do float.

## Tokens (`src/ui/styles.css`)

The default theme is **wood**: the page is rosewood with the same grain as the fretboards (a seamless tile on
a fixed layer behind the content), and the fretboard sits in a darker recessed tray. **Light** (the pearl page)
and **Match device** are under View. Printing always uses the light tokens on white paper.

| Token              | Light     | Wood                       | Use                                                    |
| ------------------ | --------- | -------------------------- | ------------------------------------------------------ |
| Pearl `--bg`       | `#f2f4f3` | rosewood `#2b1a10` + grain | page                                                   |
| Case ink `--ink`   | `#1f2a33` | pearl `#eef1f0`            | text, primary buttons, focus ring                      |
| Graphite `--muted` | `#5b6770` | `#cbbdb1`                  | secondary text, group names                            |
| Nickel `--rule`    | `#a7b0b5` | `#8b7363`                  | rules and underlines only, like fret wire (never text) |
| Tray `--surface-2` | `#e7ebec` | `#170d07`                  | the recess the fretboard sits in                       |
| Rosewood           | `#3a2317` | `#120b07`                  | the neck strip and the board                           |

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
