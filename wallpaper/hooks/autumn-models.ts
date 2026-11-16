// The autumn night's pieces, painted as cell art (`cells.ts`): trees in
// fall colours, a bare tree, the cabin, pumpkins, the fence, the moon, and
// the passers-by (bats, a little ghost, a witch, a black cat, a fox).
//
// Positions are in cells (c: column, r: row). Light comes from the moon,
// up and to the right.

import { hash } from './ascii'
import { Grid } from './cells'

const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
// Cells are 9 × 11 px: a round shape is a little wider in columns.
const ROUND = 11 / 9

// ---------- Trees ----------

export type Foliage = { shades: [string, string, string, string]; glyphs: string }

export const ORANGE: Foliage = { shades: ['#6e2812', '#a2431a', '#cf6a2a', '#eb9442'], glyphs: '*%&#@' }
export const RED: Foliage = { shades: ['#561819', '#82241f', '#ad3a2a', '#d0603c'], glyphs: '*%&#@' }
export const GOLD: Foliage = { shades: ['#6e4c10', '#a1741c', '#d0a02e', '#f0c656'], glyphs: '*%&#@' }

const TRUNK = ['#2c1a14', '#432a1e', '#5e3c28']

// A round, leafy tree: a few blobs of foliage over a trunk with branches.
// (c, r) is the foot of the trunk; `size` the canopy's radius in columns.
export function tree(g: Grid, c: number, r: number, size: number, leaf: Foliage, seed: number): void {
  const top = r - size * 2.2
  const cy = top + size * 0.8 / ROUND
  // The trunk and its forks, drawn first so the leaves cover them.
  const tw = Math.max(1, Math.round(size / 6))
  for (let y = Math.round(cy); y <= r; y++) {
    for (let x = -tw; x <= tw; x++) {
      const shade = x >= tw - 0 ? 2 : x <= -tw ? 0 : 1
      g.set(c + x, y, { bg: TRUNK[shade], fg: TRUNK[Math.min(2, shade + 1)], ch: hash(x + seed, y) < 0.3 ? '(' : '|' })
    }
  }
  for (const s of [-1, 1]) {
    for (let k = 0; k < size * 0.6; k++) g.set(c + s * (tw + k), Math.round(cy + size * 0.35 / ROUND - k * 0.55), { bg: TRUNK[1], fg: TRUNK[2], ch: s < 0 ? '\\' : '/' })
  }
  // Foliage: a main blob and a few smaller ones around it.
  const blobs: [number, number, number][] = [[0, 0, 1]]
  for (let i = 0; i < 5; i++) {
    const a = hash(seed, i) * Math.PI * 2
    blobs.push([Math.cos(a) * size * 0.55, (Math.sin(a) * size * 0.4) / ROUND - size * 0.1, 0.5 + hash(i, seed) * 0.3])
  }
  for (let y = Math.floor(cy - size); y <= Math.ceil(cy + size); y++) {
    for (let x = Math.floor(c - size * 1.6); x <= Math.ceil(c + size * 1.6); x++) {
      let inside = -1
      let nx = 0
      let ny = 0
      for (const [bx, by, k] of blobs) {
        const dx = (x - (c + bx)) / (size * k)
        const dy = ((y - (cy + by)) * ROUND) / (size * k * 0.9)
        const d = dx * dx + dy * dy
        const v = 1 - d
        if (v > inside) {
          inside = v
          nx = dx
          ny = dy
        }
      }
      // A ragged edge: some cells near the rim are left out.
      const n = hash(x * 3 + seed, y * 7)
      if (inside < 0 || (inside < 0.18 && n < 0.45)) continue
      const light = clamp(0.5 + 0.35 * nx - 0.35 * ny + (n - 0.5) * 0.35 - (inside < 0.12 ? 0.15 : 0))
      const s = Math.min(3, Math.floor(light * 4))
      const glyph = leaf.glyphs[Math.floor(hash(y + seed, x) * leaf.glyphs.length)]!
      g.set(x, y, { bg: leaf.shades[s], fg: leaf.shades[Math.min(3, s + 1)] === leaf.shades[s] ? leaf.shades[2] : leaf.shades[Math.min(3, s + 1)], ch: n < 0.55 ? glyph : ' ' })
    }
  }
}

