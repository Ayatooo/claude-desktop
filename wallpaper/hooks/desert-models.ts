// The dwellers and scenery of the desert at night, as vector shapes.
// Each one faces right; `ascii.ts` renders them as characters.
// The moon is high up, slightly to the right: faces turned to the right
// are lit.

import { clamp, hash, inEllipse, inPoly, inStroke, rotate } from './ascii'
import type { Model } from './ascii'

const TAU = Math.PI * 2

type P = readonly [number, number]
type S = [number, number, number]
const shift = (pts: readonly P[], dx: number, dy: number): P[] => pts.map(([x, y]) => [x + dx, y + dy] as const)

// ---------- Moon ----------

export function moon(): Model {
  const c = 11
  const r = 9.5
  return {
    w: 22,
    h: 22,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: ['#b8b29a', '#e6dfc4', '#fffbe9'],
        ramp: ':-=+*#',
        edge: '#fffbe9',
        // Lunar maria: a few darker patches.
        pattern: (x, y) => (inEllipse(x, y, 13.5, 8.5, 2.2, 1.6) || inEllipse(x, y, 16, 13.5, 1.6, 2.2) ? { ch: '=', tone: 0 } : undefined),
      },
      { colors: ['#232647', '#2b2f57', '#363b69'], ramp: '.:', sparse: 0.55, noEdge: true },
    ],
    light: (x, y) => clamp(0.95 - Math.hypot(x - 15, y - 9) * 0.04),
    at(x, y) {
      if (!inEllipse(x, y, c, c, r, r)) return -1
      // Crescent: lit on the right, earthshine on the left.
      return inEllipse(x, y, c - 4.6, c - 1.2, r * 0.92, r * 0.98) ? 1 : 0
    },
  }
}

// ---------- Dunes ----------

// The texture of a row of dunes (the solid body is an SVG path laid
// underneath): sharp crest, wind ripples on the lit slopes, sparse grain
// in the shade. `crest(px)` gives the crest line in pixels, `u` the size
// of one unit (cell width) at the chosen font size.
export function duneLayer(opts: {
  crest: (x: number) => number
  top: number
  bottom: number
  u: number
  width: number
  lit: [string, string, string]
  shade: [string, string, string]
  crestColor: string
  ripples?: boolean
  // Height of the textured band under the crest, in pixels.
  band?: number
}): () => Model {
  const { crest, top, u } = opts
  const slope = (X: number) => (crest(X + 4) - crest(X - 4)) / 8
  // Lit if the slope falls toward the right (facing the moon); dithered
  // transition to avoid a straight-line boundary.
  const litAt = (X: number, Y: number) => slope(X) + (hash(X * 0.5, Y * 0.5) - 0.5) * 0.25 > -0.12
  return () => ({
    w: Math.ceil(opts.width / u) + 1,
    h: (opts.bottom - top) / u,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: opts.lit,
        ramp: ".'-:~",
        edge: opts.crestColor,
        sparse: 0.32,
        pattern: (x, y) => {
          if (!opts.ripples) return undefined
          const X = x * u
          const Y = top + y * u
          const v = Math.sin(X * 0.045 + Y * 0.3 + Math.sin(X * 0.011) * 2.4)
          return v > 0.7 ? { ch: '~', tone: 2 } : undefined
        },
      },
      { colors: opts.shade, ramp: '.:', edge: opts.shade[2], sparse: 0.16 },
    ],
    light(x, y) {
      const X = x * u
      const Y = top + y * u
      const depth = Y - crest(X)
      return clamp(0.85 - depth * 0.004)
    },
    at(x, y) {
      const X = x * u
      const Y = top + y * u
      const c = crest(X)
      if (Y < c || Y > c + (opts.band ?? 120)) return -1
      return litAt(X, Y) ? 0 : 1
    },
  })
}

// Profile of a dune: gentle windward slope, steep slip face.
export function dune(x: number, peak: number, height: number, left: number, right: number): number {
  const d = x < peak ? (peak - x) / left : (x - peak) / right
  if (d >= 1) return 0
  return x < peak ? height * (1 - Math.pow(d, 1.7)) : height * (1 - Math.pow(d, 0.9))
}

// ---------- Saguaro ----------

