// The inhabitants and scenery of the forest floor at night, as vector shapes.
// Every animal faces right; `ascii.ts` renders them as characters.

import { clamp, hash, inEllipse, inPoly, inStroke } from './ascii'
import type { Model, Region } from './ascii'

const TAU = Math.PI * 2

type P = readonly [number, number]
type S = [number, number, number]

// Converts between a local frame (centre c, angle a) and the world frame.
function local(x: number, y: number, cx: number, cy: number, a: number): [number, number] {
  const dx = x - cx
  const dy = y - cy
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [dx * c + dy * s, -dx * s + dy * c]
}
function world(lx: number, ly: number, cx: number, cy: number, a: number): [number, number] {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return [cx + lx * c - ly * s, cy + lx * s + ly * c]
}

// Lighting of an egg-shaped volume seen in profile: light on top, dark at the
// bottom and edges, in curved bands (not horizontal stripes).
function ovoid(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number | undefined {
  const nx = (x - cx) / rx
  const ny = (y - cy) / ry
  const d = nx * nx + ny * ny
  if (d > 1) return undefined
  return clamp(0.74 - 0.34 * ny - 0.3 * d + 0.08 * nx)
}

// ---------- Tree trunk ----------

export type TrunkOpts = {
  // Bole width and height, in units.
  w: number
  h: number
  seed: number
  // Side lit by the moon: 1 on the right, -1 on the left.
  side: 1 | -1
  // Lean of the top relative to the foot, in units.
  lean?: number
  branches?: { y: number; dir: 1 | -1; len: number; rise: number }[]
  // A single tint (distant planes: lighter).
  flat?: string
  colors?: [string, string, string]
}

// A trunk's geometry, shared by the ASCII rendering and the silhouette.
export function trunkGeom(o: TrunkOpts) {
  const pad = o.w * 0.9 + Math.max(0, ...(o.branches ?? []).map(b => b.len)) + Math.abs(o.lean ?? 0)
  const w = o.w + pad * 2
  const cxAt = (y: number) => pad + o.w / 2 + (o.lean ?? 0) * ((o.h - y) / o.h)
  // Half-width: slight taper, flare at the foot.
  const half = (y: number) => {
    const foot = Math.max(0, (y - (o.h - 12)) / 12)
    return (o.w / 2) * (0.88 + 0.12 * (y / o.h)) * (1 + 0.85 * foot * foot)
  }
  const twigs: S[][] = []
  const strokes: S[][] = (o.branches ?? []).map(b => {
    const x0 = cxAt(b.y) + b.dir * half(b.y) * 0.6
    const pts: S[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      pts.push([x0 + b.dir * b.len * t, b.y - b.rise * Math.pow(t, 1.4) + Math.sin(t * 3 + o.seed) * 1.2, o.w * 0.16 * (1 - t * 0.75) + 0.35])
    }
    // A twig near the tip.
    const [ex, ey] = pts[4]!
    twigs.push([[ex, ey, 0.5], [ex + b.dir * b.len * 0.25, ey - b.rise * 0.5 - 3, 0.3]])
    return pts
  })
  return { pad, w, cxAt, half, strokes: [...strokes, ...twigs] }
}

export function trunk(o: TrunkOpts): () => Model {
  return () => {
    const g = trunkGeom(o)
    const colors = o.flat ? ([o.flat, o.flat, o.flat] as [string, string, string]) : (o.colors ?? ['#1c2a2c', '#3a4a48', '#6d8584'])
    const bark: Region = o.flat
      ? { colors, ramp: ' .:|', edge: o.flat }
      : {
          colors,
          ramp: '.:-=+*#',
          pattern: (x, y) => {
            const v = Math.sin(x * 1.25 + Math.sin(y * 0.06 + o.seed) * 2.6 + o.seed)
            if (v > 0.8) return { ch: '|', tone: 0 }
            if (hash(x * 3 + o.seed, y) < 0.025) return { ch: 'o', tone: 0 }
            return undefined
          },
        }
    return {
      w: g.w,
      h: o.h,
      frames: 1,
      period: 1,
      regions: [bark],
      light(x, y) {
        const u = (x - g.cxAt(y)) / Math.max(0.5, g.half(y))
        if (Math.abs(u) > 1.3) return 0.45
        // Cylinder lit from the side by the moon.
        return clamp(0.42 + 0.42 * o.side * u - 0.18 * u * u)
      },
      at(x, y) {
        if (Math.abs(x - g.cxAt(y)) <= g.half(y)) return 0
        for (const s of g.strokes) if (inStroke(x, y, s)) return 0
        return -1
      },
    }
  }
}

// ---------- Moon ----------

export function moon(): Model {
  const c = 16
  const r = 14.5
  const craters: [number, number, number][] = [
    [11, 12, 3.2],
    [19, 9, 2.2],
    [20, 19, 3.6],
    [12, 21, 1.8],
    [24, 13, 1.5],
    [15, 16, 1.2],
  ]
  return {
    w: 32,
    h: 32,
    frames: 1,
    period: 1,
    regions: [
      // Inverted ramp: the lit part stays empty (the pale disc shows through).
      { colors: ['#8ea2b0', '#a8bac6', '#b9c9d3'], ramp: ':-.  ', edge: '#c9d8e0', dither: 0.03 },
      { colors: ['#93a6b3', '#a3b5c1', '#b3c3ce'], ramp: '%=:', noEdge: true },
    ],
    light(x, y) {
      // Lit from the top left: the shadow spreads to the bottom right.
      return clamp(1.15 - Math.hypot(x - (c - 6), y - (c - 6)) / (r * 1.7))
    },
    at(x, y) {
      if (!inEllipse(x, y, c, c, r, r)) return -1
      for (const [cx, cy, cr] of craters) if (inEllipse(x, y, cx, cy, cr, cr)) return 1
      return 0
    },
  }
}

// ---------- Fox ----------

export function fox(): Model {
  const frames = 4
  const ground = 27
  return {
    w: 48,
    h: 29,
    frames,
    period: 1,
    regions: [
      { colors: ['#a24a1c', '#d9733a', '#f6ab72'], ramp: '.:-=+*#%' },
      { colors: ['#bdb4a8', '#e6dfd5', '#fbf7f2'], ramp: ':-=+*' },
      { colors: ['#3a281c', '#56392a', '#7a5440'], ramp: ':=+*#' },
    ],
    light(x, y) {
      return ovoid(x, y, 22, 13.6, 11.6, 6.2) ?? ovoid(x, y, 38.4, 9, 5, 4) ?? ovoid(x, y, 32.4, 12.4, 5.2, 5.2)
    },
    at(x, y, f) {
      const ph = (f / frames) * TAU
      // Pointed ears, dark tips.
      if (inPoly(x, y, [[35.6, 6.4], [36.6, 0.6], [39.2, 5.4]]) || inPoly(x, y, [[39, 5.6], [40.8, 0.8], [42.2, 6.6]])) return y < 2.8 ? 2 : 0
      // Slender muzzle, white underneath.
      if (inPoly(x, y, [[40.6, 8], [47.4, 10.6], [47, 11.6], [40.4, 12.2]])) return y > 10.6 ? 1 : 0
      if (inEllipse(x, y, 38.4, 9, 4.6, 3.6)) return y > 10.8 && x > 36.6 ? 1 : 0
      // Neck and white chest.
      if (inEllipse(x, y, 32.4, 12.4, 4.8, 4.8)) return y > 13.4 && x > 30.6 ? 1 : 0
      // Body.
      if (inEllipse(x, y, 22, 13.6, 11, 5.6)) return y > 17 && x > 17 && x < 30 ? 1 : 0
      // Bushy, swaying tail, white tip.
      const sw = Math.sin(ph) * 1.2
      if (inStroke(x, y, [[12, 12.4, 2.1], [7, 14 + sw * 0.4, 3.1], [3, 16.4 + sw, 2.6], [1.2, 17.8 + sw, 1.2]])) return x < 4.4 ? 1 : 0
      // Thin legs: front and hind legs in opposition.
      const legs: [number, number][] = [
        [29.5, 0],
        [32, Math.PI],
        [14.5, Math.PI],
        [17, 0],
      ]
      for (const [lx, o] of legs) {
        const sn = Math.sin(ph + o)
        const knee = lx + sn * 1.6
        const paw = lx + sn * 3.6
        if (inStroke(x, y, [[lx, 17, 0.95], [knee, 22, 0.7], [paw, ground - 0.4, 0.62]])) return y > 22 ? 2 : 0
      }
      return -1
    },
    stamps: () => [
      { x: 39.6, y: 7.8, text: 'o', color: '#140a05' },
      { x: 47, y: 10.2, text: '*', color: '#140a05' },
    ],
  }
}

// ---------- Deer ----------

export type DeerPose = 'walk' | 'graze' | 'alert'

export function deer(pose: DeerPose): () => Model {
  return () => {
    const ground = 63
    const frames = pose === 'walk' ? 3 : 2
    const body = { cx: 26, cy: 35 }
    // Head: centre and angle (0 = muzzle to the right; >0 downward).
    const head = pose === 'graze' ? { x: 46, y: 51, a: 1.15 } : { x: 44.5, y: 18.5, a: 0.2 }
    const antlers: S[][] = [
      [[-0.6, -3, 0.75], [-3.2, -8.5, 0.65], [-6.8, -12.5, 0.55], [-9.6, -14, 0.45]],
      [[-2, -6.4, 0.5], [1.6, -10.4, 0.42]],
      [[-4.4, -10, 0.45], [-2.6, -14.4, 0.38]],
      [[-6.8, -12.5, 0.4], [-6.4, -16.6, 0.34]],
      [[-8.4, -13.4, 0.36], [-11.6, -15.8, 0.3]],
    ]
    return {
      w: 62,
      h: 66,
      frames,
      period: pose === 'walk' ? 1.3 : 2.6,
      regions: [
        { colors: ['#6a4a30', '#9b7350', '#cfa375'], ramp: '.:-=+*#%' },
        { colors: ['#a69479', '#d2c3a6', '#efe5cf'], ramp: ':-=+*' },
        { colors: ['#8f8470', '#c4b697', '#ece2c6'], ramp: ':=+*#', edge: '#ece2c6' },
        { colors: ['#4a3426', '#6e4f38', '#93704f'], ramp: ':=+*#' },
      ],
      light(x, y) {
        return ovoid(x, y, body.cx, body.cy + 0.4, 14.5, 7) ?? ovoid(x, y, 14.6, 33.4, 6.4, 7.4) ?? ovoid(x, y, 36.6, 34.6, 6.4, 7.8)
      },
      at(x, y, f) {
        const ph = (f / frames) * TAU
        // Head and antlers, in the head's frame.
        const [hx, hy] = local(x, y, head.x, head.y, head.a)
        for (const s of antlers) if (inStroke(hx, hy, s)) return 2
        // Far antler, slightly offset (depth).
        for (const s of antlers) if (inStroke(hx - 1.4, hy + 0.4, s)) return 2
        const flick = pose !== 'walk' && f === 1 ? -1.8 : 0
        if (inStroke(hx, hy, [[-1.6, -2.2, 0.7], [-5, -4 + flick, 1.25], [-6.2, -3.8 + flick, 0.5]])) return 0
        if (inEllipse(hx, hy, 0, 0, 3.4, 2.7) || inStroke(hx, hy, [[0, 0.2, 2.5], [6, 2.6, 1.25]])) return hx > 4.4 ? 3 : 0
        // Neck.
        const [nx, ny] = world(-2, 1, head.x, head.y, head.a)
        if (inStroke(x, y, [[37, 31, 4], [nx, ny, 2.6]])) return 0
        // Body, rump, chest; white rump patch and pale belly.
        if (inEllipse(x, y, 13.2, 1 + 33, 3, 4) && x < 14.5) return 1
        if (inEllipse(x, y, body.cx, body.cy + 0.4, 13.2, 6) || inEllipse(x, y, 14.6, 33.4, 6, 7) || inEllipse(x, y, 36.6, 34.6, 6, 7.4)) {
          return y > body.cy + 4.2 ? 1 : 0
        }
        // Tail.
        const tail = pose === 'alert' && f === 1 ? -1.6 : 0
        if (inStroke(x, y, [[10, 30, 0.9], [8.4, 32.6 + tail, 1]])) return 1
        // Thin, jointed legs; straight when standing still.
        const legs: [number, number, number][] = [
          [35, 0, 1],
          [38, Math.PI, 1],
          [14.5, Math.PI, -1],
          [17.5, 0, -1],
        ]
        for (const [lx, o, bend] of legs) {
          const s = pose === 'walk' ? Math.sin(ph + o) : 0
          const knee = lx + s * 2 + bend * 1.2
          const hoof = lx + s * 4.2
          if (inStroke(x, y, [[lx, 39, 1.05], [knee, 49.5, 0.68], [hoof, ground - 0.6, 0.58]])) return y > ground - 3 ? 3 : 0
        }
        return -1
      },
      stamps: () => {
        const [ex, ey] = world(1.2, -0.8, head.x, head.y, head.a)
        const [mx, my] = world(6.2, 2.8, head.x, head.y, head.a)
        return [
          { x: ex, y: ey, text: '@', color: '#120a05' },
          { x: mx, y: my, text: '*', color: '#120a05' },
        ]
      },
    }
  }
}

// ---------- Rabbit ----------

export function rabbit(pose: 'hop' | 'sit'): () => Model {
  return () => {
    const frames = 2
    return {
      w: 28,
      h: 24,
      frames,
      period: pose === 'hop' ? 0.9 : 3,
      regions: [
        { colors: ['#756a60', '#ab9c8d', '#e4d6c5'], ramp: '.:-=+*#' },
        { colors: ['#c2b6a8', '#e4dbd0', '#fbf7f1'], ramp: ':-=+' },
        { colors: ['#6b4f4f', '#a77b7b', '#d9a9a9'], ramp: ':=' },
      ],
      at(x, y, f) {
        const up = pose === 'hop' && f === 1
        const dy = up ? -2.2 : 0
        const yy = y - dy
        // Ears.
        const tilt = pose === 'sit' && f === 1 ? 1.4 : 0
        if (inStroke(x, yy, [[18.5, 9.5, 1.1], [16.2 - tilt, 1.6, 1.3], [15.4 - tilt, 0.8, 0.6]])) return x > 16.6 - tilt && yy > 2.6 ? 2 : 0
        if (inStroke(x, yy, [[19.8, 9.8, 1], [19.6 + tilt * 0.4, 2, 1.2], [19.2 + tilt * 0.4, 1.2, 0.5]])) return 0
        // Head.
        if (inEllipse(x, yy, 20, 12, 4.4, 3.6)) return yy > 13.6 && x > 21 ? 1 : 0
        // Round body; stretched during the hop.
        const rx = up ? 8.4 : 7.2
        if (inEllipse(x, yy, 11.5, 16, rx, 5.6)) return yy > 18.4 ? 1 : 0
        // Pompom tail.
        if (inEllipse(x, yy, 4.4, 14.6, 2, 2)) return 1
        // Legs: hind leg tucked or stretched, front leg planted.
        if (up) {
          if (inStroke(x, yy, [[8, 19, 1.4], [2.5, 21.4, 0.9]])) return 0
          if (inStroke(x, yy, [[17, 19, 0.8], [21, 21, 0.6]])) return 0
        } else {
          if (inEllipse(x, yy, 9, 19.6, 4.6, 2.2)) return 0
          if (inStroke(x, yy, [[17.6, 19, 0.85], [18.4, 22.6, 0.7]])) return 0
        }
        return -1
      },
      stamps: f => {
        const dy = pose === 'hop' && f === 1 ? -2.2 : 0
        const nose = pose === 'sit' && f === 1 ? '·' : '*'
        return [
          { x: 21.2, y: 11.2 + dy, text: '@', color: '#120c08' },
          { x: 24, y: 12.4 + dy, text: nose === '·' ? '.' : nose, color: '#c98b8b' },
        ]
      },
    }
  }
}

// ---------- Hedgehog ----------

export function hedgehog(): Model {
  const frames = 2
  return {
    w: 32,
    h: 18,
    frames,
    period: 0.8,
    regions: [
      {
        colors: ['#625142', '#968069', '#d0b794'],
        ramp: ":;=+*#",
        pattern: (x, y) => {
          const h = hash(x * 2.3, y * 1.7)
          return { ch: h < 0.33 ? '/' : h < 0.55 ? "'" : h < 0.75 ? '^' : '\\', tone: h < 0.5 ? 0 : 2 }
        },
      },
      { colors: ['#b39a7d', '#dcc6a6', '#f4e6cf'], ramp: ':-=+' },
      { colors: ['#4a3a2e', '#644f40', '#80695a'], ramp: ':=' },
    ],
    light(x, y) {
      return clamp(0.95 - (y - 3) / 12 + (x - 14) * 0.01)
    },
    at(x, y, f) {
      if (inEllipse(x, y, 25.5, 11.4, 4.2, 3.2) || inStroke(x, y, [[26, 12, 2.2], [30.6, 12.8, 0.8]])) return 1
      if (inEllipse(x, y, 14, 11, 12, 7.6) && y <= 14.2) return 0
      const s = f === 0 ? 1 : -1
      for (const [lx, o] of [[9, 1], [19, -1]] as const) {
        if (inStroke(x, y, [[lx, 13.6, 0.75], [lx + s * o * 0.9, 16.8, 0.6]])) return 2
      }
      return -1
    },
    stamps: () => [
      { x: 26.4, y: 10.2, text: 'o', color: '#0d0905' },
      { x: 30.6, y: 12, text: '*', color: '#0d0905' },
    ],
  }
}

// ---------- Bat ----------

export function bat(): Model {
  const frames = 3
  return {
    w: 22,
    h: 12,
    frames,
    period: 0.45,
    regions: [{ colors: ['#22323d', '#3b5262', '#5d7a8c'], ramp: ':=+*#' }],
    at(x, y, f) {
      if (inEllipse(x, y, 11, 6, 2.2, 1.8)) return 0
      if (inPoly(x, y, [[9.6, 4.6], [10.2, 2.6], [10.9, 4.4]]) || inPoly(x, y, [[11.1, 4.4], [11.8, 2.6], [12.4, 4.6]])) return 0
      const tip = [1, 5.6, 10.6][f]!
      const mid = [3.2, 5.8, 8.4][f]!
      for (const s of [-1, 1]) {
        const X = (u: number) => 11 + s * u
        if (inPoly(x, y, [[X(1.5), 5], [X(10.5), tip], [X(9), mid + 0.8], [X(7), mid + 0.2], [X(5), mid + 1.2], [X(3), 6.2]])) return 0
      }
      return -1
    },
  }
}

// ---------- Perched owl ----------

// Poses: 0 eyes open, 1 blink, 2 looking left, 3 looking right.
export function owl(pose: 0 | 1 | 2 | 3): () => Model {
  return () => ({
    w: 20,
    h: 30,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: ['#6b5a48', '#a08a70', '#d8c1a0'],
        ramp: '.:-=+*',
        pattern: (x, y) => (Math.floor(y / 2) % 2 === 0 && hash(x, y) < 0.6 ? { ch: Math.floor(x) % 2 === 0 ? 'v' : 'w' } : undefined),
      },
      { colors: ['#b5a48c', '#ddd0bb', '#f7efe1'], ramp: ':-=+' },
      { colors: ['#54463a', '#7e6b58', '#a8917a'], ramp: ':=+*' },
    ],
    light(x, y) {
      return clamp(0.95 - (y - 4) / 34 - Math.abs(x - 10) * 0.012)
    },
    at(x, y) {
      const turn = pose === 2 ? -1.4 : pose === 3 ? 1.4 : 0
      // Ear tufts.
      if (inPoly(x, y, [[4.6 + turn, 4.4], [3 + turn, 0.6], [7 + turn, 3.4]]) || inPoly(x, y, [[15.4 + turn, 4.4], [17 + turn, 0.6], [13 + turn, 3.4]])) return 2
      // Facial disc.
      if (inEllipse(x, y, 7.4 + turn, 8.2, 3, 2.8) || inEllipse(x, y, 12.6 + turn, 8.2, 3, 2.8)) return 1
      if (inEllipse(x, y, 10, 8, 6.8, 5.4)) return 0
      // Body, folded wings darker on the sides.
      if (inEllipse(x, y, 10, 19, 7.2, 9.4)) return Math.abs(x - 10) > 5 ? 2 : 0
      return -1
    },
    stamps: () => {
      const turn = pose === 2 ? -1.4 : pose === 3 ? 1.4 : 0
      const eye = pose === 1 ? '-' : '@'
      const color = pose === 1 ? '#5a4632' : '#f2b544'
      return [
        { x: 7 + turn, y: 7.6, text: eye, color },
        { x: 12.4 + turn, y: 7.6, text: eye, color },
        { x: 9.8 + turn, y: 10, text: 'v', color: '#d8b26a' },
        { x: 6.6, y: 28.6, text: 'm', color: '#c9a24a' },
        { x: 12, y: 28.6, text: 'm', color: '#c9a24a' },
      ]
    },
  })
}