// A bare, twisted tree: a dark silhouette of branches (and a perch).
export function bareTree(g: Grid, c: number, r: number, h: number, seed: number): { perch: [number, number] } {
  const dark = '#1a1220'
  const edge = '#33243a'
  for (let y = r - h; y <= r; y++) {
    const w = y > r - 3 ? 2 : 1
    const sway = Math.round(Math.sin((r - y) * 0.15 + seed) * 1.5)
    for (let x = -w; x <= w; x++) g.set(c + x + sway, y, { bg: dark, fg: edge, ch: x === w ? ')' : '|' })
  }
  // Branches: crooked strokes going up and out.
  let perch: [number, number] = [c, r - h]
  const branches = 7
  for (let i = 0; i < branches; i++) {
    const y0 = r - h * (0.35 + (i / branches) * 0.6)
    const s = i % 2 === 0 ? 1 : -1
    const len = 6 + hash(i, seed) * 10
    let x = c + Math.round(Math.sin((r - y0) * 0.15 + seed) * 1.5)
    let y = y0
    for (let k = 0; k < len; k++) {
      x += s
      if (hash(k, i + seed) < 0.55) y -= 1
      g.set(x, y, { bg: dark, fg: edge, ch: s > 0 ? '/' : '\\' })
      // Twigs.
      if (k > len * 0.5 && hash(k + 3, i) < 0.35) g.set(x + s, y - 1, { fg: edge, ch: s > 0 ? '/' : '\\' })
    }
    if (i === 2) perch = [Math.round(x - s * 3), Math.round(y)]
  }
  return { perch }
}

// A small far tree on the hills: a few muted cells.
export function farTree(g: Grid, c: number, r: number, h: number, tint: string, glyph: string): void {
  for (let y = 0; y < h; y++) {
    const w = Math.round(((y + 1) / h) * (h > 2 ? 1 : 0))
    for (let x = -w; x <= w; x++) g.set(c + x, r - h + y, { bg: tint, fg: '#5a3448', ch: y === 0 ? glyph : x < 0 ? '/' : x > 0 ? '\\' : ':' })
  }
}

// ---------- The cabin ----------

export const WINDOW = { bg: '#ffb54a', fg: '#b8651e' }

// A log cabin with a red roof and a stone chimney; returns where its
// windows and the chimney's top are, for the glow and the smoke.
export function cabin(g: Grid, c: number, r: number): { windows: [number, number][]; chimney: [number, number] } {
  const w = 16
  const wallH = 5
  const logs = ['#4a2a1c', '#5c3624', '#6e4330']
  // Walls.
  for (let y = 0; y < wallH; y++) {
    for (let x = 0; x < w; x++) g.set(c + x, r - y, { bg: logs[(y + (x > w - 3 ? 0 : 1)) % 3 === 0 ? 0 : 1], fg: logs[2], ch: x === 0 || x === w - 1 ? '|' : '=' })
  }
  // Roof: a steep gable in dark red.
  const roof = ['#3c1418', '#5a1e20', '#7a2c26']
  const rh = 6
  for (let y = 0; y < rh; y++) {
    const inset = y
    for (let x = -2 + inset; x < w + 2 - inset; x++) {
      const left = x < w / 2
      g.set(c + x, r - wallH - y, { bg: roof[left ? 1 : 0], fg: roof[2], ch: x === -2 + inset ? '/' : x === w + 1 - inset ? '\\' : y % 2 === 0 ? '-' : '_' })
    }
  }
  // Chimney.
  const cx = c + w - 5
  for (let y = r - wallH - 2; y >= r - wallH - rh - 1; y--) {
    g.set(cx, y, { bg: '#3a3036', fg: '#5a4a52', ch: '#' })
    g.set(cx + 1, y, { bg: '#2c242a', fg: '#4a3c44', ch: '#' })
  }
  // Door and windows.
  for (let y = 0; y < 3; y++) g.set(c + 7, r - y, { bg: '#24120c', fg: '#4a2a1c', ch: '|' })
  for (let y = 0; y < 3; y++) g.set(c + 8, r - y, { bg: '#2c160e', fg: '#4a2a1c', ch: y === 1 ? '.' : '|' })
  const windows: [number, number][] = [
    [c + 3, r - 2],
    [c + 4, r - 2],
    [c + 11, r - 2],
    [c + 12, r - 2],
    [c + 3, r - 3],
    [c + 4, r - 3],
    [c + 11, r - 3],
    [c + 12, r - 3],
  ]
  return { windows, chimney: [cx, r - wallH - rh - 2] }
}

// ---------- Pumpkins ----------

