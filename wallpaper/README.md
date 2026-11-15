# wallpaper

A Claude Code mod that dresses up the Claude app (desktop and mobile): animated ASCII-art wallpapers, an interface palette matched to each scene, a themed thinking indicator and a quiet end-of-turn sound.

## Install

At the prompt of a terminal session:

```
/plugin install wallpaper --marketplace ayatooo/claude-desktop
```

From a shell: `claude plugin install wallpaper --marketplace ayatooo/claude-desktop`.
In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `ayatooo/claude-desktop`, then **Add plugin**.

To try it from a clone without installing: `claude --plugin-dir ./wallpaper`.

## Themes

| Command | Scene |
|---|---|
| `/wallpaper ocean` | Aquarium (default): shark, distant whale, turtle, manta ray, a blue tang and a clownfish that come to look and leave, a school of fish, an angelfish, a rising jellyfish, a crab on the sand; reefs, kelp, light rays, bubbles. |
| `/wallpaper lake` | A mountain lake that follows the time of day: an illustrated landscape (not ASCII) whose light moves on continuously from night to dawn, day and dusk. The sun and moon follow their real course (sunrise and sunset computed for the date and place, the moon in its real phase), with stars at night, mist at dawn, birds by day, reflections and glitter on the water. The interface palette changes with the moment of the day. |
| `/wallpaper forest` | Forest at night: moon behind the trunks, mist, fireflies, an owl on its branch (blinks, turns its head); a fox, a deer that stops to graze then looks up, a rabbit that sits, a hedgehog, bats across the moon. |
| `/wallpaper cabin` | Winter cabin: northern lights, mountains, snowy firs, a log cabin with warm windows, chimney smoke, snow on three layers; an arctic fox, a hare, a snowy owl in flight, an elk on the ridge. |
| `/wallpaper abyss` | The deep sea: bioluminescence, a hydrothermal vent and its plume, glass sponges; giant squid, anglerfish with a glowing lure, dumbo octopus, rainbow comb jelly, lanternfish, gulper eel. |
| `/wallpaper desert` | Desert at night: Milky Way, crescent moon, shooting star, dunes, oasis, saguaros; a caravan on the ridge, a fennec fox, a glowing scorpion, a jerboa, a viper. |
| `/wallpaper aurora`, `night`, `tide` | Three simpler backdrops, without creatures. |
| `/wallpaper off` | Back to the app's own look. |
| `/wallpaper` | Current theme, sound state, list of themes. |
| `/wallpaper sound on` / `off` | End-of-turn sound. |
| `/wallpaper place <lat> <lon> [time zone]` | Where the lake's sun rises and sets, e.g. `/wallpaper place 45.76 4.84 Europe/Paris`. Default: Paris. |
| `/wallpaper diag`, `/wallpaper test` | Display diagnostics: is the theme drawn? does a loud still gradient show? |

The choice is kept across sessions. Animations stop when the system asks for reduced motion.

Every scene follows one rule: as in an aquarium, creatures pass by one at a time on two "lanes", so **never more than two on screen**. Everything is slow: a pass lasts one to several minutes, a full cycle about 6 to 8 minutes.

What a theme changes:
- **The backdrop** (desktop and mobile) and the glass over it (blur, tint, opacity).
- **The interface palette** (desktop and mobile).
- **The thinking indicator** (desktop and terminal; the mobile app does not draw it): themed words and a small glyph. On the desktop, when the row describes the current step ("Creating notes.md"), it keeps its words and only takes the glyph.
- **The end-of-turn sound**: bubble, water drop, owl hoot, bell, sonar or kalimba. It only plays where Claude Code runs on a Mac (the engine plays it with `afplay`); a cloud or Linux session plays nothing.

The texts a person reads (command replies, indicator words, labels) are in French; the code is in English.

## How it works

- `hooks/register.tsx`: the `/wallpaper` command, the backdrop, the thinking indicator, the end-of-turn sound.
- `hooks/themes.ts`: the theme registry (palette, glass, indicator words, sound). A new theme is a new entry here.
- `hooks/ascii.ts`: the ASCII renderer. A vector shape becomes a grid of characters: 4×4 samples per cell, the inside shaded with a density ramp (`.:-=+*#%`) by the light, edges picked from the edge's direction (`/ \ _ - ( ) | ' .`), patterns, stamps (eyes, gills). Cells that do not change between frames are written once.
- `hooks/stage.ts`: the toolkit every scene shares: renders models to SVG, CSS animations, and the choreography. `lane` plays a queue of passes (`cross` with an optional stop, `visit` with a U-turn, `rise`, `fall`, `walk`) and spreads the idle time; two lanes means two creatures at most.
- A scene is two files: `<scene>-models.ts` (creatures and scenery as vector shapes) and `<scene>.ts` (the staging): `ocean`, `forest`, `cabin`, `abyss`, `desert`.
- `hooks/lake.ts`: the lake, painted rather than geometric: SVG filters give the rock its relief (fractal noise lit from the side, laid as a soft shadow), the clouds their ragged edges and the reflection its wobble; detailed pines, reeds, rocks, a dock and a rocking boat, fish rings, fireflies and the Milky Way at night. One SVG on a 24-hour CSS cycle, drawn at each render with a negative delay equal to the local time of day; its keyframes come from the day's sunrise and sunset (NOAA's simplified formulas) and the moon from its phase. A timer re-applies the palette when the moment of the day changes.
- `hooks/simple-scenes.ts`: the three simple backdrops.
- `hooks/generated-scenes.ts`: the detailed scenes, prebuilt (**generated**: the mod loads them without computing anything). After changing a scene, its models, `ascii.ts` or `stage.ts`, run:
  ```bash
  node --experimental-strip-types tools/build-scenes.mjs          # every scene
  node --experimental-strip-types tools/build-scenes.mjs forest   # one scene
  ```
  The script refuses a scene over 131,072 characters, the limit for a backdrop. Today: ocean ~101,000, forest ~111,000, cabin ~91,000, abyss ~83,000, desert ~118,000.
- `sounds/`: the end-of-turn sounds, synthesized.
- `tests/wallpaper.test.tsx`: thinking indicator tests (`claude plugin test wallpaper`).

The terminal draws no backdrop or palette: the desktop or mobile app is needed for those. The themed thinking indicator also shows in the terminal.
