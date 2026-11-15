// A coast with a lighthouse that follows the time of day.
//
// Same principle as the lake (see lake.ts and daylight.ts): one SVG on a
// 24-hour CSS cycle, drawn with a negative delay equal to the local time, its
// keyframes laid on the real sunrise and sunset, the moon in its real phase.
//
// The scene: a harbor village on a hillside whose windows light up in waves
// at dusk and go out late at night, a stone quay with street lamps and moored
// boats, layered cliffs with a lighthouse whose beam sweeps the night, waves
// rolling in perspective and breaking at the cliff's foot, a sailboat and
// gulls by day, and a dune with grass, flowers and a fence in the foreground.
// The sun sets into the sea.

import { DAY, dayKf, localHour, moonMask, moonPhase, phaseColors, rad, sunTimes } from './daylight'
import type { Four, Place, SunTimes } from './daylight'
import { W, n, rng } from './stage'

const HORIZON = 545

// ---------- Palette, by moment of the day ----------

const C = {
  islands: ['#18213a', '#8a7ba2', '#8eaac3', '#7a5c7c'],
  rock: ['#1f2230', '#7a6272', '#b49c7e', '#8a5a52'],
  grass: ['#0c171a', '#4a5a4e', '#6e8e4a', '#5a4c3a'],
  dune: ['#1a1d2a', '#a88a8e', '#e2cea0', '#c98c6a'],
  wallA: ['#272b3b', '#c9a7aa', '#f1e3cd', '#d99a7e'],
  wallB: ['#242939', '#b59cac', '#e8cfab', '#c98a70'],
  wallC: ['#2a2f40', '#c6b2ba', '#f5f0e7', '#d9a68c'],
  roof: ['#1c1923', '#8a5662', '#c0603f', '#9c4636'],
  slate: ['#141925', '#5a5a74', '#5d6c7e', '#4a3f55'],
  red: ['#371c23', '#a8546a', '#c8372f', '#a83a36'],
  tree: ['#08100f', '#33394a', '#3d5a35', '#2e2730'],
  wood: ['#191a24', '#5a4048', '#7a5a3e', '#5a3a34'],
  hullA: ['#141c30', '#4a5a8a', '#2f6fae', '#3a4a7a'],
  hullB: ['#2a1418', '#9a4a5a', '#c23b2f', '#a03a34'],
  foam: ['#7a89a8', '#f5dde0', '#ffffff', '#ffd9c2'],
  cloud: ['#2b3555', '#f5bcbf', '#ffffff', '#f7a682'],
  cloudShade: ['#1b2440', '#a97f9c', '#b9c9db', '#a8566f'],
  sun: ['#ff9a4d', '#ffb26b', '#fff6d8', '#ff8f45'],
  stone: ['#1d2130', '#77707f', '#a6a29a', '#806a66'],
  flowerA: ['#3a2a40', '#e79ab0', '#ef6f9a', '#e0708a'],
  flowerB: ['#3a3a30', '#f0d58a', '#f6d34a', '#f0b24a'],
} satisfies Record<string, Four>

// ---------- Geometry, built once ----------

type Pt = [number, number]
const i0 = (v: number) => Math.round(v).toString()
const pts = (list: Pt[]) => list.map(([x, y]) => `${i0(x)} ${i0(y)}`).join('L')
const span = (a: number, b: number, step: number) => Array.from({ length: Math.floor(Math.abs(b - a) / step) + 1 }, (_, i) => a + Math.sign(b - a) * i * step)

// Small islands on the horizon, hazy.
const ISLANDS = (() => {
  const isle = (x0: number, x1: number, h: number, seed: number) => {
    const r = rng(seed)
    const top = span(x0, x1, 6).map(x => {
      const t = (x - x0) / (x1 - x0)
      return [x, HORIZON - h * Math.pow(Math.sin(Math.PI * t), 0.7) - (r() - 0.5) * 3] as Pt
    })
    return `M${pts(top)}L${x1} ${HORIZON + 1}L${x0} ${HORIZON + 1}Z`
  }
  return isle(470, 690, 26, 3) + isle(760, 820, 9, 5)
})()

