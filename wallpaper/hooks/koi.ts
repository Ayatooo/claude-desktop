// "Koi pond" scene: a Japanese garden pond seen from above, made of
// characters.
//
// Layers, from back to front:
//   water (gradient) → pond floor (pebbles, seen through the water) →
//   light shimmer → koi and their shadows on the floor → lily pads and a lotus on the surface → drifting petals → ripples →
//   dragonfly → vignette.
//
// Koi follow gentle curves, turned along their path: one per lane, two
// lanes, so never more than two fish on screen. Everything is a
// CSS-animated SVG built once, no script, fixed seed.

import { ASPECT } from './ascii'
import { KOI, dragonfly, koi, lilyPad, lotus } from './koi-models'
import type { KoiKind } from './koi-models'
import { H, W, cw, lh, mix, n, rng, stage } from './stage'
import type { Drawn } from './stage'

const st = stage({ cycle: 480, slow: 2.2 })
const { kf, draw } = st
const CYCLE = 480

// ---------- Paths ----------

type Pt = readonly [number, number]
// A cubic curve from a to d, b and c its handles.
type Curve = { a: Pt; b: Pt; c: Pt; d: Pt }

const bez = (k: Curve, t: number): [number, number] => {
  const u = 1 - t
  const f = (i: 0 | 1) => u * u * u * k.a[i] + 3 * u * u * t * k.b[i] + 3 * u * t * t * k.c[i] + t * t * t * k.d[i]
  return [f(0), f(1)]
}

const pc = (t: number) => `${(Math.round((t / CYCLE) * 100000) / 1000).toString()}%`

// A swim along a curve, `dur` seconds; `hold` stops halfway for that long
// (a dragonfly hovering).
type Swim = { d: Drawn; path: Curve; dur: number; hold?: number; shadow?: boolean; opacity?: number }

// Plays the swims of one lane one after the other, the idle time spread
// evenly, then shifts the lane by `offset` seconds within the cycle.
function lane(swims: Swim[], offset: number): string[] {
  const busy = swims.reduce((s, w) => s + w.dur, 0)
  if (busy > CYCLE) throw new Error(`Lane too long: ${busy} s for a ${CYCLE} s cycle.`)
  const gap = (CYCLE - busy) / swims.length
  let t0 = gap / 2
  const shift = ((offset % CYCLE) + CYCLE) % CYCLE
  return swims.map(w => {
    const i = st.id()
    const start = t0
    t0 += w.dur + gap
    const N = 28
    const travel = w.dur - (w.hold ?? 0)
    // Points along the curve, with the heading unwrapped so a turn never
    // spins the long way round.
    const pts: { x: number; y: number; a: number }[] = []
    let prev = 0
    for (let k = 0; k <= N; k++) {
      const s = k / N
      const [x, y] = bez(w.path, s)
      const [x2, y2] = bez(w.path, Math.min(1, s + 0.01))
      const [x1, y1] = bez(w.path, Math.max(0, s - 0.01))
      let a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI
      if (k > 0) {
        while (a - prev > 180) a -= 360
        while (a - prev < -180) a += 360
      }
      prev = a
      pts.push({ x, y, a })
    }
    const at = (p: { x: number; y: number; a: number }) => `transform:translate(${Math.round(p.x)}px,${Math.round(p.y)}px) rotate(${Math.round(p.a)}deg)`
    let frames = `0%{${at(pts[0]!)}}`
    pts.forEach((p, k) => {
      let t = start + (k / N) * travel
      if (w.hold && k / N > 0.5) t += w.hold
      frames += `${pc(t)}{${at(p)}}`
      if (w.hold && k === N / 2) frames += `${pc(t + w.hold)}{${at(p)}}`
    })
    frames += `100%{${at(pts[N]!)}}`
    kf(`sw${i}`, frames)
    const delay = shift === 0 ? '' : ` ${n(-(CYCLE - shift))}s`
    const body = `<g transform="translate(${n(-w.d.w / 2)},${n(-w.d.h / 2)})">${w.d.svg}</g>`
    return `<g opacity="${w.opacity ?? 1}"${w.shadow === false ? '' : ' filter="url(#shade)"'}><g style="animation:sw${i} ${CYCLE}s linear${delay} infinite">${body}</g></g>`
  })
}

// ---------- Water ----------

