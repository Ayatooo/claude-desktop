// "Abyss" scene: the ocean floor, in the dark. The only light comes from
// living things (bioluminescence) and the glow of a hydrothermal vent.
//
// Layers, back to front: bluish black water → vent glow → marine snow →
// bioluminescent sparks → rocky floor, glass sponges, sea pen, vent and its
// plume → creatures (two lanes, never more than two on screen) → vignette.

import {
  ANGLER_LURE,
  EEL_TAIL,
  SQUID_EYE,
  angler,
  ctenophore,
  dumbo,
  giantSquid,
  glassSponge,
  gulper,
  rocks,
  seaPen,
  vent,
} from './abyss-models'
import type { Spot } from './abyss-models'
import { H, W, cw, esc, lh, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

const st = stage({ cycle: 500, slow: 2.1 })
const { kf, draw, place } = st

// Where a model point lands on screen once rendered (font, scale).
function spotAt(s: Spot, font: number, scale: number): { x: number; y: number } {
  return { x: (Math.floor(s.x * scale) + 0.5) * cw(font), y: (Math.floor((s.y * scale) / 2) + 0.5) * lh(font) }
}

// A pulsing halo placed on a light organ.
function halo(at: { x: number; y: number }, r: number, gradient: string, period: number, delay = 0): string {
  kf('glim', '0%,100%{opacity:.35}50%{opacity:1}')
  return `<circle cx="${n(at.x)}" cy="${n(at.y)}" r="${r}" fill="url(#${gradient})" style="animation:glim ${period}s ease-in-out ${delay}s infinite"/>`
}

// Marine snow: fine particles falling very slowly.
function marineSnow(): string {
  const r = rng(53)
  ;[24, -30, 40, -18].forEach((d, i) =>
    kf(`sn${i}`, `0%{transform:translate(0,-20px);opacity:0}10%{opacity:1}50%{transform:translate(${d}px,${H / 2}px)}90%{opacity:1}100%{transform:translate(${-d / 2}px,${H + 20}px);opacity:0}`),
  )
  let out = ''
  for (let i = 0; i < 40; i++) {
    const dur = 90 + r() * 80
    out += `<text x="${n(r() * W)}" style="animation:sn${i % 4} ${Math.round(dur)}s linear ${Math.round(-r() * dur)}s infinite">${r() < 0.75 ? '.' : "'"}</text>`
  }
  return `<g font-size="12" fill="#8fa9bd" opacity="0.4">${out}</g>`
}

// Sparks: points of light that switch on, drift, and fade out.
function sparks(): string {
  const r = rng(61)
  kf('tw0', '0%,100%{opacity:0}40%{opacity:0}50%{opacity:1}62%{opacity:.15}')
  kf('tw1', '0%,100%{opacity:.1}30%{opacity:.9}45%{opacity:.2}70%{opacity:.6}')
  kf('tw2', '0%,100%{opacity:0}70%{opacity:0}78%{opacity:1}90%{opacity:0}')
  ;[18, -22, 30, -12].forEach((d, i) =>
    kf(`dr${i}`, `from{transform:translate(0,0)}to{transform:translate(${d}px,${-d * 1.5}px)}`),
  )
  const colors = ['#5ff3ff', '#8fb7ff', '#b08cff', '#5ff3ff', '#7affc8']
  let out = ''
  for (let i = 0; i < 34; i++) {
    const x = r() * W
    const y = 60 + r() * (H - 200)
    const tw = 5 + r() * 9
    const dr = 30 + r() * 30
    const ch = r() < 0.6 ? '.' : r() < 0.5 ? '*' : '+'
    out += `<text x="${n(x)}" y="${n(y)}" fill="${colors[i % colors.length]}" style="animation:tw${i % 3} ${n(tw)}s ease-in-out ${n(-r() * tw)}s infinite,dr${i % 4} ${n(dr)}s ease-in-out ${n(-r() * dr)}s infinite alternate">${ch}</text>`
  }
  return `<g font-size="13" filter="url(#glow)">${out}</g>`
}

// The vent's plume: dark swirls that rise, drift and widen as they
// dissipate.
function plume(x: number, y: number): string {
  const r = rng(71)
  ;[30, 55, 20].forEach((d, i) =>
    kf(
      `smoke${i}`,
      `0%{transform:translate(0,0) scale(.5);opacity:0}8%{opacity:.8}40%{transform:translate(${n(d * 0.3)}px,-${n((y - 80) * 0.4)}px) scale(1.6)}100%{transform:translate(${d}px,-${n(y - 80)}px) scale(3.6);opacity:0}`,
    ),
  )
  let out = ''
  const puffs = ['(~)', '{~}', '(:)', '~', '(~~)', ':~:']
  for (let i = 0; i < 10; i++) {
    const dur = 38 + r() * 10
    out += `<text class="fb" x="${n(x - 8 + (r() - 0.5) * 10)}" y="${n(y)}" style="animation:smoke${i % 3} ${n(dur)}s linear ${n(-r() * dur)}s infinite">${esc(puffs[i % puffs.length]!)}</text>`
  }
  return `<g font-size="14" fill="#56636f" filter="url(#haze)" opacity="0.8">${out}</g>`
}

// School of lanternfish: dark bodies, rows of glowing dots.
function lanternSchool(count: number, seed: number): Drawn {
  const r = rng(seed)
  let members = ''
  const frames = ['&gt;&lt;(((', '&gt;-(((']
  for (let i = 0; i < count; i++) {
    const id = st.id()
    kf(`bo${id}`, `from{transform:translateY(-5px)}to{transform:translateY(5px)}`)
    const body = frames
      .map((tail, k) => `<text style="${st.frameAnim(2, k, 1.4)}"><tspan fill="#5a6d82">${tail}</tspan><tspan fill="#7ff6ff">·:·:·</tspan><tspan fill="#5a6d82">°&gt;</tspan></text>`)
      .join('')
    members += `<g transform="translate(${n(20 + r() * 260)},${n(r() * 120)})"><g style="animation:bo${id} ${n(3.4 + r() * 2.2)}s ease-in-out ${n(-r() * 3)}s infinite alternate">${body}</g></g>`
  }
  return { svg: `<g font-size="13" filter="url(#glow)">${members}</g>`, w: 380, h: 150 }
}

// Adds halos to a drawing.
function withHalos(d: Drawn, halos: string): Drawn {
  return { ...d, svg: `${halos}${d.svg}` }
}

function build(): string {
  // Creatures, each with its lights.
  const squid = draw(giantSquid, 12, 1.3)
  const squidLit = withHalos(squid, halo(spotAt(SQUID_EYE, 12, 1.3), 30, 'h-pale', 7))

  const ang = draw(angler, 11, 1.4)
  const lure = spotAt(ANGLER_LURE, 11, 1.4)
  const angLit = withHalos(ang, halo(lure, 70, 'h-cyan', 4.2) + halo(lure, 18, 'h-white', 4.2))

  // The pale dumbo octopus, barely lit by a soft halo.
  const dum = draw(dumbo, 11, 1.4)
  const dumLit = withHalos(dum, `<circle cx="${n(dum.w / 2)}" cy="${n(dum.h / 2)}" r="${n(dum.w * 0.5)}" fill="url(#h-pale)"/>`)

  const cteno = draw(ctenophore, 10, 1.4, c => c, ' filter="url(#glow)"')

  const eel = draw(gulper, 10, 1.2)
  const eelLit = withHalos(eel, halo(spotAt(EEL_TAIL, 10, 1.2), 34, 'h-pink', 2.6))

  // Upper lane: the big ones, very slow.
  const big = st.lane(
    [
      { d: squidLit, kind: 'cross', from: 'left', y: 120, dur: 160, bob: 14, bobPeriod: 11 },
      { d: angLit, kind: 'visit', from: 'right', y: 300, turnAt: 760, pause: 14, dur: 124, bob: 10, bobPeriod: 9 },
      { d: dumLit, kind: 'cross', from: 'right', y: 150, dur: 120, bob: 26, bobPeriod: 9 },
    ] satisfies Pass[],
    0,
  )
  // Lower lane: the rising ctenophore, the school, the gulper eel.
  const small = st.lane(
    [
      { d: cteno, kind: 'rise', from: 'left', x: 700, y: 0, dur: 120, sway: 22 },
      { d: lanternSchool(10, 19), kind: 'cross', from: 'left', y: 440, dur: 72, bob: 10, bobPeriod: 9 },
      { d: eelLit, kind: 'cross', from: 'right', y: 520, dur: 120, bob: 12, bobPeriod: 10 },
    ] satisfies Pass[],
    80,
  )

  // Floor: rocks, glass sponges, sea pens, smoking vent.
  const ventD = draw(vent, 10, 1.2)
  const ventX = 640
  const ventTop = H - 4 - ventD.h + Math.floor((6 * 1.2) / 2) * lh(10)
  const floor = [
    place(draw(rocks(3, 90), 10, 1.4), -20, H - 4),
    place(draw(rocks(8, 80), 10, 1.4), W - 640, H - 4),
    place(draw(glassSponge, 10, 1.2), 140, H - 30),
    place(draw(glassSponge, 9, 0.95), 290, H - 26),
    place(draw(seaPen, 10, 1.2), 1250, H - 28),
    place(draw(seaPen, 9, 1), 1350, H - 26),
    place(ventD, ventX, H - 4),
    plume(ventX + 30 * 1.2 * 6, ventTop),
  ]

  const defs = `<linearGradient id="depths" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#061427"/><stop offset=".5" stop-color="#030b18"/><stop offset="1" stop-color="#01040a"/></linearGradient>
<radialGradient id="vent-glow" cx="${n((ventX + 216) / W)}" cy=".9" r=".45"><stop offset="0" stop-color="#ff7a3a" stop-opacity=".16"/><stop offset=".5" stop-color="#7a2a3a" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".45" r=".75"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".75"/></radialGradient>
<radialGradient id="h-cyan"><stop offset="0" stop-color="#7ff6ff" stop-opacity=".55"/><stop offset=".4" stop-color="#3fd6ff" stop-opacity=".18"/><stop offset="1" stop-color="#3fd6ff" stop-opacity="0"/></radialGradient>
<radialGradient id="h-white"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset="1" stop-color="#bffbff" stop-opacity="0"/></radialGradient>
<radialGradient id="h-pink"><stop offset="0" stop-color="#ff9ae0" stop-opacity=".6"/><stop offset=".45" stop-color="#ff5ac8" stop-opacity=".16"/><stop offset="1" stop-color="#ff5ac8" stop-opacity="0"/></radialGradient>
<radialGradient id="h-pale"><stop offset="0" stop-color="#cfe6f2" stop-opacity=".14"/><stop offset="1" stop-color="#cfe6f2" stop-opacity="0"/></radialGradient>
<filter id="glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>`

  return st.finish({
    defs,
    layers: [
      `<rect width="${W}" height="${H}" fill="url(#depths)"/>`,
      `<rect width="${W}" height="${H}" fill="url(#vent-glow)"/>`,
      marineSnow(),
      sparks(),
      ...floor,
      ...big,
      ...small,
      `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
    ],
  })
}

export const ABYSS_SVG = build()
