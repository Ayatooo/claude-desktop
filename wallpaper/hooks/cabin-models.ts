// The models of the "winter cabin" scene, as vector shapes.
// Each one faces right; `ascii.ts` renders them as characters.

import { clamp, fusiform, hash, inEllipse, inPoly, inStroke, rotate } from './ascii'
import type { Model } from './ascii'

const TAU = Math.PI * 2

type P = readonly [number, number]
const shift = (pts: readonly P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy] as const)

// ---------- Snowy fir ----------

// A tiered fir: each tier is a triangle with drooping tips;
// the snow is the layer just below its top edge.
export function fir(height: number, seed: number): () => Model {
  return () => {
    const w = Math.round(height * 0.62)
    const cx = w / 2
    const tiers = Math.max(4, Math.round(height / 9))
    const top = 1
    const trunkH = height * 0.08
    const crownH = height - trunkH - top
    const step = crownH / (tiers + 0.6)
    const tierH = step * 1.6
    const inTier = (x: number, y: number, k: number) => {
      const ya = top + k * step
      const half = (w / 2 - 1) * (0.28 + (0.72 * (k + 1)) / tiers)
      const yb = ya + tierH + Math.sin(x * 1.1 + seed + k) * 0.5
      if (y < ya || y > yb) return false
      // Drooping edge: the slope softens toward the bottom.
      const f = (y - ya) / tierH
      return Math.abs(x - cx) <= half * Math.pow(clamp(f), 0.75)
    }
    const inCrown = (x: number, y: number) => {
      for (let k = 0; k < tiers; k++) if (inTier(x, y, k)) return true
      return false
    }
    return {
      w,
      h: height,
      frames: 1,
      period: 1,
      regions: [
        { colors: ['#0f2a2a', '#1c4440', '#2e6158'], ramp: '.:-=+*#', edge: '#1c4440' },
        { colors: ['#8ea6c4', '#c9d8ea', '#f2f8ff'], ramp: ':-=+*#', lift: 0.2, edge: '#e4eefa' },
        { colors: ['#2a1d16', '#3d2a1f', '#523a2b'], ramp: '|' },
      ],
      light(x) {
        // The moon lights from the left.
        return clamp(0.75 - (x - cx) / w)
      },
      at(x, y) {
        if (inCrown(x, y)) {
          // Snow: inside the tree, but not a little higher up.
          return inCrown(x, y - 2.6) && inCrown(x, y - 1.3) ? (hash(x * 3 + seed, y * 2) < 0.07 ? 1 : 0) : 1
        }
        if (Math.abs(x - cx) < 1 && y > top + crownH - 1 && y < height) return 2
        return -1
      },
    }
  }
}

// ---------- Log cabin ----------

