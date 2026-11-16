// The little Claude creature that lives above the prompt: pixel art drawn
// as an SVG strip, animated in CSS (no script).
//
// Three moods:
//   idle    : stays home, blinks, looks around, goes for a short walk,
//             hops, waves, now and then.
//   working : while Claude works, bounces in place under a twinkling star.
//   happy   : when a turn ends, hops twice with sparkles, then idles.

import type { Mood } from '../types'

export type { Mood }

const P = 4 // one pixel of the sprite, in CSS pixels
const SW = 320 // strip width
const SH = 56 // strip height
const BODY = '#d97757'
const LIGHT = '#eb9a7a'
const DARK = '#b45a3c'
const EYE = '#1d1410'

// The sprite, 14 × 9: X body, E eye, A arm, L legs.
const SPRITE = [
  '...XXXXXXXX...',
  '..XXXXXXXXXX..',
  '..XXEXXXXEXX..',
  '..XXEXXXXEXX..',
  'AAXXXXXXXXXXAA',
  '..XXXXXXXXXX..',
  '..XXXXXXXXXX..',
]
const LEGS_A = ['...L.L..L.L...', '...L.L..L.L...']
const LEGS_B = ['....L.L..L.L..', '...L....L.....']
const COLS = 14
const ROWS = SPRITE.length + 2
const HOME = SW - COLS * P - 12
const GROUND = SH - 4 - ROWS * P

const px = (x: number, y: number, c: string) => `<rect x="${x * P}" y="${y * P}" width="${P - 0.6}" height="${P - 0.6}" fill="${c}"/>`

function body(): string {
  let out = ''
  SPRITE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === 'X') out += px(x, y, y === 0 || (y === 1 && x < 6) ? LIGHT : y >= 5 || x >= 11 ? DARK : BODY)
    }
  })
  return out
}

function only(rows: readonly string[], want: string, c: string, dy = 0): string {
  let out = ''
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === want) out += px(x, y + dy, c)
  })
  return out
}

const pc = (t: number, cycle: number) => `${Math.round((t / cycle) * 10000) / 100}%`

// The idle timeline, in seconds over a 48 s loop.
function idleCss(cycle = 48): string {
  const k = (name: string, stops: [number, string][]) => `@keyframes ${name}{${stops.map(([t, v]) => `${pc(t, cycle)}{${v}}`).join('')}}`
  const x = (v: number) => `transform:translateX(${v}px)`
  const walkL = HOME - 120
  // Position: home, walk left (10-14 s), stay, walk back (30-34 s).
  const pos = k('mPos', [
    [0, x(0)],
    [10, x(0)],
    [14, x(walkL - HOME)],
    [30, x(walkL - HOME)],
    [34, x(0)],
    [48, x(0)],
  ])
  // Legs: alternate every 0.25 s while walking.
  const legStops: [number, string][] = [[0, 'opacity:0']]
  for (const [a, b] of [
    [10, 14],
    [30, 34],
  ] as const) {
    for (let t = a; t < b; t += 0.5) {
      legStops.push([t, 'opacity:1'], [t + 0.25, 'opacity:0'])
    }
  }
  legStops.push([48, 'opacity:0'])
  const legs = k('mLegB', legStops)
  const legsA = k(
    'mLegA',
    legStops.map(([t, v]) => [t, v === 'opacity:1' ? 'opacity:0' : 'opacity:1']),
  )
  // Eyes: look left, look right, then the way it walks.
  const e = (v: number) => `transform:translateX(${v}px)`
  const eyes = k('mLook', [
    [0, e(0)],
    [6, e(0)],
    [6.1, e(-P)],
    [8, e(-P)],
    [8.1, e(P)],
    [9.5, e(P)],
    [9.6, e(-P)],
    [14, e(-P)],
    [14.1, e(0)],
    [30, e(0)],
    [30.1, e(P)],
    [34, e(P)],
    [34.1, e(0)],
    [40, e(0)],
    [40.1, e(-P)],
    [42, e(-P)],
    [42.1, e(0)],
    [48, e(0)],
  ])
  // A hop at 21 s.
  const y = (v: number) => `transform:translateY(${v}px)`
  const hop = k('mHop', [
    [0, y(0)],
    [21, y(0)],
    [21.3, y(-12)],
    [21.6, y(0)],
    [21.75, y(-3)],
    [21.9, y(0)],
    [48, y(0)],
  ])
  // A wave of the right arm at 25-27 s.
  const up = k('mArmUp', [
    [0, 'opacity:0'],
    [25, 'opacity:0'],
    [25.01, 'opacity:1'],
    [25.5, 'opacity:0'],
    [25.8, 'opacity:1'],
    [26.3, 'opacity:0'],
    [26.6, 'opacity:1'],
    [27, 'opacity:0'],
    [48, 'opacity:0'],
  ])
  const down = k('mArmDown', [
    [0, 'opacity:1'],
    [25, 'opacity:1'],
    [25.01, 'opacity:0'],
    [25.5, 'opacity:1'],
    [25.8, 'opacity:0'],
    [26.3, 'opacity:1'],
    [26.6, 'opacity:0'],
    [27, 'opacity:1'],
    [48, 'opacity:1'],
  ])
  return pos + legs + legsA + eyes + hop + up + down
}