export function saguaro(arms: 'two' | 'one' = 'two'): () => Model {
  return () => {
    const cx = 14
    const trunk: S[] = [[cx, 72, 4.6], [cx, 8, 4.3]]
    const left: S[] = [[cx - 2, 42, 3], [cx - 8, 41, 3], [cx - 9, 33, 2.9], [cx - 8.6, 22, 2.7]]
    const right: S[] = [[cx + 2, 34, 2.9], [cx + 8, 33, 2.9], [cx + 9, 26, 2.8], [cx + 8.6, 17, 2.6]]
    const axisOf = (x: number, y: number) => {
      // X of the nearest axis, for lighting each arm.
      if (Math.abs(x - cx) < 4 || y > 44) return cx
      if (x < cx) return y < 41 ? cx - 8.2 : cx - 5
      return y < 33 ? cx + 8.2 : cx + 5
    }
    return {
      w: 28,
      h: 74,
      frames: 1,
      period: 1,
      regions: [
        {
          colors: ['#24453b', '#3a6d58', '#86b89a'],
          ramp: ":-=+|#",
          edge: '#9fcdb0',
          // Vertical ribs of the cactus.
          pattern: (x, y, L) => (Math.abs(((x * 0.9) % 2) - 1) < 0.22 && L > 0.3 ? { ch: '|' } : hash(x * 3, y * 2) < 0.05 ? { ch: "'" } : undefined),
        },
      ],
      light(x, y) {
        const a = axisOf(x, y)
        return clamp(0.48 + (x - a) * 0.16)
      },
      at(x, y) {
        if (inStroke(x, y, trunk) || inEllipse(x, y, cx, 8, 4.3, 4)) return 0
        if (inStroke(x, y, left) || inEllipse(x, y, cx - 8.6, 22, 2.7, 2.6)) return 0
        if (arms === 'two' && (inStroke(x, y, right) || inEllipse(x, y, cx + 8.6, 17, 2.6, 2.5))) return 0
        return -1
      },
    }
  }
}

// ---------- Rocks ----------

export function rocks(seed: number): () => Model {
  return () => {
    const blobs: [number, number, number, number][] = [
      [16, 22, 13, 9],
      [32, 25, 9, 6],
      [6, 26, 6, 4],
    ]
    const inBlob = (x: number, y: number, [cx, cy, rx, ry]: [number, number, number, number], k: number) => {
      const a = Math.atan2(y - cy, x - cx)
      const f = 1 + 0.1 * Math.sin(a * 3 + seed + k) + 0.06 * Math.sin(a * 7 + seed * 2 + k)
      return inEllipse(x, y, cx, cy, rx * f, ry * f) && y <= cy + ry * 0.4
    }
    return {
      w: 44,
      h: 30,
      frames: 1,
      period: 1,
      regions: [
        {
          colors: ['#2c2c45', '#4a4a6a', '#8a89ad'],
          ramp: '.:-=+*#%',
          edge: '#9d9cc0',
          pattern: (x, y) => (hash(x * 2.3, y * 1.7) < 0.07 ? { ch: '.' } : undefined),
        },
      ],
      light(x, y) {
        for (const [i, b] of blobs.entries()) {
          if (inBlob(x, y, b, i)) return clamp(0.5 + (x - b[0]) / b[2] * 0.3 - (y - b[1]) / b[3] * 0.25)
        }
        return undefined
      },
      at(x, y) {
        for (const [i, b] of blobs.entries()) if (inBlob(x, y, b, i)) return 0
        return -1
      },
    }
  }
}

// ---------- Oasis (in the distance) ----------

