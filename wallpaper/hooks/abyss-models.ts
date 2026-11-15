// The abyss creatures and scenery, as vector shapes.
// Each one faces right; `ascii.ts` renders them as characters.
// Bodies are dark: light comes from the light organs (bright stamps, to
// which the scene adds a halo).

import { clamp, fusiform, hash, inEllipse, inPoly, inStroke, rotate } from './ascii'
import type { Model } from './ascii'

const TAU = Math.PI * 2

type P = readonly [number, number]
type S = [number, number, number]

// Screen position of a model point, to place a halo on it.
export type Spot = { x: number; y: number }

// ---------- Giant squid ----------
// It swims mantle first: the mantle tip and fins in front (on the right),
// then the head, the eye, and the arms trailing behind.

export const SQUID_EYE: Spot = { x: 52.5, y: 15.2 }

export function giantSquid(): Model {
  const y0 = 17
  const frames = 4
  const fins: P[] = [[86, y0], [97, y0 - 9.5], [107.5, y0], [97, y0 + 9.5]]
  return {
    w: 110,
    h: 34,
    frames,
    period: 2.6,
    regions: [
      {
        colors: ['#4a1d19', '#7d3328', '#b8624d'],
        ramp: '.:-=+*#%',
        pattern: (x, y) => (hash(x * 1.3, y * 0.9) < 0.1 ? { ch: 'o', tone: 0 } : undefined),
      },
      { colors: ['#3d1814', '#6b2b22', '#9c4d3c'], ramp: '.:-=+' },
      { colors: ['#43201a', '#6e3326', '#a15a46'], ramp: ':-=+*' },
      { colors: ['#4a2a22', '#7f4a3c', '#c88d77'], ramp: ':o' },
      { colors: ['#a9c8d8', '#cfe6f2', '#f2fbff'], ramp: 'O', noEdge: true },
    ],
    light(x, y) {
      if (x < 54 || x > 104) return undefined
      const t = (x - 54) / 50
      const h = 8.6 * Math.pow(1 - t, 0.55) * (0.8 + 0.2 * Math.min(1, t * 6))
      const v = (y - y0) / Math.max(0.5, h)
      return clamp(0.82 - 0.45 * ((v + 1) / 2))
    },
    at(x, y, f) {
      const ph = (f / frames) * TAU
      // Mantle: wide at the head end, tapering to a point at the front.
      if (x >= 54 && x <= 104) {
        const t = (x - 54) / 50
        const h = 8.6 * Math.pow(1 - t, 0.55) * (0.8 + 0.2 * Math.min(1, t * 6))
        if (Math.abs(y - y0) <= h) return 0
      }
      // Diamond-shaped fins, gently flapping.
      const k = 1 - 0.18 * Math.sin(ph)
      if (inPoly(x, y0 + (y - y0) / k, fins)) return 1
      // Head and large eye.
      if (inEllipse(x, y, SQUID_EYE.x, SQUID_EYE.y, 1.5, 1.4)) return 4
      if (inEllipse(x, y, 50.5, y0, 7, 6)) return 2
      // Eight arms trailing and undulating.
      for (let a = 0; a < 8; a++) {
        const spread = (a - 3.5) * 1.5
        const pts: S[] = []
        for (let i = 0; i <= 8; i++) {
          const s = i / 8
          pts.push([45 - s * 24, y0 + spread * (0.6 + s * 1.5) + Math.sin(s * 4 + ph + a * 0.7) * 2 * s, 1.15 * (1 - s) + 0.32])
        }
        if (inStroke(x, y, pts)) return 2
      }
      // Two long club-tipped tentacles.
      for (const side of [-1, 1]) {
        const pts: S[] = []
        for (let i = 0; i <= 10; i++) {
          const s = i / 10
          const club = s > 0.82 ? 0.9 : 0.32
          pts.push([44 - s * 41, y0 + side * (2 + s * 9) + Math.sin(s * 5 + ph + side) * 3 * s, club * 1.1])
        }
        if (inStroke(x, y, pts)) return 3
      }
      return -1
    },
    stamps: () => [{ x: SQUID_EYE.x, y: SQUID_EYE.y - 0.6, text: '@', color: '#0a1620' }],
  }
}

