// The creatures and plants of the koi pond, seen from above, as vector
// shapes. Each animal faces right (+x); `ascii.ts` renders them as
// characters and the scene turns them along their path.

import { clamp, hash, inEllipse, inPoly, rotate } from './ascii'
import type { Model, Region } from './ascii'

const TAU = Math.PI * 2

// ---------- Koi ----------

// The koi varieties: body tint and how the patches fall.
export type KoiKind = 'kohaku' | 'tancho' | 'showa' | 'yamabuki' | 'asagi' | 'ogon'

const WHITE: Region['colors'] = ['#a9a397', '#ddd7cb', '#fffaf0']
const RED: Region['colors'] = ['#9e2f1c', '#df542d', '#ff8d5e']
const BLACK: Region['colors'] = ['#141418', '#26262d', '#45454f']
const GOLD: Region['colors'] = ['#a8700f', '#e6a92c', '#ffe08a']
const SLATE: Region['colors'] = ['#3f5a6e', '#6a8aa0', '#a3bfd0']
const PLATINUM: Region['colors'] = ['#9aa3a8', '#d2d8da', '#ffffff']
const FIN: Region['colors'] = ['#8fa9b0', '#cfe0e2', '#ffffff']

// A smooth field for the patches, fixed to the fish's own body.
function blob(x: number, y: number, seed: number): number {
  return Math.sin(x * 0.33 + seed) * Math.sin(y * 0.55 + seed * 1.7) + 0.75 * Math.sin(x * 0.16 - y * 0.27 + seed * 2.3)
}

// The koi's layout, in model units: tail fan from x 0 to X0, body from X0
// to X1 (the snout), along y = CY. The scene bends the fish at two joints:
// JOINT (mid-body) and X0 (the root of the tail).
export const KOI = { X0: 11, X1: 52, CY: 13, JOINT: 28, W: 56, H: 26 }

