// The simple backdrops: hand-written SVGs animated with CSS, no script and no
// external resource. Each SVG fills the screen (xMidYMid slice) and keeps its
// subject away from the middle (the text) and the bottom (the prompt box).

export type Scene = { id: string; label: string; alt: string; svg: string }

const aurora = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0b0a1f"/><stop offset="0.6" stop-color="#151236"/><stop offset="1" stop-color="#1d1440"/>
  </linearGradient>
  <linearGradient id="v1" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#5ef2c2" stop-opacity="0"/><stop offset="0.5" stop-color="#5ef2c2" stop-opacity="0.55"/><stop offset="1" stop-color="#7b6cff" stop-opacity="0"/>
  </linearGradient>
  <linearGradient id="v2" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#b56cff" stop-opacity="0"/><stop offset="0.5" stop-color="#b56cff" stop-opacity="0.45"/><stop offset="1" stop-color="#ff7ab8" stop-opacity="0"/>
  </linearGradient>
  <filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
</defs>
<style>
  .b{transform-box:fill-box;transform-origin:center;mix-blend-mode:screen}
  .b1{animation:d1 26s ease-in-out infinite alternate}
  .b2{animation:d2 34s ease-in-out infinite alternate}
  .b3{animation:d1 41s ease-in-out infinite alternate-reverse}
  @keyframes d1{0%{transform:translate(-80px,0) skewX(-8deg) scaleY(1)}100%{transform:translate(90px,30px) skewX(10deg) scaleY(1.25)}}
  @keyframes d2{0%{transform:translate(60px,20px) scaleY(1.2)}100%{transform:translate(-110px,-10px) scaleY(0.85)}}
  .e{fill:#fff;animation:t 5s ease-in-out infinite}
  .e:nth-child(2n){animation-duration:7s;animation-delay:-2s}
  .e:nth-child(3n){animation-duration:9s;animation-delay:-4s}
  @keyframes t{0%,100%{opacity:.25}50%{opacity:.9}}
  @media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<rect width="1600" height="1000" fill="url(#sky)"/>
<g>
  <circle class="e" cx="120" cy="90" r="1.6"/><circle class="e" cx="340" cy="60" r="1.2"/><circle class="e" cx="560" cy="140" r="1.4"/>
  <circle class="e" cx="980" cy="70" r="1.3"/><circle class="e" cx="1210" cy="120" r="1.7"/><circle class="e" cx="1480" cy="50" r="1.2"/>
  <circle class="e" cx="1390" cy="230" r="1.1"/><circle class="e" cx="80" cy="300" r="1.2"/><circle class="e" cx="760" cy="40" r="1.5"/>
  <circle class="e" cx="1540" cy="340" r="1.3"/><circle class="e" cx="250" cy="200" r="1"/><circle class="e" cx="1100" cy="260" r="1"/>
</g>
<g filter="url(#blur)">
  <path class="b b1" d="M-100 260 C 300 120, 700 380, 1100 220 S 1600 160, 1750 260 L 1750 380 C 1300 300, 900 480, 500 360 S 0 380, -100 400 Z" fill="url(#v1)"/>
  <path class="b b2" d="M-100 180 C 400 300, 800 80, 1200 200 S 1650 300, 1750 180 L 1750 260 C 1200 300, 800 200, 400 330 S 0 260, -100 290 Z" fill="url(#v2)"/>
  <path class="b b3" d="M-100 330 C 350 260, 750 420, 1150 300 S 1600 330, 1750 300 L 1750 400 C 1250 380, 850 470, 450 420 S 0 440, -100 450 Z" fill="url(#v1)" opacity="0.6"/>
</g>
<path d="M0 1000 L0 860 L180 800 L320 850 L470 770 L640 840 L820 790 L980 860 L1150 780 L1330 840 L1480 800 L1600 830 L1600 1000 Z" fill="#090817"/>
</svg>`

const night = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs>
  <radialGradient id="glow" cx="0.85" cy="0.1" r="1.1">
    <stop offset="0" stop-color="#2a2150"/><stop offset="0.45" stop-color="#120f2b"/><stop offset="1" stop-color="#07061a"/>
  </radialGradient>
  <radialGradient id="halo"><stop offset="0" stop-color="#f6e7c8" stop-opacity="0.5"/><stop offset="1" stop-color="#f6e7c8" stop-opacity="0"/></radialGradient>
  <mask id="crescent"><rect width="1600" height="1000" fill="#fff"/><circle cx="1374" cy="126" r="42" fill="#000"/></mask>
  <linearGradient id="meteor" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.9"/></linearGradient>
</defs>
<style>
  .s{fill:#e9e4ff;animation:t 6s ease-in-out infinite}
  .s:nth-child(2n){animation-duration:4s;animation-delay:-1s}
  .s:nth-child(3n){animation-duration:8s;animation-delay:-3s}
  .s:nth-child(5n){animation-duration:11s;animation-delay:-6s}
  @keyframes t{0%,100%{opacity:.2}50%{opacity:1}}
  .sky{transform-origin:1350px 120px;animation:r 240s linear infinite}
  @keyframes r{to{transform:rotate(360deg)}}
  .f{animation:f 14s linear infinite;opacity:0}
  @keyframes f{0%,88%{opacity:0;transform:translate(0,0)}90%{opacity:1}96%{opacity:0;transform:translate(-520px,260px)}100%{opacity:0}}
  .moon{animation:p 9s ease-in-out infinite alternate}
  @keyframes p{to{opacity:.75}}
  @media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<rect width="1600" height="1000" fill="url(#glow)"/>
<g class="sky">
  <circle class="s" cx="90" cy="80" r="1.4"/><circle class="s" cx="260" cy="150" r="1"/><circle class="s" cx="420" cy="60" r="1.8"/>
  <circle class="s" cx="610" cy="190" r="1.1"/><circle class="s" cx="800" cy="90" r="1.3"/><circle class="s" cx="930" cy="230" r="1"/>
  <circle class="s" cx="1060" cy="50" r="1.6"/><circle class="s" cx="1180" cy="300" r="1.2"/><circle class="s" cx="1530" cy="260" r="1.4"/>
  <circle class="s" cx="1450" cy="420" r="1"/><circle class="s" cx="60" cy="380" r="1.2"/><circle class="s" cx="180" cy="540" r="1.5"/>
  <circle class="s" cx="1500" cy="600" r="1.1"/><circle class="s" cx="1350" cy="520" r="1.7"/><circle class="s" cx="330" cy="300" r="1.3"/>
  <circle class="s" cx="720" cy="330" r="0.9"/><circle class="s" cx="1240" cy="160" r="1"/><circle class="s" cx="1580" cy="80" r="1.2"/>
  <circle class="s" cx="40" cy="650" r="1"/><circle class="s" cx="1420" cy="720" r="1.3"/><circle class="s" cx="520" cy="240" r="1.1"/>
</g>
<circle cx="1340" cy="146" r="150" fill="url(#halo)" class="moon" opacity="0.6"/>
<circle cx="1350" cy="140" r="46" fill="#f3ead6" mask="url(#crescent)"/>
<g class="f"><rect x="1100" y="90" width="180" height="2" rx="1" fill="url(#meteor)" transform="rotate(-26 1190 91)"/></g>
</svg>`

const tide = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
<defs>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#0d1b2a"/><stop offset="0.55" stop-color="#10283b"/><stop offset="1" stop-color="#0a1a28"/>
  </linearGradient>
</defs>
<style>
  .o{animation:o 18s ease-in-out infinite alternate}
  .o2{animation-duration:23s;animation-delay:-5s}
  .o3{animation-duration:29s;animation-delay:-11s}
  @keyframes o{0%{transform:translateX(-120px)}100%{transform:translateX(60px)}}
  .r{animation:h 12s ease-in-out infinite alternate}
  @keyframes h{0%{transform:translateY(0)}100%{transform:translateY(-14px)}}
  @media (prefers-reduced-motion:reduce){*{animation-play-state:paused!important}}
</style>
<rect width="1600" height="1000" fill="url(#sea)"/>
<g class="r">
  <path class="o" d="M-200 760 Q 0 720 200 760 T 600 760 T 1000 760 T 1400 760 T 1800 760 L1800 1000 L-200 1000 Z" fill="#14384f" opacity="0.7"/>
  <path class="o o2" d="M-200 820 Q 0 785 200 820 T 600 820 T 1000 820 T 1400 820 T 1800 820 L1800 1000 L-200 1000 Z" fill="#1a4a63" opacity="0.65"/>
  <path class="o o3" d="M-200 880 Q 0 850 200 880 T 600 880 T 1000 880 T 1400 880 T 1800 880 L1800 1000 L-200 1000 Z" fill="#225c75" opacity="0.6"/>
</g>
<g class="o o3" opacity="0.35" fill="none" stroke="#7fd1d9" stroke-width="1.2">
  <path d="M-100 140 Q 100 110 300 140 T 700 140 T 1100 140 T 1500 140 T 1900 140"/>
  <path d="M-100 190 Q 100 165 300 190 T 700 190 T 1100 190 T 1500 190 T 1900 190"/>
</g>
</svg>`

export const SIMPLE_SCENES: Scene[] = [
  { id: 'aurora', label: 'Aurore', alt: 'Une aurore boréale qui ondule au-dessus de collines sombres', svg: aurora },
  { id: 'night', label: 'Nuit étoilée', alt: 'Un ciel de nuit qui tourne lentement, une lune et une étoile filante', svg: night },
  { id: 'tide', label: 'Marée', alt: 'Des vagues bleues qui montent et descendent doucement', svg: tide },
]
