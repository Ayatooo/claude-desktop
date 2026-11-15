// The themes: for each scene, its animated backdrop, its interface palette,
// the glass over it, the matching thinking indicator and its end-of-turn sound.
//
// Ids and code are English; labels, alt texts and indicator words are what a
// person reads, in French.

import type { ThemeBackdrop, ThemeBackdropGlass, ThemeColors } from 'claude-code'

import { ABYSS_SVG, CABIN_SVG, DESERT_SVG, FOREST_SVG, OCEAN_SVG } from './generated-scenes'
import { coastSvg } from './coast'
import { dayPhase } from './daylight'
import type { DayPhase, Place } from './daylight'
import { lakeSvg } from './lake'
import { makeColors } from './make-colors.js'
import { SIMPLE_SCENES } from './simple-scenes'
import type { Scene } from './simple-scenes'

type Palette = {
  label: string
  roles: { accent: string; danger: string; success: string; warning: string; pro: string }
  anchors: {
    'surface-0': string
    'surface-1': string
    'surface-2': string
    'surface-3': string
    'text-primary': string
    'text-secondary': string
    'text-muted': string
  }
}

// What a theme looks like at one moment: its palette and glass, and, for a
// theme that shows a picture rather than an animated scene, its backdrop.
export type Look = { key: string; colors: ThemeColors; problems: string[]; glass: ThemeBackdropGlass; backdrop?: ThemeBackdrop }

export type Theme = {
  id: string
  label: string
  alt: string
  svg: string
  // A backdrop drawn for the moment (the lake follows the time of day).
  render?: (ms: number, place: Place) => string
  // A look that changes over time (the lake's palette follows the day).
  lookAt?: (ms: number, place: Place) => Look
  colors: ThemeColors
  // The contrast lines Desktop would refuse the palette for (empty when fine).
  problems: string[]
  glass: ThemeBackdropGlass
  // The thinking indicator: words in place of the engine's verb, and what
  // follows the word (in place of the ellipsis).
  spinner?: { words: string[]; suffix: string }
  // A quiet end-of-turn sound, a file of the mod (played where the engine can).
  sound?: string
}

type Spec = {
  palette: Palette
  glass: ThemeBackdropGlass
  spinner?: { words: string[]; suffix: string }
  sound?: string
}

const NIGHT: Palette = {
  label: 'Wallpaper',
  roles: { accent: '#8b7dff', danger: '#ef6b73', success: '#5fd3a2', warning: '#e9b056', pro: '#c58cff' },
  anchors: {
    'surface-0': '#0f0d24',
    'surface-1': '#16132f',
    'surface-2': '#1c1838',
    'surface-3': '#221d40',
    'text-primary': '#eeeaff',
    'text-secondary': '#c9c3e6',
    'text-muted': '#a39cc4',
  },
}

const NIGHT_GLASS: ThemeBackdropGlass = { blur: 18, tint: '#120f2b', opacity: 0.55 }