// One part of a koi: 'front' (head, fore body, pectoral fins), 'rear'
// (hind body, pelvic fins) or 'tail' (the fan). Drawn still: the scene
// sways the rear and the tail around their joints.
export function koi(kind: KoiKind, seed: number, part: 'front' | 'rear' | 'tail'): () => Model {
  return () => {
    const { X0, X1, CY, JOINT } = KOI
    const MAXW = 6.6
    const half = (t: number) => (t <= 0 || t >= 1 ? 0 : 0.9 * (1 - t) + MAXW * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.7))
    const fins: Region = { colors: FIN, ramp: ".:-~", sparse: 0.7, edge: '#e8f2f2' }
    const regions: Region[] =
      kind === 'yamabuki'
        ? [{ colors: GOLD, ramp: '.:-=+*#%' }, fins]
        : kind === 'ogon'
          ? [{ colors: PLATINUM, ramp: '.:-=+*#%' }, fins]
          : kind === 'asagi'
            ? [{ colors: SLATE, ramp: '.:-=+*#%', pattern: (x, y) => (hash(x * 2, y) < 0.18 ? { ch: 'x', tone: 0 } : undefined) }, fins, { colors: RED, ramp: '.:-=+*#' }]
            : [{ colors: WHITE, ramp: '.:-=+*' }, fins, { colors: RED, ramp: ':-=+*#%' }, { colors: BLACK, ramp: ':-=+*#%@' }]
    // Each part overlaps the next by a little, so no seam opens as it bends.
    const inPart = (x: number) => (part === 'front' ? x >= JOINT - 1 : part === 'rear' ? x >= X0 - 0.5 && x < JOINT + 1.5 : x < X0 + 1)
    return {
      w: KOI.W,
      h: KOI.H,
      frames: 1,
      period: 1,
      regions,
      light(x, y) {
        if (x < X0 || x > X1) return undefined
        const h = half((x - X0) / (X1 - X0)) || 1
        const v = (y - CY) / h
        // Lit along the back's ridge.
        return clamp(0.92 - 0.5 * Math.abs(v) - 0.12 * v)
      },
      at(x, y) {
        if (!inPart(x)) return -1
        const yy = y - CY
        const t = (x - X0) / (X1 - X0)
        const h = half(t)
        if (part !== 'tail' && x >= X0 && x <= X1 && Math.abs(yy) <= h) {
          if (kind === 'yamabuki' || kind === 'ogon') return 0
          if (kind === 'asagi') return Math.abs(yy) > h * 0.62 && t < 0.85 ? 2 : 0
          // The red cap of a tancho, the head of a kohaku.
          if (kind === 'tancho') return inEllipse(x, yy, X1 - 7, 0, 3.4, 2.9) ? 2 : 0
          const v = blob(x, yy, seed)
          if (kind === 'showa' && blob(x * 1.3, yy * 1.2, seed + 4) > 0.55 && t < 0.9) return 3
          if (t > 0.86) return kind === 'kohaku' && Math.abs(yy) < h * 0.8 && t < 0.97 ? 2 : 0
          return v > 0.05 ? 2 : 0
        }
        if (part === 'front') {
          // Pectoral fins, swept back.
          for (const s of [-1, 1]) {
            const fx = X1 - 13
            const fy = s * (half((fx - X0) / (X1 - X0)) + 0.4)
            const [rx, ry] = rotate(x, yy, fx, fy, s * 0.5)
            if (inEllipse(rx, ry, fx - 3, fy + s * 1.6, 3.6, 1.9)) return 1
          }
        }
        if (part === 'rear') {
          // Pelvic fins, smaller.
          for (const s of [-1, 1]) {
            const fx = X0 + 15
            const fy = s * (half((fx - X0) / (X1 - X0)) + 0.2)
            if (inEllipse(x, yy, fx - 2.4, fy + s * 1.1, 2.4, 1.2)) return 1
          }
        }
        if (part === 'tail' && x >= 0 && x < X0 + 1) {
          // The tail fan: forked, flowing.
          const d = X0 - x
          const spread = 1 + Math.max(0, d) * 0.62
          const notch = d > 4 ? (d - 4) * 0.42 : -1
          const a = Math.abs(yy)
          if (a <= spread && a >= notch) return 1
        }
        return -1
      },
      stamps: () =>
        part === 'front'
          ? [
              { x: X1 - 3.5, y: CY - 2.6, text: '.', color: '#1a1a1a' },
              { x: X1 - 3.5, y: CY + 2.2, text: '.', color: '#1a1a1a' },
            ]
          : [],
    }
  }
}

// ---------- Lily pad ----------

// A round leaf with its notch, veins radiating from the center.
export function lilyPad(r: number, notchAt: number, seed: number): () => Model {
  return () => {
    const c = r + 1
    return {
      w: c * 2,
      h: c * 2,
      frames: 1,
      period: 1,
      regions: [
        {
          colors: ['#1f4a26', '#3d7a3c', '#7fb865'],
          ramp: ".:-=+*#",
          pattern(x, y) {
            const a = Math.atan2(y - c, x - c)
            // Veins: thin rays.
            const k = ((a + Math.PI) / TAU) * 14 + seed
            if (Math.abs(k - Math.round(k)) < 0.07) return { ch: '/', tone: 2 }
            return undefined
          },
        },
        { colors: ['#4d3a1c', '#8a6a2a', '#c49a46'], ramp: ':-=', noEdge: true },
      ],
      light(x, y) {
        return clamp(0.8 - 0.25 * (Math.hypot(x - c, y - c) / r) + 0.15 * Math.sin(x * 0.3 + seed))
      },
      at(x, y) {
        const d = Math.hypot(x - c, y - c)
        if (d > r) return -1
        // The notch, a thin wedge from the center to the rim.
        let a = Math.atan2(y - c, x - c) - notchAt
        a = Math.atan2(Math.sin(a), Math.cos(a))
        if (Math.abs(a) < 0.16 && d > 0.8) return -1
        // A few brown spots of age.
        if (hash(x * 0.4 + seed, y * 0.4) > 0.985) return 1
        return 0
      },
    }
  }
}

// ---------- Lotus flower (seen from above) ----------

