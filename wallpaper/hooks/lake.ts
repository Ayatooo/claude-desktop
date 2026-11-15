// A mountain lake that follows the time of day.
//
// One SVG on a 24-hour CSS cycle: every element that changes over the day
// (sky, water, mountain colors, sun and moon paths, stars, mist, birds) runs a
// single 86,400 s animation, and the SVG is built with a negative delay equal
// to the local time of day, so the light moves on continuously and in sync.
// The keyframes come from the real sunrise and sunset of the day at the
// chosen place, and the moon is drawn in its real phase.
//
// The geometry (ridges, trees, stars, clouds) is built once at load; only the
// keyframes and the delay are rebuilt for each render.

import { W, n, rng } from './stage'

export type Place = { lat: number; lon: number; tz: string }

export const DEFAULT_PLACE: Place = { lat: 48.857, lon: 2.352, tz: 'Europe/Paris' }

const DAY = 86400
const HORIZON = 652

// ---------- Sun, moon and local time ----------

const rad = (d: number) => (d * Math.PI) / 180

// Minutes the time zone is ahead of UTC at `ms`.
function tzOffsetMinutes(ms: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms))
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0)
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'))
  return Math.round((asUtc - ms) / 60000)
}

// Local hour of day (0–24) at `ms` in `tz`.
export function localHour(ms: number, tz: string): number {
  const local = ms + tzOffsetMinutes(ms, tz) * 60000
  return (((local / 3600000) % 24) + 24) % 24
}

export type SunTimes = { sunrise: number; sunset: number; noonElevation: number }

// Sunrise and sunset in local hours (NOAA's simplified formulas, within a few
// minutes), and the sun's height at noon in degrees.
export function sunTimes(ms: number, place: Place): SunTimes {
  const start = Date.UTC(new Date(ms).getUTCFullYear(), 0, 0)
  const dayOfYear = Math.floor((ms - start) / 86400000)
  const decl = 23.44 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365)
  const b = (2 * Math.PI * (dayOfYear - 81)) / 364
  const eqTime = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b)
  const offsetH = tzOffsetMinutes(ms, place.tz) / 60
  const noon = 12 - place.lon / 15 - eqTime / 60 + offsetH
  const cosH = (Math.sin(rad(-0.833)) - Math.sin(rad(place.lat)) * Math.sin(rad(decl))) / (Math.cos(rad(place.lat)) * Math.cos(rad(decl)))
  // Polar day or night: keep a short day so the cycle still reads.
  const half = Math.acos(Math.max(-1, Math.min(1, cosH))) * (180 / Math.PI) / 15
  const h = Math.max(2, Math.min(22, half * 2)) / 2
  return { sunrise: noon - h, sunset: noon + h, noonElevation: Math.max(8, 90 - Math.abs(place.lat - decl)) }
}

// Moon phase from 0 (new) through 0.5 (full) to 1, from a known new moon.
export function moonPhase(ms: number): number {
  const ref = Date.UTC(2000, 0, 6, 18, 14)
  const p = ((ms - ref) / 86400000 / 29.530588) % 1
  return p < 0 ? p + 1 : p
}

export type DayPhase = 'night' | 'dawn' | 'day' | 'dusk'

export function dayPhase(ms: number, place: Place): DayPhase {
  const h = localHour(ms, place.tz)
  const { sunrise, sunset } = sunTimes(ms, place)
  if (h >= sunrise - 1 && h < sunrise + 1) return 'dawn'
  if (h >= sunrise + 1 && h < sunset - 1) return 'day'
  if (h >= sunset - 1 && h < sunset + 1) return 'dusk'
  return 'night'
}

// ---------- Palette of the scene, by phase ----------

type Four = [night: string, dawn: string, day: string, dusk: string]

const C = {
  far: ['#1a2440', '#7a6e9a', '#8fa9c4', '#6b4a72'] as Four,
  mid: ['#141c34', '#5c5682', '#6f8eab', '#4f3558'] as Four,
  hills: ['#0d1426', '#3d3f5e', '#4b6a63', '#33233d'] as Four,
  shore: ['#060a14', '#1e2236', '#203a2f', '#1a1222'] as Four,
  snow: ['#4a5878', '#f3d3d6', '#f4f8fb', '#f2b48f'] as Four,
  cloud: ['#2a3352', '#f4b6b9', '#ffffff', '#f6a07a'] as Four,
  sun: ['#ff9a4d', '#ffb26b', '#fff6d8', '#ff8f45'] as Four,
}

