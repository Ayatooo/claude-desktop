// The creatures of the ocean scene, as vector shapes.
// Each one faces right; `ascii.ts` renders them as characters.

import { clamp, fusiform, hash, inEllipse, inPoly, inStroke, rotate } from './ascii'
import type { Model, Stamp } from './ascii'

const TAU = Math.PI * 2

type P = readonly [number, number]
const shift = (pts: readonly P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy] as const)

// ---------- Shark ----------

export function shark(): Model {
  const y0 = 15
  const x0 = 9
  const x1 = 62
  const frames = 4
  const off = (x: number, f: number) => (x > 30 ? 0 : 1.1 * Math.sin((f / frames) * TAU + x * 0.11) * Math.pow(clamp((30 - x) / 21), 1.6))
  const dorsal = shift([[29, -5.6], [33.5, -15.5], [36.3, -14.7], [37.4, -9], [41.5, -5.6]], 0, y0)
  const pect = shift([[43, 3.4], [37, 12.6], [39.8, 12.9], [48, 3.8]], 0, y0)
  const pelvic = shift([[22, 2.4], [19.6, 5.6], [21.6, 5.7], [25, 2.1]], 0, y0)
  const dorsal2 = shift([[14.5, -1.3], [13, -4.3], [14.9, -4.1], [17.6, -1.1]], 0, y0)
  const anal = shift([[15, 1.1], [13.4, 3.9], [15.3, 3.7], [18, 0.9]], 0, y0)
  const upper = shift([[12.5, -1.6], [1.2, -13.6], [4.6, -13.2], [9.6, -2.6], [12, 1]], 0, y0)
  const lower = shift([[10, -0.4], [2.6, 7.9], [5.6, 8], [12.5, 1.2]], 0, y0)
  return {
    w: 64,
    h: 30,
    frames,
    period: 1.6,
    regions: [
      { colors: ['#4e6a80', '#7f9bb0', '#b4c9d8'], ramp: '.:-=+*#%' },
      { colors: ['#9fb3c0', '#d4e1e8', '#f1f7fa'], ramp: '.:-=+*', lift: 0.25 },
      { colors: ['#3f586b', '#62809a', '#8fa9bd'], ramp: '.:-=+*#' },
    ],
    light(x, y, f) {
      if (x < x0 || x > x1) return undefined
      const yy = y - off(x, f)
      const t = (x - x0) / (x1 - x0)
      const ht = 6.4 * fusiform(t, 0.75, 0.32) + 1.2 * (1 - t)
      const hb = 5.2 * fusiform(t, 0.8, 0.42) + 1 * (1 - t)
      if (yy < y0 - ht || yy > y0 + hb) return undefined
      // v: -1 on the back, +1 under the belly. Light that follows the volume.
      const v = yy < y0 ? (yy - y0) / ht : (yy - y0) / hb
      return clamp(0.86 - 0.5 * ((v + 1) / 2) + (v < -0.72 ? 0.1 : 0) - (v > 0.1 && v < 0.35 ? 0.12 : 0))
    },
    at(x, y, f) {
      const yy = y - off(x, f)
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0)
        const ht = 6.4 * fusiform(t, 0.75, 0.32) + 1.2 * (1 - t)
        const hb = 5.2 * fusiform(t, 0.8, 0.42) + 1 * (1 - t)
        if (yy >= y0 - ht && yy <= y0 + hb) return yy > y0 + 0.9 + Math.max(0, t - 0.85) * 4 ? 1 : 0
      }
      if (inPoly(x, yy, dorsal) || inPoly(x, yy, pect) || inPoly(x, yy, pelvic) || inPoly(x, yy, dorsal2) || inPoly(x, yy, anal)) return 2
      // Tail: pivots and shortens as it beats.
      const a = 0.2 * Math.sin((f / frames) * TAU)
      const k = 0.85 + 0.15 * Math.cos((f / frames) * TAU)
      const [tx, ty] = rotate(10 + (x - 10) / k, yy, 10, y0, -a)
      if (inPoly(tx, ty, upper) || inPoly(tx, ty, lower)) return 2
      return -1
    },
    stamps: () => [
      { x: 55, y: y0 - 1.4, text: '@', color: '#06121d' },
      { x: 44, y: y0 - 1.6, text: ')))', color: '#3c5568' },
      { x: 44.5, y: y0 + 0.4, text: ')))', color: '#7d93a2' },
      { x: 55.5, y: y0 + 2.6, text: '`-', color: '#6f8798' },
    ],
  }
}

// Beating fish tail: pivots around (px, py) and shortens.
function tailBeat(x: number, y: number, f: number, frames: number, px: number, py: number, amp = 0.28): [number, number] {
  const ph = (f / frames) * TAU
  const k = 0.8 + 0.2 * Math.cos(ph)
  return rotate(px + (x - px) / k, y, px, py, -amp * Math.sin(ph))
}

