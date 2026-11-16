// The koi pond's thumbnail for the picker: a kohaku circling, a showa
// following it, under a lily pad and its lotus, on a 400 × 225 canvas.

import { ASPECT } from './ascii'
import { KOI, koi, lilyPad, lotus } from './koi-models'
import type { KoiKind } from './koi-models'
import { cw, lh, n, rng, stage } from './stage'

const TW = 400
const TH = 225

function build(): string {
  const st = stage({ cycle: 20, slow: 1 })
  const { kf, draw } = st

  kf('wag', 'from{transform:rotate(-8deg)}to{transform:rotate(8deg)}')
  kf('wag2', 'from{transform:rotate(-14deg)}to{transform:rotate(14deg)}')
  kf('circle', 'from{transform:rotate(0deg)}to{transform:rotate(360deg)}')
  kf('bob', 'from{transform:rotate(-3deg)}to{transform:rotate(3deg)}')

  const fish = (kind: KoiKind, seed: number, font: number, scale: number) => {
    const part = (p: 'front' | 'rear' | 'tail') => draw(koi(kind, seed, p), font, scale)
    const [front, rear, tail] = [part('front'), part('rear'), part('tail')]
    const px = (u: number) => n(u * scale * cw(font))
    const py = n(((KOI.CY * scale) / ASPECT) * lh(font))
    const svg =
      `<g style="transform-origin:${px(KOI.JOINT)}px ${py}px;animation:wag 1.6s ease-in-out infinite alternate">${rear.svg}` +
      `<g style="transform-origin:${px(KOI.X0)}px ${py}px;animation:wag2 1.6s ease-in-out -.5s infinite alternate">${tail.svg}</g></g>${front.svg}`
    return { svg, w: front.w, h: front.h }
  }

  // Pebbles.
  const r = rng(3)
  let pebbles = ''
  for (let i = 0; i < 70; i++) {
    const v = r()
    pebbles += `<text x="${Math.round(r() * TW)}" y="${Math.round(r() * TH)}">${v < 0.5 ? '.' : v < 0.75 ? 'o' : '°'}</text>`
  }

  // Two koi on one circle, half a turn apart, swimming clockwise.
  const swimmer = (d: { svg: string; w: number; h: number }, R: number, delay: number) =>
    `<g transform="translate(190,112)"><g style="animation:circle 20s linear ${n(delay)}s infinite"><g transform="translate(${n(-d.w / 2)},${n(-R - d.h / 2)})">${d.svg}</g></g></g>`
  const a = fish('kohaku', 1, 3.2, 1.6)
  const b = fish('showa', 3, 2.8, 1.6)

  const pad = draw(lilyPad(13, 2.2, 3), 4.2, 1.5)
  const flower = draw(lotus, 4.2, 1.4)

  return st
    .finish({
      defs: `<radialGradient id="p" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#22594a"/><stop offset=".6" stop-color="#153d32"/><stop offset="1" stop-color="#0a221b"/></radialGradient>
<filter id="sh" x="-20%" y="-30%" width="150%" height="170%"><feGaussianBlur in="SourceAlpha" stdDeviation="2.5"/><feOffset dx="9" dy="12"/><feComponentTransfer><feFuncA type="linear" slope=".45"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
      layers: [
        `<rect width="${TW}" height="${TH}" fill="url(#p)"/>`,
        `<g font-size="8" fill="#8a826e" opacity=".45">${pebbles}</g>`,
        `<g filter="url(#sh)">${swimmer(a, 62, 0)}${swimmer(b, 62, -10)}</g>`,
        `<g transform="translate(${n(TW - pad.w + 14)},${n(-18)})" filter="url(#sh)"><g class="fb" style="animation:bob 6s ease-in-out infinite alternate">${pad.svg}<g transform="translate(${n(pad.w / 2 - flower.w / 2 - 4)},${n(pad.h / 2 - flower.h / 2 - 6)})">${flower.svg}</g></g></g>`,
      ],
    })
    .replace(/viewBox="[^"]*"/, `viewBox="0 0 ${TW} ${TH}"`)
}

export const KOI_THUMB = build()
