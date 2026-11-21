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
4. **One bold element: the neck.** The navigation is a rosewood neck. Steps 1–5 are fret positions with inlay
   dots (a pearl inlay means the step is done), and a 12th-fret double inlay separates the lessons from the tools
   beyond them. Everything else stays quiet.
5. **A method-book page, not a dashboard.** Sections are divided by a heavy ink rule (the edge of a case), and
   supporting notes sit in margin columns under nickel rules. There are no boxed cards and no drop shadows; the
   one shadow is on floating menus, which do float.

## Tokens (`src/ui/styles.css`)

| Token | Light | Dark | Use |
|---|---|---|---|
| Pearl `--bg` | `#f2f4f3` | rosewood `#21160f` | page |
| Case ink `--ink` | `#1f2a33` | pearl `#eef1f0` | text, primary buttons, focus ring |
| Graphite `--muted` | `#5b6770` | `#c3b6ab` | secondary text, group names |
| Nickel `--rule` | `#a7b0b5` | `#7a6555` | rules and underlines only, like fret wire (never text) |
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