// ---------- Blue tang ----------

export function tang(): Model {
  const y0 = 12
  const x0 = 6
  const x1 = 28
  const frames = 4
  const tail: P[] = shift([[7, -1.2], [0.5, -7], [2.2, -1], [2.2, 1], [0.5, 7], [7, 1.2]], 0, y0)
  const half = (t: number) => 8.6 * fusiform(t, 0.85, 0.5) + 1.3 * (1 - t)
  return {
    w: 30,
    h: 26,
    frames,
    period: 0.9,
    regions: [
      { colors: ['#1d4fb8', '#3b7cf0', '#86b4ff'], ramp: '.:-=+*#%' },
      { colors: ['#0a1430', '#15244d', '#26396e'], ramp: ':=+*#' },
      { colors: ['#b58a14', '#f2c230', '#ffe27a'], ramp: ':-=+*#' },
      { colors: ['#173a86', '#2c5fc4', '#5a8ef0'], ramp: '.:-=+*' },
    ],
    light(x, y) {
      if (x < x0 || x > x1) return undefined
      const h = half((x - x0) / (x1 - x0))
      const v = (y - y0) / h
      return clamp(0.9 - 0.45 * ((v + 1) / 2))
    },
    at(x, y, f) {
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0)
        const h = half(t)
        const d = Math.abs(y - y0)
        if (d <= h) {
          // The black palette-shaped marking.
          const inRing = inEllipse(x, y, 15.5, y0 - 1.2, 9.5, 5.6) && !inEllipse(x, y, 14.2, y0 + 0.2, 7.6, 3.4)
          if (inRing && x > 7.5 && x < 23 && y < y0 + 2.8) return 1
          return 0
        }
        // Dorsal and anal fins, as a band along the body.
        if (t > 0.1 && t < 0.82 && d <= h + 2.1 * Math.sin(((t - 0.1) / 0.72) * Math.PI)) return 3
      }
      const [tx, ty] = tailBeat(x, y, f, frames, 7, y0)
      if (inPoly(tx, ty, tail)) return 2
      return -1
    },
    stamps: () => [
      { x: 24.4, y: y0 - 1.2, text: '@', color: '#050a18' },
      { x: 27.4, y: y0 + 0.8, text: '>', color: '#86b4ff' },
    ],
  }
}

// ---------- Clownfish ----------

export function clown(): Model {
  const y0 = 9
  const x0 = 5
  const x1 = 27
  const frames = 4
  const half = (t: number) => 5 * fusiform(t, 0.9, 0.4) + 1.5 * (1 - t)
  // White bands, slightly curved, edged in black.
  const band = (x: number, y: number): number => {
    const c = (y - y0) * (y - y0) * 0.035
    for (const [a, b] of [[20.5, 23.2], [13.2, 15.8], [6.2, 7.6]] as const) {
      const xa = a - c
      const xb = b + c * 0.4
      if (x >= xa - 0.55 && x <= xb + 0.55) return x >= xa && x <= xb ? 1 : 2
    }
    return 0
  }
  return {
    w: 30,
    h: 18,
    frames,
    period: 0.7,
    regions: [
      { colors: ['#b8461a', '#f07a2a', '#ffab5e'], ramp: '.:-=+*#%' },
      { colors: ['#b8c1c9', '#eef2f5', '#ffffff'], ramp: ':-=+*' },
      { colors: ['#2a2d33', '#3c4048', '#50555e'], ramp: '|', noEdge: true },
      { colors: ['#a94416', '#e06a22', '#ff9a4a'], ramp: '.:-=+' },
    ],
    light(x, y) {
      if (x < x0 || x > x1) return undefined
      const v = (y - y0) / half((x - x0) / (x1 - x0))
      return clamp(0.92 - 0.45 * ((v + 1) / 2))
    },
    at(x, y, f) {
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0)
        const h = half(t)
        const d = Math.abs(y - y0)
        if (d <= h) {
          const b = band(x, y)
          return b === 1 ? 1 : b === 2 ? 2 : 0
        }
        if (t > 0.2 && t < 0.68 && y < y0 && d <= h + 1.7 * Math.sin(((t - 0.2) / 0.48) * Math.PI)) return 3
        if (t > 0.12 && t < 0.4 && y > y0 && d <= h + 1.6 * Math.sin(((t - 0.12) / 0.28) * Math.PI)) return 3
      }
      const [tx, ty] = tailBeat(x, y, f, frames, 5.6, y0, 0.3)
      if (inEllipse(tx, ty, 3, y0, 3.2, 4.6) && tx < 5.8) return inEllipse(tx, ty, 3.2, y0, 2.5, 3.9) ? 3 : 2
      return -1
    },
    stamps: () => [{ x: 24.6, y: y0 - 1.6, text: '@', color: '#14161a' }],
  }
}

