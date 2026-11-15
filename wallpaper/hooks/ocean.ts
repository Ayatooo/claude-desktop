// "Ocean" scene: an aquarium made entirely of characters.
//
// The creatures are vector shapes (`ocean-models.ts`) rendered as solid,
// shaded ASCII by `ascii.ts`. Layers, from back to front:
//   water (character field) → light rays → far plane (whale, shark, school,
//   veiled by fog) → surface caustics → marine snow → middle plane (fish,
//   turtle, jellyfish, shark) → seabed (kelp, reefs, sand, octopus, crab,
//   seahorse, anemone) → bubbles → near plane (manta ray, slightly
//   blurred) → vignette.
//
// Everything is a CSS-animated SVG, built once when the module loads: no
// script in the SVG, no external resource. Fixed seed: the scene is always
// the same.

import {
  angel,
  clown,
  crab,
  jelly,
  kelp,
  manta,
  reef,
  shark,
  tang,
  turtle,
  whale,
} from './ocean-models'
import { H, W, cw, esc, lh, mix, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

const WATER_TOP = '#0f4566'
const WATER_MID = '#0a2f4b'
const WATER_DEEP = '#04162a'

// Everything is slow: `slow` multiplies the frame cycles (tails, fins).
const st = stage({ cycle: 500, slow: 2.1 })
const { kf, frameAnim, draw, place } = st

type Plane = 'far' | 'mid' | 'near'

const PLANE: Record<Plane, { fog: number; opacity: number }> = {
  far: { fog: 0.6, opacity: 0.75 },
  mid: { fog: 0.06, opacity: 0.95 },
  near: { fog: 0, opacity: 0.55 },
}

const fogged = (plane: Plane) => (c: string) => mix(c, WATER_MID, PLANE[plane].fog)

// ---------- Water, light, surface ----------

// Suspended particles: a repeated tile of characters that fades with
// depth.
function waterField(): string {
  const r = rng(7)
  const f = 14
  const tw = 300
  const th = 200
  const glyphs = ['.', "'", '`', ',', '.', '.']
  let marks = ''
  for (let i = 0; i < 26; i++) {
    marks += `<text x="${Math.round(r() * tw)}" y="${Math.round(r() * th)}">${glyphs[Math.floor(r() * glyphs.length)]}</text>`
  }
  return (
    `<pattern id="grain" width="${tw}" height="${th}" patternUnits="userSpaceOnUse"><g font-size="${f}" fill="#7fb6d2">${marks}</g></pattern>` +
    `<mask id="depthMask"><rect width="${W}" height="${H}" fill="url(#depth)"/></mask>` +
    `<rect width="${W}" height="${H}" fill="url(#grain)" mask="url(#depthMask)" opacity="0.5"/>`
  )
}

function rays(): string {
  const bands = [
    { x: 250, w: 110, slant: 340, period: 16 },
    { x: 690, w: 70, slant: 300, period: 21 },
    { x: 1060, w: 150, slant: 380, period: 14 },
    { x: 1420, w: 60, slant: 320, period: 18 },
  ]
  kf('ray', 'from{opacity:.45;transform:skewX(-3deg)}to{opacity:1;transform:skewX(3deg)}')
  const out = bands
    .map(
      (b, i) =>
        `<polygon class="ry" style="animation:ray ${b.period}s ease-in-out ${-i * 3}s infinite alternate" points="${b.x},0 ${b.x + b.w},0 ${b.x + b.w * 2.4 + b.slant},${H} ${b.x - b.w * 0.8 + b.slant},${H}"/>`,
    )
    .join('')
  return `<g fill="url(#beam)" filter="url(#soft)" opacity="0.55">${out}</g>`
}

// Caustics below the surface: 6 frames in sequence, like moving water.
function caustics(): string {
  const f = 12
  const cW = cw(f)
  const lH = lh(f)
  const cols = Math.ceil(W / cW)
  const frames = 6
  let out = ''
  for (let k = 0; k < frames; k++) {
    const ph = (k / frames) * Math.PI * 2
    let spans = ''
    for (let y = 1; y < 7; y++) {
      let s = ''
      for (let x = 0; x < cols; x++) {
        const v = Math.sin(x * 0.31 + y * 0.9 + ph) + Math.sin(x * 0.117 - y * 0.4 - ph * 2) * 0.8 + Math.sin(x * 0.053 + ph) * 0.6
        const th = 1.35 + y * 0.12
        s += v > th ? (v > th + 0.45 ? '~' : v > th + 0.2 ? '-' : '_') : ' '
      }
      const t = s.trimEnd()
      const st = t.search(/\S/)
      if (st >= 0) spans += `<tspan x="${n(st * cW)}" y="${n((y + 0.8) * lH)}" opacity="${n(1 - y * 0.13)}">${t.slice(st)}</tspan>`
    }
    out += `<text style="${frameAnim(frames, k, 6)}">${spans}</text>`
  }
  const wave = '~^~-~~-^-~~^~--~^~~-~^-~~-~^~-~^~~--~^~'
  const unit = wave.length * cW
  const surface = wave.repeat(Math.ceil((W * 2) / unit) + 1)
  kf('surf', `from{transform:translateX(0)}to{transform:translateX(${n(-unit)}px)}`)
  return (
    `<g font-size="${f}" fill="#bfefff" opacity="0.38">${out}</g>` +
    `<text font-size="${f}" fill="#d8f6ff" opacity="0.55" y="${n(0.8 * lH)}" style="animation:surf 26s linear infinite">${surface}</text>`
  )
}

// Marine snow: fine particles drifting down.
function marineSnow(): string {
  const r = rng(23)
  ;[30, -24, 44, -40].forEach((d, i) =>
    kf(`sn${i}`, `0%{transform:translate(0,-20px);opacity:0}8%{opacity:1}50%{transform:translate(${d}px,${H / 2}px)}92%{opacity:1}100%{transform:translate(${-d / 2}px,${H + 20}px);opacity:0}`),
  )
  let out = ''
  for (let i = 0; i < 46; i++) {
    const dur = 60 + r() * 60
    out += `<text x="${n(r() * W)}" style="animation:sn${i % 4} ${Math.round(dur)}s linear ${Math.round(-r() * dur)}s infinite">${r() < 0.7 ? '.' : "'"}</text>`
  }
  return `<g font-size="12" fill="#cfe9f5" opacity="0.5">${out}</g>`
}

// ---------- Seabed ----------

function sand(): string {
  const r = rng(31)
  const f = 12
  const cW = cw(f)
  const lH = lh(f)
  const cols = Math.ceil(W / cW)
  let out = ''
  for (let y = 0; y < 3; y++) {
    let s = ''
    for (let x = 0; x < cols; x++) {
      const v = r()
      s += y === 0 ? (v < 0.5 ? '_' : v < 0.7 ? '.' : v < 0.85 ? ',' : '-') : v < 0.3 ? '.' : v < 0.45 ? ':' : v < 0.55 ? ',' : ' '
    }
    out += `<tspan x="0" y="${n(H - 3 * lH + (y + 0.8) * lH)}" fill="${mix('#d9c48f', '#5b5136', y * 0.3)}">${esc(s.trimEnd())}</tspan>`
  }
  return `<text font-size="${f}" opacity="0.6">${out}</text>`
}

// Bubbles: strings of them rising and growing.
function bubbles(): string {
  const r = rng(41)
  const vents = [
    { x: 150, y: H - 120 },
    { x: 1420, y: H - 110 },
  ]
  let out = ''
  vents.forEach((v, j) => {
    const name = `bu${j}`
    const w = 8 + j * 3
    for (let i = 0; i < 7; i++) {
      const dur = 16 + r() * 7
      kf(
        name,
        `0%{transform:translate(0,0) scale(.5);opacity:0}6%{opacity:.9}25%{transform:translate(${n(w)}px,-${n(v.y * 0.25)}px) scale(.8)}50%{transform:translate(${n(-w)}px,-${n(v.y * 0.5)}px) scale(1)}75%{transform:translate(${n(w)}px,-${n(v.y * 0.75)}px) scale(1.2)}96%{opacity:.7}100%{transform:translate(0,-${n(v.y - 20)}px) scale(1.35);opacity:0}`,
      )
      const ch = ['°', 'o', '°', 'O', 'o'][i % 5]!
      out += `<text class="fb" x="${n(v.x)}" y="${n(v.y)}" style="animation:${name} ${n(dur)}s ease-in ${n(-(i / 7) * dur)}s infinite">${ch}</text>`
    }
  })
  return `<g font-size="14" fill="#d6f3ff" opacity="0.75">${out}</g>`
}

// A school of small fish in thin ASCII, drawn facing right.
function schoolDrawn(plane: Plane, count: number, seed: number, font: number): Drawn {
  const r = rng(seed)
  const tint = fogged(plane)
  const fish = ['><((°>', '>-((°>']
  let members = ''
  for (let i = 0; i < count; i++) {
    const id = st.id()
    kf(`bo${id}`, `from{transform:translateY(-4px)}to{transform:translateY(4px)}`)
    const body = fish.map((s, k) => `<text style="${frameAnim(2, k, 1.2)}">${esc(s)}</text>`).join('')
    const shade = mix('#cfe7f2', '#7fa6ba', r())
    members += `<g transform="translate(${n(20 + r() * 220)},${n(r() * 110)})" fill="${tint(shade)}"><g style="animation:bo${id} ${n(3.2 + r() * 2)}s ease-in-out ${n(-r() * 3)}s infinite alternate">${body}</g></g>`
  }
  return { svg: `<g font-size="${font}">${members}</g>`, w: 300, h: 130 }
}

// ---------- Assembly ----------

function build(): string {
  const far = fogged('far')
  const mid = fogged('mid')
  const reefL = draw(reef('left'), 10, 1.1)
  const reefR = draw(reef('right'), 10, 1.1)
  // Kelp: a still drawing that sways from its base.
  kf('sway', 'from{transform:skewX(-5deg)}to{transform:skewX(5deg)}')
  const kelpAt = (x: number, height: number, seed: number) => {
    const d = draw(kelp(height, seed), 10, 1)
    return `<g transform="translate(${n(x)},${n(H - 30 - d.h)})"><g class="sw" style="animation:sway ${n(6.5 + (seed % 5) * 0.8)}s ease-in-out ${-seed}s infinite alternate">${d.svg}</g></g>`
  }
  // Jellyfish: the bell pulses.
  kf('pulse', '0%,100%{transform:scale(1,1)}45%{transform:scale(1.05,.92)}')
  const jellyD = draw(jelly({ hue: 'violet' }), 9, 1.7, mid, ' filter="url(#glow)"')
  const pulsing: Drawn = { ...jellyD, svg: `<g class="pu" style="animation:pulse 4.6s ease-in-out infinite">${jellyD.svg}</g>` }
  // Manta seen from above: the wing beat squashes the wingspan.
  kf('flap', 'from{transform:scaleY(1)}to{transform:scaleY(.64)}')
  const mantaD = draw(manta, 13, 1.05)
  const flapping: Drawn = { ...mantaD, svg: `<g class="fb" style="animation:flap 3.4s ease-in-out infinite alternate">${mantaD.svg}</g>` }

  const crabD = draw(crab, 11, 1.2)

  // Upper lane: the big, slow animals.
  const big = st.lane(
    ([
      { d: draw(shark, 12, 1.4, mid), opacity: PLANE.mid.opacity, kind: 'cross', from: 'left', y: 110, dur: 76, bob: 12, bobPeriod: 8.0 },
      { d: draw(whale, 9, 1.2, far), opacity: PLANE.far.opacity, kind: 'cross', from: 'right', y: 90, dur: 133, bob: 10, bobPeriod: 11.2 },
      { d: draw(turtle, 11, 1.5, mid), opacity: PLANE.mid.opacity, kind: 'cross', from: 'right', y: 200, dur: 99, bob: 18, bobPeriod: 9.6 },
      { d: flapping, opacity: PLANE.near.opacity, kind: 'cross', from: 'left', y: 10, dur: 68, bob: 24, bobPeriod: 12.8, wrap: g => `<g filter="url(#dof)">${g}</g>` },
    ] satisfies Pass[]),
    0,
  )
  // Lower lane: the small, livelier fish that come to look and leave again.
  const small = st.lane(
    ([
      { d: draw(tang, 11, 1.7, mid), opacity: PLANE.mid.opacity, kind: 'visit', from: 'right', y: 430, turnAt: 820, dur: 49 },
      { d: pulsing, opacity: PLANE.mid.opacity, kind: 'rise', from: 'left', x: 660, y: 0, dur: 87 },
      { d: draw(clown, 11, 1.8, mid), opacity: PLANE.mid.opacity, kind: 'visit', from: 'left', y: 520, turnAt: 620, dur: 42, bob: 6 },
      { d: schoolDrawn('mid', 9, 9, 13), opacity: PLANE.mid.opacity, kind: 'cross', from: 'right', y: 420, dur: 46, bob: 12, bobPeriod: 8.0 },
      { d: draw(angel, 10, 1.6, mid), opacity: PLANE.mid.opacity, kind: 'cross', from: 'left', y: 360, dur: 65, bobPeriod: 7.0 },
      { d: crabD, opacity: PLANE.mid.opacity, kind: 'walk', from: 'right', y: H - 24 - crabD.h, dur: 84, bob: 0 },
    ] satisfies Pass[]),
    60,
  )

  const layers = [
    waterField(),
    rays(),
    caustics(),
    marineSnow(),

    // Calm seabed: rocks and corals in the corners, a few kelp.
    kelpAt(330, 70, 3),
    place(reefL, 0, H - 22),
    place(reefR, W - reefR.w, H - 22),
    sand(),
    kelpAt(70, 86, 5),
    kelpAt(1500, 80, 21),
    bubbles(),

    ...big,
    ...small,
  ]

  return st.finish({
    defs: `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${WATER_TOP}"/><stop offset=".45" stop-color="${WATER_MID}"/><stop offset="1" stop-color="${WATER_DEEP}"/></linearGradient>
<radialGradient id="halo" cx=".5" cy="0" r="1.1"><stop offset="0" stop-color="#7fd8ff" stop-opacity=".22"/><stop offset=".6" stop-color="#7fd8ff" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".45" r=".8"><stop offset=".55" stop-color="#020b16" stop-opacity="0"/><stop offset="1" stop-color="#020b16" stop-opacity=".7"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4f1ff" stop-opacity=".26"/><stop offset=".55" stop-color="#c4f1ff" stop-opacity=".07"/><stop offset="1" stop-color="#c4f1ff" stop-opacity="0"/></linearGradient>
<linearGradient id="depth" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>
<filter id="soft" x="-20%" y="-5%" width="140%" height="110%"><feGaussianBlur stdDeviation="16"/></filter>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="dof" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="0.7"/></filter>`,
    layers: [
      `<rect width="${W}" height="${H}" fill="url(#water)"/>`,
      `<rect width="${W}" height="${H}" fill="url(#halo)"/>`,
      ...layers,
      `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
    ],
  })
}

export const OCEAN_SVG = build()
