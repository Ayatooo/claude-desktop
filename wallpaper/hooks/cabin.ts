// "Winter cabin" scene: a snowy night in the mountains.
//
// Layers, from back to front:
//   sky and stars → moon → northern lights (striated curtains) → distant
//   mountains → ASCII snowy ridge → frozen lake (the elk crosses it) →
//   back forest → middle firs → window glow → cabin and its
//   smoke → ground and drifts → front firs → falling snow (three
//   planes) → passes (snowy owl, fox, hare) → vignette.
//
// Two lanes: the sky and the distance (snowy owl, elk), the ground (fox,
// hare). Never more than two creatures at once. Everything is slow.

import { cabin, elk, fir, fox, hare, owl, peaks, ridge, snowField } from './cabin-models'
import { H, W, esc, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

const SKY_TOP = '#050a1a'
const SKY_MID = '#0b1630'
const SKY_LOW = '#1a2a4c'

const st = stage({ cycle: 380, slow: 2.1 })
const { kf, draw, place } = st

// Model units → pixels, for a given font size and scale.
const px = (u: number, font: number, scale: number) => u * scale * 0.6 * font

// ---------- Sky ----------

// Stars: a fixed repeated tile, plus a few twinkling stars.
function stars(): string {
  const r = rng(5)
  let marks = ''
  for (let i = 0; i < 30; i++) {
    const ch = r() < 0.8 ? '.' : r() < 0.5 ? '+' : "'"
    marks += `<text x="${Math.round(r() * 320)}" y="${Math.round(r() * 240)}">${ch}</text>`
  }
  kf('tw', 'from{opacity:.15}to{opacity:1}')
  let twinkle = ''
  for (let i = 0; i < 14; i++) {
    const x = r() * W
    const y = r() * 420
    twinkle += `<text x="${n(x)}" y="${n(y)}" style="animation:tw ${n(3 + r() * 5)}s ease-in-out ${n(-r() * 6)}s infinite alternate">${r() < 0.5 ? '*' : '+'}</text>`
  }
  return (
    `<pattern id="starTile" width="320" height="240" patternUnits="userSpaceOnUse"><g font-size="11" fill="#c9d6ff">${marks}</g></pattern>` +
    `<mask id="topFade"><rect width="${W}" height="${H}" fill="url(#fade)"/></mask>` +
    `<rect width="${W}" height="620" fill="url(#starTile)" mask="url(#topFade)" opacity="0.55"/>` +
    `<g font-size="13" fill="#e4ecff">${twinkle}</g>`
  )
}

function moon(): string {
  return (
    `<circle cx="1330" cy="118" r="120" fill="url(#halo)"/>` +
    `<circle cx="1330" cy="118" r="34" fill="url(#moon)"/>` +
    `<g font-size="9" fill="#9fb0c8" opacity="0.6"><text x="1314" y="110">o</text><text x="1336" y="128">.</text><text x="1322" y="134">°</text></g>`
  )
}

// Northern lights: each curtain follows a wavy curve, with a bright edge
// at the bottom and a veil striated with rays that fades out upward.
function aurora(): string {
  const curve = (y: number, amp: number, k: number, ph: number) => {
    let d = ''
    for (let x = -120; x <= W + 120; x += 40) {
      d += `${d ? ' L' : 'M'} ${x} ${n(y + Math.sin(x * k + ph) * amp + Math.sin(x * k * 2.7 + ph * 2) * amp * 0.35)}`
    }
    return d
  }
  const curtain = (y: number, amp: number, k: number, ph: number, color: string, veil: string, anim: string) =>
    `<g class="ry" style="animation:${anim}">` +
    `<path d="${curve(y - 62, amp, k, ph)}" fill="none" stroke="url(#${veil})" stroke-width="130" opacity=".5"/>` +
    `<path d="${curve(y, amp, k, ph)}" fill="none" stroke="${color}" stroke-width="9" opacity=".7"/>` +
    `</g>`
  kf('aurora1', 'from{transform:translateX(-60px) skewX(-6deg);opacity:.5}to{transform:translateX(60px) skewX(6deg);opacity:1}')
  kf('aurora2', 'from{transform:translateX(50px) skewX(5deg);opacity:1}to{transform:translateX(-50px) skewX(-5deg);opacity:.4}')
  return (
    `<g mask="url(#rays)" filter="url(#aurora)" opacity="0.8">` +
    curtain(250, 46, 0.0042, 0.6, '#5dffb6', 'veil', 'aurora1 48s ease-in-out infinite alternate') +
    curtain(190, 34, 0.0058, 2.4, '#b48cff', 'veil2', 'aurora2 63s ease-in-out infinite alternate') +
    curtain(300, 26, 0.0034, 4.2, '#46e6a6', 'veil', 'aurora2 55s ease-in-out -22s infinite alternate') +
    `</g>`
  )
}

// Distant range: two smooth silhouettes, with a gradient.
function farMountains(): string {
  const line = (base: number, amp: number, seed: number) => {
    let d = `M 0 ${H}`
    for (let x = 0; x <= W; x += 16) d += ` L ${x} ${n(base - amp * peaks(x / W, seed))}`
    return `${d} L ${W} ${H} Z`
  }
  return `<path d="${line(500, 260, 0.4)}" fill="url(#mountain1)"/><path d="${line(560, 200, 2.9)}" fill="url(#mountain2)"/>`
}

// ---------- Chimney smoke ----------

function smoke(x: number, y: number): string {
  kf(
    'smoke',
    `0%{transform:translate(0,0) scale(.35);opacity:0}10%{opacity:.55}50%{transform:translate(38px,-120px) scale(1.1)}100%{transform:translate(110px,-260px) scale(2);opacity:0}`,
  )
  let out = ''
  for (let i = 0; i < 10; i++) {
    out += `<circle class="fb" cx="${n(x)}" cy="${n(y)}" r="${13 + (i % 3) * 3}" style="animation:smoke 24s linear ${n(-i * 2.4)}s infinite"/>`
  }
  return `<g fill="#9fb0c6" filter="url(#blur)">${out}</g>`
}

// ---------- Falling snow ----------

// A plane of flakes: a layer that scrolls vertically in a loop (two
// copies one above the other), with a slow sideways drift.
function snowfall(id: string, count: number, seed: number, font: number, glyphs: string[], color: string, opacity: number, period: number, drift: number): string {
  const r = rng(seed)
  let flakes = ''
  for (let i = 0; i < count; i++) {
    flakes += `<text x="${Math.round(r() * W)}" y="${Math.round(r() * H)}">${esc(glyphs[Math.floor(r() * glyphs.length)]!)}</text>`
  }
  kf(`snow${id}`, `from{transform:translateY(-${H}px)}to{transform:translateY(0)}`)
  kf(`drift${id}`, `from{transform:translateX(${-drift}px)}to{transform:translateX(${drift}px)}`)
  // The second copy is a <use>: the content is fixed, only the parent moves.
  return (
    `<g style="animation:drift${id} ${n(period * 0.4)}s ease-in-out infinite alternate"><g style="animation:snow${id} ${period}s linear infinite" font-size="${font}" fill="${color}" opacity="${opacity}">` +
    `<g id="flakes${id}">${flakes}</g><use href="#flakes${id}" y="${H}"/>` +
    `</g></g>`
  )
}

// ---------- Assembly ----------

function build(): string {
  // Firs: three templates defined once, placed several times with <use>
  // (they contain no animation).
  const firA = draw(fir(64, 3), 8, 1)
  const firB = draw(fir(48, 7), 8, 0.9)
  const firC = firA
  const firDefs = `<g id="firA">${firA.svg}</g><g id="firB">${firB.svg}</g>`
  const tree = (idRef: string, d: Drawn, x: number, bottom: number, k: number, opacity = 1, flip = false) =>
    `<use href="#${idRef}" transform="translate(${n(x)},${n(bottom - d.h * k)}) scale(${flip ? -k : k},${k})${flip ? ` translate(${n(-d.w)},0)` : ''}" opacity="${opacity}"/>`

  // ASCII snowy ridge, between the distant range and the forest.
  const ridgeD = draw(ridge(334, 64, 1.7), 8, 1)
  // Ground: snowdrifts in the foreground.
  const groundD = draw(snowField(268, 30, 2), 10, 1)
  const GROUND = H - groundD.h + 14

  // Cabin in the center (visible on a phone) and its chimney.
  const CF = 7
  const CS = 1.66
  const cabinD = draw(cabin, CF, CS)
  const cx = W / 2 - cabinD.w / 2 + 10
  const cy = GROUND + 18 - cabinD.h
  const chimneyX = cx + px(45, CF, CS)
  const chimneyY = cy + px(4, CF, CS)
  const winY = cy + px(37.5, CF, CS)

  // Solid silhouette behind the cabin: what lies behind does not show
  // through between the characters.
  const P = (u: number, v: number) => `${n(cx + px(u, CF, CS))},${n(cy + px(v, CF, CS))}`
  const backing = `<polygon fill="#140f0c" points="${[P(1.5, 27), P(31, 3.2), P(42, 11.6), P(42, 3.5), P(48.2, 3.5), P(48.2, 16.4), P(60.5, 27), P(53, 27.5), P(53, 52), P(9, 52), P(9, 27.5)].join(' ')}"/>`

  // Warm glow of the windows: halo behind, reflection on the snow in front.
  kf('glow', 'from{opacity:.7}to{opacity:1}')
  const glow =
    `<g style="animation:glow 3.7s ease-in-out infinite alternate">` +
    `<ellipse cx="${n(cx + px(17.5, CF, CS))}" cy="${n(winY)}" rx="70" ry="48" fill="url(#warm)"/>` +
    `<ellipse cx="${n(cx + px(44.5, CF, CS))}" cy="${n(winY)}" rx="70" ry="48" fill="url(#warm)"/>` +
    `<ellipse cx="${n(cx + px(31, CF, CS))}" cy="${n(winY + 30)}" rx="60" ry="60" fill="url(#warm)"/>` +
    `</g>`
  const spill = `<g style="animation:glow 4.3s ease-in-out -1s infinite alternate"><ellipse cx="${n(cx + cabinD.w / 2)}" cy="${n(GROUND + 30)}" rx="260" ry="34" fill="url(#warm)" opacity="0.55"/></g>`

  // Passes. Upper lane: the sky and the distance.
  // A dark halo around the characters makes the creatures stand out from the scenery.
  const apart = (svg: string) => `<g filter="url(#standOut)">${svg}</g>`
  const owlD = draw(owl, 8, 1.2)
  const elkD = draw(elk, 7, 1)
  const LAKE = 652
  const sky = st.lane(
    [
      { d: owlD, kind: 'cross', from: 'left', y: 150, dur: 86, bob: 22, bobPeriod: 7, opacity: 0.95, wrap: apart },
      { d: elkD, kind: 'cross', from: 'right', y: LAKE - elkD.h, dur: 190, stopAt: 820, pause: 34, bob: 0, opacity: 0.9, wrap: apart },
    ] satisfies Pass[],
    0,
  )
  // Lower lane: the ground, in front of the cabin.
  const foxD = draw(fox, 7, 1.3)
  const hareD = draw(hare, 7, 1.05)
  const ground = st.lane(
    [
      { d: foxD, kind: 'cross', from: 'left', y: GROUND + 46 - foxD.h, dur: 132, stopAt: 760, pause: 24, bob: 3, bobPeriod: 1.8, wrap: apart },
      { d: hareD, kind: 'visit', from: 'right', y: GROUND + 44 - hareD.h, turnAt: 930, dur: 104, pause: 30, bob: 5, bobPeriod: 2.4, wrap: apart },
    ] satisfies Pass[],
    250,
  )

  const layers = [
    `<rect width="${W}" height="${H}" fill="url(#night)"/>`,
    stars(),
    moon(),
    aurora(),
    farMountains(),
    `<g opacity="0.66">${place(ridgeD, 0, 640)}</g>`,
    ...sky.slice(1, 2),
    // Back forest, hazy.
    `<g opacity="0.55">${[40, 150, 260, 340, 1180, 1290, 1390, 1490, 1560].map((x, i) => tree(i % 2 ? 'firB' : 'firA', i % 2 ? firB : firA, x, LAKE + 70 + (i % 3) * 6, 0.45 + (i % 3) * 0.06, 1, i % 2 === 0)).join('')}</g>`,
    `<g opacity="0.8">${[150, 330, 1190, 1350].map((x, i) => tree(i % 2 ? 'firA' : 'firB', i % 2 ? firA : firB, x, GROUND + 6, 0.75 + (i % 2) * 0.1, 1, i > 1)).join('')}</g>`,
    `<g opacity="0.9">${[520, 600, 690, 900, 990, 1060].map((x, i) => tree(i % 2 ? 'firA' : 'firB', i % 2 ? firA : firB, x, GROUND - 40 + (i % 3) * 8, 0.62 + (i % 3) * 0.08, 1, i % 2 === 1)).join('')}</g>`,
    backing,
    glow,
    place(cabinD, cx, cy + cabinD.h),
    smoke(chimneyX, chimneyY - 4),
    place(groundD, 0, H + 6),
    spill,
    // Front firs, at the edges.
    tree('firA', firC, -40, H + 10, 1.25),
    tree('firA', firC, W - firC.w * 1.15 + 30, H + 14, 1.15, 1, true),
    snowfall('1', 90, 13, 9, ['.', '.', "'", '`'], '#c7d5ea', 0.55, 90, 24),
    ...sky.slice(0, 1),
    snowfall('2', 46, 17, 13, ['*', '.', '+'], '#e3ecf8', 0.75, 58, 34),
    ...ground,
    snowfall('3', 14, 19, 22, ['*'], '#f4f8ff', 0.6, 34, 46),
    `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
  ]

  return st.finish({
    defs:
      `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY_TOP}"/><stop offset=".45" stop-color="${SKY_MID}"/><stop offset=".7" stop-color="${SKY_LOW}"/><stop offset="1" stop-color="#0d1830"/></linearGradient>` +
      `<linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="halo"><stop offset="0" stop-color="#cfe0ff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>` +
      `<radialGradient id="moon" cx=".4" cy=".4"><stop offset="0" stop-color="#fbfdff"/><stop offset=".8" stop-color="#d9e4f5"/><stop offset="1" stop-color="#b8c8e2"/></radialGradient>` +
      `<linearGradient id="veil" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#4dffb0" stop-opacity=".9"/><stop offset=".45" stop-color="#2ad1a0" stop-opacity=".35"/><stop offset="1" stop-color="#7a5cff" stop-opacity="0"/></linearGradient>` +
      `<linearGradient id="veil2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#b06cff" stop-opacity=".7"/><stop offset=".5" stop-color="#5b8cff" stop-opacity=".25"/><stop offset="1" stop-color="#5b8cff" stop-opacity="0"/></linearGradient>` +
      `<pattern id="stripes" width="61" height="10" patternUnits="userSpaceOnUse"><rect width="61" height="10" fill="#8a8a8a"/><rect x="3" width="4" height="10" fill="#fff"/><rect x="12" width="2" height="10" fill="#d8d8d8"/><rect x="19" width="7" height="10" fill="#f2f2f2"/><rect x="31" width="1.5" height="10" fill="#fff"/><rect x="38" width="5" height="10" fill="#e4e4e4"/><rect x="49" width="3" height="10" fill="#fff"/><rect x="55" width="2" height="10" fill="#cfcfcf"/></pattern>` +
      `<mask id="rays"><rect width="${W}" height="${H}" fill="url(#stripes)"/></mask>` +
      `<filter id="aurora" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="7 4"/></filter>` +
      `<linearGradient id="mountain1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b3d5e"/><stop offset=".5" stop-color="#141f37"/></linearGradient>` +
      `<linearGradient id="mountain2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a5078"/><stop offset=".5" stop-color="#18253f"/></linearGradient>` +
      `<linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb6d8" stop-opacity=".0"/><stop offset=".5" stop-color="#9fb6d8" stop-opacity=".22"/><stop offset="1" stop-color="#9fb6d8" stop-opacity="0"/></linearGradient>` +
      `<radialGradient id="warm"><stop offset="0" stop-color="#ffb35a" stop-opacity=".55"/><stop offset=".5" stop-color="#ff9a3c" stop-opacity=".18"/><stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/></radialGradient>` +
      `<filter id="blur" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="13"/></filter>` +
      `<filter id="standOut" x="-5%" y="-5%" width="110%" height="110%"><feMorphology in="SourceAlpha" operator="dilate" radius="2.2" result="d"/><feFlood flood-color="#0a1322" flood-opacity=".8"/><feComposite in2="d" operator="in"/><feGaussianBlur stdDeviation="1.6"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>` +
      `<radialGradient id="vignette" cx=".5" cy=".45" r=".8"><stop offset=".55" stop-color="#02050e" stop-opacity="0"/><stop offset="1" stop-color="#02050e" stop-opacity=".65"/></radialGradient>` +
      firDefs,
    layers,
  })
}

export const CABIN_SVG = build()