// ---------- Angelfish ----------

export function angel(): Model {
  const cx = 15
  const cy = 18
  const frames = 4
  const dorsal: P[] = [[17, cy - 7.5], [11, cy - 16.5], [3.5, cy - 17.5], [8.5, cy - 6.5]]
  const anal: P[] = [[17, cy + 7.5], [11, cy + 16.5], [3.5, cy + 17.5], [8.5, cy + 6.5]]
  const tail: P[] = [[8, cy - 1.5], [2, cy - 4.5], [1.2, cy], [2, cy + 4.5], [8, cy + 1.5]]
  return {
    w: 27,
    h: 37,
    frames,
    period: 1.4,
    regions: [
      { colors: ['#9aa6ae', '#d3dbe0', '#f6f9fb'], ramp: ':-=+*#%', edge: '#f6f9fb' },
      { colors: ['#4a4438', '#6b6250', '#8c8068'], ramp: '#', noEdge: true },
      {
        colors: ['#b8963e', '#e6c86a', '#fbe6a0'],
        ramp: "':",
        sparse: 0.75,
        edge: '#f2d77e',
        pattern: (x, y) => (Math.abs(((x * 0.7 + y * 0.45) % 2.4) - 1.2) < 0.35 ? { ch: '/', tone: 2 } : undefined),
      },
    ],
    at(x, y, f) {
      if (inEllipse(x, y, cx, cy, 8.6, 8.4) || inPoly(x, y, [[cx + 6, cy - 4], [cx + 10.5, cy + 0.3], [cx + 6, cy + 4]])) {
        const s = x - (y - cy) * 0.18
        if ((s > 9.2 && s < 10.6) || (s > 14.4 && s < 16) || (s > 19.4 && s < 20.4)) return 1
        return 0
      }
      const sway = 0
      const [dx, dy] = rotate(x, y, 14, cy - 6, sway)
      if (inPoly(dx, dy, dorsal)) return 2
      const [ax, ay] = rotate(x, y, 14, cy + 6, -sway)
      if (inPoly(ax, ay, anal)) return 2
      const [tx, ty] = tailBeat(x, y, f, frames, 8, cy, 0.25)
      if (inPoly(tx, ty, tail)) return 2
      return -1
    },
    stamps: () => [{ x: 21.5, y: cy - 2.2, text: '@', color: '#14161a' }],
  }
}

// ---------- Turtle ----------

export function turtle(): Model {
  const frames = 4
  const scutes: P[] = [[14, 9], [21.5, 7.6], [29, 8.4], [10, 13.6], [17.5, 12.6], [25, 12.4], [32.5, 13.4]]
  const front: P[] = [[32, 17.5], [45, 23.5], [48, 26.5], [41, 25.6], [30, 20.5]]
  const rear: P[] = [[13, 18], [5, 21.5], [3.4, 24], [10, 23], [15, 19.6]]
  return {
    w: 52,
    h: 30,
    frames,
    period: 2.4,
    regions: [
      { colors: ['#5b4321', '#8f6c35', '#cfa35a'], ramp: '.:-=+*#%' },
      { colors: ['#2e2210', '#3d2d16', '#4d391c'], ramp: ':' },
      { colors: ['#4a6541', '#759566', '#a8c591'], ramp: '.:-=+*' },
      { colors: ['#a3955f', '#cfc08a', '#ece0b0'], ramp: ':-=+' },
    ],
    light(x, y) {
      if (!inEllipse(x, y, 22, 15.5, 15.5, 10.5) || y > 17.4) return undefined
      // Each shell scute is domed: light at the center.
      let d1 = Infinity
      for (const [sx, sy] of scutes) d1 = Math.min(d1, Math.hypot(x - sx, (y - sy) * 1.25))
      return clamp(0.95 - d1 * 0.11 - (y - 6) * 0.012)
    },
    at(x, y, f) {
      if (inEllipse(x, y, 22, 15.5, 15.5, 10.5) && y <= 17.4) {
        let d1 = Infinity
        let d2 = Infinity
        for (const [sx, sy] of scutes) {
          const d = Math.hypot(x - sx, (y - sy) * 1.25)
          if (d < d1) {
            d2 = d1
            d1 = d
          } else if (d < d2) d2 = d
        }
        return d2 - d1 < 0.75 ? 1 : 0
      }
      if (y > 17.4 && y < 19.4 && x > 9 && x < 36) return 3
      if (inEllipse(x, y, 43.5, 15.8, 5.2, 3.5) || inStroke(x, y, [[35, 16.8, 2.6], [41, 16.2, 2.4]])) return 2
      const ph = (f / frames) * TAU
      const [fx, fy] = rotate(x, y, 32, 17.5, 0.55 * Math.sin(ph))
      if (inPoly(fx, fy, front)) return 2
      const [rx, ry] = rotate(x, y, 13, 18.5, -0.3 * Math.sin(ph))
      if (inPoly(rx, ry, rear)) return 2
      if (inPoly(x, y, [[9, 17], [4.5, 18.6], [9, 19]])) return 2
      return -1
    },
    stamps: () => [
      { x: 45.5, y: 14.6, text: '@', color: '#10160c' },
      { x: 47.4, y: 16.6, text: '-', color: '#2e3f28' },
    ],
  }
}

