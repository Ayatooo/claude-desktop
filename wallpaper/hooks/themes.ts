// The themes: for each scene, its animated backdrop, its interface palette,
// the glass over it, the matching thinking indicator and its end-of-turn sound.
//
// Ids and code are English; labels, alt texts and indicator words are what a
// person reads, in French.

import type { ThemeBackdropGlass, ThemeColors } from 'claude-code'

import { AUTUMN_SVG, AUTUMN_THUMB, BLOOM_SVG, BLOOM_THUMB, KOI_SVG, KOI_THUMB, NIGHT_SVG, NIGHT_THUMB, OCEAN_SVG, OCEAN_THUMB } from './generated-scenes'
import { makeColors } from './make-colors.js'

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

export type Theme = {
  id: string
  label: string
  alt: string
  svg: string
  // A small animated preview for the picker (16:9).
  thumb: string
  colors: ThemeColors
  // The contrast lines Desktop would refuse the palette for (empty when fine).
  problems: string[]
  // No blur: the desktop app holds a scene still when it costs too much to
  // draw, and frosting its panels over a moving scene did (the autumn night
  // froze within seconds with a blur of 5, and kept moving with none). The
  // tint and its opacity keep the text readable.
  glass: ThemeBackdropGlass
  // The thinking indicator: words in place of the engine's verb, and what
  // follows the word (in place of the ellipsis).
  spinner?: { words: string[]; suffix: string }
  // A quiet end-of-turn sound, a file of the mod (played where the engine can).
  sound?: string
}

type Spec = Omit<Theme, 'colors' | 'problems'> & { palette: Palette }

