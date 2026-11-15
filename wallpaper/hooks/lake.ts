// A mountain lake that follows the time of day.
//
// One SVG on a 24-hour CSS cycle: every element that changes over the day
// (sky, water, mountain colors, sun and moon paths, stars, mist, birds) runs a
// single 86,400 s animation, and the SVG is built with a negative delay equal
// to the local time of day, so the light moves on continuously and in sync.
// The keyframes come from the real sunrise and sunset of the day at the
// chosen place, and the moon is drawn in its real phase.
//
// The look is painterly rather than geometric: SVG filters (fractal noise,
// lighting, displacement) give the rock its relief, the clouds their fluffy
// edges and the reflection its wobble; trees, reeds, rocks, a dock and a boat
// are drawn in detail. The geometry is built once at load; only the
// keyframes and the delay are rebuilt for each render.
//
// Colors that follow the day change in one-minute steps rather than every
// frame, so the filtered layers are repainted once a minute, not 60 times a
// second.

import { DAY, dayKf, localHour, moonMask, moonPhase, phaseColors, rad, sunTimes } from './daylight'
import type { Four, Place, SunTimes } from './daylight'
import { W, n, rng } from './stage'

export { DEFAULT_PLACE, dayPhase, localHour, moonPhase, sunTimes } from './daylight'
export type { DayPhase, Place } from './daylight'

const HORIZON = 652

// ---------- Palette of the scene, by phase ----------

const C = {
  far: ['#1c2742', '#7d6f9c', '#8aa3bd', '#6e4c74'],
  mid: ['#151d36', '#5e5784', '#6a879f', '#523759'],
  hills: ['#0f1729', '#423f60', '#4f6a5f', '#36263f'],
  forest: ['#0b1120', '#2f2f4a', '#2f4a3e', '#291c30'],
  shore: ['#070b15', '#1f2236', '#253c2f', '#1c1324'],
  pine: ['#04070f', '#16182a', '#162a20', '#140d1b'],
  rock: ['#1b2234', '#5c5269', '#707578', '#4c3c4a'],
  snow: ['#56648c', '#f6d9dc', '#f5f9fc', '#f5bd96'],
  haze: ['#24345a', '#e7a9b3', '#d4e6f3', '#e89a86'],
  cloud: ['#2b3555', '#f5bcbf', '#ffffff', '#f7a682'],
  cloudShade: ['#1b2440', '#a97f9c', '#b9c9db', '#a8566f'],
  sun: ['#ff9a4d', '#ffb26b', '#fff6d8', '#ff8f45'],
  rim: ['#3a4a73', '#ffcfae', '#ffffff', '#ffb27a'],
  reed: ['#0a0f1a', '#3a3048', '#4b5a37', '#3a2633'],
  wood: ['#191a24', '#4a3a42', '#6e5640', '#4a3030'],
} satisfies Record<string, Four>

// ---------- Geometry, built once ----------

type Pt = [number, number]
const i0 = (v: number) => Math.round(v).toString()
const pts = (list: Pt[]) => list.map(([x, y]) => `${i0(x)} ${i0(y)}`).join('L')

// A ridge line by midpoint displacement: deterministic for a seed.
function ridge(seed: number, base: number, amp: number, rough: number, peaks: [number, number, number][] = []): Pt[] {
  const r = rng(seed)
  const N = 256
  const ys = new Array<number>(N + 1).fill(0)
  ys[0] = (r() - 0.5) * amp
  ys[N] = (r() - 0.5) * amp
  for (let step = N; step > 1; step /= 2) {
    const scale = amp * Math.pow(step / N, rough)
    for (let i = step / 2; i < N; i += step) {
      ys[i] = (ys[i - step / 2]! + ys[i + step / 2]!) / 2 + (r() - 0.5) * scale
    }
  }
  return ys.map((y, i) => {
    const x = (i / N) * (W + 80) - 40
    let lift = 0
    for (const [px, h, w] of peaks) lift += h * Math.exp(-(((x - px) / w) ** 2))
    return [x, base + y - lift] as Pt
  })
}

const pathOf = (line: Pt[], bottom: number) => `M${pts(line)}L${W + 40} ${bottom}L-40 ${bottom}Z`

const FAR = ridge(11, 470, 150, 0.55, [[430, 170, 150], [1170, 205, 170], [800, 80, 120], [1450, 60, 110]])
const MID = ridge(23, 560, 100, 0.62, [[230, 70, 140], [1380, 80, 150], [700, 25, 90]])
const HILLS = ridge(37, 622, 34, 0.72)

