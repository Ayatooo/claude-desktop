// The toolkit shared by the scenes: rendering ASCII models to SVG, CSS
// animations, choreography by lanes (at most one creature per lane on
// screen), final assembly.
//
// Each scene creates its own working stage (`stage`), which keeps its
// keyframes and ids, then calls `finish` to get the SVG.

import { renderModel } from './ascii'
import type { Frame, Model } from './ascii'

export const W = 1600
export const H = 1000

export const cw = (font: number) => font * 0.6
export const lh = (font: number) => font * 1.2

export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// The engine refuses a backdrop whose text holds `/*` (it reads it as a CSS
// comment that never closes): a run is cut there into a second tspan, which
// goes on at the same pen position, so nothing moves.
export const spanText = (s: string) => esc(s).split('/*').join('/</tspan><tspan>*')

export const n = (v: number) => (Math.round(v * 10) / 10).toString()

function hex(c: string): [number, number, number] {
  const v = parseInt(c.slice(1), 16)
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255]
}

export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a)
  const [r2, g2, b2] = hex(b)
  const f = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0')
  return `#${f(r1, r2)}${f(g1, g2)}${f(b1, b2)}`
}

export type Drawn = { svg: string; w: number; h: number }

// One pass through a lane.
//  'cross': crosses the screen (optionally stops at `stopAt` for `pause` s).
//  'visit': enters, swims to `turnAt`, turns around, leaves on the same side.
//  'rise' : goes up from bottom to top at abscissa `x` (jellyfish, bubble).
//  'fall' : goes down from top to bottom at abscissa `x`.
//  'walk' : crosses without turning around (crab, scorpion walking sideways).
export type Pass = {
  d: Drawn
  opacity?: number
  kind: 'cross' | 'visit' | 'rise' | 'fall' | 'walk'
  from: 'left' | 'right'
  y: number
  dur: number
  turnAt?: number
  stopAt?: number
  pause?: number
  x?: number
  sway?: number
  bob?: number
  bobPeriod?: number
  wrap?: (svg: string) => string
}

export type StageOptions = {
  // Length of the choreography cycle, in seconds.
  cycle: number
  // Slows down the frame cycles of the models (tails, legs, wings).
  slow: number
}