export function cabin(): Model {
  const w = 62
  const h = 58
  const wallL = 9
  const wallR = 53
  const wallTop = 27
  const ground = 54
  const apex: P = [31, 4]
  const log = 2.6
  // Roof: two thick slopes, covered by an overhanging layer of snow.
  const roofY = (x: number) => apex[1] + Math.abs(x - apex[0]) * 0.78
  const inRoof = (x: number, y: number) => x > 1 && x < 61 && y >= roofY(x) - 1.6 + Math.abs(Math.sin(x * 0.5)) * 0.4 && y <= roofY(x) + 5.6
  const windows: [number, number, number, number][] = [
    [13, 33, 22, 42],
    [40, 33, 49, 42],
  ]
  const door: [number, number, number, number] = [27, 34, 35, ground]
  const gableWin: [number, number, number, number] = [28.5, 16, 33.5, 21]
  const inBox = (x: number, y: number, b: readonly number[]) => x >= b[0]! && x <= b[2]! && y >= b[1]! && y <= b[3]!
  return {
    w,
    h,
    frames: 1,
    period: 1,
    regions: [
      // 0 logs
      {
        colors: ['#3a2416', '#6b4428', '#a06a3c'],
        ramp: '.:-=+*#%',
        pattern: (x, y) => {
          // Log ends at the corners.
          if (x < wallL + 1.6 || x > wallR - 1.6) return { ch: (y % log) / log < 0.5 ? '(' : ')', tone: 2 }
          return (y % log) / log < 0.22 ? { ch: '_', tone: 0 } : undefined
        },
      },
      // 1 snow on the roof, sills and drifts
      { colors: ['#8fa6c2', '#cbd9ea', '#f4f9ff'], ramp: ':-=+*#', lift: 0.15, edge: '#e8f1fb' },
      // 2 lit windows
      { colors: ['#e0892a', '#ffb347', '#ffe08a'], ramp: '=+*#%@', noEdge: true },
      // 3 mullions and frames
      { colors: ['#2a1a10', '#3a2416', '#4d3020'], ramp: '#', noEdge: true },
      // 4 stone chimney
      { colors: ['#3f4652', '#5e6674', '#868f9e'], ramp: '.:-=+*#', pattern: (x, y) => (Math.floor(y / 2) % 2 === 0 ? (Math.floor(x / 2.5) % 2 === 0 ? { ch: '|', tone: 0 } : undefined) : Math.floor(x / 2.5 + 0.5) % 2 === 0 ? { ch: '|', tone: 0 } : undefined) },
      // 5 door
      { colors: ['#2e1c11', '#4f3220', '#6f4a30'], ramp: ':-=+|', pattern: x => (Math.floor(x) % 2 === 0 ? { ch: '|' } : undefined) },
      // 6 roof underside
      { colors: ['#4a3020', '#5e3d27', '#7a5236'], ramp: '=', edge: '#3a2416' },
      // 7 snowdrift at the foot of the walls
      { colors: ['#6f88a8', '#a9bfd8', '#dfeaf6'], ramp: '..:-', lift: 0.2, dither: 0.06 },
    ],
    light(x, y) {
      // Cylindrical logs: light in the middle, dark at the joints.
      if (x >= wallL && x <= wallR && y >= roofY(x) + 5 && y <= ground) {
        const v = (y % log) / log
        return clamp(0.25 + 0.65 * Math.sin(Math.PI * v) - (x - wallL) * 0.004)
      }
      return undefined
    },
    at(x, y) {
      // Wavy snowdrift at the foot of the walls.
      if (y > ground - 2.2 + Math.sin(x * 0.35) * 1.4 && y <= h && x > 3 && x < 59) return 7
      // Chimney, with its cap of snow.
      if (x >= 42 && x <= 48 && y >= 4 && y <= roofY(x) + 1) return y < 6 ? 1 : 4
      if (inRoof(x, y)) {
        // Thick snow on top, dark beam below.
        return y < roofY(x) + 3.2 ? 1 : 6
      }
      // Icicles under the eaves.
      for (let i = 0; i < 14; i++) {
        const ix = 3 + i * 4.2 + (i % 3)
        if (ix > 59) break
        const iy = roofY(ix) + 5.6
        const len = 1.6 + (i % 4) * 0.9
        if (Math.abs(x - ix) < 0.45 * (1 - (y - iy) / len) && y >= iy && y <= iy + len) return 1
      }
      const inWall = x >= wallL && x <= wallR && y >= roofY(x) + 5 && y <= ground
      if (!inWall) return -1
      for (const b of windows) {
        if (inBox(x, y, [b[0] - 0.9, b[1] - 1, b[2] + 0.9, b[3] + 1])) {
          // Snowy sill under the window.
          if (y > b[3] + 0.2) return 1
          if (!inBox(x, y, b)) return 3
          const mx = (b[0] + b[2]) / 2
          const my = (b[1] + b[3]) / 2
          if (Math.abs(x - mx) < 0.5 || Math.abs(y - my) < 0.5) return 3
          return 2
        }
      }
      if (inBox(x, y, [gableWin[0] - 0.8, gableWin[1] - 0.8, gableWin[2] + 0.8, gableWin[3] + 0.8])) {
        return inBox(x, y, gableWin) && Math.abs(x - 31) > 0.45 ? 2 : 3
      }
      if (inBox(x, y, [door[0] - 0.8, door[1] - 0.8, door[2] + 0.8, door[3]])) {
        if (!inBox(x, y, door)) return 3
        // Small lit pane in the door.
        if (inBox(x, y, [29.5, 36.5, 32.5, 40])) return 2
        return 5
      }
      return 0
    },
    stamps: () => [{ x: 34, y: 45, text: 'o', color: '#d9a441' }],
  }
}

