// Cell art: a grid of character cells, each with an optional background
// colour and an optional glyph in its own colour, as a terminal draws with
// background colours. Shapes paint cells into a `Grid`; `gridSvg` turns it
// into compact SVG: one path of rectangles per background colour (runs of
// cells merged), one <text> per glyph colour with a list of positions.

import { esc } from './stage'

export const CW = 9
export const CH = 11

export type Cell = { bg?: string; fg?: string; ch?: string }

export class Grid {
  readonly cells = new Map<string, Cell & { c: number; r: number }>()

  // Paints a cell; a field left out keeps what was there.
  set(c: number, r: number, cell: Cell): void {
    c = Math.round(c)
    r = Math.round(r)
    const k = `${c},${r}`
    const old = this.cells.get(k)
    this.cells.set(k, { ...old, ...cell, c, r })
  }

  get(c: number, r: number): Cell | undefined {
    return this.cells.get(`${Math.round(c)},${Math.round(r)}`)
  }

  has(c: number, r: number): boolean {
    return this.cells.has(`${Math.round(c)},${Math.round(r)}`)
  }

  // The columns and rows the painted cells span.
  bounds(): { c0: number; r0: number; c1: number; r1: number } {
    let c0 = Infinity
    let r0 = Infinity
    let c1 = -Infinity
    let r1 = -Infinity
    for (const { c, r } of this.cells.values()) {
      c0 = Math.min(c0, c)
      r0 = Math.min(r0, r)
      c1 = Math.max(c1, c)
      r1 = Math.max(r1, r)
    }
    return { c0, r0, c1, r1 }
  }
}

// The grid as SVG, cell (0, 0) at (ox, oy). `opacity` applies to the
// backgrounds alone (the glyphs stay crisp).
export function gridSvg(g: Grid, ox = 0, oy = 0, opts: { bgOpacity?: number; font?: number } = {}): string {
  const byBg = new Map<string, Map<number, number[]>>()
  const byFg = new Map<string, { xs: number[]; ys: number[]; s: string }>()
  for (const { c, r, bg, fg, ch } of g.cells.values()) {
    if (bg !== undefined) {
      let rows = byBg.get(bg)
      if (!rows) byBg.set(bg, (rows = new Map()))
      let cols = rows.get(r)
      if (!cols) rows.set(r, (cols = []))
      cols.push(c)
    }
    if (fg !== undefined && ch !== undefined && ch !== ' ') {
      let t = byFg.get(fg)
      if (!t) byFg.set(fg, (t = { xs: [], ys: [], s: '' }))
      t.xs.push(ox + c * CW + CW / 2)
      t.ys.push(oy + r * CH + CH - 2.5)
      t.s += ch
    }
  }
  let out = ''
  for (const [bg, rows] of byBg) {
    let d = ''
    for (const [r, cols] of rows) {
      cols.sort((a, b) => a - b)
      let i = 0
      while (i < cols.length) {
        let j = i
        while (j + 1 < cols.length && cols[j + 1] === cols[j]! + 1) j++
        const w = (j - i + 1) * CW
        d += `M${ox + cols[i]! * CW} ${oy + r * CH}h${w}v${CH}h-${w}z`
        i = j + 1
      }
    }
    out += `<path d="${d}" fill="${bg}"${opts.bgOpacity !== undefined ? ` fill-opacity="${opts.bgOpacity}"` : ''}/>`
  }
  for (const [fg, t] of byFg) {
    // The engine refuses a backdrop whose text holds `/*` (a CSS comment that
    // never closes). Each glyph has its own position, so their order is free:
    // the stars go first, and a `/` is never followed by a `*`.
    const glyphs = Array.from(t.s)
    const order = glyphs
      .map((_, i) => i)
      .filter(i => glyphs[i] !== '\\')
      .sort((a, b) => Number(glyphs[a] !== '*') - Number(glyphs[b] !== '*'))
    if (order.length > 0) {
      const xs = order.map(i => t.xs[i]).join(' ')
      const ys = order.map(i => t.ys[i]).join(' ')
      out += `<text x="${xs}" y="${ys}" fill="${fg}">${esc(order.map(i => glyphs[i]).join(''))}</text>`
    }
    // The desktop app draws no backdrop whose cell art holds a `\` (the
    // engine passes it, the app shows nothing): each one is a `/` drawn
    // mirrored, centred on the same cell, which looks the same.
    const back = glyphs.map((_, i) => i).filter(i => glyphs[i] === '\\')
    if (back.length > 0) {
      const xs = back.map(i => -t.xs[i]!).join(' ')
      const ys = back.map(i => t.ys[i]).join(' ')
      out += `<text transform="scale(-1,1)" x="${xs}" y="${ys}" fill="${fg}">${'/'.repeat(back.length)}</text>`
    }
  }
  return `<g class="cl"${opts.font ? ` font-size="${opts.font}"` : ''}>${out}</g>`
}

// The CSS the cell text needs.
export const CELL_CSS = '.cl text{font-size:10px;font-weight:700;text-anchor:middle}'