const SPECS: Record<string, Spec> = {
  ocean: {
    palette: {
      label: 'Océan',
      roles: { accent: '#3fc8d4', danger: '#ff6b6b', success: '#5ee6a8', warning: '#ffb454', pro: '#a08cff' },
      anchors: {
        'surface-0': '#06131f',
        'surface-1': '#0a1b2a',
        'surface-2': '#0e2233',
        'surface-3': '#12283b',
        'text-primary': '#e8f6fb',
        'text-secondary': '#bcd6e1',
        'text-muted': '#93b4c2',
      },
    },
    // Light blur: the ASCII stays readable behind the panels.
    glass: { blur: 5, tint: '#041220', opacity: 0.62 },
    spinner: {
      words: ['Nage avec les poissons', 'Suit le courant', 'Explore le récif', 'Plonge', 'Fait des bulles', 'Remonte doucement'],
      suffix: ' o°',
    },
    sound: 'sounds/ocean.wav',
  },
  forest: {
    palette: {
      label: 'Sous-bois',
      roles: { accent: '#9fd36b', danger: '#ef6f6c', success: '#6fcf97', warning: '#f2b544', pro: '#9ab8ff' },
      anchors: {
        'surface-0': '#07141b',
        'surface-1': '#0b1c24',
        'surface-2': '#10232c',
        'surface-3': '#142a33',
        'text-primary': '#e7f1ee',
        'text-secondary': '#bcd0cb',
        'text-muted': '#93aba6',
      },
    },
    glass: { blur: 5, tint: '#06121a', opacity: 0.6 },
    spinner: {
      words: ['Suit les lucioles', 'Écoute le hibou', 'Marche à pas de renard', 'Cherche sous les fougères', 'Guette le cerf', 'Traverse la brume', 'Lit à la lueur de la lune'],
      suffix: ' *',
    },
    sound: 'sounds/forest.wav',
  },
  cabin: {
    palette: {
      label: 'Chalet',
      roles: { accent: '#7fb8ff', danger: '#ff6b7a', success: '#5fe3b0', warning: '#ffb15c', pro: '#b48cff' },
      anchors: {
        'surface-0': '#070d1c',
        'surface-1': '#0c1427',
        'surface-2': '#111b32',
        'surface-3': '#16213b',
        'text-primary': '#eaf1fb',
        'text-secondary': '#bccbe0',
        'text-muted': '#93a5bf',
      },
    },
    glass: { blur: 5, tint: '#060c1a', opacity: 0.6 },
    spinner: {
      words: ['Attise le feu', 'Fend du bois', 'Suit les traces', 'Chausse les raquettes', "Guette l'aurore", 'Fait chauffer le thé', 'Déneige le seuil', 'Compte les flocons'],
      suffix: ' *',
    },
    sound: 'sounds/cabin.wav',
  },
  abyss: {
    palette: {
      label: 'Abysses',
      roles: { accent: '#3fd6ff', danger: '#ff5f7a', success: '#4fe0b0', warning: '#ffb066', pro: '#a98bff' },
      anchors: {
        'surface-0': '#03080f',
        'surface-1': '#060e19',
        'surface-2': '#0a1422',
        'surface-3': '#0e1a2b',
        'text-primary': '#e2f1fa',
        'text-secondary': '#b0c8d8',
        'text-muted': '#8aa4b8',
      },
    },
    glass: { blur: 5, tint: '#02070e', opacity: 0.62 },
    spinner: {
      words: ['Sonde les abysses', 'Suit une lueur', 'Descend en apnée', 'Écoute le sonar', 'Fouille la fosse', 'Remonte le panache', 'Guette le leurre', 'Allume les photophores'],
      suffix: ' ·:·',
    },
    sound: 'sounds/abyss.wav',
  },
  desert: {
    palette: {
      label: 'Désert la nuit',
      roles: { accent: '#e3a869', danger: '#ef6f6c', success: '#7fd1a8', warning: '#f0c060', pro: '#a99cff' },
      anchors: {
        'surface-0': '#0c0d24',
        'surface-1': '#12142f',
        'surface-2': '#171a38',
        'surface-3': '#1c1f41',
        'text-primary': '#ece9f7',
        'text-secondary': '#c8c4de',
        'text-muted': '#a39fbd',
      },
    },
    glass: { blur: 6, tint: '#0a0b22', opacity: 0.6 },
    spinner: {
      words: ['Suit les étoiles', 'Lit les dunes', 'Écoute le vent', "Cherche l'oasis", 'Suit la caravane', 'Compte les étoiles', 'Traverse le désert', 'Attend la fraîcheur'],
      suffix: ' *',
    },
    sound: 'sounds/desert.wav',
  },
}