// ---------- Jellyfish (moon jelly) ----------

export function jelly(opts: { hue: 'violet' | 'rose'; size?: number }): () => Model {
  const k = opts.size ?? 1
  const pal =
    opts.hue === 'violet'
      ? { bell: ['#7a5fae', '#bfa0f0', '#f1e4ff'], gon: ['#c45a9c', '#ee86c4', '#ffc4e6'], arm: ['#8c6cc6', '#c6a6f4', '#ead9ff'] }
      : { bell: ['#b0507f', '#f28fbe', '#ffd6ea'], gon: ['#d9739a', '#ffa3c4', '#ffe0ec'], arm: ['#b8628f', '#f3a2c9', '#ffe1ef'] }
  return () => {
    const frames = 3
    const cx = 15 * k
    const top = 3 * k
    return {
      w: 30 * k,
      h: 44 * k,
      frames,
      period: 2.4,
      regions: [
        { colors: pal.bell as [string, string, string], ramp: ".:-=", sparse: 0.8, edge: pal.bell[2] },
        { colors: pal.gon as [string, string, string], ramp: ':-=+*', noEdge: true },
        { colors: pal.arm as [string, string, string], ramp: '~', noEdge: true },
        { colors: pal.bell as [string, string, string], ramp: '|', edge: pal.bell[1] },
      ],
      light: () => 0.7,
      at(x, y, f) {
        const ph = (f / frames) * TAU
        const sx = 1
        const sy = 1
        const by = top + 9.5 * k * sy
        // Bell: half-ellipse, scalloped edge.
        if (y <= by + 0.4 * k && inEllipse(x, y, cx, by, 11 * k * sx, 9.5 * k * sy)) {
          // The four horseshoe-shaped gonads.
          for (const [gx, gy] of [[-4.2, -2.4], [0, -4.8], [4.2, -2.4], [0, -0.6]] as const) {
            const ex = cx + gx * k * sx
            const ey = by + gy * k * sy
            if (inEllipse(x, y, ex, ey, 2.4 * k, 1.5 * k) && !inEllipse(x, y, ex, ey, 1.2 * k, 0.7 * k)) return 1
          }
          return 0
        }
        // Oral arms, wavy and frilled.
        for (const ax of [-1.3, 1.3]) {
          const pts: [number, number, number][] = []
          for (let i = 0; i <= 8; i++) {
            const s = i / 8
            const yy = by + 0.5 * k + s * 19 * k
            pts.push([cx + ax * k * (1 + s * 1.2) + Math.sin(s * 5 + ph + ax * 2) * 2.2 * k, yy, (1.1 - s * 0.8) * k])
          }
          if (inStroke(x, y, pts)) return 2
        }
        // Thin tentacles from the rim.
        for (let i = 0; i < 6; i++) {
          const ox = cx + (i - 2.5) * 3.9 * k * sx
          const pts: [number, number, number][] = []
          for (let j = 0; j <= 12; j++) {
            const s = j / 12
            pts.push([ox + Math.sin(s * 5 + ph + i * 1.7) * 2.8 * k * s, by + 0.6 * k + s * (24 + (i % 3) * 6) * k, 0.3])
          }
          if (inStroke(x, y, pts)) return 3
        }
        return -1
      },
    }
  }
}

// ---------- Manta ray (seen from above) ----------

