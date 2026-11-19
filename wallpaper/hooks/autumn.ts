// "Autumn night" scene: a cosy Halloween evening in cell art (a character
// in each coloured cell, as a terminal paints): a harvest moon, hills in
// the dusk, a log cabin with warm windows and chimney smoke, fall trees, a
// bare tree with an owl, a fence, jack-o'-lanterns, fog, falling leaves.
//
// Passers-by, one per lane, two lanes (never more than two on screen):
// in the sky bats, a little ghost, a witch across the moon; on the ground
// a black cat along the fence and a fox.
//
// Layers, back to front: sky → stars → dusk glow → moon → sky lane → hills
// → field → cabin, smoke → fence → ground lane → trees, owl → pumpkins →
// fog → leaves → vignette. All CSS-animated, no script, fixed seed.

import { CELL_CSS, CH, CW, Grid, gridSvg } from './cells'
import { GOLD, ORANGE, RED, WINDOW, bareTree, bat, cabin, cat, farTree, fence, fox, ghost, moon, owl, pumpkin, tree, witch } from './autumn-models'
import { H, W, esc, mix, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

// A wide view (a desktop window much wider than 16:10) crops the scene's top
// and bottom by the same height, which hid the ground where the cat and the
// fox walk. There, the land rises and the sky (moon, witch, bats) comes down
// by that height, so both stay in view. Each step uses its narrowest aspect,
// so nothing is lifted further than the view crops.
const WIDE = [1.8, 2, 2.2, 2.4, 2.7, 3].map(a => {
  const h = Math.round((H - W / a) / 2)
  return `@media (min-aspect-ratio:${Math.round(a * 10)}/10){#fit{transform:translateY(-${h}px)}#sky{transform:translateY(${2 * h}px)}}`
})

// Falling leaves: how many, and their frames a second (see the leaves below).
const LEAVES = 8
const LEAF_FPS = 10

const st = stage({ cycle: 420, slow: 1 })
const { kf, frameAnim } = st

const COLS = Math.ceil(W / CW)
const HORIZON = 62

// A sprite of a few frames, as a Drawn the lanes can play.
function sprite(make: (f: number) => Grid, frames: number, period: number): Drawn {
  let svg = ''
  let w = 0
  let h = 0
  for (let f = 0; f < frames; f++) {
    const g = make(f)
    const b = g.bounds()
    w = Math.max(w, (b.c1 + 1) * CW)
    h = Math.max(h, (b.r1 + 1) * CH)
    svg += `<g style="${frameAnim(frames, f, period)}">${gridSvg(g)}</g>`
  }
  return { svg, w, h }
}

// ---------- Sky ----------

function stars(): string {
  const r = rng(5)
  ;[0, 1, 2].forEach(k => kf(`tw${k}`, `0%,100%{opacity:.25}${40 + k * 15}%{opacity:1}`))
  let out = ''
  for (let i = 0; i < 70; i++) {
    const y = Math.round(Math.pow(r(), 1.6) * 520)
    const v = r()
    // A dot rather than a glyph: cheaper to paint again as it twinkles.
    out += `<circle cx="${Math.round(r() * W)}" cy="${y - 4}" r="${v < 0.6 ? 1.2 : v < 0.85 ? 1.8 : 2.4}" style="animation:tw${i % 3} ${n(4 + r() * 6)}s ease-in-out ${n(-r() * 8)}s infinite"/>`
  }
  return `<g fill="#f3d9b0" opacity=".7">${out}</g>`
}

function hills(): string {
  const g = new Grid()
  const back = (c: number) => Math.round(HORIZON - 7 - 4 * Math.sin(c * 0.034 + 1) - 2 * Math.sin(c * 0.11))
  const front = (c: number) => Math.round(HORIZON - 2 - 3 * Math.sin(c * 0.05 + 2.4) - 1.5 * Math.sin(c * 0.13 + 1))
  const r = rng(13)
  for (let c = 0; c < COLS; c++) {
    for (let y = back(c); y <= HORIZON + 2; y++) g.set(c, y, { bg: y === back(c) ? '#46213e' : '#3a1c38', fg: '#55294a', ch: y === back(c) ? '_' : r() < 0.06 ? '.' : ' ' })
    if (r() < 0.22) farTree(g, c, back(c), 1 + Math.floor(r() * 3), ['#4a2238', '#5a2a34', '#5c3a2c'][Math.floor(r() * 3)]!, '^')
  }
  for (let c = 0; c < COLS; c++) {
    for (let y = front(c); y <= HORIZON + 4; y++) g.set(c, y, { bg: y === front(c) ? '#3d1f32' : '#30192c', fg: '#4a2840', ch: y === front(c) ? '-' : r() < 0.05 ? ',' : ' ' })
    if (r() < 0.12) farTree(g, c, front(c), 2 + Math.floor(r() * 3), ['#5e2a26', '#6a3a1e', '#4e2030'][Math.floor(r() * 3)]!, '*')
  }
  return gridSvg(g, 0, 0, { glyphs: false })
}

// ---------- Field ----------

function field(): string {
  const g = new Grid()
  const r = rng(19)
  // Grass tufts and dry leaves on the ground.
  for (let y = HORIZON + 5; y < H / CH; y++) {
    for (let c = 0; c < COLS; c++) {
      const v = r()
      if (v < 0.07) g.set(c, y, { fg: mix('#5a3a3e', '#7a4a34', r()), ch: [',', '"', "'", '.'][Math.floor(r() * 4)]! })
      else if (v < 0.085) g.set(c, y, { fg: ['#a8441a', '#c08a2a', '#86241f'][Math.floor(r() * 3)]!, ch: '*' })
    }
  }
  // A dirt path from the bottom up to the cabin's door.
  for (let y = 71; y < H / CH + 1; y++) {
    const t = (y - 71) / 21
    const c = Math.round(112 - t * 30 + Math.sin(t * 3.2) * 8)
    const w = 1 + Math.round(t * 4)
    for (let x = -w; x <= w; x++) g.set(c + x, y, { bg: x === -w || x === w ? '#33202a' : '#3c2630', fg: '#57384a', ch: r() < 0.3 ? '.' : ' ' })
  }
  return gridSvg(g, 0, 0, { glyphs: false })
}

// ---------- Assembly ----------

function build(): string {
  // The moon, its glow breathing slowly.
  const moonG = new Grid()
  moon(moonG, 124, 16, 10)
  kf('glow', 'from{opacity:.75}to{opacity:1}')
  kf('dusk', `from{transform:translateX(-380px)}to{transform:translateX(320px)}`)

  // Cabin, its windows and smoke.
  const cab = new Grid()
  const { windows, chimney } = cabin(cab, 104, 70)
  const lit = new Grid()
  for (const [c, r] of windows) lit.set(c, r, { ...WINDOW, ch: '+' })
  kf('flick', '0%,100%{opacity:1}30%{opacity:.86}52%{opacity:.97}71%{opacity:.8}')
  const r = rng(31)
  kf('smoke', `0%{transform:translate(0,0) scale(.6);opacity:0}10%{opacity:.7}100%{transform:translate(-110px,-260px) scale(2.2);opacity:0}`)
  let smoke = ''
  for (let i = 0; i < 8; i++) {
    smoke += `<text class="fb" x="${n((chimney[0] + 1) * CW)}" y="${chimney[1] * CH}" style="animation:smoke 14s ease-out ${n(-(i / 8) * 14)}s infinite">${['o', 'O', '°', '~'][i % 4]}</text>`
  }
  const windowGlow = `<ellipse cx="${n(112 * CW)}" cy="${n(67 * CH)}" rx="190" ry="90" fill="url(#lamp)" style="animation:flick 5s ease-in-out infinite"/>`

  // Fence.
  const fen = new Grid()
  fence(fen, -1, COLS, 79)

  // Trees: a big orange one and a gold one on the left, a red one at the
  // right edge, the bare tree with its owl.
  const trees = new Grid()
  tree(trees, -6, 92, 13, RED, 3)
  tree(trees, 47, 88, 11, GOLD, 7)
  tree(trees, 21, 93, 17, ORANGE, 1)
  tree(trees, 180, 90, 14, RED, 11)
  const eyes = new Grid()
  const { perch } = bareTree(trees, 157, 92, 42, 2)
  owl(trees, eyes, perch[0] - 1, perch[1] - 4)
  kf('blink', '0%,46%,50%,100%{opacity:1}47%,49%{opacity:0}')

  // Jack-o'-lanterns and their candlelight.
  const pumpkins = new Grid()
  const faces = new Grid()
  pumpkin(pumpkins, faces, 62, 89, 9, true)
  pumpkin(pumpkins, faces, 71, 90, 5, false)
  pumpkin(pumpkins, faces, 133, 88, 11, true)
  pumpkin(pumpkins, faces, 123, 90, 7, true)
  pumpkin(pumpkins, faces, 141, 90, 5, false)
  kf('candle', '0%,100%{opacity:.95}20%{opacity:.7}35%{opacity:1}60%{opacity:.78}80%{opacity:.92}')
  const candleGlow = [
    [62, 87, 70],
    [133, 85, 90],
    [123, 88, 60],
  ]
    .map(([c, rr, rad], i) => `<ellipse cx="${n(c! * CW)}" cy="${n(rr! * CH)}" rx="${rad}" ry="${n(rad! * 0.6)}" fill="url(#candle)" style="animation:candle ${n(2.6 + i * 0.7)}s ease-in-out ${-i}s infinite"/>`)
    .join('')

  // Fog drifting low over the field.
  kf('fog', 'from{transform:translateX(-160px)}to{transform:translateX(160px)}')
  const fog = [
    [500, 700, 520, 40, 60],
    [1200, 760, 600, 46, 75],
    [800, 860, 700, 50, 90],
  ]
    .map(([x, y, rx, ry, d], i) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#c9b2cf" opacity=".1" filter="url(#haze)" style="animation:fog ${d}s ease-in-out ${-i * 20}s infinite alternate"/>`)
    .join('')

  // Leaves falling, turning, swaying in the breeze. Few of them, stepped at
  // LEAF_FPS: the desktop app holds a scene still when it costs too much to
  // draw, and 34 leaves turning at 60 frames a second over the cell art did.
  // A leaf falls about 25 px a second, so ten steps a second still look smooth.
  ;[0, 1, 2].forEach(k =>
    kf(
      `lf${k}`,
      `0%{transform:translate(0,0) rotate(0deg)}25%{transform:translate(${30 + k * 10}px,${H * 0.27}px) rotate(${120 + k * 40}deg)}50%{transform:translate(${-20 - k * 8}px,${H * 0.54}px) rotate(${220 + k * 60}deg)}75%{transform:translate(${40 - k * 6}px,${H * 0.8}px) rotate(${330 + k * 40}deg)}100%{transform:translate(${10 + k * 12}px,${H + 60}px) rotate(${460 + k * 50}deg)}`,
    ),
  )
  let leaves = ''
  const leafTints = ['#e0782e', '#c8452a', '#e8b040', '#b8582a', '#f09a48']
  for (let i = 0; i < LEAVES; i++) {
    const dur = 26 + r() * 30
    leaves += `<g transform="translate(${Math.round(r() * W)},-30)"><text class="fb" fill="${leafTints[i % leafTints.length]}" font-size="${12 + Math.round(r() * 6)}" style="animation:lf${i % 3} ${n(dur)}s steps(${Math.round(dur * LEAF_FPS)},end) ${n(-r() * dur)}s infinite">${esc(['*', ',', "'", '~', '%', 'v', '&'][i % 7]!)}</text></g>`
  }

  // Passers-by.
  const bats = (() => {
    // Three bats, each on its own wingbeat.
    const one = sprite(bat, 2, 0.5)
    const many = [
      [0, 0, 0.5],
      [70, 34, 0.58],
      [140, 8, 0.44],
    ]
      .map(([x, y, p]) => `<g transform="translate(${x},${y})">${sprite(bat, 2, p!).svg}</g>`)
      .join('')
    return { svg: many, w: one.w + 140, h: one.h + 34 }
  })()
  const ghostD = sprite(ghost, 2, 1.8)
  // The witch, larger, so her silhouette reads against the moon.
  const witchD = (() => {
    const d = sprite(witch, 2, 0.7)
    return { svg: `<g transform="scale(1.6)">${d.svg}</g>`, w: d.w * 1.6, h: d.h * 1.6 }
  })()
  const catD = sprite(cat, 2, 0.9)
  const foxD = sprite(fox, 2, 0.5)

  const sky = st.lane(
    [
      { d: bats, kind: 'cross', from: 'left', y: 150, dur: 34, bob: 26, bobPeriod: 3 },
      { d: ghostD, opacity: 0.88, kind: 'cross', from: 'right', y: 330, dur: 64, bob: 30, bobPeriod: 5 },
      { d: witchD, kind: 'cross', from: 'left', y: 16.5 * CH - witchD.h / 2, dur: 32, bob: 14, bobPeriod: 4 },
      { d: bats, kind: 'cross', from: 'right', y: 260, dur: 36, bob: 26, bobPeriod: 3 },
    ] satisfies Pass[],
    0,
  )
  const ground = st.lane(
    [
      { d: catD, kind: 'cross', from: 'left', y: 77 * CH - catD.h, dur: 74, stopAt: 820, pause: 14, bob: 0 },
      { d: foxD, kind: 'cross', from: 'right', y: 85 * CH - foxD.h, dur: 40, bob: 0 },
    ] satisfies Pass[],
    140,
  )

  return st.finish({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#170f2a"/><stop offset=".25" stop-color="#21143a"/><stop offset=".42" stop-color="#34183f"/><stop offset=".54" stop-color="#5a2142"/><stop offset=".62" stop-color="#8a3440"/><stop offset=".68" stop-color="#b4553c"/></linearGradient>
<linearGradient id="field" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c1a2c"/><stop offset=".5" stop-color="#231524"/><stop offset="1" stop-color="#18101c"/></linearGradient>
<radialGradient id="moonGlow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb85c" stop-opacity=".35"/><stop offset=".45" stop-color="#ff9a4a" stop-opacity=".12"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>
<radialGradient id="dusk" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff8a4a" stop-opacity=".3"/><stop offset="1" stop-color="#ff8a4a" stop-opacity="0"/></radialGradient>
<radialGradient id="lamp" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb54a" stop-opacity=".28"/><stop offset="1" stop-color="#ffb54a" stop-opacity="0"/></radialGradient>
<radialGradient id="candle" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb040" stop-opacity=".45"/><stop offset="1" stop-color="#ff8a20" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".45" r=".8"><stop offset=".6" stop-color="#0c0612" stop-opacity="0"/><stop offset="1" stop-color="#0c0612" stop-opacity=".65"/></radialGradient>
<filter id="haze" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="22"/></filter>`,
    css: [CELL_CSS, ...WIDE],
    back: [`<rect width="${W}" height="${H}" fill="url(#sky)"/>`, stars()],
    layers: [
      `<g style="animation:dusk 170s ease-in-out infinite alternate"><ellipse cx="900" cy="${HORIZON * CH}" rx="760" ry="220" fill="url(#dusk)"/></g>`,
      `<g id="sky"><circle cx="${n(124.5 * CW)}" cy="${n(16.5 * CH)}" r="260" fill="url(#moonGlow)" style="animation:glow 9s ease-in-out infinite alternate"/>`,
      gridSvg(moonG),
      ...sky,
      '</g>',
      hills(),
      `<rect y="${(HORIZON + 4) * CH}" width="${W}" height="${H - (HORIZON + 4) * CH}" fill="url(#field)"/>`,
      field(),
      windowGlow,
      gridSvg(cab),
      `<g style="animation:flick 5s ease-in-out infinite">${gridSvg(lit)}</g>`,
      `<g font-size="16" fill="#9a8a9e" opacity=".55">${smoke}</g>`,
      gridSvg(fen, 0, 0, { glyphs: false }),
      ...ground,
      gridSvg(trees, 0, 0, { glyphs: false }),
      `<g style="animation:blink 7s linear infinite">${gridSvg(eyes)}</g>`,
      candleGlow,
      gridSvg(pumpkins),
      `<g style="animation:candle 2.2s ease-in-out infinite">${gridSvg(faces)}</g>`,
      fog,
      `<g font-weight="700">${leaves}</g>`,
    ],
    front: [`<rect width="${W}" height="${H}" fill="url(#vignette)"/>`],
  })
}

export const AUTUMN_SVG = build()
