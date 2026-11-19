// "Cloudy night" scene, in cell art (each character on its own coloured cell,
// as a terminal paints): a deep blue sky with a faint grid, a blue glow on
// both edges, twinkling stars and now and then a shooting star, a crescent
// moon in khaki cells with a halo of dots, and blue clouds drifting slowly
// from one edge to the other.
//
// Kept light, as the desktop app holds a scene still when it costs too much
// to draw: a few hundred glyphs, no blur, the clouds stepped at CLOUD_FPS.
// CSS-animated SVG, no script, fixed seed. `build(view)` also draws the
// picker's thumbnail (a crop).

import { CELL_CSS, CH, CW, Grid, gridSvg } from './cells'
import { H, W, n, rng, stage } from './stage'

// Frames a second of the drifting clouds: slow enough a drift looks smooth.
const CLOUD_FPS = 8
// The cells of the moon and the clouds are drawn this much larger than the
// autumn night's, as big characters on big cells.
const ZOOM = 1.8

const CLOUD_BG = ['#2b3b82', '#314493', '#3a4fa8', '#2f418c']
const CLOUD_FG = ['#7f93e6', '#93a6f2', '#6c80d6']
const CLOUD_GLYPHS = 'SSSSSttt%%XX'

// A cloud of `w` columns: four rows, the top one shorter and off-centre, the
// bottom one a little narrower, every cell a blue tone with a glyph on it.
function cloud(w: number, seed: number): Grid {
  const r = rng(seed)
  const g = new Grid()
  const rows: [number, number][] = [
    [Math.round(w * 0.3), Math.round(w * 0.42)],
    [Math.round(w * 0.1), Math.round(w * 0.82)],
    [0, w],
    [Math.round(w * 0.06), Math.round(w * 0.86)],
  ]
  rows.forEach(([start, len], y) => {
    for (let c = start; c < start + len; c++) {
      g.set(c, y, {
        bg: CLOUD_BG[Math.floor(r() * CLOUD_BG.length)]!,
        fg: CLOUD_FG[Math.floor(r() * CLOUD_FG.length)]!,
        ch: CLOUD_GLYPHS[Math.floor(r() * CLOUD_GLYPHS.length)]!,
      })
    }
    // A loose dot or two at the ends.
    if (r() < 0.6) g.set(start - 2, y, { fg: '#56659e', ch: '.' })
  })
  return g
}

// A crescent: the cells of a disc, less those of an offset disc, with a halo
// of dots and small circles around it.
function moon(cx: number, cy: number, rad: number): Grid {
  const r = rng(41)
  const g = new Grid()
  // Cells are taller than wide: count rows in cell heights.
  const k = CH / CW
  for (let y = -rad - 3; y <= rad + 3; y++) {
    for (let x = Math.round(-rad * k) - 4; x <= Math.round(rad * k) + 4; x++) {
      const d = Math.hypot(x / k, y)
      const cut = Math.hypot((x - rad * 0.55 * k) / k, y + rad * 0.25)
      if (d <= rad && cut > rad * 0.82) {
        g.set(cx + x, cy + y, { bg: r() < 0.55 ? '#8f8a68' : '#a39b74', fg: '#4a4634', ch: '%t:;:t'[Math.floor(r() * 6)]! })
      } else if (d <= rad + 2.5 && cut > rad * 0.82 && r() < 0.28) {
        g.set(cx + x, cy + y, { fg: '#636a86', ch: r() < 0.6 ? '.' : r() < 0.5 ? 'o' : ':' })
      }
    }
  }
  return g
}