const LAKE_PALETTES: Record<DayPhase, Palette> = {
  night: {
    label: 'Lac de nuit',
    roles: { accent: '#8fa8ff', danger: '#ef6b73', success: '#5fd3a2', warning: '#e9b056', pro: '#c58cff' },
    anchors: { 'surface-0': '#070b1d', 'surface-1': '#0c1226', 'surface-2': '#11182f', 'surface-3': '#151d37', 'text-primary': '#eaeffd', 'text-secondary': '#c3cbe4', 'text-muted': '#9aa5c4' },
  },
  dawn: {
    label: "Lac à l'aube",
    roles: { accent: '#f2a3b4', danger: '#f0707a', success: '#6fd3a6', warning: '#f0b65c', pro: '#b99cff' },
    anchors: { 'surface-0': '#1a1325', 'surface-1': '#21182e', 'surface-2': '#271d36', 'surface-3': '#2d223e', 'text-primary': '#f6ecf2', 'text-secondary': '#d9c6d3', 'text-muted': '#b8a3b3' },
  },
  day: {
    label: 'Lac en plein jour',
    roles: { accent: '#5aa9f0', danger: '#ef6b73', success: '#5fd3a2', warning: '#e9b056', pro: '#a99cff' },
    anchors: { 'surface-0': '#0c1826', 'surface-1': '#112031', 'surface-2': '#16273a', 'surface-3': '#1b2e43', 'text-primary': '#eef5fb', 'text-secondary': '#c3d3e2', 'text-muted': '#9cb1c6' },
  },
  dusk: {
    label: 'Lac au crépuscule',
    roles: { accent: '#f39a5d', danger: '#f0707a', success: '#6fd3a6', warning: '#f0c060', pro: '#b99cff' },
    anchors: { 'surface-0': '#1a1020', 'surface-1': '#22152a', 'surface-2': '#291a33', 'surface-3': '#301f3b', 'text-primary': '#fbeee8', 'text-secondary': '#e0c8c0', 'text-muted': '#c0a49c' },
  },
}

// The bright day sky needs a denser glass behind the text.
const LAKE_GLASS: Record<DayPhase, ThemeBackdropGlass> = {
  night: { blur: 8, tint: '#070b1d', opacity: 0.55 },
  dawn: { blur: 10, tint: '#1a1325', opacity: 0.62 },
  day: { blur: 12, tint: '#0c1826', opacity: 0.72 },
  dusk: { blur: 10, tint: '#1a1020', opacity: 0.62 },
}

function colorsOf(p: Palette): { colors: ThemeColors; problems: string[] } {
  const { theme, problems } = makeColors({ label: p.label, only: 'dark', roles: p.roles, dark: { gray: { anchors: p.anchors } } })
  return { colors: theme, problems: problems.filter(line => line.startsWith("Desktop won't paint")) }
}

const LAKE_LOOKS = Object.fromEntries(
  (Object.keys(LAKE_PALETTES) as DayPhase[]).map(phase => [phase, { key: phase, ...colorsOf(LAKE_PALETTES[phase]), glass: LAKE_GLASS[phase] }]),
) as Record<DayPhase, Look>

const LAKE: Theme = {
  id: 'lake',
  label: 'Lac de montagne',
  alt: "Un lac de montagne qui suit l'heure du jour : la lumière, le soleil, la lune, les étoiles, la brume et les couleurs changent de l'aube à la nuit",
  svg: '',
  render: lakeSvg,
  lookAt: (ms, place) => LAKE_LOOKS[dayPhase(ms, place)],
  ...LAKE_LOOKS.day,
  spinner: {
    words: ['Regarde le lac', 'Suit la course du soleil', 'Compte les nuages', 'Fait des ricochets', 'Écoute le vent dans les pins', 'Attend que la brume se lève'],
    suffix: ' ~',
  },
  sound: 'sounds/lake.wav',
}

export const DEFAULT_THEME = 'ocean'

// The detailed ASCII scenes, built by tools/build-scenes.mjs.
const DETAILED: Scene[] = [
  { id: 'ocean', label: 'Aquarium', alt: 'Un aquarium en art ASCII : requin, baleine, tortue, raie manta, poissons tropicaux, méduse et crabe parmi les récifs et les algues', svg: OCEAN_SVG },
  { id: 'forest', label: 'Sous-bois la nuit', alt: 'Un sous-bois au clair de lune en art ASCII : troncs, brume, lucioles, un hibou sur une branche, un renard, un cerf, un lapin, un hérisson et des chauves-souris', svg: FOREST_SVG },
  { id: 'cabin', label: 'Chalet en hiver', alt: 'Un chalet enneigé la nuit en art ASCII : aurores boréales, montagnes, sapins, fenêtres éclairées, fumée, neige qui tombe, un renard polaire, un lièvre, un harfang et un élan', svg: CABIN_SVG },
  { id: 'abyss', label: 'Abysses', alt: 'Les grands fonds en art ASCII : bioluminescence, cheminée hydrothermale, calmar géant, baudroie, pieuvre dumbo, cténophore, poissons-lanternes', svg: ABYSS_SVG },
  { id: 'desert', label: 'Désert la nuit', alt: 'Un désert sous les étoiles en art ASCII : Voie lactée, croissant de lune, dunes, oasis, cactus, caravane, fennec, scorpion, gerboise et vipère', svg: DESERT_SVG },
]

