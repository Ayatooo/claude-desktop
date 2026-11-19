// The tick strip: a quota as a row of ticks in its own colour (context
// violet, the five-hour window cyan, the week mint), the empty ticks a faint
// shade of the same colour, the whole strip amber then red as it runs hot.

export const TICKS = 20

// How a quota reads: calm, warm (past 80 %), hot (past 95 %).
export type Level = 'calm' | 'warm' | 'hot'
export const level = (percent: number): Level => (percent >= 95 ? 'hot' : percent >= 80 ? 'warm' : 'calm')

// Which quota a strip draws: each has its own colour while calm.
export type Gauge = 'ctx' | '5h' | 'sem'
export const GAUGE_COLOR: Record<Gauge, string> = {
  ctx: '#a78bfa',
  '5h': '#22d3ee',
  sem: '#4ade80',
}
const WARM = '#ffb020'
const HOT = '#ff5c6c'
// The opacity of an empty tick: the strip stays readable, its colour still shows.
const EMPTY_OPACITY = 0.18

// The colour a strip and its percentage take.
export const stripColor = (gauge: Gauge, percent: number): string => {
  const l = level(percent)
  return l === 'hot' ? HOT : l === 'warm' ? WARM : GAUGE_COLOR[gauge]
}

const filledTicks = (percent: number) => Math.round((Math.min(100, Math.max(0, percent)) / 100) * TICKS)

// As an SVG strip (desktop, mobile): 3 px ticks, 5 px apart.
export function ticksSvg(gauge: Gauge, percent: number): { source: string; width: number; height: number } {
  const filled = filledTicks(percent)
  const color = stripColor(gauge, percent)
  let rects = ''
  for (let i = 0; i < TICKS; i++) {
    rects += `<rect x="${i * 5}" y="0" width="3" height="12" rx="1.5"${i < filled ? '' : ` opacity="${EMPTY_OPACITY}"`}/>`
  }
  const width = TICKS * 5 - 2
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 12" width="${width}" height="12"><g fill="${color}">${rects}</g></svg>`,
    width,
    height: 12,
  }
}

// As text (terminal): the same strip in characters, in the same colour.
export function ticksText(gauge: Gauge, percent: number): { filled: string; rest: string; color: string } {
  const filled = filledTicks(percent)
  return { filled: '▮'.repeat(filled), rest: '▯'.repeat(TICKS - filled), color: stripColor(gauge, percent) }
}

// "4h31", "21h41", "2j 5h": how long until a window resets.
export function countdown(resetsAt: string | undefined, now: number): string | undefined {
  if (resetsAt === undefined) return undefined
  const ms = Date.parse(resetsAt) - now
  if (!Number.isFinite(ms)) return undefined
  if (ms <= 0) return 'maintenant'
  const minutes = Math.floor(ms / 60000)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h >= 48) return `${Math.floor(h / 24)}j ${h % 24}h`
  if (h === 0) return `${m} min`
  return `${h}h${String(m).padStart(2, '0')}`
}