function build(view?: string): string {
  const st = stage({ cycle: 240, slow: 1 })
  const { kf } = st
  const r = rng(29)

  // ---------- Sky ----------
  ;[0, 1, 2].forEach(i => kf(`tw${i}`, `0%,100%{opacity:.2}${35 + i * 20}%{opacity:.95}`))
  let stars = ''
  for (let i = 0; i < 110; i++) {
    stars += `<circle cx="${Math.round(r() * W)}" cy="${Math.round(r() * H)}" r="${n(0.7 + r() * 1.3)}" style="animation:tw${i % 3} ${n(3 + r() * 7)}s ease-in-out ${n(-r() * 9)}s infinite"/>`
  }
  // A few faint crosses.
  let crosses = ''
  for (let i = 0; i < 14; i++) {
    const x = Math.round(r() * W)
    const y = Math.round(r() * H)
    crosses += `M${x - 4} ${y}h8M${x} ${y - 4}v8`
  }

  // A shooting star now and then: a short streak crossing and fading.
  kf('shoot', '0%{transform:translate(0,0);opacity:0}1%{opacity:1}5%{transform:translate(-420px,210px);opacity:0}100%{transform:translate(-420px,210px);opacity:0}')
  const shooting = [
    [1250, 90, 23, -4],
    [700, 60, 31, -19],
  ]
    .map(([x, y, d, del]) => `<path d="M${x} ${y}l46 -23" stroke="url(#streak)" stroke-width="2" stroke-linecap="round" style="animation:shoot ${d}s linear ${del}s infinite"/>`)
    .join('')

  // ---------- Moon ----------
  const moonG = moon(0, 0, 6)

  // ---------- Clouds ----------
  // Each drifts from beyond the left edge to beyond the right one and loops,
  // in steps: CLOUD_FPS a second.
  const clouds = [
    { w: 26, y: 140, dur: 230, at: 0.15, seed: 3 },
    { w: 28, y: 400, dur: 280, at: 0.7, seed: 8 },
    { w: 26, y: 620, dur: 210, at: 0.45, seed: 13 },
    { w: 20, y: 840, dur: 260, at: 0.9, seed: 21 },
  ]
    .map(({ w, y, dur, at, seed }, i) => {
      const px = w * CW * ZOOM
      kf(`cl${i}`, `from{transform:translateX(${n(-px - 60)}px)}to{transform:translateX(${W + 60}px)}`)
      return `<g transform="translate(0,${y})"><g style="animation:cl${i} ${dur}s steps(${Math.round(dur * CLOUD_FPS)},end) ${n(-at * dur)}s infinite"><g transform="scale(${ZOOM})">${gridSvg(cloud(w, seed))}</g></g></g>`
    })
    .join('')

  const svg = st.finish({
    defs: `<linearGradient id="nsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060b1e"/><stop offset=".55" stop-color="#0b1538"/><stop offset="1" stop-color="#13265f"/></linearGradient>
<radialGradient id="edgeL" cx="0" cy=".55" r=".5"><stop offset="0" stop-color="#2f5bd8" stop-opacity=".45"/><stop offset="1" stop-color="#2f5bd8" stop-opacity="0"/></radialGradient>
<radialGradient id="edgeR" cx="1" cy=".55" r=".5"><stop offset="0" stop-color="#2f5bd8" stop-opacity=".45"/><stop offset="1" stop-color="#2f5bd8" stop-opacity="0"/></radialGradient>
<pattern id="ngrid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#9fb3ff" stroke-width="1" opacity=".06"/></pattern>
<linearGradient id="streak" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8eeff" stop-opacity="1"/><stop offset="1" stop-color="#e8eeff" stop-opacity="0"/></linearGradient>`,
    css: [CELL_CSS],
    back: [
      `<rect width="${W}" height="${H}" fill="url(#nsky)"/>`,
      `<rect width="${W}" height="${H}" fill="url(#edgeL)"/>`,
      `<rect width="${W}" height="${H}" fill="url(#edgeR)"/>`,
      `<rect width="${W}" height="${H}" fill="url(#ngrid)"/>`,
      `<g fill="#dfe6ff" opacity=".75">${stars}</g>`,
      `<path d="${crosses}" stroke="#aab8ee" stroke-width="1.2" opacity=".35"/>`,
      shooting,
    ],
    layers: [`<g transform="translate(1130,190) scale(${ZOOM})">${gridSvg(moonG)}</g>`, clouds],
  })
  return view ? svg.replace(/viewBox="[^"]*"/, `viewBox="${view}"`) : svg
}

export const NIGHT_SVG = build()
// The thumbnail: the moon and the clouds passing by it, cropped to 16:9.
export const NIGHT_THUMB = build('640 20 880 495')