export function oasis(): Model {
  const palms: { x: number; h: number; lean: number }[] = [
    { x: 14, h: 26, lean: -3 },
    { x: 22, h: 32, lean: 2 },
    { x: 40, h: 24, lean: 4 },
  ]
  return {
    w: 56,
    h: 40,
    frames: 1,
    period: 1,
    regions: [
      { colors: ['#151a30', '#1f2742', '#3a4a66'], ramp: ':=#', edge: '#3a4a66' },
      { colors: ['#1d3340', '#2a4a5a', '#7fb6c9'], ramp: '.-~', noEdge: true, pattern: (x, y) => (hash(x, y * 3) < 0.25 ? { ch: '~', tone: 2 } : undefined) },
      { colors: ['#182a26', '#23403a', '#4f7a66'], ramp: ':-=', edge: '#4f7a66' },
    ],
    at(x, y) {
      // Pool: moon reflection.
      if (inEllipse(x, y, 28, 37, 20, 2.6)) return 1
      for (const p of palms) {
        const base = 37
        const topY = base - p.h
        const tx = p.x + p.lean
        if (inStroke(x, y, [[p.x, base, 0.8], [p.x + p.lean * 0.6, base - p.h * 0.6, 0.65], [tx, topY, 0.55]])) return 0
        // Fronds: drooping arcs.
        for (let k = 0; k < 7; k++) {
          const side = k % 2 === 0 ? 1 : -1
          const reach = 6 + (k % 3) * 2.2
          const lift = 2.6 - (k % 3) * 1.1
          const pts: S[] = [
            [tx, topY, 0.45],
            [tx + side * reach * 0.45, topY - lift, 0.38],
            [tx + side * reach * 0.85, topY + 1.2, 0.3],
            [tx + side * reach, topY + 4.5, 0.22],
          ]
          if (inStroke(x, y, pts)) return 2
        }
      }
      // Bushes at the water's edge.
      if (inEllipse(x, y, 8, 35.5, 5, 2.4) || inEllipse(x, y, 48, 35, 6, 2.6)) return 2
      return -1
    },
  }
}

// ---------- Camel caravan ----------

function camelAt(x: number, y: number, ox: number, phase: number, f: number, frames: number): number {
  const X = x - ox
  const sw = Math.sin((f / frames) * TAU + phase)
  if (inEllipse(X, y, 18, 17, 10.5, 5.2)) return 0
  if (inEllipse(X, y, 16.5, 11.5, 5.8, 5) && y < 14.5) return 0
  if (inStroke(X, y, [[26, 15.5, 2.4], [29.5, 10, 1.7], [31.5, 5.5, 1.5]])) return 0
  if (inEllipse(X, y, 34, 5.6, 3.1, 1.8)) return 0
  if (inStroke(X, y, [[8, 15, 0.5], [6.8, 21, 0.45]])) return 1
  // Legs: front and back in opposite phase.
  const legs: [number, number][] = [
    [11, sw],
    [13.5, -sw],
    [23, -sw],
    [25.5, sw],
  ]
  for (const [lx, s] of legs) {
    if (inStroke(X, y, [[lx, 20, 1.1], [lx + s * 1.2, 26.5, 0.75], [lx + s * 2.2, 33, 0.6]])) return 1
  }
  return -1
}

export function caravan(): Model {
  const frames = 4
  return {
    w: 128,
    h: 35,
    frames,
    period: 1.6,
    regions: [
      { colors: ['#3d3350', '#5e4f6a', '#9c8aa0'], ramp: '.:-=+*', edge: '#a898ad' },
      { colors: ['#2e2840', '#463d58', '#7a6c88'], ramp: ':=' },
      // The camel driver and his cloak.
      { colors: ['#4a3a4e', '#6b5470', '#b78f86'], ramp: ':-=+', edge: '#c49a8e' },
    ],
    at(x, y, f) {
      for (const [ox, ph] of [[0, 0], [42, 1.7], [84, 3.1]] as const) {
        const r = camelAt(x, y, ox, ph, f, frames)
        if (r >= 0) return r
      }
      // The camel driver walks ahead, holding the lead rope.
      const sw = Math.sin((f / frames) * TAU)
      if (inEllipse(x, y, 121, 12.5, 1.9, 2) || inPoly(x, y, [[118.5, 15], [123.5, 15], [124.6, 27], [117.4, 27]])) return 2
      if (inStroke(x, y, [[119.6, 27, 0.6], [119.6 + sw * 1.4, 33, 0.5]]) || inStroke(x, y, [[122.4, 27, 0.6], [122.4 - sw * 1.4, 33, 0.5]])) return 2
      if (inStroke(x, y, [[37, 7, 0.22], [118, 17, 0.22]])) return 1
      return -1
    },
  }
}

// ---------- Fennec ----------