// The cliffs: a headland on the right. Its sea face comes toward the viewer
// along a foot line; its top carries grass and the lighthouse.
const LH_PATH_TOP = '1392 418'
const cliffTop = (x: number) => 402 + 14 * Math.sin(x * 0.012) + 6 * Math.sin(x * 0.047 + 1) - Math.max(0, (x - 1300) * 0.03)
const FACE: Pt[] = (() => {
  const r = rng(17)
  // The face, from the top edge down to the sea: ragged, with ledges.
  const out: Pt[] = []
  for (let i = 0; i <= 14; i++) {
    const t = i / 14
    out.push([1058 - t * 62 + (r() - 0.5) * 14 + (i % 3 === 0 ? 8 : 0), 412 + t * 148])
  }
  return out
})()
const FOOT: Pt[] = span(996, 1170, 6).map(x => [x, 560 + Math.pow((x - 996) / 174, 1.2) * 290 + Math.sin(x * 0.2) * 3] as Pt)
const CLIFF = `M${pts([...FACE, ...FOOT])}L1170 1040L${W + 40} 1040L${W + 40} ${i0(cliffTop(W + 40))}L${pts(span(W + 40, 1058, -8).map(x => [x, cliffTop(x)] as Pt))}Z`
// The sea face only (where the strata show): between the face and a ragged
// edge where the rock meets the grassy plateau.
const FACE_EDGE: Pt[] = (() => {
  const r = rng(29)
  return Array.from({ length: 16 }, (_, i) => {
    const t = i / 15
    const x = 1170 + Math.sin(t * Math.PI) * 40 - t * 40 + (r() - 0.5) * 12
    const y = 850 - t * (850 - cliffTop(1135) - 10)
    return [x, y] as Pt
  })
})()
const FACE_ZONE = `M${pts([...FACE, ...FOOT, ...FACE_EDGE])}L${pts(span(1135, 1058, -8).map(x => [x, cliffTop(x)] as Pt))}Z`
// Gorse on the plateau: rounded bushes dotted with yellow flowers.
const GORSE = (() => {
  const r = rng(83)
  let bush = ''
  let bloom = ''
  for (let i = 0; i < 22; i++) {
    const x = 1190 + r() * 420
    const y = cliffTop(x) + 30 + Math.pow(r(), 0.8) * 420
    if (Math.abs(x - (1300 + (y - 420) * -0.2)) < 30) continue
    const rx = 10 + r() * 22
    const ry = rx * (0.5 + r() * 0.2)
    bush += `M${i0(x - rx)} ${i0(y)}a${i0(rx)} ${i0(ry)} 0 1 1 ${i0(rx * 2)} 0Z`
    for (let k = 0; k < 6; k++) bloom += `M${i0(x + (r() - 0.5) * rx * 1.6)} ${i0(y - r() * ry * 0.9)}h2v2h-2Z`
  }
  return { bush, bloom }
})()
// A worn path up the plateau to the lighthouse.
const CLIFF_PATH = `M1250 1040C1290 900 1250 760 1330 640C1370 560 1360 480 ${LH_PATH_TOP}`
// Grass on the cliff top, hanging a little over the edge.
const CLIFF_GRASS = (() => {
  const r = rng(19)
  const top = span(1052, 1200, 5).map(x => [x, cliffTop(x) - 2 - r() * 4] as Pt)
  const under = span(1200, 1052, -5).map(x => [x, cliffTop(x) + 10 + r() * 8 + (x < 1090 ? 6 : 0)] as Pt)
  return `M${pts(top)}L${pts(under)}Z`
})()
// Ledges across the face, and two sea stacks.
const LEDGES = (() => {
  const r = rng(23)
  let d = ''
  for (let i = 0; i < 9; i++) {
    const y = 430 + i * 22 + r() * 8
    const x0 = 1000 + (y - 412) * -0.3 + r() * 30
    d += `M${i0(x0)} ${i0(y)}Q${i0(x0 + 60)} ${i0(y - 4 + r() * 8)} ${i0(x0 + 140 + r() * 60)} ${i0(y + 6)}`
  }
  return d
})()
const STACKS = `M940 572L946 548L958 541L966 552L972 575ZM1060 690L1068 652L1083 640L1096 650L1104 694Z`

// The village hill on the left, sloping down to the harbor.
const hillTop = (x: number) => 318 + Math.pow(Math.max(0, x) / 640, 1.35) * 300 + 8 * Math.sin(x * 0.03)
const HILL = `M-40 ${i0(hillTop(-40))}L${pts(span(-40, 660, 10).map(x => [x, hillTop(x)] as Pt))}L640 640L520 760L300 860L-40 860Z`

type House = { x: number; y: number; w: number; h: number; wall: 'wallA' | 'wallB' | 'wallC'; roof: 'roof' | 'slate'; windows: Pt[]; chimney: boolean }

// Houses on terraces down the slope, back to front.
const HOUSES: House[] = (() => {
  const r = rng(31)
  const out: House[] = []
  for (const [dy, x0, x1] of [[18, 0, 560], [70, -10, 500], [128, -20, 430], [190, -20, 340]] as const) {
    let x = x0 + r() * 20
    while (x < x1) {
      const w = 34 + r() * 30
      const h = 26 + r() * 22
      const y = hillTop(x + w / 2) + dy
      const windows: Pt[] = []
      const cols = w > 50 ? 3 : 2
      for (let c = 0; c < cols; c++) {
        for (let row = 0; row < (h > 38 ? 2 : 1); row++) windows.push([x + (w * (c + 0.6)) / (cols + 0.2) - 3, y - h + 8 + row * 15])
      }
      out.push({ x, y, w, h, wall: (['wallA', 'wallB', 'wallC'] as const)[Math.floor(r() * 3)]!, roof: r() < 0.7 ? 'roof' : 'slate', windows, chimney: r() < 0.5 })
      x += w + 4 + r() * 18
    }
  }
  return out
})()

// Small trees between houses: cypresses and round crowns.
const VILLAGE_TREES = (() => {
  const r = rng(37)
  let d = ''
  for (let i = 0; i < 26; i++) {
    const x = r() * 560
    const y = hillTop(x) + 10 + r() * 190
    if (r() < 0.5) {
      const h = 22 + r() * 26
      d += `M${i0(x)} ${i0(y - h)}Q${i0(x + 7)} ${i0(y - h * 0.4)} ${i0(x + 3)} ${i0(y)}L${i0(x - 3)} ${i0(y)}Q${i0(x - 7)} ${i0(y - h * 0.4)} ${i0(x)} ${i0(y - h)}Z`
    } else {
      const rr = 7 + r() * 7
      d += `M${i0(x - rr)} ${i0(y - rr)}a${i0(rr)} ${i0(rr * 0.85)} 0 1 0 ${i0(rr * 2)} 0a${i0(rr)} ${i0(rr * 0.85)} 0 1 0 ${i0(-rr * 2)} 0Z`
    }
  }
  return d
})()

// The church: nave and steeple, near the top of the village.
const CHURCH = { nave: 'M150 362L214 362L214 330L150 330Z', roof: 'M144 332L182 312L220 332Z', tower: 'M196 362L196 268L214 268L214 362Z', spire: 'M192 270L205 222L218 270Z', clock: 'M205 288m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0' }

// The quay: a stone pier from the foot of the village into the harbor.
const QUAY = { top: 'M560 634L790 630L800 642L560 650Z', face: 'M560 650L800 642L800 662L560 672Z', blocks: Array.from({ length: 12 }, (_, i) => `M${580 + i * 19} ${651 - i * 0.6}v${20 - i * 0.6}`).join('') }
const LAMPS: Pt[] = [[600, 636], [650, 635], [700, 634], [750, 632]]