export function manta(): Model {
  const frames = 1
  const cy = 26
  return {
    w: 72,
    h: 52,
    frames,
    period: 2.8,
    regions: [
      { colors: ['#34495a', '#56708a', '#86a1b8'], ramp: '.:-=+*#%' },
      { colors: ['#8aa0b0', '#bccbd6', '#e6eef4'], ramp: ':-=+*' },
      { colors: ['#2a3b4a', '#43596d', '#647c92'], ramp: '.:-=+*#' },
    ],
    light(x, y) {
      const flap = 1
      const d = Math.abs(y - cy) / (24 * flap)
      return clamp(0.85 - d * 0.55 - Math.abs(x - 42) * 0.006)
    },
    at(x, y, f) {
      const flap = 1
      const dy = Math.abs(y - cy)
      // Wingspan: rounded leading edge, hollowed trailing edge.
      let span = 0
      if (x >= 30 && x <= 58) span = 23 * Math.pow(1 - Math.pow((x - 30) / 28, 1.7), 0.6)
      else if (x >= 15 && x < 30) span = 2.4 + 20.6 * Math.pow((x - 15) / 15, 2.2)
      span *= flap
      // Wing tips curved backwards.
      if (dy <= span) {
        if (inEllipse(x, dy, 41, 8.5 * flap, 6.5, 3.6 * flap)) return 1
        if (inEllipse(x, y, 47, cy, 11, 6.2)) return 2
        return 0
      }
      // Cephalic horns.
      for (const s of [-1, 1]) {
        if (inStroke(x, y, [[56, cy + s * 4.5, 1.3], [61, cy + s * 4.8, 1.1], [63.5, cy + s * 3.4, 0.8]])) return 2
      }
      // Thin tail.
      if (inStroke(x, y, [[16, cy, 0.9], [6, cy + Math.sin((f / frames) * TAU) * 0.8, 0.45], [-2, cy, 0.3]])) return 2
      return -1
    },
    stamps: () => [
      { x: 55.5, y: cy - 3.8, text: '@', color: '#0d1620' },
      { x: 55.5, y: cy + 2.2, text: '@', color: '#0d1620' },
    ],
  }
}

// ---------- Humpback whale (side view) ----------

export function whale(): Model {
  const y0 = 18
  const x0 = 14
  const x1 = 104
  const frames = 3
  const off = (x: number, f: number) => 3 * Math.sin((f / frames) * TAU) * Math.pow(clamp((60 - x) / 60), 2)
  const ht = (t: number) => 9.5 * fusiform(t, 0.7, 0.22) + 1.2 * (1 - t)
  const hb = (t: number) => 8.5 * fusiform(t, 0.75, 0.3) + 1 * (1 - t)
  const fin: P[] = [[80, y0 + 4], [62, y0 + 15], [52, y0 + 20], [55, y0 + 21], [66, y0 + 17], [84, y0 + 6.5]]
  const fluke: P[] = [[15, y0 - 1.4], [3, y0 - 5], [0, y0 - 4.2], [4, y0], [0, y0 + 4.2], [3, y0 + 5], [15, y0 + 1.4]]
  return {
    w: 108,
    h: 40,
    frames,
    period: 4.5,
    regions: [
      { colors: ['#2c3e50', '#4b6379', '#7c95aa'], ramp: '.:-=+*#' },
      { colors: ['#6b8193', '#9fb2c0', '#cfdce5'], ramp: ':-=', lift: 0.1 },
      { colors: ['#263646', '#3f5569', '#62798e'], ramp: '.:-=+*' },
    ],
    light(x, y, f) {
      if (x < x0 || x > x1) return undefined
      const yy = y - off(x, f)
      const t = (x - x0) / (x1 - x0)
      const v = yy < y0 ? (yy - y0) / ht(t) : (yy - y0) / hb(t)
      return clamp(0.84 - 0.5 * ((v + 1) / 2))
    },
    at(x, y, f) {
      const yy = y - off(x, f)
      if (x >= x0 && x <= x1) {
        const t = (x - x0) / (x1 - x0)
        if (yy >= y0 - ht(t) && yy <= y0 + hb(t)) {
          // Ventral grooves: light lines under the throat.
          if (t > 0.6 && yy > y0 + 2.4) return Math.floor(yy / 1.9) % 2 === 0 ? 1 : 2
          return 0
        }
        if (inPoly(x, yy, [[38, y0 - ht((38 - x0) / (x1 - x0)) + 0.5], [42, y0 - 11.5], [45, y0 - ht((45 - x0) / (x1 - x0)) + 0.5]])) return 2
      }
      if (inPoly(x, yy, fin)) return 2
      if (inPoly(x, yy, fluke)) return 2
      return -1
    },
    stamps: () => [
      { x: 89, y: y0 + 2.2, text: 'o', color: '#0e1822' },
      { x: 97, y: y0 - 6.5, text: 'o  o', color: '#8ea6b9' },
      { x: 93, y: y0 - 8.2, text: 'o', color: '#8ea6b9' },
    ],
  }
}

// ---------- Octopus ----------