// ---------- Arctic fox (trotting) ----------

export function fox(): Model {
  const frames = 4
  const tail: [number, number, number][] = [
    [13, 11, 2.4],
    [8.5, 9.2, 3.6],
    [4.2, 9.6, 3.8],
    [1.6, 12.2, 2.8],
    [1.8, 14.6, 1.4],
  ]
  return {
    w: 42,
    h: 24,
    frames,
    period: 0.9,
    regions: [
      { colors: ['#93a6bd', '#d3dfec', '#f6fbff'], ramp: '.:-=+*#' },
      { colors: ['#7f93ab', '#b9c9da', '#e6eef7'], ramp: ':-=+*' },
      { colors: ['#5e6f86', '#8698b0', '#aab9cc'], ramp: ':=+' },
    ],
    at(x, y, f) {
      const ph = (f / frames) * TAU
      const yy = y + Math.abs(Math.sin(ph)) * 0.45
      // Compact body, chest, round head, short muzzle, rounded ears.
      if (inEllipse(x, yy, 21.5, 12, 9.2, 4.9)) return 0
      if (inEllipse(x, yy, 29, 10.6, 4.8, 4.4)) return 0
      if (inEllipse(x, yy, 33.8, 8.2, 4.5, 3.9)) return 0
      if (inPoly(x, yy, [[36.5, 7.4], [40.8, 9], [40.2, 10.2], [36.5, 11]])) return 0
      if (inEllipse(x, yy, 31.6, 4.6, 1.4, 1.7) || inEllipse(x, yy, 35, 4.4, 1.4, 1.7)) return 1
      // Very bushy tail, swaying.
      const [tx, ty] = rotate(x, yy, 13, 11, 0.12 * Math.sin(ph))
      if (inStroke(tx, ty, tail)) return tx < 3.5 ? 1 : 0
      // Short legs: trot, diagonal pairs.
      const leg = (bx: number, a: number) =>
        inStroke(x, yy, [[bx, 14.5, 1.5], [bx + Math.sin(a) * 1.6, 18, 1.05], [bx + Math.sin(a) * 3, 21.6 - Math.max(0, Math.cos(a)) * 0.9, 0.9]])
      if (leg(27.5, Math.sin(ph) * 0.6) || leg(15.5, -Math.sin(ph) * 0.6)) return 2
      if (leg(30, -Math.sin(ph) * 0.6) || leg(18.5, Math.sin(ph) * 0.6)) return 1
      return -1
    },
    stamps: () => [
      { x: 35.2, y: 7, text: '@', color: '#1a2433' },
      { x: 40.2, y: 8.6, text: 'o', color: '#1a2433' },
    ],
  }
}

// ---------- Mountain hare ----------