// ---------- Deep-sea anglerfish ----------

export const ANGLER_LURE: Spot = { x: 40.5, y: 3.6 }

export function angler(): Model {
  const frames = 3
  const cy = 19
  const mouth: P[] = [[25, cy + 1.5], [37, cy - 5.5], [37.5, cy + 8.5]]
  const tail: P[] = [[8, cy - 0.8], [0.5, cy - 7], [2.2, cy], [0.5, cy + 7], [8, cy + 0.8]]
  return {
    w: 46,
    h: 34,
    frames,
    period: 2.2,
    regions: [
      {
        colors: ['#26211e', '#453b34', '#76685b'],
        ramp: '.:-=+*#',
        pattern: (x, y) => (hash(x * 1.9, y * 1.4) < 0.07 ? { ch: "'", tone: 2 } : undefined),
      },
      { colors: ['#0d0807', '#140c0a', '#1d1310'], ramp: ' ', noEdge: true },
      { colors: ['#2e2723', '#4a3f37', '#6f6255'], ramp: ":-'" },
      { colors: ['#4d4238', '#7a6b5c', '#a89480'], ramp: '|' },
      { colors: ['#7ff6ff', '#bffbff', '#f2ffff'], ramp: '@', noEdge: true },
    ],
    light(x, y) {
      if (!inEllipse(x, y, 22, cy, 14, 11)) return undefined
      return clamp(0.85 - (y - (cy - 11)) / 22 * 0.55 + (x - 22) * 0.008)
    },
    at(x, y, f) {
      const ph = (f / frames) * TAU
      if (inEllipse(x, y, ANGLER_LURE.x, ANGLER_LURE.y, 1, 0.95)) return 4
      // The lure at the end of its stalk, swaying.
      const tip = { x: ANGLER_LURE.x + Math.sin(ph) * 0.3, y: ANGLER_LURE.y }
      if (inStroke(x, y, [[28, cy - 9.5, 0.4], [31, cy - 14, 0.35], [36, cy - 16.5, 0.32], [tip.x - 1, tip.y + 0.6, 0.3]])) return 3
      // Round, heavy body, huge mouth.
      if (inEllipse(x, y, 22, cy, 14, 11) || inEllipse(x, y, 31, cy + 1.5, 7.5, 8.5)) {
        if (inPoly(x, y, mouth)) return 1
        return 0
      }
      // Tail and fins.
      if (x < 12 && Math.abs(y - cy) < 3.4 * (x / 12) + 1) return 0
      const [tx, ty] = rotate(x, y, 8, cy, 0.18 * Math.sin(ph))
      if (inPoly(tx, ty, tail)) return 2
      if (inPoly(x, y, [[14, cy - 9], [9, cy - 13.5], [19, cy - 10.5]])) return 2
      const [px, py] = rotate(x, y, 20, cy + 4, -0.25 * Math.sin(ph + 1))
      if (inPoly(px, py, [[20, cy + 4], [13, cy + 9.5], [16, cy + 10.5], [23, cy + 6]])) return 2
      return -1
    },
    stamps: () => [
      { x: 25.5, y: cy - 0.6, text: 'VvVvV', color: '#e8e0cc' },
      { x: 29.8, y: cy - 2.6, text: 'vVv', color: '#e8e0cc' },
      { x: 26.4, y: cy + 3.6, text: '^A^A^', color: '#d9d0ba' },
      { x: 30.8, y: cy + 5.6, text: 'A^A', color: '#d9d0ba' },
      { x: 30.2, y: cy - 7.4, text: 'o', color: '#c9f3ff' },
    ],
  }
}

// ---------- Dumbo octopus ----------
// A small, pale, bell-shaped deep-sea octopus: its ear-like fins flap
// slowly and the web of its arms undulates.

export const DUMBO_EYE: { x: number; y: number } = { x: 20.5, y: 13.5 }