// Boats moored in the harbor.
const BOATS: { x: number; y: number; s: number; hull: 'hullA' | 'hullB'; mast: boolean }[] = [
  { x: 690, y: 700, s: 1, hull: 'hullA', mast: true },
  { x: 820, y: 678, s: 0.8, hull: 'hullB', mast: false },
  { x: 610, y: 742, s: 1.15, hull: 'hullB', mast: true },
]
const HULL = 'M-34 0C-28 12 26 12 36 -2L32 -8L-32 -8Z'
const CABIN = 'M-12 -8L-12 -20L6 -20L10 -8Z'

// The lighthouse on the cliff top.
const LH_X = 1390
const LH_BASE = cliffTop(LH_X) + 4
const LH = (() => {
  const h = 150
  const b = LH_BASE
  const wB = 22
  const wT = 15
  const at = (t: number) => wB + (wT - wB) * t
  const band = (t0: number, t1: number) => `M${n(LH_X - at(t0))} ${n(b - h * t0)}L${n(LH_X - at(t1))} ${n(b - h * t1)}L${n(LH_X + at(t1))} ${n(b - h * t1)}L${n(LH_X + at(t0))} ${n(b - h * t0)}Z`
  const top = b - h
  return {
    tower: band(0, 1),
    stripes: band(0.18, 0.34) + band(0.52, 0.68) + band(0.86, 1),
    shade: `M${n(LH_X + 4)} ${n(b)}L${n(LH_X + 3)} ${n(top)}L${n(LH_X + at(1))} ${n(top)}L${n(LH_X + at(0))} ${n(b)}Z`,
    gallery: `M${n(LH_X - 22)} ${n(top)}h44v5h-44Z`,
    rail: `M${n(LH_X - 20)} ${n(top - 7)}h40` + Array.from({ length: 9 }, (_, i) => `M${n(LH_X - 20 + i * 5)} ${n(top - 7)}v7`).join(''),
    lantern: `M${n(LH_X - 11)} ${n(top - 1)}h22v-22h-22Z`,
    roof: `M${n(LH_X - 15)} ${n(top - 22)}Q${n(LH_X)} ${n(top - 44)} ${n(LH_X + 15)} ${n(top - 22)}Z`,
    vane: `M${n(LH_X)} ${n(top - 40)}v-12`,
    light: { x: LH_X, y: top - 12 },
    house: `M${n(LH_X + 24)} ${n(b)}L${n(LH_X + 24)} ${n(b - 30)}L${n(LH_X + 80)} ${n(b - 30)}L${n(LH_X + 80)} ${n(b)}Z`,
    houseRoof: `M${n(LH_X + 20)} ${n(b - 29)}L${n(LH_X + 52)} ${n(b - 48)}L${n(LH_X + 84)} ${n(b - 29)}Z`,
    houseWin: `M${n(LH_X + 34)} ${n(b - 22)}h9v10h-9ZM${n(LH_X + 58)} ${n(b - 22)}h9v10h-9Z`,
  }
})()

// The foreground dune: a soft crest, a sandy path, a fence and grass.
const duneTop = (x: number) => 848 + 26 * Math.sin(x * 0.0042 + 0.6) + 10 * Math.sin(x * 0.013) - 30 * Math.exp(-(((x - 1450) / 220) ** 2))
const DUNE = `M-40 ${i0(duneTop(-40))}L${pts(span(-40, W + 40, 10).map(x => [x, duneTop(x)] as Pt))}L${W + 40} 1040L-40 1040Z`
const PATH = `M760 1040C780 960 700 930 735 ${i0(duneTop(735))}L752 ${i0(duneTop(752))}C735 930 820 960 850 1040Z`
const FENCE = (() => {
  let posts = ''
  let rope = 'M'
  span(600, 1000, 40).forEach((x, i) => {
    const y = duneTop(x) + 30 + i * 6
    const h = 34 + i * 2
    posts += `M${x - 2} ${i0(y)}l1 ${-h}h3l1 ${h}Z`
    rope += `${i === 0 ? '' : 'L'}${x} ${i0(y - h + 6)}`
  })
  return { posts, rope }
})()
const GRASS = (() => {
  const r = rng(43)
  let blades = ''
  for (let k = 0; k < 64; k++) {
    const cx = -20 + r() * (W + 40)
    if (cx > 700 && cx < 880) continue
    const cy = duneTop(cx) + 6 + r() * 40
    let d = ''
    for (let j = 0; j < 7; j++) {
      const x = cx + (r() - 0.5) * 22
      const h = 18 + r() * 34
      const bend = (r() - 0.5) * 20
      d += `M${n(x - 1.3)} ${n(cy)}Q${n(x + bend * 0.4)} ${n(cy - h * 0.6)} ${n(x + bend)} ${n(cy - h)}Q${n(x + bend * 0.4 + 1)} ${n(cy - h * 0.6)} ${n(x + 1.3)} ${n(cy)}Z`
    }
    blades += `<path class="blade" style="animation-delay:${n(-r() * 6)}s" d="${d}"/>`
  }
  return blades
})()
const FLOWERS = (() => {
  const r = rng(47)
  let a = ''
  let b = ''
  for (let k = 0; k < 70; k++) {
    const x = r() * W
    if (x > 700 && x < 880) continue
    const y = duneTop(x) + 14 + r() * 120
    const s = 1.6 + r() * 1.6
    const dot = `M${n(x - s)} ${n(y)}a${n(s)} ${n(s)} 0 1 0 ${n(s * 2)} 0a${n(s)} ${n(s)} 0 1 0 ${n(-s * 2)} 0Z`
    if (r() < 0.6) a += dot
    else b += dot
  }
  return { a, b }
})()

const STARS = (() => {
  const r = rng(3)
  return Array.from({ length: 160 }, (_, i) => `<circle class="tw${i % 3}" cx="${n(r() * W)}" cy="${n(Math.pow(r(), 1.3) * 500)}" r="${n(0.4 + Math.pow(r(), 3) * 1.6)}"/>`).join('')
})()