export function octopus(): Model {
  return {
    w: 44,
    h: 30,
    frames: 3,
    period: 2.4,
    regions: [
      { colors: ['#8e3a26', '#cf5d40', '#f28c6c'], ramp: '.:-=+*#%', pattern: (x, y) => (hash(x * 1.7, y * 1.3) < 0.12 ? { ch: 'o', tone: 0 } : undefined) },
      { colors: ['#8e3a26', '#c25035', '#ea7a5a'], ramp: '.:-=+*#' },
      { colors: ['#e8b9a8', '#f5d6ca', '#fff0ea'], ramp: 'o' },
    ],
    at(x, y, f) {
      // Mantle.
      if (inEllipse(x, y, 22, 9, 7.8, 8.6)) return 0
      if (inEllipse(x, y, 16.2, 14.5, 3, 2.6) || inEllipse(x, y, 27.8, 14.5, 3, 2.6)) return 0
      const ph = (f / 3) * TAU
      for (let a = 0; a < 8; a++) {
        const side = a < 4 ? -1 : 1
        const rank = a < 4 ? a : a - 4
        const pts: [number, number, number][] = []
        for (let i = 0; i <= 10; i++) {
          const s = i / 10
          const reach = 6 + rank * 3.5
          const curl = s > 0.7 ? (s - 0.7) * 10 : 0
          const px = 22 + side * (2 + s * reach + Math.sin(s * 4 + ph + a) * 1.2) - side * curl * 0.8
          const py = 15 + s * (11 - rank * 1.2) - curl * 1.6 + Math.cos(s * 3 + ph + a) * 0.8
          pts.push([px, py, 1.9 * (1 - s) + 0.35])
        }
        if (inStroke(x, y, pts)) {
          // Light suckers on the underside of the arms.
          return hash(x * 2, y * 1.1) < 0.18 && y > 17 ? 2 : 1
        }
      }
      return -1
    },
    stamps: () => [
      { x: 16, y: 13.8, text: '@', color: '#1a0d08' },
      { x: 28, y: 13.8, text: '@', color: '#1a0d08' },
    ],
  }
}

// ---------- Crab ----------

export function crab(): Model {
  const frames = 2
  return {
    w: 36,
    h: 20,
    frames,
    period: 0.7,
    regions: [
      { colors: ['#9c3b1f', '#d65a32', '#ff8a5c'], ramp: '.:-=+*#%' },
      { colors: ['#86311a', '#bf4d29', '#f07a4c'], ramp: '.:-=+*' },
    ],
    at(x, y, f) {
      if (inEllipse(x, y, 18, 10.5, 9, 4.8) && y < 13.5) return 0
      // Stalked eyes.
      if (inStroke(x, y, [[15.5, 7, 0.45], [14.5, 3.6, 0.45]]) || inStroke(x, y, [[20.5, 7, 0.45], [21.5, 3.6, 0.45]])) return 1
      const open = f === 0 ? 1 : 0.35
      for (const s of [-1, 1]) {
        const bx = 18 + s * 8.5
        if (inStroke(x, y, [[bx, 10, 1.2], [18 + s * 12, 6.8, 1.1]])) return 1
        // Claw: two jaws that open.
        const px = 18 + s * 14
        if (inEllipse(x, y, px, 5, 2.8, 1.9) && !(Math.abs(x - (px + s * 1.4)) < 1.6 && Math.abs(y - 5) < 0.45 * open + 0.1)) return 0
        for (let l = 0; l < 3; l++) {
          const lift = (l + f) % 2 === 0 ? 0 : 1
          const lx = 18 + s * (5 + l * 2)
          if (inStroke(x, y, [[lx, 12.5, 0.55], [lx + s * 3.5, 15.5 - lift, 0.5], [lx + s * 4.5, 19 - lift, 0.4]])) return 1
        }
      }
      return -1
    },
    stamps: () => [{ x: 14, y: 2.6, text: 'o', color: '#fff0e6' }, { x: 21, y: 2.6, text: 'o', color: '#fff0e6' }],
  }
}

// ---------- Seahorse ----------