export function dumbo(): Model {
  const frames = 4
  const cx = 15
  return {
    w: 32,
    h: 36,
    frames,
    period: 3.2,
    regions: [
      {
        colors: ['#a8695c', '#d79a86', '#ffd9c8'],
        ramp: '.:-=+*#',
        pattern: (x, y) => (hash(x * 1.7, y * 1.2) < 0.06 ? { ch: '.', tone: 0 } : undefined),
      },
      { colors: ['#b8786a', '#e3aa96', '#ffe4d6'], ramp: ':-=+' },
      { colors: ['#9a5a4e', '#c9846f', '#f2b9a4'], ramp: ".:-='", sparse: 0.9 },
      { colors: ['#1a0e0b', '#2a1813', '#3d241c'], ramp: '@', noEdge: true },
    ],
    light(x, y) {
      if (y > 22) return undefined
      return clamp(0.95 - (y - 2) / 22 * 0.5 - Math.abs(x - cx) * 0.012)
    },
    at(x, y, f) {
      const ph = (f / frames) * TAU
      if (inEllipse(x, y, DUMBO_EYE.x, DUMBO_EYE.y, 1.2, 1.2)) return 3
      // Dome-shaped head.
      if (inEllipse(x, y, cx, 12, 9.5, 10) && y < 21) return 0
      // Ear-like fins, flapping.
      const lift = Math.sin(ph) * 2.2
      for (const side of [-1, 1]) {
        const ex = cx + side * 9.8
        const ey = 4.5 - lift * 0.5
        const [rx, ry] = rotate(x, y, ex, ey, side * (0.55 + Math.sin(ph) * 0.3))
        if (inEllipse(rx, ry, ex, ey, 3.1, 1.9)) return 1
      }
      // Webbed skirt: flares out below the head, with a scalloped, undulating edge.
      if (y >= 19 && y <= 34) {
        const s2 = (y - 19) / 15
        const half = 9.5 + s2 * 4.5 + Math.sin(ph + 1) * 1.2 * s2
        const scallop = 32 + Math.sin((x - cx) * 0.9 + ph) * 1.6
        if (Math.abs(x - cx) <= half && y <= scallop) {
          for (const k of [-0.85, -0.42, 0, 0.42, 0.85]) {
            if (Math.abs(x - (cx + k * half)) < 0.5) return 1
          }
          return 2
        }
      }
      return -1
    },
    stamps: () => [{ x: DUMBO_EYE.x - 0.4, y: DUMBO_EYE.y - 0.5, text: 'o', color: '#ffe8dc' }],
  }
}

// ---------- Ctenophore (sea gooseberry) ----------
// A transparent body; its comb rows diffract light into a rainbow that
// flows from top to bottom.

export function ctenophore(): Model {
  const frames = 3
  const cx = 14
  const cy = 15
  const rx = 8.5
  const ry = 13
  const combs = ['#53f2ff', '#a78bff', '#ff7ad9']
  return {
    w: 28,
    h: 60,
    frames,
    period: 1.5,
    regions: [
      { colors: ['#1d3850', '#2e5674', '#6d9fc2'], ramp: ".'", sparse: 0.3, edge: '#7fb2d4' },
      { colors: [combs[0]!, combs[0]!, combs[0]!], ramp: '=', noEdge: true },
      { colors: [combs[1]!, combs[1]!, combs[1]!], ramp: '=', noEdge: true },
      { colors: [combs[2]!, combs[2]!, combs[2]!], ramp: '=', noEdge: true },
      { colors: ['#3e6d92', '#5d93bd', '#9cc9ea'], ramp: '|' },
    ],
    at(x, y, f) {
      const ph = (f / frames) * TAU
      if (inEllipse(x, y, cx, cy, rx, ry)) {
        const v = (y - cy) / ry
        const half = rx * Math.sqrt(Math.max(0, 1 - v * v))
        // Four visible comb rows, running like meridians.
        for (const k of [-0.78, -0.3, 0.3, 0.78]) {
          if (Math.abs(x - (cx + k * half)) < 0.75 && Math.abs(v) < 0.88) {
            return 1 + ((Math.floor(y / 2.4) + f) % 3)
          }
        }
        return 0
      }
      // Two trailing tentacles, with their filaments.
      for (const side of [-1, 1]) {
        const pts: S[] = []
        for (let i = 0; i <= 10; i++) {
          const s = i / 10
          pts.push([cx + side * (2 + s * 3) + Math.sin(s * 5 + ph + side) * 2.4 * s, cy + ry - 1 + s * 30, 0.22])
        }
        if (inStroke(x, y, pts)) return 4
      }
      return -1
    },
  }
}

