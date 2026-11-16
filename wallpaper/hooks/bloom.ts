// "Night garden" scene: glowing flowers in halftone dots on a black night.
//
// Every shape is filled with a dot pattern (a halftone screen) instead of a
// flat colour, and glows. Stems are dotted lines. A crescent moon, faint
// stars, flowers swaying and slowly breathing, pollen and petals drifting,
// fireflies; now and then a moth flutters across (one at a time).
//
// No characters here: the dots are the texture. CSS-animated SVG, no
// script, fixed seed. `bloomSvg` also draws the picker's thumbnail (a crop).

import { H, W, n, rng, stage } from './stage'
import type { Drawn, Pass } from './stage'

const TEAL = '#3fe0c8'
const BRIGHT = '#b9fff1'
const DIM = '#1f8f80'

type Flower = { x: number; base: number; top: number; bend: number; r: number; kind: 'star' | 'spike' | 'bud'; petals: number; sway: number; seed: number }

function build(view?: string): string {
  const st = stage({ cycle: 300, slow: 1 })
  const { kf } = st
  const r = rng(77)

  // ---------- Moon and stars ----------
  // A crescent: a disc with an offset disc masked out.
  const moon = `<g filter="url(#bloom)" mask="url(#crescent)"><circle cx="170" cy="150" r="112" fill="url(#dotsD)"/><circle cx="160" cy="158" r="92" fill="url(#dotsB)"/></g>`
  ;[0, 1, 2].forEach(k => kf(`tw${k}`, `0%,100%{opacity:.2}${35 + k * 20}%{opacity:.9}`))
  let stars = ''
  for (let i = 0; i < 90; i++) {
    stars += `<circle cx="${Math.round(r() * W)}" cy="${Math.round(r() * H * 0.8)}" r="${n(0.8 + r() * 1.4)}" style="animation:tw${i % 3} ${n(3 + r() * 6)}s ease-in-out ${n(-r() * 8)}s infinite"/>`
  }

  // ---------- Flowers ----------
  const flowers: Flower[] = []
  // The big cluster on the right, a smaller one at the bottom left.
  for (let i = 0; i < 16; i++) {
    const x = 1060 + r() * 560
    const kind = r() < 0.55 ? 'star' : r() < 0.6 ? 'spike' : 'bud'
    flowers.push({ x, base: H + 20, top: 250 + r() * 600, bend: (r() - 0.5) * 160, r: kind === 'star' ? 34 + r() * 30 : 18 + r() * 12, kind, petals: 5 + Math.floor(r() * 3), sway: 7 + r() * 6, seed: i })
  }
  for (let i = 0; i < 6; i++) {
    const x = -20 + r() * 330
    const kind = r() < 0.6 ? 'star' : 'bud'
    flowers.push({ x, base: H + 20, top: 720 + r() * 200, bend: (r() - 0.5) * 100, r: kind === 'star' ? 22 + r() * 18 : 14 + r() * 8, kind, petals: 5 + Math.floor(r() * 2), sway: 6 + r() * 5, seed: 40 + i })
  }
  // Back to front: the tallest first.
  flowers.sort((a, b) => a.top - b.top)

  kf('sway', 'from{transform:rotate(-2.2deg)}to{transform:rotate(2.2deg)}')
  kf('breathe', 'from{transform:scale(.94) rotate(-4deg)}to{transform:scale(1.05) rotate(4deg)}')
  kf('glowp', 'from{opacity:.75}to{opacity:1}')

  const flowerSvg = (f: Flower): string => {
    const hx = f.x + f.bend
    const hy = f.top
    // A dotted stem: a gentle curve from the ground to the head.
    const stem = `<path d="M${n(f.x)} ${f.base}C${n(f.x)} ${n(f.base - (f.base - hy) * 0.5)} ${n(hx - f.bend * 0.2)} ${n(hy + (f.base - hy) * 0.35)} ${n(hx)} ${n(hy)}" class="stem"/>`
    // A leaf or two along the stem.
    const ly = hy + (f.base - hy) * (0.55 + (f.seed % 3) * 0.1)
    const lx = f.x + f.bend * 0.35
    const side = f.seed % 2 === 0 ? 1 : -1
    const leaf = f.kind === 'bud' ? '' : `<ellipse cx="${n(lx + side * 22)}" cy="${n(ly)}" rx="26" ry="9" transform="rotate(${side * -30} ${n(lx)} ${n(ly)})" fill="url(#dotsD)"/>`
    let head = ''
    if (f.kind === 'star') {
      // Petals: an outer ring of dim dots, an inner ring of bright ones.
      let outer = ''
      let inner = ''
      for (let k = 0; k < f.petals; k++) {
        const a = (k / f.petals) * 360 + f.seed * 17
        outer += `<ellipse cx="${n(f.r * 0.58)}" cy="0" rx="${n(f.r * 0.58)}" ry="${n(f.r * 0.46)}" transform="rotate(${n(a)})"/>`
        inner += `<ellipse cx="${n(f.r * 0.36)}" cy="0" rx="${n(f.r * 0.36)}" ry="${n(f.r * 0.28)}" transform="rotate(${n(a)})"/>`
      }
      head =
        `<g fill="url(#dotsD)">${outer}</g><g fill="url(#dotsB)">${inner}</g>` +
        `<circle r="${n(f.r * 0.2)}" fill="${BRIGHT}" opacity=".85"/>`
    } else if (f.kind === 'spike') {
      // A spike of small florets, smaller toward the tip.
      for (let k = 0; k < 7; k++) {
        const t = k / 6
        head += `<circle cx="${n(Math.sin(k * 1.7) * 4)}" cy="${n(-t * f.r * 4.2)}" r="${n(f.r * (0.8 - t * 0.45))}" fill="url(#${k % 2 ? 'dotsD' : 'dotsB'})"/>`
      }
    } else {
      head = `<ellipse rx="${n(f.r * 0.7)}" ry="${n(f.r)}" fill="url(#dotsD)"/><ellipse rx="${n(f.r * 0.4)}" ry="${n(f.r * 0.7)}" cy="${n(-f.r * 0.15)}" fill="url(#dotsB)"/>`
    }
    const breathe = f.kind === 'star' ? `style="animation:breathe ${n(f.sway * 1.3)}s ease-in-out ${n(-f.seed * 1.1)}s infinite alternate"` : ''
    return (
      `<g style="transform-origin:${n(f.x)}px ${f.base}px;animation:sway ${n(f.sway)}s ease-in-out ${n(-f.seed * 0.9)}s infinite alternate">` +
      stem +
      leaf +
      `<g transform="translate(${n(hx)},${n(hy)})"><g ${breathe}><g style="animation:glowp ${n(f.sway * 0.7)}s ease-in-out ${n(-f.seed)}s infinite alternate">${head}</g></g></g>` +
      `</g>`
    )
  }

  // Low grass of dotted blades along the bottom.
  let grass = ''
  for (let i = 0; i < 70; i++) {
    const x = Math.round(r() * W)
    const h = 30 + r() * 70
    const b = (r() - 0.5) * 40
    grass += `<path d="M${x} ${H + 4}q${n(b * 0.3)} ${n(-h * 0.6)} ${n(b)} ${n(-h)}"/>`
  }
  kf('grass', 'from{transform:skewX(-3deg)}to{transform:skewX(3deg)}')

  // ---------- Drifting pollen and petals, fireflies ----------
  ;[0, 1, 2].forEach(k =>
    kf(
      `dr${k}`,
      `0%{transform:translate(0,0) rotate(0deg);opacity:0}10%{opacity:1}50%{transform:translate(${-260 - k * 80}px,${-180 - k * 40}px) rotate(${90 + k * 40}deg)}90%{opacity:1}100%{transform:translate(${-560 - k * 140}px,${-420 + k * 60}px) rotate(${200 + k * 50}deg);opacity:0}`,
    ),
  )
  let drift = ''
  for (let i = 0; i < 16; i++) {
    const x = Math.round(300 + r() * 1400)
    const y = Math.round(400 + r() * 600)
    const s = 6 + r() * 14
    const dur = 40 + r() * 50
    drift += `<g transform="translate(${x},${y})"><ellipse class="fb" rx="${n(s)}" ry="${n(s * 0.7)}" fill="url(#${i % 3 ? 'dotsD' : 'dotsB'})" style="animation:dr${i % 3} ${n(dur)}s linear ${n(-r() * dur)}s infinite"/></g>`
  }
  kf('ff', '0%,100%{transform:translate(0,0);opacity:.1}25%{transform:translate(30px,-24px);opacity:1}50%{transform:translate(-10px,-50px);opacity:.3}75%{transform:translate(-36px,-18px);opacity:.9}')
  let flies = ''
  for (let i = 0; i < 14; i++) {
    const x = Math.round(r() * W)
    const y = Math.round(500 + r() * 450)
    flies += `<circle cx="${x}" cy="${y}" r="${n(1.8 + r() * 1.6)}" style="animation:ff ${n(7 + r() * 8)}s ease-in-out ${n(-r() * 10)}s infinite"/>`
  }

  // ---------- The moth ----------
  kf('flap', 'from{transform:scaleY(1)}to{transform:scaleY(.35)}')
  const wings =
    `<g class="fb" style="animation:flap .45s ease-in-out infinite alternate">` +
    `<ellipse cx="20" cy="-14" rx="20" ry="16" transform="rotate(-25 20 -14)" fill="url(#dotsB)"/><ellipse cx="20" cy="14" rx="20" ry="16" transform="rotate(25 20 14)" fill="url(#dotsB)"/>` +
    `<ellipse cx="6" cy="-10" rx="12" ry="9" fill="url(#dotsD)"/><ellipse cx="6" cy="10" rx="12" ry="9" fill="url(#dotsD)"/>` +
    `</g><ellipse cx="18" cy="0" rx="14" ry="3.2" fill="${BRIGHT}" opacity=".8"/>`
  const moth: Drawn = { svg: `<g transform="translate(0,65) scale(1.8)" filter="url(#bloom)">${wings}</g>`, w: 80, h: 130 }
  const lane = st.lane(
    [
      { d: moth, kind: 'cross', from: 'left', y: 300, dur: 46, bob: 60, bobPeriod: 4.5 },
      { d: moth, kind: 'visit', from: 'right', y: 520, turnAt: 1000, dur: 40, bob: 50, bobPeriod: 3.8 },
    ] satisfies Pass[],
    0,
  )

  const svg = st.finish({
    defs: `<pattern id="dotsB" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.7" fill="${BRIGHT}"/></pattern>
<pattern id="dotsD" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.5" fill="${TEAL}"/></pattern>
<filter id="bloom" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5" result="b"/><feComponentTransfer in="b" result="b2"><feFuncA type="linear" slope="1.6"/></feComponentTransfer><feMerge><feMergeNode in="b2"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<mask id="crescent"><circle cx="170" cy="150" r="140" fill="#fff"/><circle cx="232" cy="118" r="108" fill="#000"/></mask>
<radialGradient id="mist" cx=".8" cy=".85" r=".6"><stop offset="0" stop-color="#0f4a44" stop-opacity=".35"/><stop offset="1" stop-color="#0f4a44" stop-opacity="0"/></radialGradient>`,
    css: [`.stem{fill:none;stroke:${TEAL};stroke-width:2.4;stroke-linecap:round;stroke-dasharray:0 6;opacity:.75}`, `.gr path{fill:none;stroke:${DIM};stroke-width:2;stroke-linecap:round;stroke-dasharray:0 5}`],
    back: [`<rect width="${W}" height="${H}" fill="#020405"/>`, `<rect width="${W}" height="${H}" fill="url(#mist)"/>`, `<g fill="${BRIGHT}" opacity=".7">${stars}</g>`],
    layers: [
      moon,
      ...lane,
      `<g filter="url(#bloom)">${flowers.map(flowerSvg).join('')}</g>`,
      `<g class="gr sw" style="animation:grass 7s ease-in-out infinite alternate">${grass}</g>`,
      `<g filter="url(#bloom)">${drift}</g>`,
      `<g fill="${BRIGHT}" filter="url(#bloom)">${flies}</g>`,
    ],
  })
  return view ? svg.replace(/viewBox="[^"]*"/, `viewBox="${view}"`) : svg
}

export const BLOOM_SVG = build()
// The thumbnail: the flower cluster, cropped to 16:9.
export const BLOOM_THUMB = build('900 330 720 405')