export function fennec(): Model {
  const frames = 4
  return {
    w: 38,
    h: 30,
    frames,
    period: 1.4,
    regions: [
      { colors: ['#7a6a58', '#b9a588', '#ecdcbc'], ramp: '.:-=+*#', edge: '#f4e6c8' },
      { colors: ['#9a6f68', '#c9948a', '#f0c2b5'], ramp: ':-=' },
      { colors: ['#8b7a66', '#b39f82', '#d9c6a6'], ramp: ':-=+*', edge: '#e2cfae' },
      { colors: ['#2a2420', '#3a322c', '#4a4038'], ramp: '#', noEdge: true },
    ],
    light(x, y) {
      if (inEllipse(x, y, 15, 18.6, 8.8, 5.6)) return clamp(0.88 - (y - 13.5) * 0.06)
      return undefined
    },
    at(x, y, f) {
      const ph = (f / frames) * TAU
      // Huge ears, twitching.
      const tw = 0.06 * Math.sin(ph * 2)
      const ears: P[][] = [
        [[23.5, 12.5], [21, 1.5], [26.6, 10.6]],
        [[26.4, 11.2], [29.5, 0.8], [29.8, 12]],
      ]
      for (const [i, ear] of ears.entries()) {
        const [rx, ry] = rotate(x, y, ear[0]![0], ear[0]![1], i === 0 ? tw : -tw)
        if (inPoly(rx, ry, ear)) {
          // Inner ear: the same triangle, shrunk toward its center.
          const cxE = (ear[0]![0] + ear[1]![0] + ear[2]![0]) / 3
          const cyE = (ear[0]![1] + ear[1]![1] + ear[2]![1]) / 3
          const shrink = ear.map(([px, py]) => [cxE + (px - cxE) * 0.55, cyE + (py - cyE) * 0.55] as const)
          return inPoly(rx, ry, shrink) ? 1 : 0
        }
      }
      if (inEllipse(x, y, 26, 14, 4.6, 3.8)) return 0
      if (inPoly(x, y, [[29, 12.8], [34, 15.6], [29, 17.4]])) return 0
      if (inStroke(x, y, [[21, 16.5, 3.4], [24.5, 15, 3]])) return 0
      if (inEllipse(x, y, 15, 18.6, 8.8, 5.6)) return 0
      // Bushy tail, dark tip.
      const ts = Math.sin(ph) * 0.8
      if (inStroke(x, y, [[7, 18, 1.6], [3.5, 20.5 + ts, 2.1], [1.6, 24 + ts, 1.6]])) return inEllipse(x, y, 1.6, 24.5 + ts, 1.6, 1.6) ? 3 : 2
      // Thin legs.
      const legs: [number, number][] = [
        [10, Math.sin(ph)],
        [12, -Math.sin(ph)],
        [19.5, -Math.sin(ph)],
        [21.5, Math.sin(ph)],
      ]
      for (const [lx, s] of legs) if (inStroke(x, y, [[lx, 21.5, 1.1], [lx + s * 1.3, 29, 0.65]])) return 2
      return -1
    },
    stamps: () => [
      { x: 27.6, y: 13, text: '@', color: '#14100c' },
      { x: 33.4, y: 15.2, text: 'o', color: '#1c1612' },
    ],
  }
}

// ---------- Scorpion (fluorescent under the moon) ----------

export function scorpion(): Model {
  const frames = 4
  return {
    w: 44,
    h: 22,
    frames,
    period: 1.2,
    regions: [
      { colors: ['#2a6f68', '#46bba8', '#a6f4e2'], ramp: '.:-=+*#', edge: '#b8fff0' },
      { colors: ['#22585a', '#3a9a8e', '#8fe6d4'], ramp: ':=+' },
    ],
    at(x, y, f) {
      const ph = (f / frames) * TAU
      // Segmented body.
      for (let i = 0; i < 6; i++) if (inEllipse(x, y, 13 + i * 2.6, 15.2, 2.2, 2.3 - i * 0.12)) return 0
      // Tail curled over the back, stinger at the tip.
      const tail: S[] = [
        [11.5, 14.6, 1.5],
        [9.4, 11.4, 1.35],
        [9.6, 7.8, 1.2],
        [11.8, 5.2, 1.05],
        [15, 4.4, 0.95],
        [17.4, 5.6, 0.8],
      ]
      if (inStroke(x, y, tail)) return 0
      if (inEllipse(x, y, 18.4, 6.6, 1.3, 1.1)) return 0
      if (inStroke(x, y, [[19.2, 7.2, 0.45], [20.4, 9, 0.25]])) return 1
      // Pincers.
      const open = 0.35 + 0.25 * Math.sin(ph)
      if (inStroke(x, y, [[27, 14.5, 1], [31, 11.5, 0.9]]) || inStroke(x, y, [[27, 16, 1], [31.5, 18, 0.9]])) return 1
      for (const py of [11, 18.5]) {
        if (inEllipse(x, y, 34, py, 2.8, 1.5) && !(x > 34.5 && Math.abs(y - py) < open)) return 0
      }
      // Legs, four on each side (side view: four visible).
      for (let i = 0; i < 4; i++) {
        const lx = 15 + i * 3
        const lift = Math.sin(ph + i * 1.6) * 1.1
        if (inStroke(x, y, [[lx, 16.5, 0.55], [lx - 1.5 + lift, 19.5, 0.45], [lx - 2.5 + lift, 21.6, 0.35]])) return 1
      }
      return -1
    },
  }
}

