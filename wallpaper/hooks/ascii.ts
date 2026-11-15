// A small ASCII renderer: a vector shape becomes a grid of solid, shaded,
// colored characters.
//
// Units: x in cell widths, y too (same scale), which keeps the true
// proportions. One line of text (line height 1.2) is ASPECT units tall.
//
// For each cell, 4×4 samples tell which region of the shape lies there.
// Full cell: a character from the density ramp, according to the light
// (lit from above, adjustable). Edge cell: an outline character chosen
// from the direction of the edge (/ \ _ - ( ) | ' . ,).

export const ASPECT = 2

export type Region = {
  // Shadow, mid and light tints.
  colors: [string, string, string]
  // Ramp from lightest to densest.
  ramp?: string
  // Outline color (otherwise the light tint at the top, the mid tint at the bottom).
  edge?: string
  // Translucent body: share of interior cells that are drawn.
  sparse?: number
  // Pattern: can change the character or the tint (0, 1, 2) of a full cell.
  pattern?: (x: number, y: number, L: number) => { ch?: string; tone?: 0 | 1 | 2 } | undefined
  // Light offset specific to the region.
  lift?: number
  // No outline: the edge is filled like the interior.
  noEdge?: boolean
  // Dithering amplitude (0.012 by default).
  dither?: number
}

export type Stamp = { x: number; y: number; text: string; color: string }

export type Model = {
  w: number
  h: number
  frames: number
  period: number
  regions: Region[]
  // Region at point (x, y) in frame f, or -1.
  at: (x: number, y: number, f: number) => number
  // Light 0..1; by default, a vertical gradient within each column.
  light?: (x: number, y: number, f: number) => number | undefined
  stamps?: (f: number) => Stamp[]
  // Playback order of the frames (by default 0, 1, …, frames-1).
  sequence?: number[]
}

const RAMP = ".:-=+*#%@"

// One frame: color → lines of text (spaces where the color is absent).
export type Frame = Map<string, string[]>

export function rasterize(m: Model, f: number, scale = 1): { frame: Frame; cols: number; rows: number } {
  const cols = Math.ceil(m.w * scale)
  const rows = Math.ceil((m.h * scale) / ASPECT)
  const S = 4
  type Cell = { reg: number; cov: number; dx: number; dy: number }
  const cells: (Cell | null)[] = new Array(cols * rows).fill(null)

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const counts = new Map<number, number>()
      let hits = 0
      let sx = 0
      let sy = 0
      for (let j = 0; j < S; j++) {
        for (let i = 0; i < S; i++) {
          const x = (c + (i + 0.5) / S) / scale
          const y = ((r + (j + 0.5) / S) * ASPECT) / scale
          const reg = m.at(x, y, f)
          if (reg < 0) continue
          hits++
          counts.set(reg, (counts.get(reg) ?? 0) + 1)
          sx += i - (S - 1) / 2
          sy += j - (S - 1) / 2
        }
      }
      if (hits === 0) continue
      let reg = -1
      let best = 0
      for (const [k, v] of counts) {
        if (v > best || (v === best && k > reg)) {
          best = v
          reg = k
        }
      }
      cells[r * cols + c] = { reg, cov: hits / (S * S), dx: sx / hits, dy: sy / hits }
    }
  }

  // Filled extent of each column, for the default lighting.
  const top = new Array(cols).fill(Infinity)
  const bottom = new Array(cols).fill(-Infinity)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (cells[r * cols + c]) {
        top[c] = Math.min(top[c], r)
        bottom[c] = Math.max(bottom[c], r)
      }
    }
  }

  const grid: { ch: string; color: string }[] = new Array(cols * rows)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = cells[r * cols + c]
      if (!cell) continue
      const R = m.regions[cell.reg]!
      const x = (c + 0.5) / scale
      const y = ((r + 0.5) * ASPECT) / scale
      const interior = cell.cov >= 0.8 || R.noEdge
      if (interior) {
        let L = m.light?.(x, y, f)
        if (L === undefined) {
          const span = Math.max(1, bottom[c] - top[c])
          L = 1 - 0.78 * ((r - top[c]) / span)
        }
        L += R.lift ?? 0
        // Very light ordered dithering, to break up flat areas.
        L += (((c * 3 + r * 5) % 4) - 1.5) * (R.dither ?? 0.012)
        L = Math.max(0, Math.min(1, L))
        if (R.sparse !== undefined) {
          const hsh = ((c * 73856093) ^ (r * 19349663)) >>> 0
          if ((hsh % 1000) / 1000 > R.sparse) continue
        }
        const ramp = R.ramp ?? RAMP
        let ch = ramp[Math.min(ramp.length - 1, Math.floor(L * ramp.length))]!
        let tone: 0 | 1 | 2 = L < 0.52 ? 0 : 2
        const p = R.pattern?.(x, y, L)
        if (p?.ch !== undefined) ch = p.ch
        if (p?.tone !== undefined) tone = p.tone
        grid[r * cols + c] = { ch, color: R.colors[tone] }
      } else {
        const { dx, dy, cov } = cell
        const ax = Math.abs(dx)
        const ay = Math.abs(dy)
        let ch: string
        if (cov < 0.2) {
          ch = dy > 0 ? (ax > ay ? '.' : '.') : dy < 0 ? "'" : dx > 0 ? '(' : ')'
          if (dy > 0 && ax <= ay && cov < 0.12) ch = '_'
        } else if (ay > ax * 2) {
          ch = dy > 0 ? (cov < 0.42 ? '_' : '-') : cov < 0.42 ? "'" : '-'
        } else if (ax > ay * 2) {
          ch = dx > 0 ? (cov < 0.5 ? '(' : '|') : cov < 0.5 ? ')' : '|'
        } else {
          ch = (dx > 0) === (dy > 0) ? '/' : '\\'
        }
        const color = R.edge ?? (dy > 0 ? R.colors[2] : R.colors[0])
        grid[r * cols + c] = { ch, color }
      }
    }
  }

  for (const s of m.stamps?.(f) ?? []) {
    const r = Math.floor((s.y * scale) / ASPECT)
    const c0 = Math.floor(s.x * scale)
    if (r < 0 || r >= rows) continue
    ;[...s.text].forEach((ch, i) => {
      const c = c0 + i
      if (c < 0 || c >= cols || ch === ' ') return
      grid[r * cols + c] = { ch, color: s.color }
    })
  }

  const frame: Frame = new Map()
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const g = grid[r * cols + c]
      if (!g) continue
      let lines = frame.get(g.color)
      if (!lines) {
        lines = Array.from({ length: rows }, () => ' '.repeat(cols))
        frame.set(g.color, lines)
      }
      const line = lines[r]!
      lines[r] = line.slice(0, c) + g.ch + line.slice(c + 1)
    }
  }
  return { frame, cols, rows }
}