export function lotus(): Model {
  const c = 9
  return {
    w: c * 2,
    h: c * 2,
    frames: 1,
    period: 1,
    regions: [
      { colors: ['#b0567c', '#ee8fb4', '#ffd7e6'], ramp: ".:-=+*" },
      { colors: ['#c98a9f', '#ffc6d8', '#fff2f6'], ramp: ".:-=+" },
      { colors: ['#b8901c', '#f0c53a', '#ffe98c'], ramp: ':*#', noEdge: true },
    ],
    light(x, y) {
      return clamp(0.95 - 0.35 * (Math.hypot(x - c, y - c) / c))
    },
    at(x, y) {
      const dx = x - c
      const dy = y - c
      const d = Math.hypot(dx, dy)
      if (d < 1.8) return 2
      const a = Math.atan2(dy, dx)
      // Outer ring of 8 pointed petals, inner ring of 6 turned.
      const outer = 8.6 * Math.pow(Math.abs(Math.cos((a * 8) / 2)), 0.7)
      const inner = 5.4 * Math.pow(Math.abs(Math.cos((a * 6) / 2 + 0.9)), 0.6)
      if (d <= inner) return 1
      if (d <= outer) return 0
      return -1
    },
  }
}

// ---------- Dragonfly (seen from above) ----------

export function dragonfly(): Model {
  const frames = 3
  const cy = 12
  return {
    w: 34,
    h: 24,
    frames,
    period: 0.25,
    regions: [
      { colors: ['#14505a', '#2a8c96', '#7fd6dc'], ramp: ':=+*#' },
      { colors: ['#7f9fa6', '#c8e2e6', '#ffffff'], ramp: ".:-", sparse: 0.55, edge: '#d8f0f2' },
      { colors: ['#0e2a30', '#1e4a52', '#38707a'], ramp: '@', noEdge: true },
    ],
    light: () => 0.8,
    at(x, y, f) {
      const yy = y - cy
      // Eyes, thorax, long thin abdomen.
      if (inEllipse(x, yy, 30.5, 0, 2.2, 2.6)) return 2
      if (inEllipse(x, yy, 26, 0, 3, 1.8)) return 0
      if (x >= 2 && x < 23.5 && Math.abs(yy) <= 0.75 + (x > 20 ? 0.3 : 0)) return 0
      // Four wings, a blur that shivers.
      const k = [1, 0.82, 0.94][f]!
      for (const s of [-1, 1]) {
        if (inPoly(x, yy, [[27, 0], [29.5, s * 11 * k], [26.5, s * 11.5 * k], [23.5, s * 1]])) return 1
        if (inPoly(x, yy, [[23.5, 0], [24.5, s * 10 * k], [21.5, s * 10.5 * k], [20.5, s * 1]])) return 1
      }
      return -1
    },
  }
}

// ---------- Rock (seen from above) ----------

// A bumpy, mossy stone on the pond's rim.
export function rock(rx: number, ry: number, seed: number): () => Model {
  return () => {
    const cx = rx + 1
    const cy = ry + 1
    return {
      w: cx * 2,
      h: cy * 2,
      frames: 1,
      period: 1,
      regions: [
        { colors: ['#2e332f', '#5d625c', '#9a9e94'], ramp: ".:-=+*#%" },
        { colors: ['#22401f', '#3f6b33', '#6f9a52'], ramp: ".:;", noEdge: true },
      ],
      light(x, y) {
        // Lit from the top left.
        return clamp(0.75 - 0.35 * ((x - cx) / rx + (y - cy) / ry) * 0.5 - 0.2 * Math.hypot((x - cx) / rx, (y - cy) / ry))
      },
      at(x, y) {
        const a = Math.atan2(y - cy, x - cx)
        const bump = 1 + 0.08 * Math.sin(a * 3 + seed) + 0.05 * Math.sin(a * 7 + seed * 2)
        if (!inEllipse(x, y, cx, cy, rx * bump, ry * bump)) return -1
        // Moss in the hollows.
        return Math.sin(x * 0.4 + seed) + Math.sin(y * 0.5 - seed) > 1.2 ? 1 : 0
      },
    }
  }
}