// A pumpkin, `w` columns wide: ribbed orange cells and a stem. Its carved
// face is returned apart (for the candle's flicker).
export function pumpkin(g: Grid, face: Grid, c: number, r: number, w: number, carved: boolean): void {
  const h = Math.max(3, Math.round(w / 2))
  const shades = ['#7a3410', '#b04e16', '#d96e22', '#f0923a']
  for (let y = 0; y < h; y++) {
    const t = (y + 0.5) / h
    const half = (w / 2) * Math.sqrt(1 - Math.pow(2 * t - 1, 2)) + 0.4
    for (let x = Math.ceil(-half); x <= Math.floor(half); x++) {
      const light = clamp(0.55 + (x / half) * 0.3 - (t - 0.5) * 0.5)
      const s = Math.min(3, Math.floor(light * 4))
      g.set(c + x, r - h + 1 + y, { bg: shades[s], fg: shades[Math.max(0, s - 1)], ch: x % 2 === 0 ? '(' : ')' })
    }
  }
  g.set(c, r - h, { bg: '#3e5a1c', fg: '#6e8a2e', ch: '|' })
  if (carved) {
    const lit = { bg: '#ffd257', fg: '#e8821c' }
    const eyeY = r - h + 2
    face.set(c - Math.round(w / 4), eyeY, { ...lit, ch: '^' })
    face.set(c + Math.round(w / 4), eyeY, { ...lit, ch: '^' })
    for (let x = -Math.round(w / 4); x <= Math.round(w / 4); x++) face.set(c + x, eyeY + 1 + (h > 3 ? 1 : 0), { ...lit, ch: x % 2 === 0 ? 'v' : 'w' })
  }
}

// ---------- The moon ----------

export function moon(g: Grid, c: number, r: number, radius: number): void {
  const shades = ['#c4722e', '#de9440', '#f0b45c', '#fbd27e']
  for (let y = Math.floor(r - radius / ROUND); y <= Math.ceil(r + radius / ROUND); y++) {
    for (let x = Math.floor(c - radius); x <= Math.ceil(c + radius); x++) {
      const dx = (x - c) / radius
      const dy = ((y - r) * ROUND) / radius
      const d = dx * dx + dy * dy
      if (d > 1) continue
      // Maria: darker patches, a few craters.
      const sea = Math.sin(dx * 4 + 1) * Math.sin(dy * 3.4 - 0.6) > 0.35
      const light = clamp(0.85 - d * 0.35 + dx * 0.15 - (sea ? 0.35 : 0))
      const s = Math.min(3, Math.floor(light * 4))
      const crater = hash(x * 5, y * 3) < 0.07
      g.set(x, y, { bg: shades[s], fg: shades[Math.max(0, s - 1)], ch: crater ? 'o' : sea ? ':' : d > 0.8 ? '.' : ' ' })
    }
  }
}

// ---------- Fence ----------

export function fence(g: Grid, c0: number, c1: number, r: number): void {
  const wood = ['#26161a', '#3a2228', '#523038']
  for (let x = c0; x <= c1; x++) {
    const post = (x - c0) % 6 === 0
    if (post) {
      for (let y = -3; y <= 0; y++) g.set(x, r + y, { bg: wood[1], fg: wood[2], ch: y === -3 ? '^' : '|' })
    } else {
      g.set(x, r - 2, { bg: wood[0], fg: wood[2], ch: '=' })
      g.set(x, r - 0, { bg: wood[0], fg: wood[1], ch: '=' })
    }
  }
}

// ---------- Passers-by (each painted facing right, origin top left) ----------

const NIGHT = '#120a16'
const NIGHT_EDGE = '#3c2444'

// A bat, wings up (frame 0) or down (frame 1).
export function bat(frame: number): Grid {
  const g = new Grid()
  const rows = frame === 0 ? ['X     X', 'XX v XX', '  XXX  '] : ['       ', '  XvX  ', 'XX   XX']
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'X') g.set(x, y, { bg: NIGHT, fg: NIGHT_EDGE, ch: x < 3 ? '\\' : x > 3 ? '/' : 'V' })
      if (ch === 'v') g.set(x, y, { bg: NIGHT, fg: '#d8443c', ch: ':' })
    }),
  )
  return g
}

// A little friendly ghost; frame 0 and 1 wave its hem.
export function ghost(frame: number): Grid {
  const g = new Grid()
  const sheet = ['#d9d2e6', '#ebe6f3', '#fbf8ff']
  const rows = [' XXXX ', 'XXXXXX', 'XeXXeX', 'XXooXX', 'XXXXXX', frame === 0 ? 'X XX X' : ' XX XX']
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const s = x >= 4 ? 2 : x <= 1 ? 0 : 1
      if (ch === 'X') g.set(x, y, { bg: sheet[s], fg: sheet[Math.max(0, s - 1)], ch: y === 5 ? '~' : ' ' })
      if (ch === 'e') g.set(x, y, { bg: '#2a1a34', fg: '#4a3a5a', ch: '.' })
      if (ch === 'o') g.set(x, y, { bg: sheet[1], fg: '#e58aa6', ch: '-' })
    }),
  )
  return g
}