// The pond floor seen through the water: two tiles of pebbles of
// unrelated sizes laid over each other, so no grid shows.
function floor(): string {
  const r = rng(11)
  const tints = ['#7d7766', '#66665a', '#8f846f', '#5a6352', '#a09276', '#6e7a64']
  const tile = (id: string, tw: number, th: number, count: number, size: number) => {
    let marks = ''
    for (let i = 0; i < count; i++) {
      const v = r()
      const g = v < 0.4 ? '.' : v < 0.6 ? 'o' : v < 0.75 ? '°' : v < 0.86 ? 'O' : ','
      marks += `<text x="${Math.round(r() * tw)}" y="${Math.round(r() * th)}" fill="${tints[Math.floor(r() * tints.length)]}">${g}</text>`
    }
    return `<pattern id="${id}" width="${tw}" height="${th}" patternUnits="userSpaceOnUse"><g font-size="${size}">${marks}</g></pattern>`
  }
  return (
    tile('floorA', 433, 287, 70, 13) +
    tile('floorB', 617, 389, 60, 17) +
    `<g opacity=".5" filter="url(#murk)"><rect width="${W}" height="${H}" fill="url(#floorA)"/><rect width="${W}" height="${H}" fill="url(#floorB)"/></g>`
  )
}

// Light dancing on the floor: a few frames of faint wavy marks.
function shimmer(): string {
  const r = rng(17)
  const frames = 5
  let out = ''
  for (let k = 0; k < frames; k++) {
    let spans = ''
    for (let i = 0; i < 70; i++) {
      const x = Math.round(r() * W)
      const y = Math.round(r() * H)
      spans += `<tspan x="${x}" y="${y}">${['~', '-~', '~-', '≈'][Math.floor(r() * 4)]}</tspan>`
    }
    out += `<text style="${st.frameAnim(frames, k, 7.5)}">${spans}</text>`
  }
  return `<g font-size="15" fill="#d8f5e6" opacity=".2">${out}</g>`
}

// Petals drifting on the surface, carried by a light breeze.
function petals(): string {
  const r = rng(29)
  ;[0, 1, 2].forEach(j =>
    kf(
      `pe${j}`,
      `0%{transform:translate(-40px,0) rotate(0deg);opacity:0}6%{opacity:1}50%{transform:translate(${W / 2}px,${40 - j * 30}px) rotate(${160 + j * 50}deg)}94%{opacity:1}100%{transform:translate(${W + 40}px,${-30 + j * 25}px) rotate(${320 + j * 90}deg);opacity:0}`,
    ),
  )
  let out = ''
  for (let i = 0; i < 14; i++) {
    const dur = 110 + r() * 90
    const y = Math.round(60 + r() * (H - 120))
    const ch = ['*', '°', "'", '*', ','][i % 5]!
    const c = mix('#f6c1d4', '#e58aae', r())
    out += `<g transform="translate(0,${y})"><text class="fb" fill="${c}" style="animation:pe${i % 3} ${Math.round(dur)}s linear ${Math.round(-r() * dur)}s infinite">${ch}</text></g>`
  }
  return `<g font-size="15" opacity=".85">${out}</g>`
}

// Rings spreading on the water where something touched it: a few rings of
// dots, one after another, at a few spots, each on its own beat.
function ripples(): string {
  const r = rng(43)
  const spots = [
    { x: 420, y: 260, period: 19 },
    { x: 1180, y: 700, period: 23 },
    { x: 760, y: 520, period: 29 },
    { x: 1350, y: 210, period: 31 },
    { x: 260, y: 760, period: 26 },
  ]
  const rings = 4
  // Ring k shows from k × 0.6 s to k × 0.6 + 2.4 s of the beat, fading out.
  let out = ''
  spots.forEach((s, j) => {
    for (let k = 0; k < rings; k++) {
      const name = `rp${j}_${k}`
      const t0 = (k * 0.6) / s.period
      const t1 = (k * 0.6 + 0.4) / s.period
      const t2 = (k * 0.6 + 2.6) / s.period
      const p = (v: number) => `${n(v * 100)}%`
      kf(name, `0%,${p(t0)}{opacity:0}${p(t1)}{opacity:${n(0.75 - k * 0.15)}}${p(t2)},100%{opacity:0}`)
      const radius = 18 + k * 22
      const count = Math.round((radius * 2 * Math.PI) / 11)
      const xs: number[] = []
      const ys: number[] = []
      for (let q = 0; q < count; q++) {
        const a = (q / count) * Math.PI * 2 + r() * 0.05
        xs.push(Math.round(s.x + Math.cos(a) * radius))
        ys.push(Math.round(s.y + Math.sin(a) * radius * 0.92))
      }
      out += `<text x="${xs.join(' ')}" y="${ys.join(' ')}" style="animation:${name} ${s.period}s linear ${n(-j * 4.7)}s infinite">${'.'.repeat(count)}</text>`
    }
  })
  return `<g font-size="13" fill="#e2f5ec">${out}</g>`
}