const CLOUDS = (() => {
  const r = rng(9)
  return Array.from({ length: 6 }, () => {
    const y = 70 + r() * 230
    const s = 0.42 + r() * 0.7
    const puffs = Array.from({ length: 7 }, (_, k) => {
      const x = (k - 3) * 40 * s + (r() - 0.5) * 20 * s
      const ry = (22 + r() * 26) * s * (1 - Math.abs(k - 3) / 6)
      return [x, ry, (40 + r() * 26) * s] as [number, number, number]
    })
    const shade = puffs.map(([x, ry, rx]) => `<ellipse cx="${n(x)}" cy="${n(-ry * 0.32)}" rx="${n(rx * 0.97)}" ry="${n(ry * 0.9)}"/>`).join('')
    const lit = puffs.map(([x, ry, rx]) => `<ellipse cx="${n(x - 4 * s)}" cy="${n(-ry * 0.55)}" rx="${n(rx * 0.86)}" ry="${n(ry * 0.8)}"/>`).join('')
    const dur = 600 + r() * 600
    return `<g transform="translate(0,${n(y)})"><g class="drift" style="animation:cloud ${n(dur)}s linear ${n(-r() * dur)}s infinite"><g filter="url(#cloud)"><g class="cshade">${shade}</g><g class="clit">${lit}</g></g></g></g>`
  }).join('')
})()
// High cirrus: long thin veils.
const CIRRUS = (() => {
  const r = rng(13)
  return Array.from({ length: 5 }, () => `<ellipse cx="${n(r() * W)}" cy="${n(40 + r() * 140)}" rx="${n(120 + r() * 160)}" ry="${n(3 + r() * 4)}" transform="rotate(${n(-6 + r() * 8)})"/>`).join('')
})()

// Waves: rows of crests in perspective, rolling slowly toward the shore.
const WAVES = (() => {
  const r = rng(53)
  const rows: string[] = []
  const css: string[] = []
  for (let i = 0; i < 14; i++) {
    const t = Math.pow(i / 13, 1.6)
    const y = HORIZON + 6 + t * 290
    const len = 40 + t * 150
    const amp = 0.6 + t * 3.4
    const width = 0.5 + t * 2.2
    let d = ''
    let x = -len * 2 - r() * len
    while (x < W + len * 2) {
      const l = len * (0.6 + r() * 0.8)
      d += `M${n(x)} ${n(y)}q${n(l * 0.25)} ${n(-amp)} ${n(l * 0.5)} ${n(-amp * 0.4)}q${n(l * 0.2)} ${n(amp * 0.3)} ${n(l * 0.35)} ${n(amp * 0.6)}`
      x += l * (1.1 + r() * 0.9)
    }
    const dir = i % 2 === 0 ? 1 : -1
    css.push(`@keyframes roll${i}{from{transform:translateX(0)}to{transform:translateX(${n(dir * len)}px)}}`)
    rows.push(`<g style="animation:roll${i} ${n(22 + (1 - t) * 30)}s linear ${n(-r() * 30)}s infinite"><path d="${d}" stroke-width="${n(width)}" opacity="${n(0.25 + t * 0.55)}"/></g>`)
  }
  return { svg: rows.join(''), css: css.join('') }
})()

// ---------- Keyframes for the day ----------

function keyframes(s: SunTimes): string {
  const { sunrise: sr, sunset: ss, noonElevation } = s
  const kf: string[] = []
  const add = (name: string, body: string) => kf.push(`@keyframes ${name}{${body}}`)
  add('skyNight', dayKf([[sr - 1.2, 'opacity:1'], [sr - 0.2, 'opacity:0'], [ss + 0.3, 'opacity:0'], [ss + 1.2, 'opacity:1']]))
  add('skyDawn', dayKf([[sr - 1.3, 'opacity:0'], [sr - 0.1, 'opacity:1'], [sr + 0.4, 'opacity:1'], [sr + 1.4, 'opacity:0']]))
  add('skyDusk', dayKf([[ss - 1.4, 'opacity:0'], [ss - 0.1, 'opacity:1'], [ss + 0.3, 'opacity:1'], [ss + 1.3, 'opacity:0']]))
  for (const [k, c] of Object.entries(C)) add(`c-${k}`, phaseColors('fill', c, s))
  add('s-foam', phaseColors('stroke', C.foam, s))
  add('s-wood', phaseColors('stroke', C.wood, s))
  add('nightOnly', dayKf([[sr - 1.3, 'opacity:1'], [sr - 0.3, 'opacity:0'], [ss + 0.4, 'opacity:0'], [ss + 1.4, 'opacity:1']]))
  add('beam', dayKf([[sr - 0.6, 'opacity:1'], [sr + 0.2, 'opacity:0'], [ss - 0.2, 'opacity:0'], [ss + 0.6, 'opacity:1']]))
  add('dayOnly', dayKf([[sr + 0.5, 'opacity:0'], [sr + 1.5, 'opacity:1'], [ss - 1.5, 'opacity:1'], [ss - 0.5, 'opacity:0']]))
  add('glitter', dayKf([[sr - 0.2, 'opacity:0'], [sr + 0.6, 'opacity:.95'], [ss - 0.6, 'opacity:.95'], [ss + 0.3, 'opacity:0']]))
  add('mist', dayKf([[sr - 1.5, 'opacity:.1'], [sr + 0.2, 'opacity:.5'], [sr + 2.2, 'opacity:0'], [ss + 0.5, 'opacity:0'], [ss + 2, 'opacity:.1']]))
  add('relief', dayKf([[sr - 1.2, 'opacity:.35'], [sr + 0.5, 'opacity:.75'], [ss - 0.5, 'opacity:.75'], [ss + 1.2, 'opacity:.35']]))
  add('lamps', dayKf([[ss - 0.4, 'opacity:0'], [ss, 'opacity:1'], [sr - 0.2, 'opacity:1'], [sr + 0.3, 'opacity:0']]))
  // Windows light up in waves after sunset and go out at different hours.
  const waves: [number, number][] = [[-0.4, 23.4], [0.1, 0.6], [0.7, 22.4], [1.3, 1.6]]
  waves.forEach(([on, off], i) => add(`win${i}`, dayKf([[ss + on - 0.05, 'opacity:0'], [ss + on, 'opacity:1'], [off, 'opacity:1'], [off + 0.05, 'opacity:0']])))
  // A few early risers light up before dawn.
  add('win4', dayKf([[sr - 1.6, 'opacity:0'], [sr - 1.55, 'opacity:1'], [sr + 0.4, 'opacity:1'], [sr + 0.45, 'opacity:0']]))
  // The sun sets into the sea, on the left of the cliffs.
  const arc = 180 + 290 * Math.sin(rad(noonElevation))
  const sunPts: [number, string][] = []
  for (let i = 0; i <= 12; i++) {
    const f = i / 12
    sunPts.push([sr - 0.3 + (ss - sr + 0.6) * f, `transform:translate(${n(200 + 720 * f)}px,${n(HORIZON + 26 - arc * Math.sin(Math.PI * f))}px)`])
  }
  sunPts.push([ss + 0.6, 'transform:translate(940px,800px)'], [sr - 0.6, 'transform:translate(180px,800px)'])
  add('sunPath', dayKf(sunPts))
  add('glitterPath', dayKf(sunPts.map(([h, v]) => [h, v.replace(/,(-?[\d.]+)px\)/, ',0px)')])))
  const nightLen = 24 - (ss - sr)
  const moonPts: [number, string][] = []
  for (let i = 0; i <= 10; i++) {
    const f = i / 10
    moonPts.push([ss + 0.6 + (nightLen - 1.2) * f, `transform:translate(${n(260 + 760 * f)}px,${n(470 - 300 * Math.sin(Math.PI * f))}px)`])
  }
  moonPts.push([sr - 0.4, 'transform:translate(1040px,800px)'], [ss + 0.4, 'transform:translate(240px,800px)'])
  add('moonPath', dayKf(moonPts))
  add('moonGlint', dayKf(moonPts.map(([h, v]) => [h, v.replace(/,(-?[\d.]+)px\)/, ',0px)')])))
  return kf.join('')
}