// A witch on her broom, cape flapping (frames 0 and 1).
export function witch(frame: number): Grid {
  const g = new Grid()
  // Facing right: the cape and the broom's bristles trail behind her.
  const rows = [
    '       ^       ',
    '      XXX      ',
    '     XXXXX     ',
    frame === 0 ? 'CC    Xf       ' : '      Xf       ',
    frame === 0 ? ' CCCCXXXX      ' : '   CCXXXX      ',
    '///BBBBBBBBBBBB',
    '\\\\\\   X  X     ',
  ]
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'X' || ch === '^') g.set(x, y, { bg: NIGHT, fg: NIGHT_EDGE, ch: ch === '^' ? '^' : y < 3 ? '/' : '#' })
      if (ch === 'f') g.set(x, y, { bg: '#7a9a4a', fg: '#2a3a1a', ch: '>' })
      if (ch === 'C') g.set(x, y, { bg: '#2a1036', fg: '#4a2060', ch: '~' })
      if (ch === 'B') g.set(x, y, { bg: '#3a2418', fg: '#5e3c28', ch: '=' })
      if (ch === '/' || ch === '\\') g.set(x, y, { bg: '#7a5a2a', fg: '#b08a44', ch })
    }),
  )
  return g
}

// A black cat walking (frames 0 and 1), tail up.
export function cat(frame: number): Grid {
  const g = new Grid()
  const rows = [
    'T      ^ ^',
    ' T     XeX',
    '  XXXXXXX ',
    frame === 0 ? '  L L  L L' : '   L L L L ',
  ]
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'X' || ch === 'T' || ch === '^') g.set(x, y, { bg: NIGHT, fg: NIGHT_EDGE, ch: ch === '^' ? '^' : ch === 'T' ? '(' : '~' })
      if (ch === 'e') g.set(x, y, { bg: NIGHT, fg: '#ffd34a', ch: 'o' })
      if (ch === 'L') g.set(x, y, { bg: NIGHT, fg: NIGHT_EDGE, ch: '|' })
    }),
  )
  return g
}

// A fox trotting (frames 0 and 1): rust coat, bushy tail with a white
// tip, white chest, dark legs and ear tips.
export function fox(frame: number): Grid {
  const g = new Grid()
  const coat = ['#7a3010', '#b04c1a', '#d8722e', '#eb9244']
  const rows = [
    '            e e ',
    '           HHHHN',
    'WTT  XXXXXXXXHww',
    ' WTTXXXXXXXXXw  ',
    '  TT XXXXXXXX   ',
    frame === 0 ? '     L  L  L  L ' : '      L L   L L ',
  ]
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === 'e') g.set(x, y, { bg: '#2a1610', fg: coat[1], ch: '^' })
      if (ch === 'H') g.set(x, y, { bg: coat[3], fg: coat[1], ch: x === 13 && y === 1 ? '.' : '-' })
      if (ch === 'N') g.set(x, y, { bg: coat[2], fg: '#1a0e0a', ch: '>' })
      if (ch === 'X') g.set(x, y, { bg: coat[y === 2 ? 3 : y === 3 ? 2 : 1], fg: coat[0], ch: y === 2 ? '~' : ' ' })
      if (ch === 'T') g.set(x, y, { bg: coat[y === 4 ? 1 : 2], fg: coat[0], ch: '~' })
      if (ch === 'W' || ch === 'w') g.set(x, y, { bg: '#f0e6d8', fg: '#c8b8a0', ch: ch === 'W' ? '~' : ',' })
      if (ch === 'L') g.set(x, y, { bg: '#2a1610', fg: '#4a2a1c', ch: '|' })
    }),
  )
  return g
}

// An owl perched: two round eyes (the scene makes them blink).
export function owl(g: Grid, eyes: Grid, c: number, r: number): void {
  const body = ['#3a2a22', '#5a4232', '#7a5c44']
  const rows = ['^ ^', 'XXX', 'XvX', 'XXX']
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '^') g.set(c + x, r + y, { bg: body[0], fg: body[2], ch: '^' })
      if (ch === 'X') g.set(c + x, r + y, { bg: body[x === 2 ? 0 : 1], fg: body[2], ch: y === 1 ? ' ' : y === 3 ? 'w' : '"' })
      if (ch === 'v') g.set(c + x, r + y, { bg: body[1], fg: '#e0a030', ch: 'v' })
    }),
  )
  eyes.set(c, r + 1, { bg: '#ffcf4a', fg: '#1a0e08', ch: 'o' })
  eyes.set(c + 2, r + 1, { bg: '#ffcf4a', fg: '#1a0e08', ch: 'o' })
}