const BLINK = '@keyframes mBlink{0%,93%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}'

function sparkles(cls: string): string {
  // Small plus-shaped pixel sparkles around the head.
  const s = (cx: number, cy: number, c: string, i: number) =>
    `<g class="${cls}" style="animation-delay:${i * 0.15}s"><rect x="${cx}" y="${cy - 3}" width="2" height="8" fill="${c}"/><rect x="${cx - 3}" y="${cy}" width="8" height="2" fill="${c}"/></g>`
  return s(-8, 4, '#ffd27a', 0) + s(COLS * P + 4, 0, '#ffe9b8', 1) + s(COLS * P + 8, 18, '#ffd27a', 2)
}

export function mascotSvg(mood: Mood): string {
  const legsA = only(LEGS_A, 'L', DARK, SPRITE.length)
  const legsB = only(LEGS_B, 'L', DARK, SPRITE.length)
  const eyes = only(SPRITE, 'E', EYE)
  const armDown = only(SPRITE, 'A', BODY)
  const armUp = px(13, 3, BODY) + px(13, 2, BODY) + px(0, 4, BODY) + px(1, 4, BODY)

  const css: string[] = [
    '.e{transform-box:fill-box;transform-origin:center}',
    BLINK,
  ]
  let sprite: string
  let extra = ''
  if (mood === 'working') {
    // Bounce in place on a quick beat, eyes up toward a twinkling star.
    css.push(
      '@keyframes mBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
      '@keyframes mStar{0%,100%{transform:rotate(0) scale(.7);opacity:.6}50%{transform:rotate(45deg) scale(1.1);opacity:1}}',
      '@keyframes mStep{0%,49.9%{opacity:1}50%,100%{opacity:0}}',
      '.st{transform-box:fill-box;transform-origin:center;animation:mStar 1.6s ease-in-out infinite}',
    )
    const star = `<g class="st"><rect x="${COLS * P + 6}" y="-2" width="3" height="11" fill="#ffd27a"/><rect x="${COLS * P + 2}" y="2" width="11" height="3" fill="#ffd27a"/></g>`
    sprite =
      `<g style="animation:mBounce .5s ease-in-out infinite">` +
      `<g>${body()}${armDown}</g>` +
      `<g transform="translate(${P},${-P})"><g class="e" style="animation:mBlink 3.1s infinite">${eyes}</g></g>` +
      `${star}</g>` +
      `<g style="animation:mStep .5s steps(1,end) infinite">${legsA}</g>` +
      `<g style="animation:mStep .5s steps(1,end) -.25s infinite">${legsB}</g>`
  } else {
    css.push(idleCss())
    const loop = (name: string, steps = false) => `animation:${name} 48s ${steps ? 'steps(1,end)' : 'ease-in-out'} ${mood === 'happy' ? '2.2s' : '0s'} infinite backwards`
    sprite =
      `<g style="${loop('mHop')}">` +
      `${body()}` +
      `<g style="${loop('mArmDown', true)}">${armDown}</g>` +
      `<g style="${loop('mArmUp', true)}">${armUp}</g>` +
      `<g style="${loop('mLook', true)}"><g class="e" style="animation:mBlink 4.3s infinite">${eyes}</g></g>` +
      `<g style="${loop('mLegA', true)}">${legsA}</g>` +
      `<g style="${loop('mLegB', true)}">${legsB}</g>` +
      `</g>`
    if (mood === 'happy') {
      // Two hops with sparkles, once, then the idle loop.
      css.push(
        '@keyframes mJoy{0%,100%{transform:translateY(0)}15%{transform:translateY(-14px)}30%{transform:translateY(0)}45%{transform:translateY(-10px)}60%{transform:translateY(0)}}',
        '@keyframes mSpark{0%{opacity:0;transform:scale(.3)}30%{opacity:1;transform:scale(1.2)}100%{opacity:0;transform:scale(.6) translateY(-6px)}}',
        '.sp{transform-box:fill-box;transform-origin:center;opacity:0;animation:mSpark 1.4s ease-out .2s 2 both}',
      )
      sprite = `<g style="animation:mJoy 1.8s ease-out 1">${sprite}</g>`
      extra = sparkles('sp')
    }
    sprite = `<g style="${loop('mPos')}">${sprite}${extra}</g>`
    extra = ''
  }

  css.push('@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SW} ${SH}" width="${SW}" height="${SH}"><style>${css.join('')}</style><g transform="translate(${HOME},${GROUND})">${sprite}${extra}</g></svg>`
}

export const MASCOT_SIZE = { width: SW, height: SH }