export function hare(): Model {
  const frames = 3
  return {
    w: 34,
    h: 32,
    frames,
    period: 2.2,
    sequence: [0, 0, 1, 0, 2, 0],
    regions: [
      { colors: ['#9aaabf', '#d6e1ed', '#f7fbff'], ramp: '.:-=+*#' },
      { colors: ['#1a2230', '#2a3445', '#3a4659'], ramp: '#' },
      { colors: ['#c99aa6', '#e9c0ca', '#ffdbe3'], ramp: ':=' },
    ],
    at(x, y, f) {
      // Ears: the second one twitches.
      const twitch = f === 1 ? 0.18 : f === 2 ? -0.12 : 0
      const ear = (bx: number, a: number) => {
        const [ex, ey] = rotate(x, y, bx, 9.5, a)
        if (inStroke(ex, ey, [[bx, 9.5, 1.3], [bx - 2.4, 3, 1.3], [bx - 3.6, -0.6, 0.75]])) return ey < 1.2 ? 1 : ey > 3.6 && Math.abs(ex - (bx - 1.4)) < 0.5 ? 2 : 0
        return -1
      }
      const e1 = ear(23, 0)
      if (e1 >= 0) return e1
      const e2 = ear(25, twitch + 0.15)
      if (e2 >= 0) return e2
      if (inEllipse(x, y, 25, 12.2, 4.6, 3.7)) return 0
      if (inEllipse(x, y, 21, 17.4, 4.6, 5.2)) return 0
      if (inEllipse(x, y, 14.5, 20.5, 8, 7)) return 0
      if (inEllipse(x, y, 11, 22.5, 6, 5.8)) return 0
      if (inEllipse(x, y, 5.6, 19.4, 1.9, 1.8)) return 0
      // Large hind foot, foreleg.
      if (inEllipse(x, y, 13.5, 28.3, 7.4, 1.6)) return 0
      if (inStroke(x, y, [[21.5, 21, 1.3], [23, 28.5, 0.95]])) return 0
      return -1
    },
    stamps: f => [
      { x: 26.4, y: 11.2, text: '@', color: '#1a2230' },
      { x: 29.2, y: 13.4, text: f === 2 ? '-' : '.', color: '#7b5560' },
    ],
  }
}

// ---------- Snowy owl in flight ----------

export function owl(): Model {
  const frames = 4
  const sy = 16
  // Wing, based at the shoulder, swept back; k: wingbeat.
  const wing: P[] = [
    [4, 1],
    [-2, 1.6],
    [-10, -3],
    [-17, -8.5],
    [-20, -12],
    [-17.5, -12.4],
    [-16.5, -13.8],
    [-13.5, -13.6],
    [-12.5, -14.6],
    [-9, -14],
    [-4.5, -12.6],
    [1, -7.5],
  ]
  return {
    w: 46,
    h: 34,
    frames,
    period: 1.4,
    regions: [
      {
        colors: ['#a4b3c6', '#dce6f0', '#f8fbff'],
        ramp: '.:-=+*',
        pattern: (x, y) => (hash(x * 2.3, y * 1.7) < 0.1 ? { ch: hash(x, y) < 0.5 ? ',' : "'", tone: 0 } : undefined),
      },
      { colors: ['#93a3b8', '#c8d5e3', '#eef4fa'], ramp: ":-=+*", pattern: (x, y) => (hash(x * 1.9, y * 2.1) < 0.14 ? { ch: '=', tone: 0 } : undefined) },
    ],
    at(x, y, f) {
      const k = [1, 0.35, -0.65, 0.35][f]!
      // Round head, body, tail.
      if (inEllipse(x, y, 33.5, sy - 2.4, 5.2, 5)) return 0
      if (inEllipse(x, y, 23, sy + 0.6, 9.6, 5.4)) return 0
      if (inPoly(x, y, [[14.5, sy - 1], [7.5, sy + 0.4], [8, sy + 2.4], [15, sy + 2.6]])) return 1
      // Wing (visible side).
      const lx = x - 26
      const ly = (y - sy + 0.5) / (Math.abs(k) < 0.05 ? 0.05 : k)
      if (inPoly(lx, ly, wing)) return 1
      return -1
    },
    stamps: () => [
      { x: 35.4, y: sy - 3.6, text: 'o', color: '#e8c33a' },
      { x: 37.8, y: sy - 1.4, text: 'v', color: '#3a4250' },
    ],
  }
}

// ---------- Elk (distant silhouette) ----------

