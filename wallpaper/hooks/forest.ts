// "Forest floor at night" scene: the moon behind the trunks, mist on the ground,
// fireflies, an owl on its branch, and a few animals passing by.
//
// Layers, back to front: sky and stars → moon and halo → distant trunks
// (veiled) → high mist → bats → middle trunks, branch and owl → undergrowth
// → ground animals → ferns → near trunks → fireflies → low mist → vignette.
//
// Two lanes, never more than two animals on screen: the big ones on the
// ground (fox, deer), and the small ones (rabbit, bats, hedgehog).

import {
  bat,
  deer,
  fern,
  fox,
  hedgehog,
  moon,
  owl,
  rabbit,
  trunk,
  trunkGeom,
} from './forest-models'
import type { TrunkOpts } from './forest-models'
import { H, W, cw, esc, lh, mix, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

const CYCLE = 500
const st = stage({ cycle: CYCLE, slow: 2.1 })
const { kf, id, draw, place } = st

const SKY_TOP = '#061520'
const SKY_MID = '#0b2532'
const SKY_LOW = '#0a1d27'
const GROUND = H - 70

// The animals, lit by the moon: a hint of silver.
const moonlit = (c: string) => mix(c, '#cfe0ea', 0.1)

// ---------- Lane timing ----------
//
// `stage.lane` spreads out the idle time; we redo the same computation to
// know when an animal stops, and switch its pose then.

type Timed = Pass & { start: number; shift: number }

function schedule(passes: Pass[], offset: number): Timed[] {
  const busy = passes.reduce((a, p) => a + p.dur, 0)
  const gap = (CYCLE - busy) / passes.length
  // Same start times as stage.lane: scheduled from 0 to CYCLE, then shifted.
  let t = gap / 2
  const shift = ((offset % CYCLE) + CYCLE) % CYCLE
  return passes.map(p => {
    const start = t
    t += p.dur + gap
    return { ...p, start, shift }
  })
}

// A pass's stop window, as `stage` computes it.
function pauseWindow(p: Timed): [number, number] {
  const pause = p.pause ?? 0
  if (p.kind === 'visit') {
    const mid = p.start + p.dur / 2
    return [mid - 1.2 - pause / 2, mid - 1.2 + pause / 2]
  }
  const out = p.from === 'left' ? -p.d.w - 60 : W + 60
  const other = p.from === 'left' ? W + 60 : -p.d.w - 60
  const before = Math.abs((p.stopAt ?? 0) - out) / Math.abs(other - out)
  const t1 = p.start + (p.dur - pause) * before
  return [t1, t1 + pause]
}

const pct = (t: number) => `${(Math.round((t / CYCLE) * 100000) / 1000).toString()}%`

// Visible only between a and b (in seconds of the cycle), or only outside.
function window(a: number, b: number, inside: boolean, shift: number): string {
  const i = id()
  const on = inside ? 1 : 0
  const off = 1 - on
  kf(`show${i}`, `0%{opacity:${off}}${pct(a)}{opacity:${off}}${pct(a + 0.05)}{opacity:${on}}${pct(b)}{opacity:${on}}${pct(b + 0.05)}{opacity:${off}}100%{opacity:${off}}`)
  return `animation:show${i} ${CYCLE}s linear ${shift === 0 ? 0 : -(CYCLE - shift)}s infinite`
}

// An animal that walks, then strikes other poses while it stops.
function withPoses(moving: Drawn, poses: { d: Drawn; from: number; to: number }[], walkWindow: [number, number], shift: number): Drawn {
  let svg = `<g style="${window(walkWindow[0], walkWindow[1], false, shift)}">${moving.svg}</g>`
  for (const p of poses) svg += `<g style="${window(p.from, p.to, true, shift)}">${p.d.svg}</g>`
  return { ...moving, svg }
}

// ---------- Sky ----------

function stars(): string {
  const r = rng(5)
  kf('tw0', 'from{opacity:.25}to{opacity:.9}')
  kf('tw1', 'from{opacity:.7}to{opacity:.15}')
  let out = ''
  for (let i = 0; i < 32; i++) {
    const x = r() * W
    const y = Math.pow(r(), 1.6) * 420
    const ch = r() < 0.85 ? '.' : '+'
    out += `<text x="${n(x)}" y="${n(y)}" style="animation:tw${i % 2} ${n(3 + r() * 5)}s ease-in-out ${n(-r() * 6)}s infinite alternate">${ch}</text>`
  }
  return `<g font-size="10" fill="#cfe3f0" opacity="0.7">${out}</g>`
}

// ---------- Mist ----------

function mist(y: number, opacity: number, seed: number, count: number): string {
  const r = rng(seed)
  let out = ''
  for (let i = 0; i < count; i++) {
    const k = id()
    const dx = 60 + r() * 80
    kf(`drift${k}`, `from{transform:translateX(${n(-dx)}px)}to{transform:translateX(${n(dx)}px)}`)
    out += `<ellipse cx="${n(r() * W)}" cy="${n(y + (r() - 0.5) * 40)}" rx="${n(260 + r() * 260)}" ry="${n(28 + r() * 26)}" style="animation:drift${k} ${n(40 + r() * 40)}s ease-in-out ${n(-r() * 40)}s infinite alternate"/>`
  }
  return `<g fill="#a9cbd6" opacity="${opacity}" filter="url(#mist)">${out}</g>`
}

// ---------- Fireflies ----------

function fireflies(): string {
  const r = rng(17)
  // Four drifts and three ways of blinking, shared.
  ;[
    [40, -30, -20, 25],
    [-35, -20, 30, 15],
    [25, 30, -40, -10],
    [-20, 35, 20, -30],
  ].forEach(([a, b, c, d], i) =>
    kf(`ff${i}`, `0%{transform:translate(0,0)}25%{transform:translate(${a}px,${b}px)}50%{transform:translate(${c}px,${d}px)}75%{transform:translate(${b}px,${a}px)}100%{transform:translate(0,0)}`),
  )
  kf('gl0', '0%,40%{opacity:0}50%,62%{opacity:1}72%,100%{opacity:0}')
  kf('gl1', '0%,15%{opacity:0}22%,30%{opacity:.9}36%,100%{opacity:0}')
  kf('gl2', '0%,70%{opacity:0}76%{opacity:1}80%{opacity:.2}84%{opacity:1}92%,100%{opacity:0}')
  let out = ''
  for (let i = 0; i < 24; i++) {
    const x = 80 + r() * (W - 160)
    const y = 430 + r() * 440
    out +=
      `<g transform="translate(${n(x)},${n(y)})"><g style="animation:ff${i % 4} ${n(24 + r() * 26)}s ease-in-out ${n(-r() * 40)}s infinite">` +
      `<text style="animation:gl${i % 3} ${n(5 + r() * 6)}s linear ${n(-r() * 10)}s infinite">${r() < 0.7 ? '.' : '*'}</text></g></g>`
  }
  return `<g font-size="13" fill="#e4ff8a" filter="url(#glow)">${out}</g>`
}

// ---------- Ground ----------

function undergrowth(): string {
  const r = rng(29)
  const f = 11
  const cW = cw(f)
  const lH = lh(f)
  const cols = Math.ceil(W / cW)
  const rows = 7
  const layers: Record<string, string[]> = { '#25543e': [], '#3a7a5a': [], '#5c4a34': [] }
  for (let y = 0; y < rows; y++) {
    const line: Record<string, string> = { '#25543e': '', '#3a7a5a': '', '#5c4a34': '' }
    const density = 0.25 + (y / rows) * 0.6
    for (let x = 0; x < cols; x++) {
      const v = r()
      let ch = ' '
      let color = '#25543e'
      if (v < density) {
        const k = r()
        if (y < 2) ch = k < 0.5 ? "'" : k < 0.8 ? ',' : '|'
        else ch = k < 0.3 ? '|' : k < 0.5 ? '/' : k < 0.65 ? '\\' : k < 0.8 ? ',' : "'"
        color = r() < 0.4 ? '#3a7a5a' : '#25543e'
        // Dead leaves right at ground level.
        if (y >= rows - 2 && r() < 0.35) {
          ch = r() < 0.5 ? '~' : '.'
          color = '#5c4a34'
        }
      }
      for (const k of Object.keys(line)) line[k] += k === color ? ch : ' '
    }
    for (const k of Object.keys(line)) layers[k]!.push(line[k]!)
  }
  let out = ''
  for (const [color, lines] of Object.entries(layers)) {
    let spans = ''
    lines.forEach((l, y) => {
      const s = l.search(/\S/)
      if (s >= 0) spans += `<tspan x="${n(s * cW)}" y="${n(H - rows * lH + (y + 0.8) * lH)}">${esc(l.slice(s).trimEnd())}</tspan>`
    })
    out += `<text fill="${color}">${spans}</text>`
  }
  return `<g font-size="${f}">${out}</g>`
}

// ---------- Trunks ----------

// A trunk standing on the ground, centred on `cx`: a solid silhouette (which
// hides the sky), then the ASCII bark on top. Also returns a way to place a
// point of the trunk (model units) in the scene.
function tree(o: TrunkOpts, font: number, cx: number, fill: string, ascii = true, pattern?: string) {
  const g = trunkGeom(o)
  const ux = cw(font)
  const uy = lh(font) / 2
  const rowsH = Math.ceil(o.h / 2) * lh(font)
  const left = cx - (g.pad + o.w / 2) * ux
  const top = H - rowsH
  const at = (x: number, y: number): [number, number] => [left + x * ux, top + y * uy]
  // Silhouette: both edges of the bole, then the branches as thick strokes.
  const edge: string[] = []
  for (let y = 0; y <= o.h; y += 2) edge.push(`${n(left + (g.cxAt(y) - g.half(y)) * ux)},${n(top + y * uy)}`)
  for (let y = o.h; y >= 0; y -= 2) edge.push(`${n(left + (g.cxAt(y) + g.half(y)) * ux)},${n(top + y * uy)}`)
  let sil = `<polygon points="${edge.join(' ')}"/>`
  for (const st of g.strokes) {
    const r = (st[0]![2] + st[st.length - 1]![2]) / 2
    sil += `<polyline fill="none" stroke-width="${n(r * 2 * ux)}" points="${st.map(([x, y]) => `${n(left + x * ux)},${n(top + y * uy)}`).join(' ')}"/>`
  }
  const silhouette = `<g fill="${pattern ?? fill}" stroke="${fill}" stroke-linecap="round">${sil}</g>`
  const d = ascii ? draw(trunk(o), font, 1) : undefined
  const svg = silhouette + (d ? `<g transform="translate(${n(left)},${n(top)})">${d.svg}</g>` : '')
  return { svg, g, at }
}

// Still poses that take turns in a loop (owl: blink, head turning).
function poseLoop(poses: Drawn[], seq: [number, number][]): string {
  const total = seq.reduce((a, [, t]) => a + t, 0)
  const pc2 = (t: number) => `${(Math.round((t / total) * 100000) / 1000).toString()}%`
  return poses
    .map((d, i) => {
      let t = 0
      let frames = ''
      for (const [pose, secs] of seq) {
        const on = pose === i ? 1 : 0
        frames += `${pc2(t)}{opacity:${on}}${pc2(t + secs - 0.01)}{opacity:${on}}`
        t += secs
      }
      const k = id()
      kf(`pose${k}`, frames)
      return `<g style="animation:pose${k} ${total}s linear infinite">${d.svg}</g>`
    })
    .join('')
}

// ---------- Assembly ----------

function build(): string {
  const rows = (font: number) => Math.ceil(H / lh(font)) * 2

  // Distant, veiled trunks: pale silhouettes in the mist, bark barely marked.
  const farFill = '#12293a'
  const farInk = '#1d3a4c'
  const far = [
    tree({ w: 7, h: rows(16), seed: 1, side: 1, flat: farInk, lean: 2 }, 16, 120, farFill, false, 'url(#bark)'),
    tree({ w: 9, h: rows(16), seed: 2, side: 1, flat: farInk, lean: -3 }, 16, 420, farFill, false, 'url(#bark)'),
    tree({ w: 5, h: rows(16), seed: 3, side: -1, flat: farInk, lean: 1 }, 16, 940, farFill, false, 'url(#bark)'),
    tree({ w: 8, h: rows(16), seed: 4, side: -1, flat: farInk, lean: 3 }, 16, 1190, farFill, false, 'url(#bark)'),
    tree({ w: 6, h: rows(16), seed: 5, side: -1, flat: farInk, lean: -2 }, 16, 1450, farFill, false, 'url(#bark)'),
  ]

  // Middle trunks: bark, lit on the moon side. One branch holds the owl.
  const midColors: [string, string, string] = ['#1d2f33', '#3a4f50', '#86a3a0']
  const midFont = 12
  const midH = rows(midFont)
  const owlBranch = { y: Math.round(420 / lh(midFont)) * 2, dir: 1 as const, len: 30, rise: 5 }
  const midA = tree({ w: 12, h: midH, seed: 7, side: 1, colors: midColors, lean: -2, branches: [owlBranch, { y: Math.round(250 / lh(midFont)) * 2, dir: -1, len: 18, rise: 7 }] }, midFont, 500, '#0a161b')
  const midB = tree({ w: 13, h: midH, seed: 9, side: -1, colors: midColors, lean: 3, branches: [{ y: Math.round(330 / lh(midFont)) * 2, dir: -1, len: 24, rise: 6 }] }, midFont, 1240, '#0a161b')

  // Near trunks, at the edges, the darkest.
  const nearColors: [string, string, string] = ['#16252b', '#2a3a3c', '#70908e']
  const nearA = tree({ w: 21, h: rows(14), seed: 11, side: 1, colors: nearColors, lean: 2 }, 14, 20, '#050d11')
  const nearB = tree({ w: 19, h: rows(14), seed: 13, side: -1, colors: nearColors, lean: -3 }, 14, W - 10, '#050d11')

  // The owl, perched near the middle of trunk A's branch.
  const owlPoses = ([0, 1, 2, 3] as const).map(i => draw(owl(i), 9, 1.2))
  const owlD = owlPoses[0]!
  const branch = midA.g.strokes[0]!
  const [bx, by] = midA.at(branch[3]![0], branch[3]![1] - branch[3]![2])
  const owlAt: [number, number] = [bx - owlD.w / 2, by - owlD.h + 4]
  const owlSvg = poseLoop(owlPoses, [
    [0, 7],
    [1, 0.35],
    [0, 5],
    [2, 4],
    [0, 3.5],
    [1, 0.35],
    [0, 6],
    [3, 4],
    [0, 4],
  ])

  // The moon and its halo.
  const moonD = draw(moon, 9, 1.3)
  const moonX = 760
  const moonY = 70

  // Ferns on the ground, barely swaying.
  kf('sway', 'from{transform:skewX(-3deg)}to{transform:skewX(3deg)}')
  const fernAt = (x: number, seed: number, size: number) => {
    const d = draw(fern(seed, size), 10, 1)
    return `<g transform="translate(${n(x)},${n(H - 18 - d.h)})"><g class="sw" style="animation:sway ${n(8 + seed)}s ease-in-out ${-seed}s infinite alternate">${d.svg}</g></g>`
  }

  // ---------- Lanes ----------

  // Big ground animals: a fox that comes to look, a deer that stops in the middle.
  const foxD = draw(fox, 9, 1.5, moonlit)
  const deerWalk = draw(deer('walk'), 9, 1.2, moonlit)
  const deerGraze = draw(deer('graze'), 9, 1.2, moonlit)
  const deerAlert = draw(deer('alert'), 9, 1.2, moonlit)
  const big = schedule(
    [
      { d: foxD, kind: 'visit', from: 'left', y: GROUND - foxD.h, turnAt: 600, pause: 10, dur: 84, bob: 0 },
      { d: deerWalk, kind: 'cross', from: 'right', y: GROUND - deerWalk.h, stopAt: 600, pause: 48, dur: 160, bob: 0 },
    ],
    10,
  )
  {
    const deerPass = big[1]!
    const [a, b] = pauseWindow(deerPass)
    const mid = a + (b - a) * 0.55
    deerPass.d = withPoses(deerWalk, [{ d: deerGraze, from: a, to: mid }, { d: deerAlert, from: mid, to: b }], [a, b], deerPass.shift)
  }

  // Small ones: a rabbit that comes to sniff, bats in the distance, a hedgehog.
  const hop = draw(rabbit('hop'), 10, 1.1, moonlit)
  const sit = draw(rabbit('sit'), 10, 1.1, moonlit)
  const batD = draw(bat, 8, 0.9, c => mix(c, SKY_MID, 0.1))
  const bats: Drawn = {
    svg: [
      [0, 0, 2.6],
      [70, -40, 3.1],
      [150, 10, 2.3],
    ]
      .map(([x, y, p]) => `<g transform="translate(${x},${y})">${st.bobbing(batD.svg, 26, p!)}</g>`)
      .join(''),
    w: 150 + batD.w,
    h: batD.h + 40,
  }
  const hedgeD = draw(hedgehog, 10, 1.1, moonlit)
  const small = schedule(
    [
      { d: hop, kind: 'visit', from: 'right', y: GROUND - hop.h, turnAt: 760, pause: 18, dur: 70, bob: 0 },
      { d: bats, kind: 'cross', from: 'right', y: 170, dur: 46, bob: 30, bobPeriod: 9 },
      { d: hedgeD, kind: 'cross', from: 'left', y: GROUND - hedgeD.h + 4, dur: 110, bob: 0 },
    ],
    90,
  )
  {
    const r = small[0]!
    const [a, b] = pauseWindow(r)
    r.d = withPoses(hop, [{ d: sit, from: a, to: b }], [a, b], r.shift)
  }

  const passes = [...big, ...small]
  const played = new Map<Pass, string>()
  // stage.lane recomputes the same start times: we pass it each lane as is.
  const bigSvg = st.lane(big, 10)
  const smallSvg = st.lane(small, 90)
  big.forEach((p, i) => played.set(p, bigSvg[i]!))
  small.forEach((p, i) => played.set(p, smallSvg[i]!))
  void passes

  const layers = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    stars(),
    `<circle cx="${n(moonX + moonD.w / 2)}" cy="${n(moonY + moonD.h / 2)}" r="300" fill="url(#halo)"/>`,
    `<circle cx="${n(moonX + 16 * 1.3 * cw(9))}" cy="${n(moonY + 16 * 1.3 * cw(9))}" r="${n(14.5 * 1.3 * cw(9))}" fill="#e3edf2"/>`,
    `<g transform="translate(${moonX},${moonY})">${moonD.svg}</g>`,
    ...far.map(t => t.svg),
    mist(560, 0.1, 3, 3),
    played.get(small[1]!)!,
    midA.svg,
    midB.svg,
    `<g transform="translate(${n(owlAt[0])},${n(owlAt[1])})">${owlSvg}</g>`,
    undergrowth(),
    played.get(big[0]!)!,
    played.get(big[1]!)!,
    played.get(small[0]!)!,
    played.get(small[2]!)!,
    fernAt(40, 3, 1.1),
    fernAt(460, 5, 0.9),
    fernAt(1060, 7, 1),
    fernAt(1400, 2, 1.15),
    nearA.svg,
    nearB.svg,
    fireflies(),
    mist(H - 40, 0.11, 8, 4),
    `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`,
  ]

  return st.finish({
    defs: `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${SKY_TOP}"/><stop offset=".55" stop-color="${SKY_MID}"/><stop offset="1" stop-color="${SKY_LOW}"/></linearGradient>
<radialGradient id="halo"><stop offset="0" stop-color="#cfe6f2" stop-opacity=".32"/><stop offset=".35" stop-color="#9cc6dc" stop-opacity=".12"/><stop offset="1" stop-color="#9cc6dc" stop-opacity="0"/></radialGradient>
<radialGradient id="vignette" cx=".5" cy=".42" r=".8"><stop offset=".5" stop-color="#02080d" stop-opacity="0"/><stop offset="1" stop-color="#02080d" stop-opacity=".75"/></radialGradient>
<pattern id="bark" width="24" height="38" patternUnits="userSpaceOnUse"><rect width="24" height="38" fill="#12293a"/><g font-size="13" fill="#1f3e51"><text x="3" y="12">|</text><text x="14" y="20">:</text><text x="8" y="33">|</text><text x="19" y="6">'</text></g></pattern>
<filter id="mist" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="26"/></filter>
<filter id="glow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    layers,
  })
}

export const FOREST_SVG = build()