export function seahorse(): Model {
  const frames = 2
  const spine: [number, number, number][] = [
    [9, 5, 2.7],
    [8.4, 9, 2.2],
    [9.6, 13, 3.2],
    [10.6, 18, 3.8],
    [9.6, 23, 3],
    [7.6, 28, 2.2],
    [6.8, 32, 1.6],
    [8.4, 35.4, 1.2],
    [10.8, 35.8, 0.95],
    [11.8, 33.4, 0.75],
    [10.2, 32, 0.55],
  ]
  return {
    w: 20,
    h: 40,
    frames,
    period: 0.5,
    regions: [
      {
        colors: ['#a86f10', '#e8a92e', '#ffd779'],
        ramp: '.:-=+*#',
        pattern: (_x, y) => (Math.floor(y / 1.917) % 2 === 0 ? { tone: 2 } : undefined),
      },
      { colors: ['#c98a1e', '#f6c45a', '#ffe7a8'], ramp: ":'-", sparse: 0.8 },
    ],
    at(x, y, f) {
      if (inStroke(x, y, spine)) return 0
      if (inStroke(x, y, [[10.5, 5.6, 1.1], [16.5, 6.6, 0.85]])) return 0
      if (inStroke(x, y, [[8.6, 3, 0.9], [8, 0.6, 0.6]])) return 0
      const fx = f === 0 ? 2.2 : 1.5
      if (inEllipse(x, y, 7 - fx * 0.6, 19, fx, 3) && x < 7.6) return 1
      return -1
    },
    stamps: () => [{ x: 10.2, y: 4.2, text: '@', color: '#2a1a04' }],
  }
}

// ---------- Starfish ----------

export function starfish(): Model {
  return {
    w: 20,
    h: 16,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: ['#b4472e', '#e66b4a', '#ff9b7a'],
        ramp: '.:-=+*#',
        pattern: (x, y) => (hash(x * 3, y * 2) < 0.1 ? { ch: 'o', tone: 2 } : undefined),
      },
    ],
    light(x, y) {
      return clamp(1 - Math.hypot(x - 10, y - 8) * 0.09)
    },
    at(x, y) {
      const dx = x - 10
      const dy = (y - 8.2) * 1.05
      const r = Math.hypot(dx, dy)
      const a = Math.atan2(dy, dx) + Math.PI / 2
      const R = 2.6 + 5.6 * Math.pow(Math.abs(Math.cos((a * 5) / 2)), 1.1)
      return r <= R ? 0 : -1
    },
  }
}

// ---------- Small silver fish (schools) ----------

export function minnow(): Model {
  const frames = 2
  return {
    w: 12,
    h: 5,
    frames,
    period: 0.5,
    regions: [{ colors: ['#8fb3c6', '#c7e2ef', '#f4fbff'], ramp: ':=+*' }],
    at(x, y, f) {
      if (x > 3 && x < 11.5 && Math.abs(y - 2.5) <= 2 * fusiform((x - 3) / 8.5, 0.8, 0.5) + 0.3) return 0
      const [tx, ty] = tailBeat(x, y, f, frames, 3.4, 2.5, 0.35)
      if (inPoly(tx, ty, [[3.6, 2], [0.4, 0.4], [1.4, 2.5], [0.4, 4.6], [3.6, 3]])) return 0
      return -1
    },
  }
}

// ---------- Kelp ----------

export function kelp(height: number, seed: number): () => Model {
  return () => {
    const frames = 1
    const base = 7
    const stalk = (y: number, f: number) => {
      const up = (height - y) / height
      return base + Math.sin(y * 0.18 - (f / frames) * TAU + seed) * 2.6 * up
    }
    return {
      w: 15,
      h: height,
      frames,
      period: 4.4,
      regions: [
        { colors: ['#2f8f66', '#2f8f66', '#2f8f66'], ramp: '|', edge: '#2f8f66' },
        { colors: ['#3fae7a', '#3fae7a', '#62c994'], ramp: ':-=+*', edge: '#62c994', pattern: (x, y) => (hash(x, y * 7) < 0.2 ? { ch: '~' } : undefined) },
      ],
      at(x, y, f) {
        const sx = stalk(y, f)
        if (Math.abs(x - sx) < 0.55) return 0
        // Fronds alternating on either side of the stalk.
        for (let i = 0; i < height / 6; i++) {
          const ly = 4 + i * 6 + (seed % 3)
          if (ly > height - 3) break
          const side = i % 2 === 0 ? 1 : -1
          const lx = stalk(ly, f) + side * 2.8
          const [rx, ry] = rotate(x, y, lx, ly, side * 0.5)
          if (inEllipse(rx, ry, lx, ly, 3.2, 1.3)) return 1
        }
        return -1
      },
    }
  }
}

// ---------- Reefs ----------

function rockAt(x: number, y: number, cx: number, cy: number, rx: number, ry: number, seed: number): boolean {
  const a = Math.atan2(y - cy, x - cx)
  const k = 1 + 0.12 * Math.sin(a * 3 + seed) + 0.07 * Math.sin(a * 7 + seed * 2)
  return inEllipse(x, y, cx, cy, rx * k, ry * k) && y <= cy + ry * 0.35
}