// ---------- Jerboa ----------

export function jerboa(): Model {
  const frames = 2
  return {
    w: 30,
    h: 24,
    frames,
    period: 1.1,
    regions: [
      { colors: ['#7d6b55', '#b49c7c', '#e6d1ae'], ramp: '.:-=+*', edge: '#f0dfbf' },
      { colors: ['#6a5a47', '#9a8468', '#d4bd98'], ramp: ':-=' },
      { colors: ['#e9e2d4', '#f4efe4', '#ffffff'], ramp: ':*#', noEdge: true },
      { colors: ['#2a241e', '#3a322a', '#4a4036'], ramp: '#', noEdge: true },
    ],
    at(x, y, f) {
      const ext = f === 1
      if (inEllipse(x, y, 14, 13, 4.6, 3.8)) return 0
      if (inEllipse(x, y, 18.6, 10, 3, 2.6)) return 0
      // Big ears.
      const [ex, ey] = rotate(x, y, 18, 8, 0.35)
      if (inEllipse(ex, ey, 18, 4.5, 1.1, 3.4)) return 1
      // Hind leg: powerful thigh and long foot.
      if (inEllipse(x, y, 11.5, 15, 3.2, 2.8)) return 0
      const foot: S[] = ext
        ? [[11, 17, 0.9], [9.5, 20.5, 0.6], [7, 23, 0.5]]
        : [[11, 17, 0.9], [13, 20.5, 0.6], [16.5, 21.5, 0.5]]
      if (inStroke(x, y, foot)) return 1
      if (inStroke(x, y, [[18.5, 14.5, 0.5], [19.5, 17, 0.4]])) return 1
      // Long tail ending in a black-and-white tuft.
      const tail: S[] = [[10, 14, 0.6], [5, 16.5, 0.45], [2.4, 13.5, 0.4], [1.6, 9.5, 0.35]]
      if (inStroke(x, y, tail)) return 1
      if (inEllipse(x, y, 1.6, 7.6, 1.4, 2.2)) return y < 7 ? 2 : 3
      return -1
    },
    stamps: () => [{ x: 19.8, y: 9.2, text: '@', color: '#14100c' }],
  }
}

// ---------- Sand viper ----------

export function viper(): Model {
  const frames = 4
  const len = 56
  return {
    w: 64,
    h: 14,
    frames,
    period: 1.8,
    regions: [
      {
        colors: ['#5a4a33', '#9a8159', '#d8bf8c'],
        ramp: '.:-=+*',
        edge: '#e6cf9c',
        // Dark diamonds along the back.
        pattern: x => (Math.sin(x * 0.9) > 0.55 ? { ch: '#', tone: 0 } : undefined),
      },
      { colors: ['#3a2f22', '#5a4a33', '#7a6448'], ramp: '#', noEdge: true },
    ],
    at(x, y, f) {
      const ph = (f / frames) * TAU
      const yAt = (t: number) => 7 + Math.sin(t * 0.24 - ph) * 2.6 * (0.35 + 0.65 * (t / len))
      // Body: a stroke that tapers toward the tail.
      const pts: S[] = []
      for (let i = 0; i <= 14; i++) {
        const t = (i / 14) * len
        pts.push([t + 1, yAt(t), 0.35 + 1.25 * Math.min(1, t / (len * 0.4))])
      }
      if (inStroke(x, y, pts)) return 0
      const hy = yAt(len)
      if (inEllipse(x, y, len + 3.6, hy, 3.4, 1.9)) return 0
      // Small forked tongue.
      if (f % 2 === 0 && inStroke(x, y, [[len + 7, hy + 0.3, 0.2], [len + 8.6, hy + 0.3, 0.2]])) return 1
      return -1
    },
    stamps: f => {
      const hy = 7 + Math.sin(56 * 0.24 - (f / 4) * TAU) * 2.6
      return [{ x: 60.4, y: hy - 1.2, text: '.', color: '#16110a' }]
    },
  }
}