const SPECS: Spec[] = [
  {
    id: 'ocean',
    label: 'Aquarium',
    alt: 'Un aquarium en art ASCII : requin, baleine, tortue, raie manta, poissons tropicaux, méduse et crabe parmi les récifs et les algues',
    svg: OCEAN_SVG,
    thumb: OCEAN_THUMB,
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
    glass: { blur: 0, tint: '#041220', opacity: 0.62 },
    spinner: {
      words: ['Nage avec les poissons', 'Suit le courant', 'Explore le récif', 'Plonge', 'Fait des bulles', 'Remonte doucement'],
      suffix: ' o°',
    },
    sound: 'sounds/ocean.wav',
  },
  {
    id: 'koi',
    label: 'Bassin de koïs',
    alt: "Un bassin de jardin japonais vu de dessus, en art ASCII : des carpes koïs kohaku, showa, yamabuki et asagi qui ondulent entre les nénuphars et les lotus, des pétales qui dérivent, des ronds dans l'eau et une libellule",
    svg: KOI_SVG,
    thumb: KOI_THUMB,
    palette: {
      label: 'Bassin',
      roles: { accent: '#f08a5d', danger: '#ff6b6b', success: '#7fd99a', warning: '#f5c15c', pro: '#c3a3ff' },
      anchors: {
        'surface-0': '#07140f',
        'surface-1': '#0b1d16',
        'surface-2': '#10251d',
        'surface-3': '#152d24',
        'text-primary': '#eaf5ef',
        'text-secondary': '#bfd8cb',
        'text-muted': '#94b3a4',
      },
    },
    glass: { blur: 0, tint: '#06150f', opacity: 0.6 },
    spinner: {
      words: ['Glisse sous les nénuphars', "Fait des ronds dans l'eau", 'Médite au bord du bassin', 'Suit une koï', 'Écoute la libellule', 'Ondule doucement'],
      suffix: ' ~',
    },
    sound: 'sounds/koi.wav',
  },
  {
    id: 'autumn',
    label: "Nuit d'automne",
    alt: "Une nuit d'automne douillette en art ASCII à cellules colorées : pleine lune orangée, cabane en rondins aux fenêtres chaudes et cheminée qui fume, arbres roux et dorés, arbre nu avec une chouette, citrouilles sculptées, brume et feuilles qui tombent ; passent des chauves-souris, un petit fantôme, une sorcière, un chat noir et un renard",
    svg: AUTUMN_SVG,
    thumb: AUTUMN_THUMB,
    palette: {
      label: 'Automne',
      roles: { accent: '#f0923a', danger: '#ff6b6b', success: '#9ad48a', warning: '#f5c15c', pro: '#c3a3ff' },
      anchors: {
        'surface-0': '#140c1a',
        'surface-1': '#1b1122',
        'surface-2': '#22162a',
        'surface-3': '#2a1b33',
        'text-primary': '#f6e9e0',
        'text-secondary': '#d8c3c4',
        'text-muted': '#b39ea6',
      },
    },
    glass: { blur: 0, tint: '#120a18', opacity: 0.6 },
    spinner: {
      words: ['Ramasse les feuilles', 'Sculpte une citrouille', 'Allume une bougie', 'Boit un chocolat chaud', 'Écoute la chouette', 'Rentre du bois'],
      suffix: ' *',
    },
    sound: 'sounds/autumn.wav',
  },
  {
    id: 'bloom',
    label: 'Jardin de nuit',
    alt: 'Un jardin de nuit en trame de points lumineux turquoise sur fond noir : croissant de lune, fleurs sur des tiges en pointillés qui ondulent, pollen et pétales qui flottent, lucioles, et parfois un papillon de nuit',
    svg: BLOOM_SVG,
    thumb: BLOOM_THUMB,
    palette: {
      label: 'Nuit',
      roles: { accent: '#3fe0c8', danger: '#ff6b81', success: '#6ee7a8', warning: '#f5c15c', pro: '#a99cff' },
      anchors: {
        'surface-0': '#030607',
        'surface-1': '#070d0f',
        'surface-2': '#0b1416',
        'surface-3': '#101b1e',
        'text-primary': '#e2fbf6',
        'text-secondary': '#a9d6cd',
        'text-muted': '#7fb0a6',
      },
    },
    glass: { blur: 0, tint: '#020506', opacity: 0.55 },
    spinner: {
      words: ['Fleurit dans le noir', 'Arrose les étoiles', 'Cueille la lune', 'Rêve en pointillés', 'Suit une luciole', 'Éclot doucement'],
      suffix: ' .:',
    },
    sound: 'sounds/bloom.wav',
  },
  {
    id: 'night',
    label: 'Nuit nuageuse',
    alt: "Une nuit bleue en art ASCII à cellules colorées : un croissant de lune kaki entouré de petits points, des nuages bleus faits de caractères qui dérivent lentement, des étoiles qui scintillent sur une grille discrète, et parfois une étoile filante",
    svg: NIGHT_SVG,
    thumb: NIGHT_THUMB,
    palette: {
      label: 'Nuit',
      roles: { accent: '#8fa2ff', danger: '#ff6b81', success: '#6ee7a8', warning: '#f5c15c', pro: '#b9a3ff' },
      anchors: {
        'surface-0': '#060b1e',
        'surface-1': '#0a1230',
        'surface-2': '#0f1a3c',
        'surface-3': '#142148',
        'text-primary': '#e8edff',
        'text-secondary': '#bcc6ea',
        'text-muted': '#949fc8',
      },
    },
    glass: { blur: 0, tint: '#081030', opacity: 0.55 },
    spinner: {
      words: ['Compte les étoiles', 'Suit les nuages', 'Attend la lune', 'Rêve dans le ciel', 'Souffle sur les nuages', 'Veille tard'],
      suffix: ' ·',
    },
    sound: 'sounds/bloom.wav',
  },
]

export const DEFAULT_THEME = 'ocean'

export const THEMES: Theme[] = SPECS.map(({ palette, ...theme }) => {
  const { theme: colors, problems } = makeColors({ label: palette.label, only: 'dark', roles: palette.roles, dark: { gray: { anchors: palette.anchors } } })
  return { ...theme, colors, problems: problems.filter(line => line.startsWith("Desktop won't paint")) }
})

export const themeById = (id: unknown): Theme | undefined => THEMES.find(t => t.id === id)