// Snow: from the ridge down to a ragged snow line, plus streaks that run
// down the gullies below it.
const SNOW_LINE = 410
const SNOW = (() => {
  const r = rng(41)
  let d = ''
  let run: [number, number, number][] = []
  const flush = () => {
    if (run.length > 1) d += `M${run.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}L${[...run].reverse().map(([x, , e]) => `${n(x)} ${n(e)}`).join('L')}Z`
    run = []
  }
  const edges: number[] = []
  FAR.forEach(([x, y]) => {
    const e = SNOW_LINE + 26 * Math.sin(x * 0.029) + 16 * Math.sin(x * 0.087 + 1) + (r() - 0.5) * 30
    edges.push(e)
    if (y < e - 3) run.push([x, y, e])
    else flush()
  })
  flush()
  // Patches: ragged blobs of snow just below the snowfields' edge.
  for (let i = 0; i < 60; i++) {
    const k = Math.floor(r() * FAR.length)
    const [x, y] = FAR[k]!
    const e = edges[k]!
    if (y > e - 18) continue
    const cy = e + 2 + r() * 26
    const rx = 4 + r() * 14
    const ry = 2 + r() * 5
    const ring = Array.from({ length: 7 }, (_, j) => {
      const a = (j / 7) * Math.PI * 2
      const q = 0.6 + r() * 0.6
      return [x + Math.cos(a) * rx * q, cy + Math.sin(a) * ry * q] as Pt
    })
    d += `M${pts(ring)}Z`
  }
  return d
})()

// A treeline: a sawtooth of small conifer tips along a base line.
function treeline(seed: number, x0: number, x1: number, baseAt: (x: number) => number, hMin: number, hMax: number, bottom: number): string {
  const r = rng(seed)
  const line: Pt[] = [[x0, baseAt(x0)]]
  let x = x0
  while (x < x1) {
    const w = 3 + r() * 5
    const h = hMin + r() * (hMax - hMin)
    const b = baseAt(x + w)
    line.push([x + w * 0.5, b - h], [x + w, b - h * (0.15 + r() * 0.2)])
    x += w
  }
  return `M${pts(line)}L${n(x1)} ${bottom}L${n(x0)} ${bottom}Z`
}

// A detailed pine: tiers of drooping, ragged branches around a trunk.
function pine(r: () => number, x: number, base: number, h: number): string {
  const lean = (r() - 0.5) * 0.05
  const tiers = Math.round(8 + h / 22)
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 1; i <= tiers; i++) {
    const t = i / tiers
    const y = base - h + t * h * 0.9
    const cx = x + lean * (base - y)
    const w = h * 0.3 * Math.pow(t, 0.85) * (0.75 + r() * 0.5)
    const droop = h * (0.03 + r() * 0.02)
    left.push([cx - w, y + droop], [cx - w * (0.25 + r() * 0.15), y + droop * 1.6])
    right.push([cx + w * (0.9 + r() * 0.2), y + droop], [cx + w * (0.25 + r() * 0.15), y + droop * 1.6])
  }
  const tip: Pt = [x + lean * h, base - h - h * 0.04]
  const trunk = `M${n(x - h * 0.018)} ${n(base)}L${n(x - h * 0.012)} ${n(base - h * 0.15)}L${n(x + h * 0.012)} ${n(base - h * 0.15)}L${n(x + h * 0.018)} ${n(base)}Z`
  return `M${pts([tip, ...left])}L${pts([...right].reverse())}Z${trunk}`
}

function pines(seed: number, x0: number, x1: number, baseAt: (x: number) => number, hMin: number, hMax: number, count: number): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * (i / (count - 1)) + (r() - 0.5) * 30
    d += pine(r, x, baseAt(x) + 4, hMin + Math.pow(r(), 0.7) * (hMax - hMin))
  }
  return d
}

