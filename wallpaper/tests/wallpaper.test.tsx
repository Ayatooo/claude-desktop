import { expect, test } from 'claude-code/testing'
import type { TestBody } from 'claude-code/testing'

import * as SCENES from '../hooks/generated-scenes'

const SPINNER = {
  plugin: 'wallpaper',
  component: 'Spinner',
  requestId: 'agent-1',
  props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' },
} as const

// Stands for the engine: draws the word and suffix it is handed.
function engine(on: Parameters<TestBody>[1]) {
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    const p = e.props as { word: string; suffix: string }
    return <Text>{`${p.word}${p.suffix}`}</Text>
  })
}

test('the thinking indicator takes the ocean theme words', async ($, on) => {
  on('store.get', () => ({ value: 'ocean' }))
  engine(on)
  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  const text = (await ui.find({ type: 'Text' }))?.text ?? ''
  expect(text.endsWith(' o°')).toBe(true)
  expect(text.startsWith('Sauteing')).toBe(false)
  await ui.unmount()
})

test('on the desktop, a described step keeps its words', async ($, on) => {
  on('store.get', () => ({ value: 'ocean' }))
  engine(on)
  const ui = await $.ui.mount({ ...SPINNER, surface: 'desktop', props: { ...SPINNER.props, word: 'Creating notes.md' } })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Creating notes.md o°')
  await ui.unmount()
})

test('wallpaper off: the engine keeps its own indicator', async ($, on) => {
  on('store.get', () => ({ value: 'off' }))
  engine(on)
  const ui = await $.ui.mount({ ...SPINNER, surface: 'terminal' })
  expect((await ui.find({ type: 'Text' }))?.text).toBe('Sauteing…')
  await ui.unmount()
})

test('motion on: the backdrop keeps moving even when the system asks for reduced motion', async ($, on) => {
  on('store.get', (_, e) => ({ value: (e as { key?: string }).key === 'motion' ? 'on' : 'ocean' }))
  const ui = await $.ui.mount({
    plugin: 'wallpaper',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'desktop',
    props: { scene: 'ocean', plugin: 'wallpaper', glass: { blur: 5, opacity: 0.62 } },
  })
  const svg = await ui.find({ type: 'Svg' })
  const source = String((svg?.props as { source?: string } | undefined)?.source ?? '')
  expect(source.includes('<svg')).toBe(true)
  expect(source.includes('prefers-reduced-motion')).toBe(false)
  await ui.unmount()
})

const BAND = {
  plugin: 'wallpaper',
  component: 'AbovePrompt',
  requestId: 'band',
  props: {
    hasSurvey: false,
    isCollapsed: false,
    isWorking: false,
    maxRows: 30,
    bodyColumns: 100,
    scroll: { offset: 0, bodyRows: 29 },
    view: {},
  },
} as const

test('the creature lives above the prompt, and bounces while Claude works', async ($, on) => {
  on('store.get', (_, e) => ({ value: (e as { key?: string }).key === 'scene' ? 'ocean' : undefined }))
  for (const surface of ['desktop', 'mobile'] as const) {
    const idle = await $.ui.mount({ ...BAND, surface })
    const a = String(((await idle.find({ type: 'Svg' }))?.props as { source?: string }).source)
    expect(a.includes('mPos')).toBe(true)
    await idle.unmount()
    const busy = await $.ui.mount({ ...BAND, surface, props: { ...BAND.props, isWorking: true } })
    const b = String(((await busy.find({ type: 'Svg' }))?.props as { source?: string }).source)
    expect(b.includes('mBounce')).toBe(true)
    await busy.unmount()
  }
})

test('pet off: the band is left to the engine', async ($, on) => {
  on('store.get', (_, e) => ({ value: (e as { key?: string }).key === 'pet' ? 'off' : 'ocean' }))
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})

test('/wallpaper opens the picker; a pick applies the theme and closes it', async ($, on) => {
  const stored: Record<string, unknown> = {}
  on('store.get', (_, e) => ({ value: stored[(e as { key: string }).key] }))
  on('store.set', (_, e) => {
    const { key, value } = e as { key: string; value: unknown }
    stored[key] = value
    return { value: undefined }
  })
  let applied = 0
  on('theme.set', () => {
    applied += 1
    return { value: { isDrawn: true, requestId: 't' } }
  })
  on('command.run', () => ({}))

  await $.command.run({
    command: 'wallpaper',
    args: '',
    origin: { kind: 'composer' },
    presentation: { isFullscreen: false, columns: 100 },
  })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ key: 'pick-ocean' })).toBeDefined()
    expect(await ui.find({ key: 'pick-koi' })).toBeDefined()
    expect(await ui.find({ key: 'pick-autumn' })).toBeDefined()
    expect(await ui.find({ key: 'pick-bloom' })).toBeDefined()
    expect((await ui.find({ type: 'Svg' })) !== undefined).toBe(surface === 'desktop')
    await ui.unmount()
  }
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  await ui.press({ key: 'pick-koi' })
  expect(stored['scene']).toBe('koi')
  expect(applied).toBe(1)
  await ui.unmount()
  const after = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await after.find({ key: 'pick-ocean' })).toBeUndefined()
  await after.unmount()
})

// The engine refuses a whole backdrop holding a `/*` outside a closed CSS
// comment, as the ASCII art's `/` and `*` side by side once did.
test('no scene holds a /* the engine would read as an open CSS comment', () => {
  for (const [name, svg] of Object.entries(SCENES)) {
    const bare = svg.replace(/<style[^>]*>[^<]*<\/style>/g, '')
    expect(`${name}: ${bare.includes('/*')}`).toBe(`${name}: false`)
  }
})