// ---------- Gulper eel (pelican eel) ----------
// A huge pouch-like mouth, a whip-like body, and a glowing tail tip.

export const EEL_TAIL: Spot = { x: 2.5, y: 10 }

export function gulper(): Model {
  const frames = 4
  return {
    w: 100,
    h: 22,
    frames,
    period: 3.2,
    regions: [
      { colors: ['#1d2229', '#353e49', '#5d6b7a'], ramp: '.:-=+*' },
      { colors: ['#14181d', '#20262d', '#2e3640'], ramp: ":'", edge: '#5d6b7a' },
      { colors: ['#ff8ad8', '#ffb8e8', '#ffe6f6'], ramp: '@', noEdge: true },
    ],
    at(x, y, f) {
      const ph = (f / frames) * TAU
      if (inEllipse(x, y, EEL_TAIL.x + 0.6, EEL_TAIL.y + Math.sin(8 - ph) * 4.5, 1, 0.9)) return 2
      // The pouch: the huge lower jaw, slightly open.
      if (inPoly(x, y, [[80, 9.5], [97, 5], [98, 7.5], [93, 16.5], [82, 13.5]])) return y > 8.5 && x > 84 && y < 12 + (x - 84) * 0.1 ? 1 : 0
      if (inEllipse(x, y, 84, 9.5, 5, 3.2)) return 0
      // The whip-like body, undulating more and more toward the tail.
      const pts: S[] = []
      for (let i = 0; i <= 16; i++) {
        const s = i / 16
        pts.push([80 - s * 77, 10 + Math.sin(s * 8 - ph) * 4.5 * s, 2.6 * (1 - s) + 0.3])
      }
      if (inStroke(x, y, pts)) return 0
      return -1
    },
    stamps: () => [{ x: 94, y: 6.4, text: 'o', color: '#cfe6f2' }],
  }
}

// ---------- Scenery ----------

// Hydrothermal vent: a lumpy mineral column, with red-plumed tube worms at
// its base.
export function vent(): Model {
  return {
    w: 60,
    h: 62,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: ['#1f1a17', '#3a302a', '#6a5a4c'],
        ramp: '.:-=+*#%',
        pattern: (x, y) => (hash(x * 2, y * 1.3) < 0.1 ? { ch: 'o' } : undefined),
      },
      { colors: ['#d8d2c4', '#ece6d8', '#ffffff'], ramp: '|' },
      { colors: ['#c2263a', '#ff4d5e', '#ff8a94'], ramp: '%#', noEdge: true },
      { colors: ['#262019', '#3b3026', '#5c4b3b'], ramp: '.:-=+*#' },
    ],
    light(x) {
      return clamp(0.85 - Math.abs(x - 30) * 0.03)
    },
    at(x, y) {
      // Chimney: wider at the bottom, lumpy.
      const t = clamp((y - 6) / 50)
      const half = 2.6 + t * 6.5 + Math.sin(y * 0.9) * 0.9 + Math.sin(y * 2.3 + 1) * 0.5
      if (y > 6 && Math.abs(x - 30) <= half) return 0
      if (inEllipse(x, y, 30, 6.5, 3.4, 2.2)) return 0
      // Rocky base.
      if (inEllipse(x, y, 30, 64, 30, 12)) return 3
      // Tube worms: white tubes, red plumes.
      for (const [tx, th] of [[14, 14], [17.5, 18], [21, 12], [40, 15], [43.5, 11], [46.5, 17]] as const) {
        const top = 56 - th
        if (Math.abs(x - tx) < 0.7 && y > top + 2 && y < 57) return 1
        if (inEllipse(x, y, tx, top + 1, 1.7, 2.1)) return 2
      }
      return -1
    },
  }
}