// A koi in three still parts, bent at two joints by CSS: the rear body
// sways, the tail swings further, a beat behind, so the fish undulates.
function koiDrawn(kind: KoiKind, seed: number, font: number, scale: number, beat: number): Drawn {
  const front = draw(koi(kind, seed, 'front'), font, scale)
  const rear = draw(koi(kind, seed, 'rear'), font, scale)
  const tail = draw(koi(kind, seed, 'tail'), font, scale)
  const px = (u: number) => n(u * scale * cw(font))
  const py = (u: number) => n(((u * scale) / ASPECT) * lh(font))
  const at = (x: number) => `transform-origin:${px(x)}px ${py(KOI.CY)}px`
  const svg =
    `<g style="${at(KOI.JOINT)};animation:wag ${n(beat)}s ease-in-out infinite alternate">${rear.svg}` +
    `<g style="${at(KOI.X0)};animation:wag2 ${n(beat)}s ease-in-out ${n(-beat * 0.3)}s infinite alternate">${tail.svg}</g></g>` +
    front.svg
  return { svg, w: front.w, h: front.h }
}

// ---------- Assembly ----------

function build(): string {
  // Koi: big ones on the upper lane, smaller ones on the other.
  kf('wag', 'from{transform:rotate(-7deg)}to{transform:rotate(7deg)}')
  kf('wag2', 'from{transform:rotate(-13deg)}to{transform:rotate(13deg)}')
  const big = (kind: KoiKind, seed: number) => koiDrawn(kind, seed, 6, 2.2, 3.2)
  const small = (kind: KoiKind, seed: number) => koiDrawn(kind, seed, 5, 2.1, 2.8)
  const fly = draw(dragonfly, 6, 1.8)

  // Lily pads sway gently on the surface.
  kf('bob', 'from{transform:rotate(-2.5deg)}to{transform:rotate(2.5deg)}')
  const pad = (r: number, notch: number, seed: number, x: number, y: number, period: number, flower = false) => {
    const d = draw(lilyPad(r, notch, seed), 9, 1.6)
    const bloom = flower ? (() => { const l = draw(lotus, 9, 1.5); return `<g transform="translate(${n(d.w / 2 - l.w / 2 - 6)},${n(d.h / 2 - l.h / 2 - 10)})">${l.svg}</g>` })() : ''
    return `<g transform="translate(${n(x - d.w / 2)},${n(y - d.h / 2)})" filter="url(#lift)"><g class="fb" style="animation:bob ${n(period)}s ease-in-out ${-seed}s infinite alternate">${d.svg}${bloom}</g></g>`
  }

  const lane1 = lane(
    [
      { d: big('kohaku', 1), path: { a: [-400, 820], b: [500, 1060], c: [1050, -40], d: [2000, 160] }, dur: 78 },
      { d: big('showa', 3), path: { a: [-400, 300], b: [1750, 60], c: [1750, 940], d: [-400, 720] }, dur: 96 },
      { d: big('yamabuki', 5), path: { a: [700, -380], b: [950, 420], c: [260, 640], d: [-400, 560] }, dur: 64 },
      { d: big('asagi', 7), path: { a: [2000, 520], b: [1100, 860], c: [480, -60], d: [-400, 240] }, dur: 80 },
    ],
    0,
  )
  const lane2 = lane(
    [
      { d: small('tancho', 2), path: { a: [1150, 1400], b: [1550, 560], c: [80, 520], d: [420, -380] }, dur: 70 },
      { d: fly, path: { a: [-240, 180], b: [600, 420], c: [900, 120], d: [1840, 380] }, dur: 26, hold: 7, shadow: false },
      { d: small('ogon', 4), path: { a: [-400, 640], b: [520, 360], c: [1100, 900], d: [2000, 620] }, dur: 66 },
      { d: small('kohaku', 9), path: { a: [2000, 120], b: [900, 300], c: [700, 760], d: [-400, 900] }, dur: 72 },
    ],
    150,
  )

  const surface = [
    pad(15, 0.7, 2, 1340, 150, 9, true),
    pad(11, 2.4, 5, 1500, 300, 11),
    pad(9, 4.1, 8, 1210, 70, 10),
    pad(13, 3.6, 3, 180, 840, 12, true),
    pad(9, 1.2, 6, 380, 930, 9),
    pad(7, 5.2, 9, 90, 650, 13),
  ]

  return st.finish({
    defs: `<radialGradient id="pond" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#22594a"/><stop offset=".55" stop-color="#153d32"/><stop offset="1" stop-color="#0a221b"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#03100b" stop-opacity="0"/><stop offset="1" stop-color="#03100b" stop-opacity=".72"/></radialGradient>
<filter id="murk"><feGaussianBlur stdDeviation=".9"/></filter>
<filter id="shade" x="-20%" y="-30%" width="150%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="5"/><feOffset dx="22" dy="30"/><feComponentTransfer><feFuncA type="linear" slope=".45"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="lift" x="-20%" y="-20%" width="150%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dx="8" dy="12"/><feComponentTransfer><feFuncA type="linear" slope=".5"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    layers: [
      `<rect width="${W}" height="${H}" fill="url(#pond)"/>`,
      floor(),
      shimmer(),
      ...lane1,
      ...lane2.filter((_, i) => i !== 1),
      ...surface,
      petals(),
      ripples(),
      lane2[1]!,
      `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
    ],
  })
}

export const KOI_SVG = build()