// ---------- Geometry, built once ----------

// A ridge line by midpoint displacement: deterministic for a seed.
function ridge(seed: number, base: number, amp: number, rough: number, peaks: [number, number][] = []): [number, number][] {
  const r = rng(seed)
  const N = 128
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
    for (const [px, h] of peaks) lift += h * Math.exp(-(((x - px) / 160) ** 2))
    return [x, base + y - lift] as [number, number]
  })
}

const pathOf = (pts: [number, number][], bottom: number) =>
  `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}L${W + 40} ${bottom}L-40 ${bottom}Z`

const FAR = ridge(11, 470, 170, 0.62, [[420, 150], [1180, 190], [820, 70]])
const MID = ridge(23, 560, 110, 0.7, [[250, 60], [1400, 70]])
const HILLS = ridge(37, 628, 40, 0.8)

// Snow on the high peaks: from the ridge down to a ragged snow line.
const SNOW_LINE = 418
const snowEdge = (() => {
  const r = rng(41)
  const jag = Array.from({ length: 129 }, () => (r() - 0.5) * 26)
  return (i: number, x: number) => SNOW_LINE + 22 * Math.sin(x * 0.031) + 14 * Math.sin(x * 0.083 + 1) + jag[i]!
})()
const snowPath = (() => {
  let d = ''
  let run: [number, number, number][] = []
  const flush = () => {
    if (run.length > 1) {
      const top = run.map(([x, y]) => `${n(x)} ${n(y)}`).join('L')
      const bottom = [...run].reverse().map(([x, , e]) => `${n(x)} ${n(e)}`).join('L')
      d += `M${top}L${bottom}Z`
    }
    run = []
  }
  FAR.forEach(([x, y], i) => {
    const e = snowEdge(i, x)
    if (y < e - 4) run.push([x, y, e])
    else flush()
  })
  flush()
  return d
})()

// Pines along the two shores in the foreground.
function pines(seed: number, x0: number, x1: number, baseAt: (x: number) => number, hMin: number, hMax: number, count: number): string {
  const r = rng(seed)
  let d = ''
  for (let i = 0; i < count; i++) {
    const x = x0 + (x1 - x0) * (i / (count - 1)) + (r() - 0.5) * 24
    const base = baseAt(x)
    const h = hMin + r() * (hMax - hMin)
    const w = h * (0.28 + r() * 0.06)
    // Three tiers and a trunk.
    for (let t = 0; t < 3; t++) {
      const ty = base - h * (0.18 + t * 0.27)
      const tw = w * (1 - t * 0.24)
      const th = h * 0.42
      d += `M${n(x - tw / 2)} ${n(ty)}L${n(x)} ${n(ty - th)}L${n(x + tw / 2)} ${n(ty)}Z`
    }
    d += `M${n(x - 2)} ${n(base)}L${n(x - 2)} ${n(base - h * 0.2)}L${n(x + 2)} ${n(base - h * 0.2)}L${n(x + 2)} ${n(base)}Z`
  }
  return d
}