// Branching coral: branches that split.
function branches(x0: number, y0: number, len: number, ang: number, r: number, depth: number, seed: number, out: [number, number, number][][]) {
  const x1 = x0 + Math.cos(ang) * len
  const y1 = y0 - Math.sin(ang) * len
  out.push([[x0, y0, r], [x1, y1, r * 0.75]])
  if (depth === 0) return
  const sp = 0.35 + hash(seed, depth) * 0.25
  branches(x1, y1, len * 0.72, ang + sp, r * 0.75, depth - 1, seed * 3 + 1, out)
  branches(x1, y1, len * 0.72, ang - sp, r * 0.75, depth - 1, seed * 5 + 2, out)
}

export function reef(side: 'left' | 'right'): () => Model {
  return () => {
    const L = side === 'left'
    const w = 70
    const h = 36
    const fx = (x: number) => (L ? x : w - x)
    const coral1: [number, number, number][][] = []
    branches(fx(30), 25, 6, Math.PI / 2, 1.1, 3, 7, coral1)
    const coral2: [number, number, number][][] = []
    branches(fx(58), 27, 5, Math.PI / 2 + (L ? -0.2 : 0.2), 0.9, 3, 11, coral2)
    const fan: [number, number, number][][] = []
    for (let i = 0; i < 9; i++) {
      const a = Math.PI / 2 + (i - 4) * 0.17
      fan.push([[fx(12), 24, 0.55], [fx(12) + Math.cos(a) * 13, 24 - Math.sin(a) * 15, 0.3]])
    }
    return {
      w,
      h,
      frames: 1,
      period: 1,
      regions: [
        { colors: ['#2e4556', '#4d6b7f', '#7d9bad'], ramp: '.:-=+*#%', pattern: (x, y) => (hash(x * 2, y) < 0.08 ? { ch: 'o' } : undefined) },
        { colors: ['#3d7a52', '#5fae74', '#9ad9a6'], ramp: ':;=' },
        { colors: ['#b44a6a', '#ef7f9f', '#ffc0d2'], ramp: '.:-=+*' },
        { colors: ['#b8862c', '#e8b44c', '#ffe08a'], ramp: '.:-=+*#', pattern: (x, y) => ({ ch: Math.sin(x * 1.6 + Math.sin(y * 0.9) * 2) > 0.2 ? '~' : Math.sin(x * 1.6 + Math.sin(y * 0.9) * 2) < -0.2 ? '-' : ':' }) },
        { colors: ['#6b4fa8', '#9c7ee0', '#cdb8ff'], ramp: ':+' },
        { colors: ['#b8602a', '#ef8f4c', '#ffc08a'], ramp: '.:-=+*' },
        { colors: ['#1b2833', '#25384a', '#2f475d'], ramp: '#' },
      ],
      at(x, y) {
        const X = fx(x)
        // Rocks: bottom of the scene, moss on top.
        if (rockAt(X, y, 20, 34, 22, 10, 1) || rockAt(X, y, 48, 35, 20, 8, 4) || rockAt(X, y, 64, 36, 10, 5, 9)) {
          return y < 27.5 && hash(X, y * 3) < 0.55 ? 1 : 0
        }
        // Brain coral.
        if (inEllipse(X, y, 44, 26.5, 7, 5) && y < 27.2) return 3
        // Tube sponges, dark opening at the top.
        for (const [tx, th] of [[6, 13], [9, 9], [4, 7]] as const) {
          if (inStroke(X, y, [[tx, 26, 1.4], [tx, 26 - th, 1.6]])) return y < 26 - th + 0.9 ? 6 : 5
        }
        for (const seg of coral1) if (inStroke(x, y, seg)) return 2
        for (const seg of coral2) if (inStroke(x, y, seg)) return 5
        for (const seg of fan) if (inStroke(x, y, seg)) return 4
        return -1
      },
    }
  }
}

// ---------- Anemone (animated) ----------

export function anemone(): Model {
  const frames = 4
  return {
    w: 18,
    h: 16,
    frames,
    period: 3.2,
    regions: [
      { colors: ['#8a3f62', '#c45d8a', '#f28fb8'], ramp: '.:-=+*' },
      { colors: ['#3fa6a8', '#64d4d0', '#b0fff6'], ramp: '|', edge: '#8ff0e8' },
    ],
    at(x, y, f) {
      if (inEllipse(x, y, 9, 15, 5, 4) && y < 15.5) return 0
      for (let i = 0; i < 11; i++) {
        const a = Math.PI * (0.12 + (i / 10) * 0.76)
        const pts: [number, number, number][] = []
        for (let j = 0; j <= 6; j++) {
          const s = j / 6
          pts.push([9 + Math.cos(a) * s * 8 + Math.sin(s * 3 + (f / frames) * TAU + i) * 1.2 * s, 12 - Math.sin(a) * s * 9, 0.42])
        }
        if (inStroke(x, y, pts)) return 1
      }
      return -1
    },
  }
}

export type { Stamp }
