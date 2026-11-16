// The autumn night's thumbnail for the picker: the moon, the cabin with its
// warm windows, a fall tree, jack-o'-lanterns, a bat crossing, leaves
// falling, in the same cell art, on a 400 × 225 canvas.

import { GOLD, ORANGE, WINDOW, bat, cabin, fence, moon, pumpkin, tree } from './autumn-models'
import { CELL_CSS, CH, CW, Grid, gridSvg } from './cells'
import { n, rng, stage } from './stage'

const TW = 400
const TH = 225

function build(): string {
  const st = stage({ cycle: 16, slow: 1 })
  const { kf, frameAnim } = st

  const sky = new Grid()
  moon(sky, 30, 4, 3.6)
  const land = new Grid()
  // A low hill line.
  for (let c = 0; c < TW / CW + 1; c++) {
    const top = Math.round(12 - 1.5 * Math.sin(c * 0.2 + 1))
    for (let y = top; y <= 14; y++) land.set(c, y, { bg: y === top ? '#46213e' : '#3a1c38', fg: '#55294a', ch: y === top ? '_' : ' ' })
  }
  const { windows } = cabin(land, 13, 14)
  const lit = new Grid()
  for (const [c, r] of windows) lit.set(c, r, { ...WINDOW, ch: '+' })
  fence(land, -1, TW / CW + 1, 17)
  tree(land, 3, 21, 6, ORANGE, 1)
  tree(land, 41, 21, 5, GOLD, 4)
  const faces = new Grid()
  pumpkin(land, faces, 20, 19, 5, true)
  pumpkin(land, faces, 33, 19, 7, true)

  kf('flick', '0%,100%{opacity:1}30%{opacity:.82}55%{opacity:.97}75%{opacity:.85}')
  kf('fly', `from{transform:translate(-80px,40px)}to{transform:translate(${TW + 20}px,10px)}`)
  const wing = (f: number) => `<g style="${frameAnim(2, f, 0.45)}">${gridSvg(bat(f))}</g>`

  const r = rng(2)
  kf('leaf', `0%{transform:translate(0,0) rotate(0deg)}50%{transform:translate(14px,${TH / 2}px) rotate(200deg)}100%{transform:translate(-6px,${TH + 20}px) rotate(420deg)}`)
  let leaves = ''
  for (let i = 0; i < 10; i++) {
    const dur = 8 + r() * 6
    leaves += `<g transform="translate(${Math.round(r() * TW)},-10)"><text class="fb" fill="${['#e0782e', '#c8452a', '#e8b040'][i % 3]}" style="animation:leaf ${n(dur)}s linear ${n(-r() * dur)}s infinite">${['*', ',', '~'][i % 3]}</text></g>`
  }

  return st
    .finish({
      defs: `<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c1232"/><stop offset=".45" stop-color="#3a1a40"/><stop offset=".62" stop-color="#8a3440"/><stop offset=".7" stop-color="#b4553c"/></linearGradient>
<radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb85c" stop-opacity=".4"/><stop offset="1" stop-color="#ffb85c" stop-opacity="0"/></radialGradient>`,
      css: [CELL_CSS],
      layers: [
        `<rect width="${TW}" height="${TH}" fill="url(#s)"/>`,
        `<circle cx="${n(30.5 * CW)}" cy="${n(4.5 * CH)}" r="90" fill="url(#g)"/>`,
        gridSvg(sky),
        `<g style="animation:fly 16s linear infinite">${wing(0)}${wing(1)}</g>`,
        `<rect y="${14 * CH}" width="${TW}" height="${TH - 14 * CH}" fill="#231524"/>`,
        gridSvg(land),
        `<g style="animation:flick 4s ease-in-out infinite">${gridSvg(lit)}${gridSvg(faces)}</g>`,
        `<g font-size="12" font-weight="700">${leaves}</g>`,
      ],
    })
    .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${TW} ${TH}"`)
}

export const AUTUMN_THUMB = build()
