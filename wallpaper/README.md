# wallpaper

A Claude Code mod that dresses up the Claude app (desktop and mobile): animated wallpapers (an ASCII aquarium, an ASCII koi pond, a cosy autumn night in cell art, a halftone night garden), a wallpaper picker with live thumbnails, a little Claude creature above the prompt, an interface palette to match, a themed thinking indicator and a quiet end-of-turn sound.

## Install

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `ayatooo/claude-desktop`, then **Add plugin**.

At the prompt of a terminal session: `/plugin install wallpaper --marketplace ayatooo/claude-desktop`. From a shell: `claude plugin install wallpaper --marketplace ayatooo/claude-desktop`.

To try it from a clone without installing: `claude --plugin-dir ./wallpaper`.

## The aquarium

`/wallpaper ocean` (the default): an aquarium drawn entirely in shaded ASCII art. As in a real aquarium, creatures pass by one at a time on two lanes, so never more than two on screen, slowly: a shark, a distant whale, a turtle, a manta ray, a blue tang and a clownfish that come to look and leave, a school of fish, an angelfish, a jellyfish rising, a crab on the sand; reefs, swaying kelp, light rays, marine snow and bubbles.

## The koi pond

`/wallpaper koi`: a Japanese garden pond seen from above. Koi (kohaku, showa, yamabuki, asagi, tancho, ogon) glide along slow curves, turned along their path, their bodies undulating at two joints, casting soft shadows on the pebbled floor; lily pads and lotus flowers sway on the surface, petals drift by, rings spread where something touched the water, and now and then a dragonfly crosses and hovers. Never more than two animals on screen. Its own palette (pond green, koi orange accent), indicator words ("Glisse sous les nénuphars", "Fait des ronds dans l'eau"…) and sound (a water drop and a soft chime).

## The autumn night

`/wallpaper autumn`: a cosy Halloween evening in cell art, each character on its own coloured cell as a terminal paints (after the style of the `snow-pines` example theme). A harvest moon over dusky hills, a log cabin with warm flickering windows and chimney smoke, fall trees in orange, red and gold, a bare tree where an owl blinks, a fence, carved jack-o'-lanterns flickering, low fog, falling leaves. Now and then, never more than two at once: bats, a little ghost, a witch across the moon, a black cat along the fence, a fox. Its own palette (plum and pumpkin), indicator words ("Sculpte une citrouille", "Boit un chocolat chaud"…) and sound (an owl's hoot).

## The night garden

`/wallpaper bloom`: glowing flowers in halftone dots on a black night. Every shape is filled with a dot screen instead of a flat colour and glows: a crescent moon, faint twinkling stars, flowers on dotted stems swaying and slowly breathing, spikes and buds, dotted grass, pollen and petals drifting, fireflies; now and then a moth flutters across. Its own palette (near black, turquoise accent), indicator words ("Fleurit dans le noir", "Rêve en pointillés"…) and sound (three glassy notes).

## Commands

| Command | What it does |
|---|---|
| `/wallpaper ocean` | The aquarium. |
| `/wallpaper koi` | The koi pond. |
| `/wallpaper autumn` | The autumn night. |
| `/wallpaper bloom` | The night garden. |
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
- `hooks/koi-models.ts` (koi in three parts, lily pad, lotus, dragonfly), `hooks/koi.ts` (the pond: koi follow cubic curves sampled into keyframes, turned along the path; each koi's rear and tail sway at their joints in CSS, so a fish is drawn once instead of frame by frame) and `hooks/koi-thumb.ts` (its thumbnail).
- `types/index.d.ts`: the values the mod keeps in the session's state (picker open, turns done).
- `hooks/themes.ts`: the theme registry (palette, glass, indicator words, sound).
- `hooks/ascii.ts`: the ASCII renderer. A vector shape becomes a grid of characters: 4×4 samples per cell, the inside shaded with a density ramp (`.:-=+*#%`) by the light, edges picked from the edge's direction (`/ \ _ - ( ) | ' .`), patterns, stamps (eyes, gills). Cells that do not change between frames are written once.
- `hooks/stage.ts`: renders models to SVG with CSS animations, and the choreography: `lane` plays a queue of passes (`cross` with an optional stop, `visit` with a U-turn, `rise`, `fall`, `walk`) and spreads the idle time; two lanes means two creatures at most.
- `hooks/ocean-models.ts` (the creatures and the reef as vector shapes) and `hooks/ocean.ts` (the staging).
- `hooks/generated-scenes.ts`: the aquarium, prebuilt (**generated**: the mod loads it without computing anything). After changing a scene, its models, `ascii.ts` or `stage.ts`, run `node --experimental-strip-types tools/build-scenes.mjs`. The script refuses a scene over 131,072 characters, the limit for a backdrop (the aquarium is about 101,000, the pond and the autumn night about 115,000).
- `hooks/cells.ts`: cell art, a grid of character cells with background colours, written as one path of rectangles per colour and one positioned `<text>` per glyph colour. `hooks/autumn-models.ts` (trees, cabin, pumpkins, moon, fence, the passers-by), `hooks/autumn.ts` (the scene) and `hooks/autumn-thumb.ts` (its thumbnail).
- `hooks/bloom.ts`: the night garden, pure vector shapes filled with dot patterns under a glow filter; its thumbnail is the same drawing cropped.
- `sounds/*.wav`: the end-of-turn sounds, synthesized.

The app draws a backdrop to cover its slot. In a narrow slot (a split view's pane, a phone held upright) that crops a wide scene's sides and blows it up; so each scene keeps its far layers (water, sky, stars) filling the view and, through CSS media queries on the aspect ratio, shrinks the scene itself toward the bottom so its whole width shows. `tools/build-scenes.mjs` also refuses a scene with an unescaped `&`, which would break the XML the app loads. It also refuses a `/*` outside `<style>`: the engine reads it as a CSS comment that never closes and refuses the whole backdrop, so the ASCII art never writes `/` right before `*` (a tspan is cut there and goes on at the same pen position; cell art puts its stars first, each glyph keeping its own position). The desktop app also shows nothing for the autumn night while its cell art holds a `\` (the engine passes it): cell art draws each `\` as a `/` mirrored on the same cell.

A split view's other pane is another session: it shows this wallpaper only if that session loads the mod (a cloud session does not load the plugins installed on your computer).
- `tests/wallpaper.test.tsx`: tests (`claude plugin test wallpaper`).

The terminal draws no backdrop, palette, thumbnails or creature: the desktop or mobile app is needed for those. There the picker is a row of buttons.

The band above the prompt can be collapsed with the app's `[-]` control; the creature goes with it. It lives in that band and cannot float over the conversation.