// ---------- The SVG ----------

export function coastSvg(ms: number, place: Place): string {
  const s = sunTimes(ms, place)
  const phase = moonPhase(ms)
  const delay = -Math.round(localHour(ms, place.tz) * 3600)
  const d = (name: string) => `animation:${name} ${DAY}s linear ${delay}s infinite`
  const r = rng(29)

  const css = [
    keyframes(s),
    '@keyframes cloud{from{transform:translateX(-500px)}to{transform:translateX(2100px)}}',
    '.drift{will-change:transform}',
    `.cshade{${d('c-cloudShade')}}.clit{${d('c-cloud')}}`,
    '@keyframes tw{0%,100%{opacity:.3}50%{opacity:1}}',
    '.tw0{animation:tw 5s ease-in-out infinite}.tw1{animation:tw 7s ease-in-out -2s infinite}.tw2{animation:tw 11s ease-in-out -5s infinite}',
    '@keyframes shimmer{0%,100%{opacity:0}50%{opacity:.7}}',
    WAVES.css,
    '@keyframes surf{0%,100%{opacity:.1;transform:scaleX(.85)}45%{opacity:.8;transform:scaleX(1.08)}}',
    '.surf{transform-box:fill-box;transform-origin:center}',
    '@keyframes bob{0%,100%{transform:rotate(-2deg) translateY(0)}50%{transform:rotate(2deg) translateY(2px)}}',
    '.bob{transform-box:fill-box;transform-origin:center bottom;animation:bob 6s ease-in-out infinite}',
    '@keyframes sweep{0%{transform:scaleX(1)}50%{transform:scaleX(-1)}100%{transform:scaleX(1)}}',
    '.sweep{transform-box:fill-box;transform-origin:right center;animation:sweep 14s ease-in-out infinite}',
    '@keyframes flash{0%,20%,30%,70%,80%,100%{opacity:.35}25%,75%{opacity:1}}',
    '@keyframes sway{0%,100%{transform:skewX(-4deg)}50%{transform:skewX(4deg)}}',
    '.blade{transform-box:fill-box;transform-origin:center bottom;animation:sway 5s ease-in-out infinite}',
    '@keyframes glide{0%{transform:translate(-120px,0)}50%{transform:translate(900px,-40px)}100%{transform:translate(1900px,10px)}}',
    '@keyframes flap{0%,70%,100%{transform:scaleY(1)}80%{transform:scaleY(-.5)}90%{transform:scaleY(1)}}',
    '.wing{transform-box:fill-box;transform-origin:center bottom;animation:flap 3s ease-in-out infinite}',
    '@keyframes sail{from{transform:translateX(-200px)}to{transform:translateX(1100px)}}',
    '@keyframes smoke{0%{transform:translate(0,0) scale(.4);opacity:0}15%{opacity:.5}100%{transform:translate(18px,-70px) scale(1.8);opacity:0}}',
    '@keyframes meteor{0%,94%{opacity:0;transform:translate(0,0)}95%{opacity:1}99%{opacity:0;transform:translate(-420px,180px)}100%{opacity:0}}',
    '@keyframes drift{from{transform:translateX(-60px)}to{transform:translateX(60px)}}',
    '@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}',
  ].join('')

  // Light on the sea.
  const glitter = Array.from({ length: 24 }, (_, i) => {
    const y = HORIZON + 4 + i * 12 + r() * 5
    const w = 6 + i * 4
    return `<rect x="${n(-w / 2 + (r() - 0.5) * (8 + i * 4))}" y="${n(y)}" width="${n(w)}" height="${n(1.4 + i * 0.07)}" rx="1" style="animation:shimmer ${n(1.4 + r() * 2.4)}s ease-in-out ${n(-r() * 4)}s infinite"/>`
  }).join('')
  const moonGlints = Array.from({ length: 16 }, (_, i) => {
    const w = 5 + i * 2.6
    return `<rect x="${n(-w / 2 + (r() - 0.5) * 6)}" y="${n(HORIZON + 6 + i * 16)}" width="${n(w)}" height="1.4" rx=".7" style="animation:shimmer ${n(2.6 + r() * 3)}s ease-in-out ${n(-r() * 5)}s infinite"/>`
  }).join('')
  // Reflections of the quay lamps and lit windows, shimmering on the water.
  const lampGlints = LAMPS.map(([x]) =>
    Array.from({ length: 6 }, (_, i) => `<rect x="${n(x - 3 - i)}" y="${n(676 + i * 9)}" width="${n(6 + i * 2)}" height="1.6" rx=".8" style="animation:shimmer ${n(1.8 + r() * 2)}s ease-in-out ${n(-r() * 3)}s infinite"/>`).join(''),
  ).join('')

  // Houses: walls by color, a shaded side, roofs, windows (dark by day, lit
  // in waves at night), chimneys with a thread of smoke.
  const walls: Record<string, string> = { wallA: '', wallB: '', wallC: '' }
  const roofs: Record<string, string> = { roof: '', slate: '' }
  let shade = ''
  let panes = ''
  const lit: string[] = ['', '', '', '', '']
  let chimneys = ''
  let smoke = ''
  HOUSES.forEach((h, k) => {
    const { x, y, w, h: hh } = h
    walls[h.wall] += `M${i0(x)} ${i0(y)}h${i0(w)}v${i0(-hh)}h${i0(-w)}Z`
    shade += `M${i0(x + w * 0.72)} ${i0(y)}h${i0(w * 0.28)}v${i0(-hh)}h${i0(-w * 0.28)}Z`
    const rh = 12 + w * 0.22
    roofs[h.roof] += `M${i0(x - 4)} ${i0(y - hh + 1)}L${i0(x + w * 0.5)} ${i0(y - hh - rh)}L${i0(x + w + 4)} ${i0(y - hh + 1)}Z`
    h.windows.forEach(([wx, wy], j) => {
      const rect = `M${i0(wx)} ${i0(wy)}h6v8h-6Z`
      panes += rect
      lit[(k * 3 + j) % 5] += rect
    })
    panes += `M${i0(x + w * 0.42)} ${i0(y)}v-12h7v12Z`
    if (h.chimney) {
      const cx = x + w * 0.7
      chimneys += `M${i0(cx)} ${i0(y - hh - rh * 0.4)}v-12h6v${i0(12 - rh * 0.1)}Z`
      if (k % 3 === 0) smoke += `<circle cx="${i0(cx + 3)}" cy="${i0(y - hh - rh * 0.4 - 14)}" r="5" style="animation:smoke ${n(7 + r() * 4)}s ease-out ${n(-r() * 8)}s infinite"/>`
    }
  })

  const boats = BOATS.map(
    (b, i) =>
      `<g transform="translate(${b.x},${b.y}) scale(${b.s})"><g class="bob" style="animation-delay:${-i * 1.9}s">` +
      `<path d="${HULL}" style="${d(`c-${b.hull}`)}"/><path d="M-34 -1C-26 6 26 6 36 -3" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>` +
      `<path d="${CABIN}" style="${d('c-wallC')}"/>` +
      (b.mast ? `<path d="M14 -8V-58" stroke-width="2" style="${d('s-wood')}"/><path d="M14 -56L14 -14L38 -16Z" opacity=".85" style="${d('c-wallA')}"/>` : '') +
      `</g></g><g transform="translate(${b.x},${b.y + 8}) scale(${b.s},${-b.s * 0.7})" opacity=".35" filter="url(#wobble)"><path d="${HULL}" style="${d(`c-${b.hull}`)}"/></g>`,
  ).join('')

  const gulls = Array.from({ length: 3 }, (_, i) => {
    const y = 200 + i * 46
    const wing = `<path class="wing" style="animation-delay:${-i}s" d="M-12 0Q-6 -7 0 0Q6 -7 12 0" fill="none" stroke-width="1.8" stroke-linecap="round"/>`
    return `<g transform="translate(0,${y})"><g style="animation:glide ${90 + i * 23}s linear ${-i * 31}s infinite">${wing}</g></g>`
  }).join('')

  const lampPosts = LAMPS.map(([x, y]) => `M${x - 1} ${y}v-34h2v34Z`).join('')
  const lampHeads = LAMPS.map(([x, y]) => `<circle cx="${x}" cy="${y - 36}" r="3.2"/>`).join('')
  const lampHalos = LAMPS.map(([x, y]) => `<circle cx="${x}" cy="${y - 36}" r="22"/>`).join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<path id="cliff" d="${CLIFF}"/>
<path id="face" d="${FACE_ZONE}"/>
<clipPath id="faceClip"><path d="${FACE_ZONE}"/></clipPath>
<path id="hill" d="${HILL}"/>
<path id="dune" d="${DUNE}"/>
<linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c6dc0"/><stop offset=".3" stop-color="#5a9bdb"/><stop offset=".55" stop-color="#bfe3f7"/></linearGradient>
<linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d3c80"/><stop offset=".26" stop-color="#8a6aa3"/><stop offset=".44" stop-color="#e08f9e"/><stop offset=".55" stop-color="#fbc791"/></linearGradient>
<linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#212566"/><stop offset=".26" stop-color="#7a3f7a"/><stop offset=".44" stop-color="#d9587a"/><stop offset=".55" stop-color="#fa9a42"/></linearGradient>
<linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050818"/><stop offset=".4" stop-color="#0d1530"/><stop offset=".55" stop-color="#1d2c50"/></linearGradient>
<linearGradient id="seaDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6aa3d0"/><stop offset=".25" stop-color="#3a78ad"/><stop offset="1" stop-color="#173f66"/></linearGradient>
<linearGradient id="seaDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e0a6b0"/><stop offset=".3" stop-color="#8a6c94"/><stop offset="1" stop-color="#2a2a4c"/></linearGradient>
<linearGradient id="seaDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4a560"/><stop offset=".3" stop-color="#a05068"/><stop offset="1" stop-color="#26182f"/></linearGradient>
<linearGradient id="seaNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2c50"/><stop offset="1" stop-color="#040710"/></linearGradient>
<linearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".5"/></linearGradient>
<mask id="hazeLow" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#hazeGrad)"/></mask>
<radialGradient id="sunGlow"><stop offset="0" stop-color="#fff3d1" stop-opacity=".95"/><stop offset=".18" stop-color="#ffd59a" stop-opacity=".5"/><stop offset="1" stop-color="#ffb26b" stop-opacity="0"/></radialGradient>
<radialGradient id="moonGlow"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".55"/><stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="milky"><stop offset="0" stop-color="#c8d3ff" stop-opacity=".22"/><stop offset="1" stop-color="#c8d3ff" stop-opacity="0"/></radialGradient>
<radialGradient id="warm"><stop offset="0" stop-color="#ffd88a" stop-opacity=".75"/><stop offset="1" stop-color="#ffb24a" stop-opacity="0"/></radialGradient>
<linearGradient id="beamGrad" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2c4" stop-opacity=".6"/><stop offset="1" stop-color="#fff2c4" stop-opacity="0"/></linearGradient>
<filter id="strata" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".004 .06" numOctaves="4" seed="7" result="a"/><feTurbulence type="fractalNoise" baseFrequency=".02 .02" numOctaves="4" seed="2" result="b"/><feComposite in="a" in2="b" operator="arithmetic" k2=".7" k3=".35"/><feDiffuseLighting surfaceScale="9" lighting-color="#fff"><feDistantLight azimuth="200" elevation="34"/></feDiffuseLighting><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.3 0 0 0 1.1"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="rough" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".03 .045" numOctaves="4" seed="4"/><feDiffuseLighting surfaceScale="3" lighting-color="#fff"><feDistantLight azimuth="225" elevation="45"/></feDiffuseLighting><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.2 0 0 0 1.05"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="seaTex" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".004 .07" numOctaves="3" seed="6"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -.9 0 0 0 .62"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="cloud" x="-30%" y="-60%" width="160%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".013" numOctaves="4" seed="8"/><feDisplacementMap in="SourceGraphic" scale="46" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="wobble" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".01 .2" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".6 1.2"/></filter>
<filter id="foamFx" x="-20%" y="-200%" width="140%" height="500%"><feTurbulence type="fractalNoise" baseFrequency=".05 .2" numOctaves="3" seed="12"/><feDisplacementMap in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".8"/></filter>
<filter id="soft" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="blur3" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
<filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
${moonMask(phase)}
</defs>
<style>${css}</style>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDay)"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDusk)" style="${d('skyDusk')}"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDawn)" style="${d('skyDawn')}"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyNight)" style="${d('skyNight')}"/>
<g style="${d('nightOnly')}"><ellipse cx="760" cy="220" rx="700" ry="85" transform="rotate(-20 760 220)" fill="url(#milky)"/><g fill="#eef3ff">${STARS}</g><g style="animation:meteor 89s linear -27s infinite"><rect x="700" y="90" width="150" height="1.6" rx=".8" transform="rotate(-23 770 90)" fill="#fff"/></g></g>
<g style="${d('moonPath')}"><g style="${d('nightOnly')}"><circle r="80" fill="url(#moonGlow)"/><circle r="22" fill="#3a4466" opacity=".5"/><g mask="url(#moonLit)"><circle r="22" fill="#f2f0e6"/><circle cx="-7" cy="-5" r="4" fill="#cfccc0" opacity=".5"/><circle cx="6" cy="6" r="3" fill="#cfccc0" opacity=".45"/><circle cx="-3" cy="9" r="2" fill="#cfccc0" opacity=".4"/></g></g></g>
<g style="${d('sunPath')}"><circle r="160" fill="url(#sunGlow)"/><circle r="28" style="${d('c-sun')}"/></g>
<g filter="url(#blur3)" opacity=".5" style="${d('c-cloud')}">${CIRRUS}</g>
<g opacity=".85">${CLOUDS}</g>
<path d="${ISLANDS}" style="${d('c-islands')}"/>
<rect y="${HORIZON - 60}" width="${W}" height="62" mask="url(#hazeLow)" style="${d('c-cloud')}" opacity=".35"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#seaDay)"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#seaDusk)" style="${d('skyDusk')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#seaDawn)" style="${d('skyDawn')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#seaNight)" style="${d('skyNight')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="#000" filter="url(#seaTex)" opacity=".5"/>
<g style="${d('glitterPath')}"><g fill="#fff4d6" style="${d('glitter')}">${glitter}</g></g>
<g style="${d('moonGlint')}"><g fill="#e8eeff" style="${d('nightOnly')}">${moonGlints}</g></g>
<g fill="none" stroke-linecap="round" style="${d('s-foam')}">${WAVES.svg}</g>
<g style="${d('dayOnly')}"><g transform="translate(0,${HORIZON - 4})"><g style="animation:sail 420s linear -130s infinite"><path d="M0 0L30 0L26 6L4 6Z" fill="#3a3a48"/><path d="M15 -1L15 -34L30 -2Z" fill="#f4f1ea"/><path d="M14 -1L14 -28L3 -2Z" fill="#e8e2d8"/></g></g></g>
<g fill="#ffffff" filter="url(#soft)" style="${d('mist')}"><ellipse cx="500" cy="${HORIZON + 12}" rx="380" ry="20" style="animation:drift 60s ease-in-out infinite alternate"/><ellipse cx="900" cy="${HORIZON + 22}" rx="300" ry="18" style="animation:drift 70s ease-in-out -20s infinite alternate"/></g>
<use href="#cliff" style="${d('c-grass')}"/>
<use href="#cliff" filter="url(#rough)" opacity=".45"/>
<path d="${CLIFF_PATH}" fill="none" stroke="#e9dcc0" stroke-opacity=".28" stroke-width="10" stroke-linecap="round"/>
<path d="${GORSE.bush}" style="${d('c-tree')}"/><path d="${GORSE.bloom}" style="${d('c-flowerB')}"/>
<use href="#face" style="${d('c-rock')}"/>
<g style="${d('relief')}"><use href="#face" filter="url(#strata)"/><use href="#face" filter="url(#rough)" opacity=".6"/></g>
<path d="${LEDGES}" fill="none" stroke="#000" stroke-opacity=".22" stroke-width="2" clip-path="url(#faceClip)"/>
<path d="${CLIFF_GRASS}" style="${d('c-grass')}"/>
<path d="${STACKS}" style="${d('c-rock')}"/>
<path d="${STACKS}" filter="url(#rough)" opacity=".7"/>
<g filter="url(#foamFx)" style="${d('c-foam')}">${[0.04, 0.22, 0.42, 0.62, 0.84].map((t, i) => { const p = FOOT[Math.round(t * (FOOT.length - 1))]!; const rx = 16 + t * 60; return `<ellipse class="surf" cx="${n(p[0] - rx * 0.6)}" cy="${n(p[1] + 2)}" rx="${n(rx)}" ry="${n(2 + t * 6)}" style="animation:surf ${n(6 + i)}s ease-in-out ${-i * 1.3}s infinite"/>` }).join('')}<ellipse class="surf" cx="956" cy="576" rx="26" ry="4" style="animation:surf 6s ease-in-out -1s infinite"/><ellipse class="surf" cx="1082" cy="697" rx="30" ry="5" style="animation:surf 7s ease-in-out -3s infinite"/></g>
<g style="${d('beam')}"><g transform="translate(${n(LH.light.x)},${n(LH.light.y)})"><path class="sweep" d="M-900 -70L0 -4L0 4L-900 70Z" fill="url(#beamGrad)" filter="url(#blur3)"/><circle r="30" fill="url(#warm)" style="animation:flash 14s ease-in-out infinite"/></g></g>
<path d="${LH.house}" style="${d('c-wallC')}"/><path d="${LH.houseRoof}" style="${d('c-slate')}"/><path d="${LH.houseWin}" fill="#1a1d28"/><path d="${LH.houseWin}" fill="#ffcf7a" filter="url(#glow)" style="${d('win0')}"/>
<path d="${LH.tower}" style="${d('c-wallC')}"/><path d="${LH.stripes}" style="${d('c-red')}"/><path d="${LH.shade}" fill="#000" opacity=".18"/>
<path d="${LH.gallery}" style="${d('c-slate')}"/><path d="${LH.rail}" fill="none" stroke="#1a1d28" stroke-width="1.2"/>
<path d="${LH.lantern}" fill="#2a3040"/><path d="${LH.lantern}" fill="#ffe7a0" filter="url(#glow)" style="${d('beam')}"/>
<path d="${LH.roof}" style="${d('c-red')}"/><path d="${LH.vane}" stroke="#1a1d28" stroke-width="1.5"/>
<use href="#hill" style="${d('c-grass')}"/>
<use href="#hill" filter="url(#rough)" opacity=".5"/>
<path d="${VILLAGE_TREES}" style="${d('c-tree')}"/>
<path d="${CHURCH.nave}${CHURCH.tower}" style="${d('c-wallC')}"/><path d="${CHURCH.roof}${CHURCH.spire}" style="${d('c-slate')}"/><path d="${CHURCH.clock}" fill="#2a2f40"/>
<path d="${walls.wallA}" style="${d('c-wallA')}"/><path d="${walls.wallB}" style="${d('c-wallB')}"/><path d="${walls.wallC}" style="${d('c-wallC')}"/>
<path d="${shade}" fill="#000" opacity=".16"/>
<path d="${chimneys}" style="${d('c-stone')}"/>
<path d="${roofs.roof}" style="${d('c-roof')}"/><path d="${roofs.slate}" style="${d('c-slate')}"/>
<path d="${panes}" fill="#1a1d28" opacity=".85"/>
<g fill="#ffcf7a" filter="url(#glow)">${lit.map((p, i) => `<path d="${p}" style="${d(`win${i}`)}"/>`).join('')}</g>
<g fill="#cfd6e4" opacity=".55" filter="url(#blur3)">${smoke}</g>
<path d="${QUAY.top}" style="${d('c-stone')}"/><path d="${QUAY.face}" style="${d('c-rock')}"/><path d="${QUAY.face}" filter="url(#rough)" opacity=".7"/><path d="${QUAY.blocks}" fill="none" stroke="#000" stroke-opacity=".25"/>
<path d="${lampPosts}" fill="#1a1d28"/>
<g style="${d('lamps')}"><g fill="url(#warm)">${lampHalos}</g><g fill="#ffe2a0">${lampHeads}</g><g fill="#ffd27a">${lampGlints}</g></g>
${boats}
<g stroke="#2a3340" style="${d('dayOnly')}">${gulls}</g>
<use href="#dune" style="${d('c-dune')}"/>
<use href="#dune" filter="url(#rough)" opacity=".45"/>
<path d="${PATH}" fill="#fff" opacity=".18"/>
<path d="${FLOWERS.a}" style="${d('c-flowerA')}"/><path d="${FLOWERS.b}" style="${d('c-flowerB')}"/>
<path d="${FENCE.posts}" style="${d('c-wood')}"/><path d="${FENCE.rope}" fill="none" stroke-width="1.4" style="${d('s-wood')}"/>
<g style="${d('c-grass')}">${GRASS}</g>
</svg>`
}