export function stage(opts: StageOptions) {
  const css: string[] = []
  const names = new Set<string>()
  let uid = 0
  const CYCLE = opts.cycle

  const kf = (name: string, body: string) => {
    if (!names.has(name)) {
      names.add(name)
      css.push(`@keyframes ${name}{${body}}`)
    }
  }
  const id = () => uid++

  // Loops n frames: each frame is visible for 1/n of the cycle.
  const frameAnim = (count: number, i: number, period: number): string => {
    if (count <= 1) return ''
    const slot = 100 / count
    const name = `fr${count}`
    kf(name, `0%{opacity:1}${n(slot)}%{opacity:0}100%{opacity:0}`)
    const delay = -(((count - i) % count) * period) / count
    return `animation:${name} ${n(period)}s steps(1,end) ${n(delay)}s infinite`
  }

  // One frame (color → lines) on an integer grid: 6 × 12 cells at font
  // size 10; the group is then scaled to the real font size.
  const frameSvg = (fr: Frame, tint: (c: string) => string): string => {
    let out = ''
    for (const [color, lines] of fr) {
      let spans = ''
      lines.forEach((l, r) => {
        const s = l.search(/\S/)
        if (s < 0) return
        spans += `<tspan x="${s * 6}" y="${r * 12 + 10}">${spanText(l.slice(s).trimEnd())}</tspan>`
      })
      if (spans !== '') out += `<text fill="${tint(color)}">${spans}</text>`
    }
    return out
  }

  // A model rendered in ASCII: the still part, then the animated frames.
  const draw = (make: () => Model, font: number, scale: number, tint: (c: string) => string = c => c, extra = ''): Drawn => {
    const m = make()
    const { still, frames, cols, rows } = renderModel(m, scale)
    const seq = m.sequence ?? frames.map((_, i) => i)
    let svg = frameSvg(still, tint)
    seq.forEach((fi, slot) => {
      const body = frameSvg(frames[fi]!, tint)
      if (body !== '') svg += `<g style="${frameAnim(seq.length, slot, m.period * opts.slow)}">${body}</g>`
    })
    const k = font / 10
    return { svg: `<g font-size="10" transform="scale(${Math.round(k * 100) / 100})"${extra}>${svg}</g>`, w: cols * cw(font), h: rows * lh(font) }
  }

  // Places a drawing with its bottom at `bottom`.
  const place = (d: Drawn, x: number, bottom: number): string => `<g transform="translate(${n(x)},${n(bottom - d.h)})">${d.svg}</g>`

  // Gentle vertical bobbing.
  const bobbing = (svg: string, amp: number, period: number): string => {
    const i = id()
    kf(`bo${i}`, `from{transform:translateY(${n(-amp / 2)}px)}to{transform:translateY(${n(amp / 2)}px)}`)
    return `<g style="animation:bo${i} ${n(period)}s ease-in-out ${n(-i * 0.7)}s infinite alternate">${svg}</g>`
  }

  const pc = (t: number) => `${(Math.round((t / CYCLE) * 100000) / 1000).toString()}%`

  const play = (p: Pass, start: number, shift = 0): string => {
    const i = id()
    const end = start + p.dur
    const xl = -p.d.w - 60
    const xr = W + 60
    const at = (x: number, sx: number) => `transform:translateX(${n(x)}px) scaleX(${sx})`
    let frames = ''
    if (p.kind === 'rise' || p.kind === 'fall') {
      const low = H + 40
      const high = -p.d.h - 40
      const [y0, y1] = p.kind === 'rise' ? [low, high] : [high, low]
      const sw = p.sway ?? 28
      const k = (t: number, x: number, y: number) => `${pc(t)}{transform:translate(${x}px,${n(y)}px)}`
      const yAt = (f: number) => y0 + (y1 - y0) * f
      frames =
        k(0, 0, y0) +
        k(start, 0, y0) +
        k(start + p.dur * 0.25, sw, yAt(0.25)) +
        k(start + p.dur * 0.5, -sw, yAt(0.5)) +
        k(start + p.dur * 0.75, sw, yAt(0.75)) +
        k(end, 0, y1) +
        k(CYCLE, 0, y1)
    } else {
      const leftSide = p.from === 'left'
      const out = leftSide ? xl : xr
      const other = leftSide ? xr : xl
      const face = leftSide ? 1 : -1
      if (p.kind === 'visit') {
        // 2.4 s turnaround at the farthest point.
        const mid = start + p.dur / 2
        const tx = p.turnAt ?? W / 2
        const hold = (p.pause ?? 0) / 2
        frames =
          `0%{${at(out, face)}}${pc(start)}{${at(out, face)}}` +
          `${pc(mid - 1.2 - hold)}{${at(tx, face)}}` +
          (hold > 0 ? `${pc(mid - 1.2 + hold)}{${at(tx, face)}}` : '') +
          `${pc(mid + 1.2 + hold)}{${at(tx, -face)}}` +
          `${pc(end)}{${at(out, -face)}}100%{${at(out, -face)}}`
      } else {
        const sx = p.kind === 'walk' ? 1 : face
        if (p.stopAt !== undefined && p.pause) {
          // Crossing with a stop: same speed before and after.
          const travel = p.dur - p.pause
          const before = Math.abs(p.stopAt - out) / Math.abs(other - out)
          const t1 = start + travel * before
          const t2 = t1 + p.pause
          frames = `0%{${at(out, sx)}}${pc(start)}{${at(out, sx)}}${pc(t1)}{${at(p.stopAt, sx)}}${pc(t2)}{${at(p.stopAt, sx)}}${pc(end)}{${at(other, sx)}}100%{${at(other, sx)}}`
        } else {
          frames = `0%{${at(out, sx)}}${pc(start)}{${at(out, sx)}}${pc(end)}{${at(other, sx)}}100%{${at(other, sx)}}`
        }
      }
    }
    kf(`pa${i}`, frames)
    const bob = p.bob ?? 8
    const ease = p.kind === 'visit' ? 'ease-in-out' : 'linear'
    // The lane is scheduled from 0 to CYCLE then shifted: a negative delay makes
    // the animation start further into its cycle, without any pass running
    // past 100%.
    const delay = shift === 0 ? '' : ` ${n(-(CYCLE - shift))}s`
    let moving: string
    if (p.kind === 'rise' || p.kind === 'fall') {
      moving = `<g transform="translate(${n(p.x ?? W / 2)},0)"><g style="animation:pa${i} ${CYCLE}s ${ease}${delay} infinite">${p.d.svg}</g></g>`
    } else {
      const inner = `<g class="fb" style="animation:pa${i} ${CYCLE}s ${ease}${delay} infinite">${p.d.svg}</g>`
      moving = `<g transform="translate(0,${n(p.y)})">${bob > 0 ? bobbing(inner, bob, p.bobPeriod ?? 5.8) : inner}</g>`
    }
    const g = `<g opacity="${p.opacity ?? 1}">${moving}</g>`
    return p.wrap ? p.wrap(g) : g
  }

  // A queue of passes one after another, with the idle time spread evenly,
  // shifted by `offset` seconds within the cycle.
  const lane = (passes: Pass[], offset: number): string[] => {
    const busy = passes.reduce((a, p) => a + p.dur, 0)
    if (busy > CYCLE) throw new Error(`Lane too long: ${busy} s for a ${CYCLE} s cycle.`)
    const gap = (CYCLE - busy) / passes.length
    let t = gap / 2
    const shift = ((offset % CYCLE) + CYCLE) % CYCLE
    return passes.map(p => {
      const start = t
      t += p.dur + gap
      return play(p, start, shift)
    })
  }

  // The final SVG: the scene's gradients and filters, shared CSS, layers.
  //
  // `back` (water, sky, far light) and `front` (a vignette) fill the whole
  // view. When given, the scene itself (`layers`) is fitted to narrow views:
  // the backdrop is drawn to cover its slot (a split pane, a phone held
  // upright), which crops a wide scene's sides and blows it up; there, the
  // scene shrinks toward the bottom so its whole width shows, while `back`
  // keeps filling the view above it.
  const finish = (args: { defs: string; layers: string[]; css?: string[]; back?: string[]; front?: string[] }): string => {
    const fitted = args.back !== undefined || args.front !== undefined
    // Scale for the narrowest aspect of each step: the scene is never
    // narrower than the view, so no gap opens at its sides.
    const fit = fitted
      ? [
          `#fit{transform-origin:${W / 2}px ${H}px}`,
          ...[
            [1.3, 0.81],
            [1.1, 0.69],
            [0.9, 0.56],
            [0.7, 0.44],
          ].map(([a, k]) => `@media (max-aspect-ratio:${Math.round(a! * 10)}/10){#fit{transform:scale(${k})}}`),
        ]
      : []
    const all = [
      'text{font-family:ui-monospace,"SF Mono",Menlo,Consolas,"DejaVu Sans Mono","Liberation Mono",monospace;white-space:pre}',
      '.fb{transform-box:fill-box;transform-origin:center}',
      '.ry{transform-box:fill-box;transform-origin:center top}',
      '.sw{transform-box:fill-box;transform-origin:center bottom}',
      '.pu{transform-box:fill-box;transform-origin:center top}',
      ...(args.css ?? []),
      ...css,
      ...fit,
      '@media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}',
    ]
    const body = fitted ? [...(args.back ?? []), `<g id="fit">${args.layers.join('\n')}</g>`, ...(args.front ?? [])] : args.layers
    return `<svg xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
<defs>${args.defs}</defs>
<style>${all.join('')}</style>
${body.join('\n')}
</svg>`
  }

  return { kf, id, frameAnim, draw, place, bobbing, lane, finish }
}

export type Stage = ReturnType<typeof stage>
