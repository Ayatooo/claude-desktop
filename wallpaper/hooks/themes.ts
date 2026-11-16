// The themes: for each scene, its animated backdrop, its interface palette,
// the glass over it, the matching thinking indicator and its end-of-turn sound.
//
// Ids and code are English; labels, alt texts and indicator words are what a
// person reads, in French.

import type { ThemeBackdropGlass, ThemeColors } from 'claude-code'

import { OCEAN_SVG, OCEAN_THUMB } from './generated-scenes'
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
    // Light blur: the ASCII stays readable behind the panels.
    glass: { blur: 5, tint: '#041220', opacity: 0.62 },
    spinner: {
      words: ['Nage avec les poissons', 'Suit le courant', 'Explore le récif', 'Plonge', 'Fait des bulles', 'Remonte doucement'],
      suffix: ' o°',
    },
    sound: 'sounds/ocean.wav',
  },
]

export const DEFAULT_THEME = 'ocean'

export const THEMES: Theme[] = SPECS.map(({ palette, ...theme }) => {
  const { theme: colors, problems } = makeColors({ label: palette.label, only: 'dark', roles: palette.roles, dark: { gray: { anchors: palette.anchors } } })
  return { ...theme, colors, problems: problems.filter(line => line.startsWith("Desktop won't paint")) }
})

export const themeById = (id: unknown): Theme | undefined => THEMES.find(t => t.id === id)