// ---------- Fern ----------

export function fern(seed: number, size = 1): () => Model {
  return () => {
    const fronds: { pts: [number, number][]; side: number }[] = []
    const n = 7
    const base: [number, number] = [20 * size, 26 * size]
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.18 + (i / (n - 1)) * 0.64) + (hash(seed, i) - 0.5) * 0.15
      const len = (12 + hash(i, seed) * 8) * size * (1 - Math.abs(i - (n - 1) / 2) * 0.08)
      const pts: [number, number][] = []
      for (let j = 0; j <= 10; j++) {
        const t = j / 10
        // Arc drooping outward.
        const droop = t * t * 9 * size * (Math.abs(Math.cos(a)) + 0.25)
        pts.push([base[0] + Math.cos(a) * len * t, base[1] - Math.sin(a) * len * t + droop])
      }
      fronds.push({ pts, side: Math.cos(a) >= 0 ? 1 : -1 })
    }
    return {
      w: 40 * size,
      h: 28 * size,
      frames: 1,
      period: 1,
      regions: [
        { colors: ['#1d4a36', '#2f7352', '#5aa57a'], ramp: '|', edge: '#3f8a63' },
        {
          colors: ['#1f5139', '#357f5a', '#6cb88b'],
          ramp: ':-=+',
          pattern: (x, y) => ({ ch: (Math.floor(x) + Math.floor(y / 2)) % 2 === 0 ? '/' : '\\' }),
        },
      ],
      at(x, y) {
        for (const fr of fronds) {
          const pts = fr.pts
          for (let j = 0; j < pts.length - 1; j++) {
            const [ax, ay] = pts[j]!
            const [bx, by] = pts[j + 1]!
            const vx = bx - ax
            const vy = by - ay
            const L2 = vx * vx + vy * vy || 1
            const t = clamp(((x - ax) * vx + (y - ay) * vy) / L2)
            const d = Math.hypot(ax + vx * t - x, ay + vy * t - y)
            const along = (j + t) / (pts.length - 1)
            if (d < 0.45) return 0
            // Leaflets: width tapering toward the tip.
            if (d < (1 - along) * 2.6 * size + 0.4 && along > 0.08) return 1
          }
        }
        return -1
      },
    }
  }
}