// The banks: hills whose crest rises toward the corners and whose foot
// follows the shore down to the water.
const shoreCurve = (t: number, seed: number) => {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (3 - 2 * u) * 300 + 70 * u * u * u + 7 * Math.sin(u * 23 + seed) * u
}
const leftShore = (x: number) => HORIZON + 6 + shoreCurve((440 - x) / 440, 1)
const rightShore = (x: number) => HORIZON + 6 + shoreCurve((x - 1150) / 450, 4)
const crestL = (x: number) => HORIZON + 4 - 95 * Math.pow(Math.max(0, 470 - x) / 510, 1.4) + 5 * Math.sin(x * 0.05)
const crestR = (x: number) => HORIZON + 4 - 105 * Math.pow(Math.max(0, x - 1130) / 510, 1.4) + 5 * Math.sin(x * 0.047 + 2)
const range = (a: number, b: number, step: number) => Array.from({ length: Math.floor(Math.abs(b - a) / step) + 1 }, (_, i) => a + Math.sign(b - a) * i * step)
const BANK_L = `M470 ${HORIZON + 4}L${pts(range(470, -40, 10).map(x => [x, crestL(x)] as Pt))}L-40 1040L${pts(range(0, 450, 10).map(x => [x, leftShore(x)] as Pt))}Z`
const BANK_R = `M1130 ${HORIZON + 4}L${pts(range(1130, W + 40, 10).map(x => [x, crestR(x)] as Pt))}L${W + 40} 1040L${pts(range(W, 1150, 10).map(x => [x, rightShore(x)] as Pt))}Z`

// The far shore across the lake: a dense treeline down to the water, and the
// forest on the hills behind.
const FAR_SHORE = treeline(51, 380, 1220, () => HORIZON + 3, 5, 15, HORIZON + 4)
const HILL_FOREST = treeline(53, -40, W + 40, x => {
  const i = Math.max(0, Math.min(HILLS.length - 1, Math.round(((x + 40) / (W + 80)) * (HILLS.length - 1))))
  return HILLS[i]![1] + 10
}, 6, 18, HORIZON + 4)

const PINES =
  pines(5, -10, 410, crestL, 110, 250, 13) +
  pines(9, 1190, 1610, crestR, 110, 260, 13) +
  pines(13, 30, 380, x => crestL(x) + 40, 70, 140, 9) +
  pines(17, 1220, 1570, x => crestR(x) + 40, 70, 150, 9)

// Rocks at the water's edge, and reeds.
const ROCKS = (() => {
  const r = rng(61)
  const spots: Pt[] = [[300, leftShore(300) + 4], [380, leftShore(380) + 2], [205, leftShore(205) + 6], [1260, rightShore(1260) + 4], [1340, rightShore(1340) + 6], [1205, rightShore(1205) + 2]]
  return spots
    .map(([cx, cy]) => {
      const rx = 18 + r() * 26
      const ry = 8 + r() * 12
      const k = 9
      const ring = Array.from({ length: k }, (_, i) => {
        const a = Math.PI + (i / (k - 1)) * Math.PI
        const j = 0.75 + r() * 0.4
        return [cx + Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j] as Pt
      })
      return `M${pts(ring)}Z`
    })
    .join('')
})()

const REEDS = (() => {
  const r = rng(71)
  const clumps: [number, number][] = [[420, leftShore(420)], [340, leftShore(340)], [250, leftShore(250)], [1180, rightShore(1180)], [1290, rightShore(1290)], [1400, rightShore(1400)]]
  return clumps
    .map(([cx, cy], i) => {
      let d = ''
      for (let k = 0; k < 12; k++) {
        const x = cx + (r() - 0.5) * 34
        const h = 22 + r() * 46
        const bend = (r() - 0.5) * 18
        d += `M${n(x - 1.2)} ${n(cy + 4)}Q${n(x + bend * 0.5)} ${n(cy - h * 0.6)} ${n(x + bend)} ${n(cy - h)}Q${n(x + bend * 0.5 + 1)} ${n(cy - h * 0.6)} ${n(x + 1.2)} ${n(cy + 4)}Z`
        if (r() < 0.35) d += `M${n(x + bend - 1.6)} ${n(cy - h + 2)}h3.2v9h-3.2Z`
      }
      return `<g class="reed" style="animation-delay:${-i * 1.7}s">${'<path d="' + d + '"/>'}</g>`
    })
    .join('')
})()

const STARS = (() => {
  const r = rng(3)
  return Array.from({ length: 170 }, (_, i) => {
    const s = 0.4 + Math.pow(r(), 3) * 1.6
    return `<circle class="tw${i % 3}" cx="${n(r() * W)}" cy="${n(Math.pow(r(), 1.3) * 560)}" r="${n(s)}"/>`
  }).join('')
})()