export function elk(): Model {
  const frames = 4
  return {
    w: 40,
    h: 30,
    frames,
    period: 2.4,
    regions: [{ colors: ['#4a5f7e', '#6b84a6', '#9db4d2'], ramp: ':-=+*#', edge: '#b9cce4' }],
    at(x, y, f) {
      const ph = (f / frames) * TAU
      if (inEllipse(x, y, 17, 15, 10, 4.6)) return 0
      if (inEllipse(x, y, 24, 13.5, 4.5, 5)) return 0
      if (inStroke(x, y, [[26.5, 12, 2.4], [31, 8.5, 1.8]])) return 0
      if (inStroke(x, y, [[31, 8.5, 2], [35.5, 11, 1.2]])) return 0
      // Antlers: two branched palms.
      for (const s of [0, 1]) {
        const bx = 30.5 - s * 1.2
        if (inStroke(x, y, [[bx, 7, 0.55], [bx - 2.5, 3, 0.5], [bx - 6, 0.8, 0.45]])) return 0
        if (inStroke(x, y, [[bx - 2.5, 3, 0.45], [bx - 1, 0, 0.4]]) || inStroke(x, y, [[bx - 4.5, 1.6, 0.4], [bx - 4.2, -0.4, 0.35]])) return 0
      }
      // Walking legs.
      const leg = (bx: number, a: number) => inStroke(x, y, [[bx, 18, 1.1], [bx + Math.sin(a) * 1.4, 23, 0.7], [bx + Math.sin(a) * 2.6, 28.5, 0.6]])
      if (leg(10, Math.sin(ph) * 0.5) || leg(13, Math.sin(ph + Math.PI) * 0.5) || leg(22, Math.sin(ph + Math.PI / 2) * 0.5) || leg(25, Math.sin(ph + (3 * Math.PI) / 2) * 0.5)) return 0
      return -1
    },
  }
}

// ---------- Snowy mountain ridge ----------

// Sharp peaks: 1 - |sin| makes points; faces turned toward the moon
// (on the left) are lit, opposite faces are in blue shadow.
export function peaks(u: number, seed: number): number {
  return (
    0.62 * Math.pow(1 - Math.abs(Math.sin(u * 3.3 + seed)), 1.5) +
    0.3 * Math.pow(1 - Math.abs(Math.sin(u * 8.1 + seed * 2)), 1.4) +
    0.08 * Math.sin(u * 31 + seed * 3)
  )
}

export function ridge(width: number, height: number, seed: number): () => Model {
  return () => {
    const profile = (x: number) => height * (1 - clamp(0.12 + peaks(x / width, seed) * 0.95))
    return {
      w: width,
      h: height,
      frames: 1,
      period: 1,
      regions: [
        {
          colors: ['#33496b', '#6f8db1', '#d4e2f2'],
          ramp: '.:-=+*',
          dither: 0.07,
          pattern: (x, y) => {
            // A few rocky gullies following the slope.
            const slope = profile(x + 0.5) - profile(x - 0.5)
            if (hash(Math.floor(x / 2) + seed, Math.floor(y / 4)) < 0.05 && y > profile(x) + 4) return { ch: slope > 0 ? '\\' : '/', tone: 0 }
            return undefined
          },
        },
      ],
      light(x, y) {
        const slope = profile(x + 1) - profile(x - 1)
        const depth = (y - profile(x)) / height
        return clamp(0.5 - Math.tanh(slope * 0.8) * 0.38 - depth * 0.12, 0.05, 0.95)
      },
      at(x, y) {
        return y >= profile(x) ? 0 : -1
      },
    }
  }
}

// ---------- Snowy ground, with its drifts ----------

export function snowField(width: number, height: number, seed: number): () => Model {
  return () => {
    const surf = (x: number) => 3 + 2.2 * Math.sin(x * 0.045 + seed) + 1.4 * Math.sin(x * 0.13 + seed * 2) + 0.6 * Math.sin(x * 0.4)
    return {
      w: width,
      h: height,
      frames: 1,
      period: 1,
      regions: [
        {
          colors: ['#4d6585', '#93acc9', '#e3eef9'],
          ramp: '..::--=',
          dither: 0.06,
          pattern: (x, y) => (hash(x * 1.3 + seed, y * 2.7) < 0.03 ? { ch: '*', tone: 2 } : hash(x * 0.7, y * 1.9 + seed) < 0.3 ? { ch: ' ' } : undefined),
        },
      ],
      light(x, y) {
        const slope = surf(x + 0.6) - surf(x - 0.6)
        const d = y - surf(x)
        return clamp(0.7 - slope * 0.45 - d * 0.03)
      },
      at(x, y) {
        return y >= surf(x) ? 0 : -1
      },
    }
  }
}
