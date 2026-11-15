// The daylight machinery shared by the scenes that follow the time of day:
// local time in a time zone, sunrise and sunset for a date and place, the
// moon's phase, and CSS keyframes laid over a 24-hour cycle.

import { n } from './stage'

// Seconds in the day cycle of the scenes' CSS animations.
export const DAY = 86400

export const rad = (d: number) => (d * Math.PI) / 180

export type Place = { lat: number; lon: number; tz: string }

export const DEFAULT_PLACE: Place = { lat: 48.857, lon: 2.352, tz: 'Europe/Paris' }

// ---------- Sun, moon and local time ----------

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

// ---------- Keyframes over the day ----------

// One color per moment of the day.
export type Four = [night: string, dawn: string, day: string, dusk: string]

const pct = (h: number) => `${n((h / 24) * 100)}%`

// Keyframes over the day from (hour, declarations) points, sorted and
// wrapped around midnight, stepping once a minute between points.
export function dayKf(points: [number, string][]): string {
  const norm = points.map(([h, v]) => [((h % 24) + 24) % 24, v] as [number, string]).sort((a, b) => a[0] - b[0])
  const first = norm[0]!
  const last = norm[norm.length - 1]!
  const edge = first[0] < 24 - last[0] ? first[1] : last[1]
  const all: [number, string][] = [[0, edge], ...norm, [24, edge]]
  return all
    .map(([h, v], i) => {
      const next = all[i + 1]
      const steps = next ? Math.max(1, Math.round((next[0] - h) * 60)) : 1
      return `${i === all.length - 1 ? '100%' : pct(h)}{${v};animation-timing-function:steps(${steps},end)}`
    })
    .join('')
}

export function phaseColors(prop: string, c: Four, s: SunTimes): string {
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

// The lit part of the moon for a phase: a mask that hides the dark part.
export function moonMask(phase: number): string {
  const lit = 1 - Math.abs(1 - phase * 2)
  const waxing = phase < 0.5
  const k = Math.cos(lit * Math.PI)
  const r = 22
  const rx = Math.abs(k) * r
  const side = waxing ? 1 : -1
  const half = `M0 ${-r}A${r} ${r} 0 0 ${side > 0 ? 1 : 0} 0 ${r}`
  const term = `A${n(rx)} ${r} 0 0 ${(k > 0) === (side > 0) ? 0 : 1} 0 ${-r}Z`
  return `<mask id="moonLit"><path d="${half}${term}" fill="#fff"/></mask>`
}