// Cumulus: a flat base and piled puffs, a shaded underside, a lit top.
const CLOUDS = (() => {
  const r = rng(7)
  return Array.from({ length: 7 }, () => {
    const y = 80 + r() * 250
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

// The dock: planks in perspective, from the left bank into the water.
const DOCK = (() => {
  const near: Pt = [180, 905]
  const far: Pt = [500, 704]
  const wNear = 120
  const wFar = 30
  const at = (t: number): [Pt, Pt] => {
    const x = near[0] + (far[0] - near[0]) * t
    const y = near[1] + (far[1] - near[1]) * t
    const w = wNear + (wFar - wNear) * t
    return [[x - w * 0.15, y - w * 0.18], [x + w * 0.85, y + w * 0.1]]
  }
  const [a0, b0] = at(0)
  const [a1, b1] = at(1)
  let planks = ''
  for (let i = 1; i < 24; i++) {
    const [a, b] = at(i / 24)
    planks += `M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}`
  }
  let posts = ''
  for (let i = 0; i <= 4; i++) {
    const [a, b] = at(i / 4)
    const len = 34 * (1 - i / 4) + 9
    const w = 5 * (1 - i / 4) + 1.6
    for (const p of [a, b]) posts += `M${n(p[0] - w / 2)} ${n(p[1])}h${n(w)}v${n(len)}h${n(-w)}Z`
  }
  return { deck: `M${n(a0[0])} ${n(a0[1])}L${n(a1[0])} ${n(a1[1])}L${n(b1[0])} ${n(b1[1])}L${n(b0[0])} ${n(b0[1])}Z`, planks, posts }
})()

// A rowboat moored beside the dock.
const BOAT = `M-54 0C-40 16 40 16 58 -2L52 -10L-50 -10Z`
const BOAT_RIM = `M-50 -10L52 -10`
const BOAT_SEATS = `M-20 -10l3 9M14 -10l-2 9`

// ---------- Keyframes for the day ----------

function keyframes(s: SunTimes): string {
  const { sunrise: sr, sunset: ss, noonElevation } = s
  const kf: string[] = []
  const add = (name: string, body: string) => kf.push(`@keyframes ${name}{${body}}`)
  add('skyNight', dayKf([[sr - 1.2, 'opacity:1'], [sr - 0.2, 'opacity:0'], [ss + 0.3, 'opacity:0'], [ss + 1.2, 'opacity:1']]))
  add('skyDawn', dayKf([[sr - 1.3, 'opacity:0'], [sr - 0.1, 'opacity:1'], [sr + 0.4, 'opacity:1'], [sr + 1.4, 'opacity:0']]))
  add('skyDusk', dayKf([[ss - 1.4, 'opacity:0'], [ss - 0.1, 'opacity:1'], [ss + 0.3, 'opacity:1'], [ss + 1.3, 'opacity:0']]))
  for (const [k, c] of Object.entries(C)) add(`c-${k}`, phaseColors('fill', c, s))
  add('s-wood', phaseColors('stroke', C.wood, s))
  add('s-rim', phaseColors('stroke', C.rim, s))
  add('nightOnly', dayKf([[sr - 1.3, 'opacity:1'], [sr - 0.3, 'opacity:0'], [ss + 0.4, 'opacity:0'], [ss + 1.4, 'opacity:1']]))
  add('golden', dayKf([[sr - 0.8, 'opacity:0'], [sr + 0.2, 'opacity:.9'], [sr + 1.6, 'opacity:0'], [ss - 1.6, 'opacity:0'], [ss - 0.2, 'opacity:.9'], [ss + 0.8, 'opacity:0']]))
  add('mist', dayKf([[sr - 1.5, 'opacity:.15'], [sr + 0.2, 'opacity:.55'], [sr + 2.2, 'opacity:.05'], [ss + 0.5, 'opacity:.05'], [ss + 2, 'opacity:.15']]))
  add('dayOnly', dayKf([[sr + 0.5, 'opacity:0'], [sr + 1.5, 'opacity:1'], [ss - 1.5, 'opacity:1'], [ss - 0.5, 'opacity:0']]))
  add('glitter', dayKf([[sr - 0.2, 'opacity:0'], [sr + 0.6, 'opacity:.9'], [ss - 0.6, 'opacity:.9'], [ss + 0.3, 'opacity:0']]))
  add('relief', dayKf([[sr - 1.2, 'opacity:.35'], [sr + 0.5, 'opacity:.75'], [ss - 0.5, 'opacity:.75'], [ss + 1.2, 'opacity:.35']]))
  // The sun's path: rises behind the mountains, higher in summer than in winter.
  const arc = 200 + 300 * Math.sin(rad(noonElevation))
  const sunPts: [number, string][] = []
  for (let i = 0; i <= 12; i++) {
    const f = i / 12
    const h = sr - 0.4 + (ss - sr + 0.8) * f
    sunPts.push([h, `transform:translate(${n(240 + 1120 * f)}px,${n(600 - arc * Math.sin(Math.PI * f))}px)`])
  }
  sunPts.push([ss + 0.6, 'transform:translate(1400px,900px)'], [sr - 0.6, 'transform:translate(200px,900px)'])
  add('sunPath', dayKf(sunPts))
  add('glitterPath', dayKf(sunPts.map(([h, v]) => [h, v.replace(/,(-?[\d.]+)px\)/, ',0px)')])))
  // The moon crosses the night sky, from after sunset to before sunrise.
  const nightLen = 24 - (ss - sr)
  const moonPts: [number, string][] = []
  for (let i = 0; i <= 10; i++) {
    const f = i / 10
    moonPts.push([ss + 0.6 + (nightLen - 1.2) * f, `transform:translate(${n(260 + 1080 * f)}px,${n(560 - 330 * Math.sin(Math.PI * f))}px)`])
  }
  moonPts.push([sr - 0.4, 'transform:translate(1400px,900px)'], [ss + 0.4, 'transform:translate(200px,900px)'])
  add('moonPath', dayKf(moonPts))
  add('moonGlint', dayKf(moonPts.map(([h, v]) => [h, v.replace(/,(-?[\d.]+)px\)/, ',0px)')])))
  return kf.join('')
}

// ---------- The SVG ----------

export function lakeSvg(ms: number, place: Place): string {
  const s = sunTimes(ms, place)
  const phase = moonPhase(ms)
  const delay = -Math.round(localHour(ms, place.tz) * 3600)
  const d = (name: string) => `animation:${name} ${DAY}s linear ${delay}s infinite`
  const mirror = `transform="translate(0,${HORIZON * 2}) scale(1,-1)"`
  const r = rng(29)

  const css = [
    keyframes(s),
    '@keyframes cloud{from{transform:translateX(-500px)}to{transform:translateX(2100px)}}',
    '.drift{will-change:transform}',
    `.cshade{${d('c-cloudShade')}}.clit{${d('c-cloud')}}`,
    '@keyframes tw{0%,100%{opacity:.3}50%{opacity:1}}',
    '.tw0{animation:tw 5s ease-in-out infinite}.tw1{animation:tw 7s ease-in-out -2s infinite}.tw2{animation:tw 11s ease-in-out -5s infinite}',
    '@keyframes shimmer{0%,100%{opacity:0}50%{opacity:.6}}',
    '@keyframes drift{from{transform:translateX(-60px)}to{transform:translateX(60px)}}',
    '@keyframes flock{from{transform:translate(-200px,0)}to{transform:translate(1900px,-70px)}}',
    '@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(-.6)}}',
    '.wing{transform-box:fill-box;transform-origin:center bottom;animation:flap 1.4s ease-in-out infinite}',
    '@keyframes meteor{0%,94%{opacity:0;transform:translate(0,0)}95%{opacity:1}99%{opacity:0;transform:translate(-420px,180px)}100%{opacity:0}}',
    '@keyframes sway{0%,100%{transform:skewX(-3deg)}50%{transform:skewX(3deg)}}',
    '.reed{transform-box:fill-box;transform-origin:center bottom;animation:sway 6s ease-in-out infinite}',
    '@keyframes rock{0%,100%{transform:rotate(-1.2deg) translateY(0)}50%{transform:rotate(1.2deg) translateY(2px)}}',
    '.boat{transform-box:fill-box;transform-origin:center;animation:rock 7s ease-in-out infinite}',
    '@keyframes ring{0%,80%{transform:scale(.1);opacity:0}82%{opacity:.8}100%{transform:scale(1);opacity:0}}',
    '.ring{transform-box:fill-box;transform-origin:center}',
    '@keyframes fly{0%{transform:translate(0,0)}25%{transform:translate(14px,-10px)}50%{transform:translate(-6px,-18px)}75%{transform:translate(-14px,-4px)}100%{transform:translate(0,0)}}',
    '@keyframes glowfly{0%,100%{opacity:0}40%,60%{opacity:1}}',
    '@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}',
  ].join('')

  // Light on the water: ripple lines in perspective, glitter under the sun
  // and the moon.
  const ripples = Array.from({ length: 60 }, () => {
    const t = Math.pow(r(), 1.5)
    const y = HORIZON + 8 + t * 340
    const x = 440 + (r() - 0.5) * (300 + t * 900) + 260
    const w = 10 + t * 70 * (0.4 + r())
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(0.8 + t * 1.4)}" rx="1" style="animation:shimmer ${n(5 + r() * 8)}s ease-in-out ${n(-r() * 10)}s infinite"/>`
  }).join('')
  const glitter = Array.from({ length: 22 }, (_, i) => {
    const y = HORIZON + 6 + i * 14 + r() * 6
    const w = 6 + i * 3.4
    return `<rect x="${n(-w / 2 + (r() - 0.5) * (8 + i * 3))}" y="${n(y)}" width="${n(w)}" height="${n(1.4 + i * 0.06)}" rx="1" style="animation:shimmer ${n(1.6 + r() * 2.4)}s ease-in-out ${n(-r() * 4)}s infinite"/>`
  }).join('')
  const moonGlints = Array.from({ length: 16 }, (_, i) => {
    const y = HORIZON + 8 + i * 18
    const w = 5 + i * 2.6
    return `<rect x="${n(-w / 2 + (r() - 0.5) * 6)}" y="${n(y)}" width="${n(w)}" height="1.4" rx=".7" style="animation:shimmer ${n(2.6 + r() * 3)}s ease-in-out ${n(-r() * 5)}s infinite"/>`
  }).join('')
  // A fish jumps now and then: rings spreading on the water.
  const rings = [[640, 760, 53], [960, 820, 71], [820, 700, 89]]
    .map(([x, y, period], i) => `<g transform="translate(${x},${y})"><ellipse class="ring" rx="46" ry="7" style="animation:ring ${period}s ease-out ${-i * 23}s infinite"/><ellipse class="ring" rx="28" ry="4.4" style="animation:ring ${period}s ease-out ${-i * 23 + 0.6}s infinite"/></g>`)
    .join('')
  const birds = Array.from({ length: 6 }, (_, i) => {
    const x = i * 24 - Math.abs(i - 2.5) * 4
    const y = Math.abs(i - 2.5) * 10
    return `<path class="wing" style="animation-delay:${-i * 0.2}s" d="M${n(x - 8)} ${n(y)}Q${n(x - 4)} ${n(y - 5)} ${n(x)} ${n(y)}Q${n(x + 4)} ${n(y - 5)} ${n(x + 8)} ${n(y)}" fill="none" stroke-width="1.7" stroke-linecap="round"/>`
  }).join('')
  const mist = [360, 620, 880, 1140]
    .map((x, i) => `<ellipse cx="${x}" cy="${HORIZON + 12 + i * 5}" rx="280" ry="24" style="animation:drift ${50 + i * 11}s ease-in-out ${-i * 7}s infinite alternate"/>`)
    .join('')
  const fireflies = Array.from({ length: 16 }, () => {
    const left = r() < 0.5
    const x = left ? 60 + r() * 360 : 1200 + r() * 360
    const y = HORIZON - 40 + r() * 160
    return `<g transform="translate(${n(x)},${n(y)})"><g style="animation:fly ${n(9 + r() * 8)}s ease-in-out ${n(-r() * 10)}s infinite"><circle r="2.2" style="animation:glowfly ${n(3 + r() * 4)}s ease-in-out ${n(-r() * 6)}s infinite"/></g></g>`
  }).join('')
  const craters = '<circle cx="-7" cy="-5" r="4" fill="#cfccc0" opacity=".5"/><circle cx="6" cy="6" r="3" fill="#cfccc0" opacity=".45"/><circle cx="-3" cy="9" r="2" fill="#cfccc0" opacity=".4"/><circle cx="8" cy="-8" r="2.4" fill="#cfccc0" opacity=".4"/>'

  const use = (id: string, anim: string, extra = '') => `<use href="#${id}"${extra} style="${d(anim)}"/>`
  const mountains = (withDetail: boolean) =>
    use('far', 'c-far') +
    use('snow', 'c-snow') +
    (withDetail
      ? `<use href="#rim" fill="none" stroke-width="1.6" opacity=".7" style="${d('s-rim')}"/>` +
        `<g style="${d('relief')}"><use href="#far" filter="url(#relief)"/></g>`
      : '') +
    `<rect y="${HORIZON - 230}" width="${W}" height="230" mask="url(#hazeLow)" style="${d('c-haze')}"/>` +
    use('mid', 'c-mid') +
    (withDetail ? `<g style="${d('relief')}"><use href="#mid" filter="url(#reliefFine)"/></g>` : '') +
    `<rect y="${HORIZON - 130}" width="${W}" height="130" mask="url(#hazeLow)" opacity=".8" style="${d('c-haze')}"/>` +
    use('hills', 'c-hills') +
    use('hillForest', 'c-forest') +
    use('farShore', 'c-forest')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<path id="far" d="${pathOf(FAR, HORIZON)}"/>
<path id="rim" d="M${pts(FAR)}"/>
<path id="mid" d="${pathOf(MID, HORIZON)}"/>
<path id="hills" d="${pathOf(HILLS, HORIZON)}"/>
<path id="snow" d="${SNOW}" clip-path="url(#farClip)"/>
<clipPath id="farClip"><path d="${pathOf(FAR, HORIZON)}"/></clipPath>
<path id="bankL" d="${BANK_L}"/>
<path id="bankR" d="${BANK_R}"/>
<path id="hillForest" d="${HILL_FOREST}"/>
<path id="farShore" d="${FAR_SHORE}"/>
<linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fbf"/><stop offset=".35" stop-color="#5f9bd8"/><stop offset=".65" stop-color="#b3daf3"/></linearGradient>
<linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f3f80"/><stop offset=".3" stop-color="#8a6aa3"/><stop offset=".5" stop-color="#d98a9c"/><stop offset=".65" stop-color="#f9c08f"/></linearGradient>
<linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#232766"/><stop offset=".3" stop-color="#7a3f7a"/><stop offset=".5" stop-color="#d0587a"/><stop offset=".65" stop-color="#f59a48"/></linearGradient>
<linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050818"/><stop offset=".45" stop-color="#0d1530"/><stop offset=".65" stop-color="#1d2c50"/></linearGradient>
<linearGradient id="waterDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ebede"/><stop offset=".35" stop-color="#4f84b0"/><stop offset="1" stop-color="#1c3a58"/></linearGradient>
<linearGradient id="waterDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e3a6ae"/><stop offset=".4" stop-color="#8a6b8f"/><stop offset="1" stop-color="#262646"/></linearGradient>
<linearGradient id="waterDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ee985f"/><stop offset=".4" stop-color="#9a4f68"/><stop offset="1" stop-color="#24182e"/></linearGradient>
<linearGradient id="waterNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2c50"/><stop offset="1" stop-color="#04070f"/></linearGradient>
<linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".78"/><stop offset=".7" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="hazeGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".55"/></linearGradient>
<mask id="hazeLow" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#hazeGrad)"/></mask>
<mask id="reflectFade"><rect x="0" y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#fadeDown)"/></mask>
<radialGradient id="sunGlow"><stop offset="0" stop-color="#fff3d1" stop-opacity=".95"/><stop offset=".18" stop-color="#ffd59a" stop-opacity=".5"/><stop offset="1" stop-color="#ffb26b" stop-opacity="0"/></radialGradient>
<radialGradient id="moonGlow"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".55"/><stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="ray"><stop offset="0" stop-color="#ffe2b0" stop-opacity=".5"/><stop offset="1" stop-color="#ffe2b0" stop-opacity="0"/></radialGradient>
<radialGradient id="milky"><stop offset="0" stop-color="#c8d3ff" stop-opacity=".22"/><stop offset="1" stop-color="#c8d3ff" stop-opacity="0"/></radialGradient>
<filter id="relief" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".007 .011" numOctaves="6" seed="3" result="a"/><feTurbulence type="fractalNoise" baseFrequency=".022 .014" numOctaves="3" seed="9" result="b"/><feComposite in="a" in2="b" operator="arithmetic" k2=".85" k3=".15"/><feDiffuseLighting surfaceScale="8" lighting-color="#fff"><feDistantLight azimuth="235" elevation="40"/></feDiffuseLighting><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.25 0 0 0 1.08"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="reliefFine" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".011 .015" numOctaves="5" seed="5"/><feDiffuseLighting surfaceScale="4" lighting-color="#fff"><feDistantLight azimuth="235" elevation="42"/></feDiffuseLighting><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.25 0 0 0 1.08"/><feComposite in2="SourceAlpha" operator="in"/></filter>
<filter id="cloud" x="-30%" y="-60%" width="160%" height="220%"><feTurbulence type="fractalNoise" baseFrequency=".013" numOctaves="4" seed="8"/><feDisplacementMap in="SourceGraphic" scale="46" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="wobble" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".003 .11" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="12" xChannelSelector="R" yChannelSelector="G"/><feGaussianBlur stdDeviation=".6 1.4"/></filter>
<filter id="soft" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="20"/></filter>
<filter id="rays" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="stone" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="3" seed="2"/><feDiffuseLighting surfaceScale="3" lighting-color="#fff"><feDistantLight azimuth="225" elevation="45"/></feDiffuseLighting><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.25 0 0 0 1.08"/><feComposite in2="SourceAlpha" operator="in"/></filter>
${moonMask(phase)}
</defs>
<style>${css}</style>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDay)"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDusk)" style="${d('skyDusk')}"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDawn)" style="${d('skyDawn')}"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyNight)" style="${d('skyNight')}"/>
<g style="${d('nightOnly')}"><ellipse cx="900" cy="260" rx="700" ry="90" transform="rotate(-24 900 260)" fill="url(#milky)"/><g fill="#eef3ff">${STARS}</g><g style="animation:meteor 97s linear -31s infinite"><rect x="1180" y="120" width="150" height="1.6" rx=".8" transform="rotate(-23 1250 120)" fill="#fff"/></g></g>
<g style="${d('moonPath')}"><g style="${d('nightOnly')}"><circle r="80" fill="url(#moonGlow)"/><circle r="22" fill="#3a4466" opacity=".5"/><g mask="url(#moonLit)"><circle r="22" fill="#f2f0e6"/>${craters}</g></g></g>
<g style="${d('sunPath')}"><g filter="url(#rays)" style="${d('golden')}">${Array.from({ length: 7 }, (_, i) => `<path d="M0 0L${n(-60 + i * 20)} 900L${n(-30 + i * 20)} 900Z" fill="url(#ray)" transform="rotate(${-36 + i * 12})"/>`).join('')}</g><circle r="150" fill="url(#sunGlow)"/><circle r="28" style="${d('c-sun')}"/></g>
<g opacity=".82">${CLOUDS}</g>
${mountains(true)}
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterDay)"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterDusk)" style="${d('skyDusk')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterDawn)" style="${d('skyDawn')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterNight)" style="${d('skyNight')}"/>
<g mask="url(#reflectFade)"><g filter="url(#wobble)"><g ${mirror}>${mountains(false)}</g></g></g>
<g fill="#ffffff" opacity=".45">${ripples}</g>
<g style="${d('glitterPath')}"><g fill="#fff4d6" style="${d('glitter')}">${glitter}</g></g>
<g style="${d('moonGlint')}"><g fill="#e8eeff" style="${d('nightOnly')}">${moonGlints}</g></g>
<g fill="none" stroke="#e8f2ff" stroke-width="1.2" opacity=".55">${rings}</g>
<g fill="#ffffff" filter="url(#soft)" style="${d('mist')}">${mist}</g>
<g style="${d('dayOnly')}"><g transform="translate(0,220)"><g stroke="#28313d" style="animation:flock 80s linear -20s infinite">${birds}</g></g></g>
<use href="#bankL" style="${d('c-shore')}"/>
<use href="#bankR" style="${d('c-shore')}"/>
<g opacity=".55"><use href="#bankL" filter="url(#reliefFine)"/><use href="#bankR" filter="url(#reliefFine)"/></g>
<path d="${ROCKS}" style="${d('c-rock')}"/>
<path d="${ROCKS}" filter="url(#stone)" opacity=".7"/>
<g style="${d('c-wood')}"><path d="${DOCK.posts}"/><path d="${DOCK.deck}"/></g>
<path d="${DOCK.planks}" fill="none" stroke-width=".9" opacity=".55" stroke="#000"/>
<g transform="translate(560,742) scale(.9)"><g class="boat"><path d="${BOAT}" style="${d('c-wood')}"/><path d="${BOAT_RIM}${BOAT_SEATS}" fill="none" stroke-width="2" style="${d('s-rim')}" opacity=".5"/></g></g>
<path d="${PINES}" style="${d('c-pine')}"/>
<g style="${d('c-reed')}">${REEDS}</g>
<g fill="#e9ff9a" filter="url(#glow)" style="${d('nightOnly')}">${fireflies}</g>
</svg>`
}