// ---------- Geometry ----------

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))

export function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const u = (x - cx) / rx
  const v = (y - cy) / ry
  return u * u + v * v <= 1
}

export function inPoly(x: number, y: number, pts: readonly (readonly [number, number])[]): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!
    const [xj, yj] = pts[j]!
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

// Distance from a point to a segment.
export function segDist(x: number, y: number, ax: number, ay: number, bx: number, by: number): { d: number; t: number } {
  const vx = bx - ax
  const vy = by - ay
  const t = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1))
  const px = ax + vx * t - x
  const py = ay + vy * t - y
  return { d: Math.hypot(px, py), t }
}

// A thick stroke along a series of points, with a variable radius.
export function inStroke(x: number, y: number, pts: readonly (readonly [number, number, number])[]): boolean {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay, ar] = pts[i]!
    const [bx, by, br] = pts[i + 1]!
    const { d, t } = segDist(x, y, ax, ay, bx, by)
    if (d <= ar + (br - ar) * t) return true
  }
  return false
}

export function rotate(x: number, y: number, cx: number, cy: number, a: number): [number, number] {
  const s = Math.sin(a)
  const c = Math.cos(a)
  const dx = x - cx
  const dy = y - cy
  return [cx + dx * c + dy * s, cy - dx * s + dy * c]
}

// Fusiform profile: half-thickness at t (0 = tail, 1 = snout).
export function fusiform(t: number, a: number, b: number): number {
  if (t <= 0 || t >= 1) return 0
  const peak = Math.pow(a / (a + b), a) * Math.pow(b / (a + b), b)
  return (Math.pow(t, a) * Math.pow(1 - t, b)) / peak
}

export function hash(a: number, b: number): number {
  const h = (Math.imul(Math.floor(a) | 0, 374761393) + Math.imul(Math.floor(b) | 0, 668265263)) >>> 0
  return ((Math.imul(h ^ (h >>> 13), 1274126177) >>> 0) % 10000) / 10000
}

// All the frames of a model, with the part that does not move set apart:
// only the cells that change from one frame to the next are repeated.
export function renderModel(m: Model, scale = 1): { still: Frame; frames: Frame[]; cols: number; rows: number } {
  const all = Array.from({ length: m.frames }, (_, f) => rasterize(m, f, scale))
  const { cols, rows } = all[0]!
  const at = (fr: Frame, r: number, c: number): [string, string] | undefined => {
    for (const [color, lines] of fr) {
      const ch = lines[r]![c]!
      if (ch !== ' ') return [color, ch]
    }
    return undefined
  }
  const put = (fr: Frame, color: string, r: number, c: number, ch: string) => {
    let lines = fr.get(color)
    if (!lines) {
      lines = Array.from({ length: rows }, () => ' '.repeat(cols))
      fr.set(color, lines)
    }
    const l = lines[r]!
    lines[r] = l.slice(0, c) + ch + l.slice(c + 1)
  }
  const still: Frame = new Map()
  const frames: Frame[] = all.map(() => new Map())
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cells = all.map(a => at(a.frame, r, c))
      const first = cells[0]
      const same = cells.every(x => (x === undefined && first === undefined) || (x !== undefined && first !== undefined && x[0] === first[0] && x[1] === first[1]))
      if (same) {
        if (first) put(still, first[0], r, c, first[1])
      } else {
        cells.forEach((x, f) => x && put(frames[f]!, x[0], r, c, x[1]))
      }
    }
  }
  return { still, frames, cols, rows }
}
