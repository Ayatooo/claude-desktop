// "Desert at night" scene: a desert made entirely of characters.
//
// Layers, from back to front:
//   indigo sky → Milky Way (glow + star dust) → twinkling stars →
//   crescent moon → shooting star → far dunes, oasis, caravan on the
//   ridge → middle dunes, saguaro → ground dwellers (fennec, fluorescent
//   scorpion, jerboa, viper) → near dunes, saguaro and rocks → sand
//   blown by the wind → vignette.
//
// Creatures move through two lanes, never more than two on screen.
// Everything is slow. Built once, when the scenes are generated.

import {
  caravan,
  dune,
  duneLayer,
  fennec,
  jerboa,
  moon,
  oasis,
  rocks,
  saguaro,
  scorpion,
  viper,
} from './desert-models'
import { H, W, cw, esc, lh, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

const st = stage({ cycle: 500, slow: 2.1 })
const { kf, draw, place } = st

// A dune ridge: sharp crest at the top, wide troughs, slightly
// asymmetric (gentle windward slope, steeper slip face).
function ridge(x: number, wave: number, phase: number): number {
  const t = (Math.PI * x) / wave + phase
  const skew = t + 0.45 * Math.sin(t)
  return Math.pow(1 - Math.abs(Math.sin(skew)), 1.35)
}
const smooth = (v: number) => {
  const c = Math.max(0, Math.min(1, v))
  return c * c * (3 - 2 * c)
}

// Crest lines of the three rows of dunes, in pixels.
const farCrest = (x: number) => 566 - (18 + 14 * Math.sin(x * 0.0021 + 0.7)) * ridge(x, 560, 0.4) - 7 * ridge(x, 190, 1.3)
const midCrest = (x: number) => 730 - (62 + 38 * Math.sin(x * 0.0019 + 2.2)) * ridge(x, 640, 1.9) - 12 * ridge(x, 260, 0.2)
// The near dunes rise at the edges and leave a hollow in the middle.
const nearCrest = (x: number) => {
  const edge = smooth((Math.abs(x - 790) - 360) / 260)
  return 914 + 3 * Math.sin(x * 0.013) - edge * 180 * ridge(x, 700, 2.6)
}

// The ground the dwellers walk on: the hollow between the near dunes.
const GROUND = 914

// ---------- Sky ----------

// The Milky Way: a diagonal band of star dust, with a dark rift down the
// middle, over a blurred glow.
function milkyWay(): string {
  const r = rng(5)
  const f = 7
  const cW = cw(f)
  const lH = lh(f)
  const x0 = 60
  const y0 = -40
  const x1 = 1560
  const y1 = 470
  const len = Math.hypot(x1 - x0, y1 - y0)
  const nx = -(y1 - y0) / len
  const ny = (x1 - x0) / len
  const sigma = 105
  let spans = ''
  for (let row = 0; row * lH < 520; row++) {
    const y = (row + 0.8) * lH
    // X of the band's center at this height.
    const xc = x0 + ((y - y0) / (y1 - y0)) * (x1 - x0)
    const half = (1.9 * sigma) / Math.abs(ny)
    const c0 = Math.max(0, Math.floor((xc - half) / cW))
    const c1 = Math.min(Math.ceil(W / cW), Math.ceil((xc + half) / cW))
    let s = ''
    for (let c = c0; c < c1; c++) {
      const x = c * cW
      const d = (x - x0) * nx + (y - y0) * ny
      const g = Math.exp(-((d / sigma) ** 2))
      const rift = 1 - 0.75 * Math.exp(-(((d - 14) / 26) ** 2)) * (0.6 + 0.4 * Math.sin(x * 0.012))
      const p = g * rift * 0.55
      const v = r()
      s += v < p ? (v < p * 0.12 ? '*' : v < p * 0.35 ? ':' : v < p * 0.6 ? "'" : '.') : ' '
    }
    const t = s.trimEnd()
    const st0 = t.search(/\S/)
    if (st0 >= 0) spans += `<tspan x="${n((c0 + st0) * cW)}" y="${n(y)}">${esc(t.slice(st0))}</tspan>`
  }
  const glow = `<polygon points="${x0 - 40},${y0 - 80} ${x0 + 200},${y0 - 120} ${x1 + 60},${y1 - 90} ${x1 - 120},${y1 + 120}" fill="url(#milkyWay)" filter="url(#blur)" opacity="0.8"/>`
  return `${glow}<text font-size="${f}" fill="#a9addf" opacity="0.5">${spans}</text>`
}

// The stars, in four groups that each twinkle at their own pace.
function stars(): string {
  const r = rng(17)
  const groups: string[][] = [[], [], [], []]
  for (let i = 0; i < 170; i++) {
    const x = r() * W
    const y = r() * (farCrest(x) - 40)
    const v = r()
    const ch = v < 0.07 ? '+' : v < 0.12 ? '*' : v < 0.55 ? '.' : "'"
    groups[i % 4]!.push(`<tspan x="${Math.round(x)}" y="${Math.round(y)}">${ch}</tspan>`)
  }
  ;[5.2, 7.4, 6.1, 9.3].forEach((p, i) => kf(`tw${i}`, `from{opacity:${i % 2 ? 0.25 : 0.45}}to{opacity:1}`))
  return groups
    .map(
      (g, i) =>
        `<text font-size="${i === 0 ? 13 : 11}" fill="${['#f4f1ff', '#dfe3ff', '#fff3dc', '#cfd6ff'][i]}" style="animation:tw${i} ${[5.2, 7.4, 6.1, 9.3][i]}s ease-in-out ${-i * 1.7}s infinite alternate">${g.join('')}</text>`,
    )
    .join('')
}

// A shooting star, now and then.
function shootingStar(): string {
  kf('shootingStar', '0%,93%{opacity:0;transform:translate(0,0) rotate(18deg)}94%{opacity:1}98%{opacity:.8;transform:translate(-420px,150px) rotate(18deg)}100%{opacity:0;transform:translate(-470px,168px) rotate(18deg)}')
  return `<g transform="translate(1320,70)"><text class="fb" font-size="12" fill="#f6f4ff" style="animation:shootingStar 47s linear -20s infinite">*=--- - -  .</text></g>`
}

// ---------- Wind ----------

// Blown sand, streaking along the ridges now and then.
function windStreaks(): string {
  const spots = [
    { x: 150, y: nearCrest(150) - 6, len: 260, p: 19 },
    { x: 1560, y: nearCrest(1560) - 6, len: 300, p: 23 },
    { x: 190, y: midCrest(190) - 4, len: 200, p: 17 },
    { x: 1360, y: midCrest(1360) - 4, len: 220, p: 21 },
    { x: 790, y: midCrest(790) - 4, len: 180, p: 26 },
    { x: 1290, y: farCrest(1290) - 3, len: 140, p: 29 },
  ]
  const glyphs = ['. -~ .', "-.~'. -", '.~- . ~', "' .-~."]
  let out = ''
  spots.forEach((s, i) => {
    const name = `wi${i}`
    kf(name, `0%{opacity:0;transform:translate(0,0)}6%{opacity:.85}30%{opacity:.6}40%{opacity:0;transform:translate(${-s.len}px,${n(s.len * 0.12)}px)}100%{opacity:0;transform:translate(${-s.len}px,${n(s.len * 0.12)}px)}`)
    out += `<text x="${n(s.x - 30)}" y="${n(s.y)}" style="animation:${name} ${s.p}s ease-out ${-i * 4.3}s infinite">${esc(glyphs[i % glyphs.length]!)}</text>`
  })
  return `<g font-size="11" fill="#c9cbee">${out}</g>`
}

// ---------- Dunes ----------

// The solid body of a row of dunes: a gradient-filled path under the crest,
// and a thin rim of moonlight along the ridge.
function duneBody(crest: (x: number) => number, bottom: number, fill: string, rim: string): string {
  let top = ''
  for (let x = 0; x <= W; x += 8) top += `${x === 0 ? 'M' : 'L'}${x},${n(crest(x))}`
  const body = `${top}L${W},${bottom}L0,${bottom}Z`
  return (
    `<path d="${body}" fill="${fill}"/>` +
    `<path d="${top}" fill="none" stroke="${rim}" stroke-width="1.6" opacity=".55" filter="url(#rimBlur)"/>`
  )
}

// ---------- Assembly ----------

function build(): string {
  const farFont = 8
  const midFont = 10
  const nearFont = 12
  const farDunes = draw(
    duneLayer({
      crest: farCrest,
      top: 500,
      bottom: 760,
      u: cw(farFont),
      width: W,
      lit: ['#2a2d55', '#383c69', '#575c92'],
      shade: ['#17193a', '#1f2247', '#2b2f5c'],
      crestColor: '#767bb3',
    }),
    farFont,
    1,
  )
  const midDunes = draw(
    duneLayer({
      crest: midCrest,
      top: 570,
      bottom: 940,
      u: cw(midFont),
      width: W,
      lit: ['#373b6b', '#50558b', '#8085bf'],
      shade: ['#1d2046', '#272b58', '#363b70'],
      crestColor: '#9fa3d8',
      ripples: true,
    }),
    midFont,
    1,
  )
  const nearDunes = draw(
    duneLayer({
      crest: nearCrest,
      top: 730,
      bottom: H,
      u: cw(nearFont),
      width: W,
      lit: ['#474a78', '#666a9e', '#a3a6d4'],
      shade: ['#25284e', '#313567', '#454a82'],
      crestColor: '#c0c3ea',
      ripples: true,
    }),
    nearFont,
    1,
  )

  const moonD = draw(moon, 10, 1.7)
  const oasisD = draw(oasis, 6, 1)
  const caravanD = draw(caravan, 5, 1)
  const bigCactus = draw(saguaro('two'), 9, 1.05)
  const smallCactus = draw(saguaro('one'), 7, 0.8)
  const rocksD = draw(rocks(3), 9, 1)

  // Ground dwellers: feet resting on the hollow of the near dunes. `foot`
  // is the height of the feet within the drawing (0 at top, 1 at bottom).
  const onGround = (d: Drawn, foot: number) => GROUND - 9 - d.h * foot
  const fennecD = draw(fennec, 10, 1.2)
  const scorpionD = draw(scorpion, 10, 1.1, c => c, ' filter="url(#glow)"')
  const viperD = draw(viper, 10, 1.1)
  // The jerboa moves along in hops.
  kf('hop', '0%{transform:translateY(0)}12%{transform:translateY(-30px)}26%{transform:translateY(0)}40%,100%{transform:translateY(0)}')
  const jerboaRaw = draw(jerboa, 9, 1)
  const jerboaD: Drawn = { ...jerboaRaw, svg: `<g style="animation:hop 2.8s ease-in-out infinite">${jerboaRaw.svg}</g>` }

  // Far lane: the caravan on the ridge, then the viper in the foreground.
  const far = st.lane(
    [
      { d: caravanD, kind: 'cross', from: 'right', y: 548 - caravanD.h, dur: 230, bob: 0, opacity: 0.9 },
      { d: viperD, kind: 'cross', from: 'left', y: onGround(viperD, 0.8), dur: 130, bob: 0 },
    ] satisfies Pass[],
    0,
  )
  // Near lane: the fennec comes to look, the scorpion passes, the jerboa hops.
  const near = st.lane(
    [
      { d: fennecD, kind: 'visit', from: 'left', y: onGround(fennecD, 0.97), turnAt: 640, pause: 18, dur: 120, bob: 0 },
      { d: scorpionD, kind: 'cross', from: 'right', y: onGround(scorpionD, 0.98), dur: 150, bob: 0 },
      { d: jerboaD, kind: 'cross', from: 'left', y: onGround(jerboaD, 0.96), dur: 85, bob: 0 },
    ] satisfies Pass[],
    60,
  )

  const layers = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<rect width="${W}" height="${H}" fill="url(#horizon)"/>`,
    milkyWay(),
    stars(),
    `<circle cx="880" cy="135" r="150" fill="url(#halo)"/>`,
    place(moonD, 880 - moonD.w / 2, 135 + moonD.h / 2),
    shootingStar(),

    // Far dunes, oasis, caravan on the ridge.
    duneBody(farCrest, 760, 'url(#duneFar)', '#8d92c8'),
    place(farDunes, 0, 760),
    place(oasisD, 690, farCrest(800) + 10),
    ...far.slice(0, 1),

    // Middle dunes and small saguaro.
    duneBody(midCrest, 940, 'url(#duneMid)', '#aeb2e2'),
    place(midDunes, 0, 940),
    place(smallCactus, 1205, midCrest(1225) + 6),

    // Ground dwellers, who pass behind the near dunes at the edges.
    ...far.slice(1),
    ...near,

    // Near dunes, big saguaro, rocks, wind.
    duneBody(nearCrest, H, 'url(#duneNear)', '#cdd0f2'),
    place(nearDunes, 0, H),
    place(bigCactus, 70, nearCrest(150) + 14),
    place(rocksD, 1250, nearCrest(1330) + 30),
    windStreaks(),
    `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
  ]

  return st.finish({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070820"/><stop offset=".45" stop-color="#0f1236"/><stop offset=".62" stop-color="#1b1d4a"/><stop offset="1" stop-color="#14163a"/></linearGradient>
<linearGradient id="horizon" x1="0" y1="0" x2="0" y2="1"><stop offset=".42" stop-color="#3b2d5a" stop-opacity="0"/><stop offset=".56" stop-color="#4a3560" stop-opacity=".45"/><stop offset=".64" stop-color="#3b2d5a" stop-opacity="0"/></linearGradient>
<linearGradient id="milkyWay" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f94d8" stop-opacity="0"/><stop offset=".5" stop-color="#9aa0e6" stop-opacity=".22"/><stop offset="1" stop-color="#8f94d8" stop-opacity="0"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#f3ecd0" stop-opacity=".28"/><stop offset=".45" stop-color="#c9c3e8" stop-opacity=".08"/><stop offset="1" stop-color="#c9c3e8" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".45" r=".8"><stop offset=".55" stop-color="#03030f" stop-opacity="0"/><stop offset="1" stop-color="#03030f" stop-opacity=".7"/></radialGradient>
<linearGradient id="duneFar" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="#262955"/><stop offset=".8" stop-color="#191b40"/></linearGradient>
<linearGradient id="duneMid" x1="0" y1="0" x2="0" y2="1"><stop offset=".58" stop-color="#2d3163"/><stop offset=".95" stop-color="#1a1c44"/></linearGradient>
<linearGradient id="duneNear" x1="0" y1="0" x2="0" y2="1"><stop offset=".74" stop-color="#363a72"/><stop offset="1" stop-color="#1e2150"/></linearGradient>
<filter id="rimBlur" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
<filter id="blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="40"/></filter>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    layers,
  })
}

export const DESERT_SVG = build()
