import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

const NOW = Date.parse('2026-11-16T10:00:00Z')
const at = (h: number, m: number) => new Date(NOW + (h * 60 + m) * 60000).toISOString()

const BAND = {
  plugin: 'statusbar',
  component: 'AbovePrompt',
  requestId: 'band',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 30, bodyColumns: 120, scroll: { offset: 0, bodyRows: 29 }, view: {} },
} as const

// Seeds what an earlier session measured.
function seed(on: Parameters<TestBody>[1], usage: unknown) {
  const state: Record<string, unknown> = {
    usage,
    repo: { project: 'isiit', branch: 'backlog' },
    now: NOW,
  }
  on('state.get', (_, e) => ({ value: { value: state[(e as { key: string }).key], version: 1 } }))
}

const USAGE = { context: 9, fiveHour: { percent: 6, resetsAt: at(4, 31) }, week: { percent: 49, resetsAt: at(21, 41) } }

test('the bar shows project, branch and the three quotas as tick strips', async ($, on) => {
  seed(on, USAGE)
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: 'isiit' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'backlog' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↻ 4h31' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: '↻ 21h41' })).toBeDefined()
  expect(await ui.find({ type: 'Svg' })).toBeDefined()
  await ui.unmount()
})

test('a quota past 80 % turns warm', async ($, on) => {
  seed(on, { ...USAGE, week: { percent: 86, resetsAt: at(30, 0) } })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  const t = await ui.find({ type: 'Text', text: /^86/ })
  expect((t?.props as { color?: string } | undefined)?.color).toBe('warning')
  expect(await ui.find({ type: 'Text', text: '↻ 30h00' })).toBeDefined()
  await ui.unmount()
})

test('the terminal draws the strips in characters', async ($, on) => {
  seed(on, USAGE)
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /▮/ })).toBeDefined()
  await ui.unmount()
})