// The shores: a soft curve that sinks toward the corners, with a little noise.
const shoreCurve = (t: number, seed: number) => {
  const u = Math.max(0, Math.min(1, t))
  return u * u * (3 - 2 * u) * 300 + 70 * u * u * u + 6 * Math.sin(u * 19 + seed) * u
}
const leftShore = (x: number) => HORIZON + 6 + shoreCurve((440 - x) / 440, 1)
const rightShore = (x: number) => HORIZON + 6 + shoreCurve((x - 1150) / 450, 4)
// Each bank is a hill: its crest rises toward the corner (trees stand on it,
// against the mountains), its foot follows the shore curve down to the water.
const crestL = (x: number) => HORIZON + 4 - 95 * Math.pow(Math.max(0, 470 - x) / 510, 1.4) + 4 * Math.sin(x * 0.05)
const crestR = (x: number) => HORIZON + 4 - 105 * Math.pow(Math.max(0, x - 1130) / 510, 1.4) + 4 * Math.sin(x * 0.047 + 2)
const SHORE_L = `M470 ${HORIZON + 4}${Array.from({ length: 35 }, (_, i) => { const x = 470 - i * 15; return `L${x} ${n(crestL(x))}` }).join('')}L-40 1040${Array.from({ length: 31 }, (_, i) => { const x = i * 15; return `L${x} ${n(leftShore(x))}` }).join('')}Z`
const SHORE_R = `M1130 ${HORIZON + 4}${Array.from({ length: 35 }, (_, i) => { const x = 1130 + i * 15; return `L${x} ${n(crestR(x))}` }).join('')}L${W + 40} 1040${Array.from({ length: 31 }, (_, i) => { const x = W - i * 15; return `L${x} ${n(rightShore(x))}` }).join('')}Z`
const PINES =
  pines(5, 0, 400, x => crestL(x) + 6, 90, 210, 15) +
  pines(9, 1200, 1600, x => crestR(x) + 6, 90, 220, 15) +
  pines(13, 420, 560, () => HORIZON + 4, 26, 44, 9) +
  pines(17, 1040, 1180, () => HORIZON + 4, 24, 40, 8)

const STARS = (() => {
  const r = rng(3)
  return Array.from({ length: 140 }, (_, i) => {
    const s = 0.5 + r() * 1.3
    return `<circle class="tw${i % 3}" cx="${n(r() * W)}" cy="${n(r() * 520)}" r="${n(s)}"/>`
  }).join('')
})()

const CLOUDS = (() => {
  const r = rng(7)
  return Array.from({ length: 6 }, (_, i) => {
    const y = 90 + r() * 260
    const s = 0.6 + r() * 0.9
    const puffs = Array.from({ length: 5 }, (_, k) => `<ellipse cx="${n((k - 2) * 46 * s)}" cy="${n(Math.sin(k * 1.7) * 8 * s)}" rx="${n((52 + r() * 30) * s)}" ry="${n((20 + r() * 12) * s)}"/>`).join('')
    const dur = 420 + r() * 380
    return `<g transform="translate(0,${n(y)})"><g style="animation:cloud ${n(dur)}s linear ${n(-r() * dur)}s infinite">${puffs}</g></g>`
  }).join('')
})()

// ---------- Keyframes for the day ----------

const pct = (h: number) => `${n((((h % 24) + 24) % 24 / 24) * 100)}%`

// Keyframes over the day from (hour, value) points, sorted and wrapped.
function dayKf(points: [number, string][]): string {
  const norm = points.map(([h, v]) => [((h % 24) + 24) % 24, v] as [number, string]).sort((a, b) => a[0] - b[0])
  const first = norm[0]!
  const last = norm[norm.length - 1]!
  // Value at midnight, interpolated through the night gap: use the nearest.
  const edge = first[0] < 24 - last[0] ? first[1] : last[1]
  return `0%{${edge}}${norm.map(([h, v]) => `${pct(h)}{${v}}`).join('')}100%{${edge}}`
}

function phaseColors(prop: string, c: Four, s: SunTimes): string {
  const { sunrise: sr, sunset: ss } = s
  return dayKf([
    [sr - 1.1, `${prop}:${c[0]}`],
    [sr - 0.1, `${prop}:${c[1]}`],
    [sr + 1.3, `${prop}:${c[2]}`],
    [ss - 1.3, `${prop}:${c[2]}`],
    [ss + 0.1, `${prop}:${c[3]}`],
    [ss + 1.1, `${prop}:${c[0]}`],
  ])
}

