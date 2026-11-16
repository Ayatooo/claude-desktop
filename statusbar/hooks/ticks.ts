// The tick strip: a quota as a row of thin vertical ticks, the last fifth
// tinted amber, filled ticks in the accent until the quota runs hot.

export const TICKS = 20

// How a quota reads: calm, warm (past 80 %), hot (past 95 %).
export type Level = 'calm' | 'warm' | 'hot'
export const level = (percent: number): Level => (percent >= 95 ? 'hot' : percent >= 80 ? 'warm' : 'calm')

const FILL: Record<Level, [string, string]> = {
  calm: ['#2f8cff', '#7c6cff'],
  warm: ['#f5a524', '#f5a524'],
  hot: ['#ff5a5f', '#ff5a5f'],
}
const EMPTY = '#3a3a40'
const TAIL = '#5a4216'

// As an SVG strip (desktop, mobile): 2 px ticks, 4 px apart.
export function ticksSvg(percent: number): { source: string; width: number; height: number } {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * TICKS)
  const [a, b] = FILL[level(percent)]
  let rects = ''
  for (let i = 0; i < TICKS; i++) {
    const color = i < filled ? (i < TICKS / 2 ? a : b) : i >= TICKS * 0.8 ? TAIL : EMPTY
    rects += `<rect x="${i * 4}" y="0" width="2" height="12" rx="1" fill="${color}"/>`
  }
  const width = TICKS * 4 - 2
  return { source: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 12" width="${width}" height="12">${rects}</svg>`, width, height: 12 }
}

// As text (terminal): the same strip in characters, split by colour.
export function ticksText(percent: number): { filled: string; rest: string; tail: string; color: string } {
  const filled = Math.round((Math.min(100, Math.max(0, percent)) / 100) * TICKS)
  const tailStart = TICKS * 0.8
  const restCount = Math.max(0, tailStart - filled)
  const tailCount = TICKS - Math.max(filled, tailStart)
  return { filled: '▮'.repeat(filled), rest: '▯'.repeat(restCount), tail: '▯'.repeat(tailCount), color: FILL[level(percent)][0] }
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