// Glass sponge: a tall, pale vase with a lattice wall.
export function glassSponge(): Model {
  return {
    w: 22,
    h: 50,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: ['#4e6470', '#7d97a5', '#b9d0db'],
        ramp: ".:'",
        sparse: 0.9,
        edge: '#a9c2cf',
        pattern: (x, y) => {
          const a = (x * 1.3 + y * 0.7) % 3
          const b = (x * 1.3 - y * 0.7 + 99) % 3
          return a < 0.6 || b < 0.6 ? { ch: a < 0.6 ? '/' : '\\', tone: 2 } : { ch: ' ' }
        },
      },
      { colors: ['#2a2420', '#40362e', '#62533f'], ramp: '.:-=+*' },
    ],
    at(x, y) {
      if (inEllipse(x, y, 11, 50, 11, 5)) return 1
      if (y < 4 || y > 47) return -1
      const s = (y - 4) / 43
      const half = 3 + 5.2 * Math.sin(s * Math.PI * 0.9 + 0.25) * (1 - s * 0.35)
      return Math.abs(x - 11) <= half ? 0 : -1
    },
  }
}

// Sea pen: a stalk and barbs.
export function seaPen(): Model {
  return {
    w: 14,
    h: 44,
    frames: 1,
    period: 1,
    regions: [
      { colors: ['#6a4a5c', '#a3728a', '#e0b2c8'], ramp: "'-=" },
      { colors: ['#4d3442', '#7d5468', '#b0839a'], ramp: '|' },
    ],
    at(x, y) {
      if (Math.abs(x - 7) < 0.5 && y > 6 && y < 43) return 1
      if (y > 6 && y < 32) {
        const s = (y - 6) / 26
        const half = 5.5 * Math.sin(s * Math.PI)
        if (Math.abs(x - 7) <= half && Math.floor(y / 2) % 2 === 0) return 0
      }
      return -1
    },
  }
}

// Dark seabed rocks.
export function rocks(seed: number, w: number): () => Model {
  return () => ({
    w,
    h: 22,
    frames: 1,
    period: 1,
    regions: [
      {
        colors: ['#14181c', '#232a31', '#3e4a55'],
        ramp: '.:-=+*#',
        pattern: (x, y) => (hash(x * 2 + seed, y) < 0.06 ? { ch: 'o' } : undefined),
      },
    ],
    at(x, y) {
      for (let i = 0; i < 4; i++) {
        const cx = (w * (i + 0.5)) / 4 + (hash(seed, i) - 0.5) * 8
        const ry = 7 + hash(i, seed) * 9
        const rx = w / 5 + hash(seed + 3, i) * 6
        const a = Math.atan2(y - 22, x - cx)
        const k = 1 + 0.1 * Math.sin(a * 5 + seed + i)
        if (inEllipse(x, y, cx, 22, rx * k, ry * k)) return 0
      }
      return -1
    },
  })
}

// Small lanternfish, for schools: dark body, glowing dots.
export function lanternfish(): Model {
  const frames = 2
  return {
    w: 16,
    h: 6,
    frames,
    period: 0.6,
    regions: [
      { colors: ['#2a3442', '#45566b', '#7389a2'], ramp: ':=+' },
      { colors: ['#6ff4ff', '#b5fbff', '#ffffff'], ramp: '.', noEdge: true },
    ],
    at(x, y, f) {
      if (x > 4 && x < 15.5) {
        const h = 2.4 * fusiform((x - 4) / 11.5, 0.8, 0.45) + 0.3
        if (Math.abs(y - 3) <= h) return y > 3.4 && Math.floor(x) % 2 === 0 ? 1 : 0
      }
      const [tx, ty] = rotate(x, y, 4.4, 3, 0.35 * Math.sin((f / frames) * TAU))
      if (inPoly(tx, ty, [[4.6, 2.4], [0.5, 0.4], [1.6, 3], [0.5, 5.6], [4.6, 3.6]])) return 0
      return -1
    },
  }
}