function keyframes(s: SunTimes, phase: number): string {
  const { sunrise: sr, sunset: ss, noonElevation } = s
  const kf: string[] = []
  const add = (name: string, body: string) => kf.push(`@keyframes ${name}{${body}}`)
  // Sky and water layers fade over the day one on top of the other.
  add('skyNight', dayKf([[sr - 1.2, 'opacity:1'], [sr - 0.2, 'opacity:0'], [ss + 0.3, 'opacity:0'], [ss + 1.2, 'opacity:1']]))
  add('skyDawn', dayKf([[sr - 1.3, 'opacity:0'], [sr - 0.1, 'opacity:1'], [sr + 0.4, 'opacity:1'], [sr + 1.4, 'opacity:0']]))
  add('skyDusk', dayKf([[ss - 1.4, 'opacity:0'], [ss - 0.1, 'opacity:1'], [ss + 0.3, 'opacity:1'], [ss + 1.3, 'opacity:0']]))
  for (const [k, c] of Object.entries(C)) add(`c-${k}`, phaseColors('fill', c, s))
  // Stars and moon only at night; mist at dawn; birds by day.
  add('nightOnly', dayKf([[sr - 1.3, 'opacity:1'], [sr - 0.3, 'opacity:0'], [ss + 0.4, 'opacity:0'], [ss + 1.4, 'opacity:1']]))
  add('mist', dayKf([[sr - 1.5, 'opacity:.12'], [sr + 0.2, 'opacity:.5'], [sr + 2.2, 'opacity:0'], [ss + 0.5, 'opacity:0'], [ss + 2, 'opacity:.12']]))
  add('dayOnly', dayKf([[sr + 0.5, 'opacity:0'], [sr + 1.5, 'opacity:1'], [ss - 1.5, 'opacity:1'], [ss - 0.5, 'opacity:0']]))
  add('glitter', dayKf([[sr - 0.2, 'opacity:0'], [sr + 0.6, 'opacity:.9'], [ss - 0.6, 'opacity:.9'], [ss + 0.3, 'opacity:0']]))
  // The sun's path: rises behind the mountains, higher in summer than in winter.
  const arc = 200 + 300 * Math.sin(rad(noonElevation))
  const sunPts: [number, string][] = []
  for (let i = 0; i <= 12; i++) {
    const f = i / 12
    const h = sr - 0.4 + (ss - sr + 0.8) * f
    const x = 240 + 1120 * f
    const y = 600 - arc * Math.sin(Math.PI * f)
    sunPts.push([h, `transform:translate(${n(x)}px,${n(y)}px)`])
  }
  sunPts.push([ss + 0.6, 'transform:translate(1400px,900px)'], [sr - 0.6, 'transform:translate(200px,900px)'])
  add('sunPath', dayKf(sunPts))
  // Glitter on the water follows the sun across.
  add('glitterPath', dayKf(sunPts.map(([h, v]) => [h, v.replace(/,(-?[\d.]+)px\)/, ',0px)')])))
  // The moon crosses the night sky, from after sunset to before sunrise.
  const nightLen = 24 - (ss - sr)
  const moonPts: [number, string][] = []
  for (let i = 0; i <= 10; i++) {
    const f = i / 10
    const h = ss + 0.6 + (nightLen - 1.2) * f
    moonPts.push([h, `transform:translate(${n(260 + 1080 * f)}px,${n(560 - 330 * Math.sin(Math.PI * f))}px)`])
  }
  moonPts.push([sr - 0.4, 'transform:translate(1400px,900px)'], [ss + 0.4, 'transform:translate(200px,900px)'])
  add('moonPath', dayKf(moonPts))
  add('moonGlint', dayKf(moonPts.map(([h, v]) => [h, v.replace(/,(-?[\d.]+)px\)/, ',0px)')])))
  void phase
  return kf.join('')
}

// The lit part of the moon for a phase: a mask that hides the dark part.
function moonMask(phase: number): string {
  // 0 new, 0.25 first quarter (right half lit), 0.5 full, 0.75 last quarter.
  const lit = 1 - Math.abs(1 - phase * 2)
  const waxing = phase < 0.5
  const k = Math.cos(lit * Math.PI) // 1 new → -1 full
  const r = 22
  const rx = Math.abs(k) * r
  const side = waxing ? 1 : -1
  // Lit half and the terminator ellipse.
  const half = `M0 ${-r}A${r} ${r} 0 0 ${side > 0 ? 1 : 0} 0 ${r}`
  const term = `A${n(rx)} ${r} 0 0 ${(k > 0) === (side > 0) ? 0 : 1} 0 ${-r}Z`
  return `<mask id="moonLit"><path d="${half}${term}" fill="#fff"/></mask>`
}

// ---------- The SVG ----------