export const THEMES: Theme[] = [...DETAILED, ...SIMPLE_SCENES].map(scene => {
  const spec = SPECS[scene.id] ?? { palette: NIGHT, glass: NIGHT_GLASS }
  const { theme, problems } = makeColors({
    label: spec.palette.label,
    only: 'dark',
    roles: spec.palette.roles,
    dark: { gray: { anchors: spec.palette.anchors } },
  })
  return {
    ...scene,
    colors: theme,
    problems: problems.filter(line => line.startsWith("Desktop won't paint")),
    glass: spec.glass,
    spinner: spec.spinner,
    sound: spec.sound,
  }
})

// The coast follows the day the same way, with its own palettes.
const COAST_PALETTES: Record<DayPhase, Palette> = {
  night: {
    label: 'Côte de nuit',
    roles: { accent: '#ffcf7a', danger: '#ef6b73', success: '#5fd3a2', warning: '#e9b056', pro: '#a99cff' },
    anchors: { 'surface-0': '#060a18', 'surface-1': '#0b1122', 'surface-2': '#10172b', 'surface-3': '#141c33', 'text-primary': '#eaeffb', 'text-secondary': '#c3cbe2', 'text-muted': '#9aa5c2' },
  },
  dawn: {
    label: "Côte à l'aube",
    roles: { accent: '#f2a3b4', danger: '#f0707a', success: '#6fd3a6', warning: '#f0b65c', pro: '#b99cff' },
    anchors: { 'surface-0': '#191326', 'surface-1': '#20182f', 'surface-2': '#261d37', 'surface-3': '#2c223f', 'text-primary': '#f6ecf2', 'text-secondary': '#d9c6d3', 'text-muted': '#b8a3b3' },
  },
  day: {
    label: 'Côte en plein jour',
    roles: { accent: '#3f9be8', danger: '#ef6b73', success: '#5fd3a2', warning: '#e9b056', pro: '#a99cff' },
    anchors: { 'surface-0': '#0b1726', 'surface-1': '#101f31', 'surface-2': '#15263a', 'surface-3': '#1a2d43', 'text-primary': '#eef5fb', 'text-secondary': '#c3d3e2', 'text-muted': '#9cb1c6' },
  },
  dusk: {
    label: 'Côte au crépuscule',
    roles: { accent: '#f59a52', danger: '#f0707a', success: '#6fd3a6', warning: '#f0c060', pro: '#b99cff' },
    anchors: { 'surface-0': '#1a1020', 'surface-1': '#22152a', 'surface-2': '#291a33', 'surface-3': '#301f3b', 'text-primary': '#fbeee8', 'text-secondary': '#e0c8c0', 'text-muted': '#c0a49c' },
  },
}

const COAST_LOOKS = Object.fromEntries(
  (Object.keys(COAST_PALETTES) as DayPhase[]).map(phase => [phase, { key: phase, ...colorsOf(COAST_PALETTES[phase]), glass: LAKE_GLASS[phase] }]),
) as Record<DayPhase, Look>

const COAST: Theme = {
  id: 'coast',
  label: 'Côte et phare',
  alt: "Une côte avec un phare qui suit l'heure du jour : village de pêcheurs dont les fenêtres s'allument le soir, port, barques, falaises, vagues, voilier, mouettes, faisceau du phare la nuit",
  svg: '',
  render: coastSvg,
  lookAt: (ms, place) => COAST_LOOKS[dayPhase(ms, place)],
  ...COAST_LOOKS.day,
  spinner: {
    words: ['Guette le phare', 'Compte les vagues', 'Suit les mouettes', 'Répare les filets', 'Attend la marée', 'Regarde passer le voilier', "Allume les fenêtres du port"],
    suffix: ' ≈',
  },
  sound: 'sounds/coast.wav',
}

THEMES.splice(1, 0, LAKE, COAST)

export const themeById = (id: unknown): Theme | undefined => THEMES.find(t => t.id === id)

// The look of a theme now: its own, or the one of the moment.
export const lookOf = (t: Theme, ms: number, place: Place): Look =>
  t.lookAt?.(ms, place) ?? { key: t.id, colors: t.colors, problems: t.problems, glass: t.glass }
