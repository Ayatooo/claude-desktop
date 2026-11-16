// The aquarium's thumbnail for the picker: a small, always busy view of the
// scene (a clownfish going back and forth, a jellyfish, kelp, reef), drawn
// on a 400 × 225 canvas so it stays legible once shrunk.

import { clown, jelly, kelp, reef } from './ocean-models'
import { cw, esc, lh, mix, n, rng, stage } from './stage'

const TW = 400
const TH = 225

function build(): string {
  const st = stage({ cycle: 24, slow: 1.6 })
  const { kf, draw } = st

  // Water specks.
  const r = rng(5)
  let specks = ''
  for (let i = 0; i < 40; i++) specks += `<text x="${Math.round(r() * TW)}" y="${Math.round(r() * (TH - 30))}">${r() < 0.7 ? '.' : "'"}</text>`

  // Sand.
  const f = 8
  const cols = Math.ceil(TW / cw(f))
  let sand = ''
  for (let y = 0; y < 2; y++) {
    let s = ''
    for (let x = 0; x < cols; x++) {
      const v = r()
      s += y === 0 ? (v < 0.5 ? '_' : v < 0.75 ? '.' : ',') : v < 0.35 ? '.' : v < 0.5 ? ':' : ' '
    }
    sand += `<tspan x="0" y="${n(TH - 2 * lh(f) + (y + 0.8) * lh(f))}" fill="${mix('#d9c48f', '#5b5136', y * 0.4)}">${esc(s.trimEnd())}</tspan>`
  }

  // Kelp swaying from its base, a reef in the corner.
  kf('sway', 'from{transform:skewX(-6deg)}to{transform:skewX(6deg)}')
  const k1 = draw(kelp(40, 3), 5, 1)
  const k2 = draw(kelp(30, 8), 5, 1)
  const rf = draw(reef('right'), 4, 1.5)

  // The jellyfish drifts up and down, its bell pulsing.
  kf('pulse', '0%,100%{transform:scale(1,1)}45%{transform:scale(1.06,.9)}')
  kf('drift', 'from{transform:translate(0,14px)}to{transform:translate(8px,-14px)}')
  const jl = draw(jelly({ hue: 'violet' }), 3, 1.7)

  // The clownfish crosses, turns around, comes back.
  const fish = draw(clown, 4.4, 2.2)
  const out = -fish.w - 10
  const back = TW + 10
  const at = (x: number, s: number) => `transform:translateX(${n(x)}px) scaleX(${s})`
  kf('swim', `0%{${at(out, 1)}}45%{${at(back, 1)}}50%{${at(back, -1)}}95%{${at(out, -1)}}100%{${at(out, 1)}}`)
  kf('bob', 'from{transform:translateY(-4px)}to{transform:translateY(4px)}')

  const layers = [
    `<rect width="${TW}" height="${TH}" fill="url(#w)"/>`,
    `<polygon points="90,0 130,0 210,${TH} 140,${TH}" fill="url(#beam)" opacity=".5"/>`,
    `<polygon points="260,0 290,0 350,${TH} 300,${TH}" fill="url(#beam)" opacity=".35"/>`,
    `<g font-size="7" fill="#7fb6d2" opacity=".45">${specks}</g>`,
    `<g transform="translate(40,${n(TH - 14 - k1.h)})"><g class="sw" style="animation:sway 5s ease-in-out infinite alternate">${k1.svg}</g></g>`,
    `<g transform="translate(78,${n(TH - 14 - k2.h)})"><g class="sw" style="animation:sway 6.4s ease-in-out -2s infinite alternate">${k2.svg}</g></g>`,
    `<g transform="translate(${n(TW - rf.w)},${n(TH - 10 - rf.h)})">${rf.svg}</g>`,
    `<text font-size="${f}" opacity=".6">${sand}</text>`,
    `<g transform="translate(232,24)" opacity=".9"><g style="animation:drift 7s ease-in-out infinite alternate"><g class="pu" style="animation:pulse 3.6s ease-in-out infinite">${jl.svg}</g></g></g>`,
    `<g transform="translate(0,${n(TH * 0.42)})"><g style="animation:bob 3.4s ease-in-out infinite alternate"><g class="fb" style="animation:swim 24s ease-in-out infinite">${fish.svg}</g></g></g>`,
  ]

  return st
    .finish({
      defs: `<linearGradient id="w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f4566"/><stop offset=".5" stop-color="#0a2f4b"/><stop offset="1" stop-color="#04162a"/></linearGradient>
<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4f1ff" stop-opacity=".3"/><stop offset="1" stop-color="#c4f1ff" stop-opacity="0"/></linearGradient>`,
      layers,
    })
    .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${TW} ${TH}"`)
}

export const OCEAN_THUMB = build()