export function lakeSvg(ms: number, place: Place): string {
  const s = sunTimes(ms, place)
  const phase = moonPhase(ms)
  const delay = -Math.round(localHour(ms, place.tz) * 3600)
  const d = (name: string) => `animation:${name} ${DAY}s linear ${delay}s infinite`
  const mirror = `transform="translate(0,${HORIZON * 2}) scale(1,-1)"`
  const css = [
    keyframes(s, phase),
    '@keyframes cloud{from{transform:translateX(-400px)}to{transform:translateX(2000px)}}',
    '@keyframes tw{0%,100%{opacity:.35}50%{opacity:1}}',
    '.tw0{animation:tw 5s ease-in-out infinite}.tw1{animation:tw 7s ease-in-out -2s infinite}.tw2{animation:tw 11s ease-in-out -5s infinite}',
    '@keyframes ripple{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(3px) scaleY(.985)}}',
    '.ripple{transform-box:fill-box;transform-origin:center top;animation:ripple 9s ease-in-out infinite}',
    '@keyframes shimmer{0%,100%{opacity:0}50%{opacity:.55}}',
    '@keyframes drift{from{transform:translateX(-60px)}to{transform:translateX(60px)}}',
    '@keyframes flock{from{transform:translate(-200px,0)}to{transform:translate(1900px,-60px)}}',
    '@keyframes flap{0%,100%{transform:scaleY(1)}50%{transform:scaleY(-.6)}}',
    '.wing{transform-box:fill-box;transform-origin:center bottom;animation:flap 1.4s ease-in-out infinite}',
    '@keyframes meteor{0%,94%{opacity:0;transform:translate(0,0)}95%{opacity:1}99%{opacity:0;transform:translate(-420px,180px)}100%{opacity:0}}',
    '@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}',
  ].join('')

  const r = rng(29)
  const shimmer = Array.from({ length: 34 }, (_, i) => {
    const y = HORIZON + 14 + Math.pow(r(), 1.4) * 330
    const x = 380 + r() * 840
    const w = 20 + (y - HORIZON) * 0.25 * r()
    return `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="1.4" rx=".7" style="animation:shimmer ${n(6 + r() * 8)}s ease-in-out ${n(-r() * 10)}s infinite"/>`
  }).join('')
  const glitter = Array.from({ length: 16 }, (_, i) => {
    const y = HORIZON + 8 + i * 18 + r() * 6
    const w = 8 + i * 4
    return `<rect x="${n(-w / 2 + (r() - 0.5) * (6 + i * 3))}" y="${n(y)}" width="${n(w)}" height="2" rx="1" style="animation:shimmer ${n(2 + r() * 3)}s ease-in-out ${n(-r() * 4)}s infinite"/>`
  }).join('')
  const moonGlints = Array.from({ length: 12 }, (_, i) => {
    const y = HORIZON + 10 + i * 22
    const w = 6 + i * 3
    return `<rect x="${n(-w / 2)}" y="${n(y)}" width="${n(w)}" height="1.6" rx=".8" style="animation:shimmer ${n(3 + r() * 3)}s ease-in-out ${n(-r() * 5)}s infinite"/>`
  }).join('')
  const birds = Array.from({ length: 5 }, (_, i) => {
    const x = i * 26 - Math.abs(i - 2) * 6
    const y = Math.abs(i - 2) * 12
    return `<path class="wing" d="M${x - 9} ${y}Q${x - 4} ${y - 6} ${x} ${y}Q${x + 4} ${y - 6} ${x + 9} ${y}" fill="none" stroke-width="1.8" stroke-linecap="round"/>`
  }).join('')
  const mist = [380, 640, 900, 1150]
    .map((x, i) => `<ellipse cx="${x}" cy="${HORIZON + 14 + i * 6}" rx="260" ry="26" style="animation:drift ${40 + i * 9}s ease-in-out ${-i * 7}s infinite alternate"/>`)
    .join('')

  const mountains = (withSnow: boolean) =>
    `<path d="${pathOf(FAR, HORIZON)}" style="${d('c-far')}"/>` +
    (withSnow && snowPath ? `<path d="${snowPath}" style="${d('c-snow')}"/>` : '') +
    `<path d="${pathOf(MID, HORIZON)}" style="${d('c-mid')}"/>` +
    `<path d="${pathOf(HILLS, HORIZON)}" style="${d('c-hills')}"/>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 1000" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d7cc9"/><stop offset=".62" stop-color="#a9d3f2"/></linearGradient>
<linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4a8a"/><stop offset=".38" stop-color="#c77d9d"/><stop offset=".64" stop-color="#f7b98a"/></linearGradient>
<linearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b2f6b"/><stop offset=".38" stop-color="#b0507a"/><stop offset=".64" stop-color="#f39a4d"/></linearGradient>
<linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070b1f"/><stop offset=".64" stop-color="#1b2a4d"/></linearGradient>
<linearGradient id="waterDay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0d8"/><stop offset="1" stop-color="#24486b"/></linearGradient>
<linearGradient id="waterDawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d79ba9"/><stop offset="1" stop-color="#2c2c4f"/></linearGradient>
<linearGradient id="waterDusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e08a5c"/><stop offset="1" stop-color="#2a1b33"/></linearGradient>
<linearGradient id="waterNight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a2a4c"/><stop offset="1" stop-color="#050914"/></linearGradient>
<linearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="reflectFade"><rect x="0" y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#fadeDown)"/></mask>
<radialGradient id="sunGlow"><stop offset="0" stop-color="#fff3d1" stop-opacity=".9"/><stop offset=".25" stop-color="#ffd59a" stop-opacity=".45"/><stop offset="1" stop-color="#ffb26b" stop-opacity="0"/></radialGradient>
<radialGradient id="moonGlow"><stop offset="0" stop-color="#dfe8ff" stop-opacity=".5"/><stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/></radialGradient>
<filter id="soft" x="-20%" y="-80%" width="140%" height="260%"><feGaussianBlur stdDeviation="20"/></filter>
<filter id="cloudBlur" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
${moonMask(phase)}
</defs>
<style>${css}</style>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDay)"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDusk)" style="${d('skyDusk')}"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyDawn)" style="${d('skyDawn')}"/>
<rect width="${W}" height="${HORIZON + 2}" fill="url(#skyNight)" style="${d('skyNight')}"/>
<g fill="#eef3ff" style="${d('nightOnly')}">${STARS}<g style="animation:meteor 97s linear -31s infinite"><rect x="1180" y="120" width="140" height="1.6" rx=".8" transform="rotate(-23 1250 120)" fill="#fff"/></g></g>
<g style="${d('moonPath')}"><g style="${d('nightOnly')}"><circle r="70" fill="url(#moonGlow)"/><circle r="22" fill="#3a4466" opacity=".55"/><circle r="22" fill="#f2f0e6" mask="url(#moonLit)"/></g></g>
<g style="${d('sunPath')}"><circle r="130" fill="url(#sunGlow)"/><circle r="30" style="${d('c-sun')}"/></g>
<g filter="url(#cloudBlur)" opacity=".85" style="${d('c-cloud')}">${CLOUDS}</g>
${mountains(true)}
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterDay)"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterDusk)" style="${d('skyDusk')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterDawn)" style="${d('skyDawn')}"/>
<rect y="${HORIZON}" width="${W}" height="${1000 - HORIZON}" fill="url(#waterNight)" style="${d('skyNight')}"/>
<g mask="url(#reflectFade)"><g class="ripple"><g ${mirror}>${mountains(false)}</g></g></g>
<g fill="#ffffff" opacity=".5">${shimmer}</g>
<g style="${d('glitterPath')}"><g fill="#fff4d6" style="${d('glitter')}">${glitter}</g></g>
<g style="${d('moonGlint')}"><g fill="#e8eeff" style="${d('nightOnly')}">${moonGlints}</g></g>
<g fill="#ffffff" filter="url(#soft)" style="${d('mist')}">${mist}</g>
<g style="${d('dayOnly')}"><g transform="translate(0,230)"><g stroke="#2a3340" style="animation:flock 74s linear -20s infinite">${birds}</g></g></g>
<path d="${SHORE_L}" style="${d('c-shore')}"/>
<path d="${SHORE_R}" style="${d('c-shore')}"/>
<path d="${PINES}" style="${d('c-shore')}"/>
</svg>`
}
