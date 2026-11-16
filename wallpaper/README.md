# wallpaper

A Claude Code mod that dresses up the Claude app (desktop and mobile): an animated ASCII-art aquarium as wallpaper, a wallpaper picker with live thumbnails, a little Claude creature above the prompt, an interface palette to match, a themed thinking indicator and a quiet end-of-turn sound.

## Install

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `ayatooo/claude-desktop`, then **Add plugin**.

At the prompt of a terminal session: `/plugin install wallpaper --marketplace ayatooo/claude-desktop`. From a shell: `claude plugin install wallpaper --marketplace ayatooo/claude-desktop`.

To try it from a clone without installing: `claude --plugin-dir ./wallpaper`.

## The aquarium

`/wallpaper ocean` (the default): an aquarium drawn entirely in shaded ASCII art. As in a real aquarium, creatures pass by one at a time on two lanes, so never more than two on screen, slowly: a shark, a distant whale, a turtle, a manta ray, a blue tang and a clownfish that come to look and leave, a school of fish, an angelfish, a jellyfish rising, a crab on the sand; reefs, swaying kelp, light rays, marine snow and bubbles.

| Command | What it does |
|---|---|
| `/wallpaper ocean` | The aquarium. |
| `/wallpaper off` | Back to the app's own look. |
| `/wallpaper` | Opens (or closes) the picker above the prompt: an animated thumbnail per wallpaper, a click or its digit applies it, `0` for none. Sending a prompt closes it. |
| `/wallpaper status` | Current state and settings. |
| `/wallpaper pet on` / `off` | The little Claude creature above the prompt (desktop and mobile). It blinks, looks around, takes a short walk, hops and waves now and then; bounces under a twinkling star while Claude works; hops with sparkles when a turn ends. |
| `/wallpaper sound on` / `off` | End-of-turn sound (a bubble). It only plays where Claude Code runs on a Mac (the engine plays it with `afplay`). |
| `/wallpaper motion on` / `auto` | `auto` (default): the aquarium freezes on a still frame when the system asks for reduced motion (on Windows: Settings > Accessibility > Visual effects > Animation effects off). `on`: it keeps moving anyway. |
| `/wallpaper diag`, `/wallpaper test` | Display diagnostics: is the theme drawn? does a loud still gradient show? |

What the theme changes:
- **The backdrop** (desktop and mobile) and the glass over it.
- **The interface palette** (desktop and mobile), deep sea blue.
- **The thinking indicator** (desktop and terminal; the mobile app does not draw it): sea words ("Nage avec les poissons", "Suit le courant"…) and a small `o°`. On the desktop, when the row describes the current step ("Creating notes.md"), it keeps its words and only takes the glyph.

The texts a person reads are in French; the code is in English.

## How it works

- `hooks/register.tsx`: the `/wallpaper` command, the backdrop, the thinking indicator, the end-of-turn sound, and the band above the prompt (picker and creature).
- `hooks/mascot.ts`: the creature, pixel art in an SVG strip animated in CSS, in three moods (idle, working, happy).
- `hooks/ocean-thumb.ts`: the aquarium's thumbnail for the picker (prebuilt into `generated-scenes.ts` too).
- `types/index.d.ts`: the values the mod keeps in the session's state (picker open, turns done).
- `hooks/themes.ts`: the theme registry (palette, glass, indicator words, sound).
- `hooks/ascii.ts`: the ASCII renderer. A vector shape becomes a grid of characters: 4×4 samples per cell, the inside shaded with a density ramp (`.:-=+*#%`) by the light, edges picked from the edge's direction (`/ \ _ - ( ) | ' .`), patterns, stamps (eyes, gills). Cells that do not change between frames are written once.
- `hooks/stage.ts`: renders models to SVG with CSS animations, and the choreography: `lane` plays a queue of passes (`cross` with an optional stop, `visit` with a U-turn, `rise`, `fall`, `walk`) and spreads the idle time; two lanes means two creatures at most.
- `hooks/ocean-models.ts` (the creatures and the reef as vector shapes) and `hooks/ocean.ts` (the staging).
- `hooks/generated-scenes.ts`: the aquarium, prebuilt (**generated**: the mod loads it without computing anything). After changing `ocean*.ts`, `ascii.ts` or `stage.ts`, run `node --experimental-strip-types tools/build-scenes.mjs`. The script refuses a scene over 131,072 characters, the limit for a backdrop (the aquarium is about 101,000).
- `sounds/ocean.wav`: the end-of-turn sound, synthesized.
- `tests/wallpaper.test.tsx`: tests (`claude plugin test wallpaper`).

The terminal draws no backdrop, palette, thumbnails or creature: the desktop or mobile app is needed for those. There the picker is a row of buttons.

The band above the prompt can be collapsed with the app's `[-]` control; the creature goes with it. It lives in that band and cannot float over the conversation.
