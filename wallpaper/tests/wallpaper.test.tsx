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
    expect(await ui.find({ key: 'pick-night' })).toBeDefined()
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

// The desktop app shows no autumn night while its cell art holds a `\`:
// cell art draws it as a mirrored `/`.
test('the cell-art scenes and their thumbnails hold no backslash', () => {
  for (const name of ['AUTUMN_SVG', 'AUTUMN_THUMB', 'NIGHT_SVG', 'NIGHT_THUMB'] as const) {
    expect(`${name}: ${SCENES[name].includes('\\')}`).toBe(`${name}: false`)
  }
})

test('/wallpaper glass lowers the opacity of the glass over the scene, and default restores it', async ($, on) => {
  const stored: Record<string, unknown> = { scene: 'autumn' }
  on('store.get', (_, e) => ({ value: stored[(e as { key: string }).key] }))
  on('store.set', (_, e) => {
    const { key, value } = e as { key: string; value: unknown }
    stored[key] = value
    return { value: undefined }
  })
  on('store.delete', (_, e) => {
    delete stored[(e as { key: string }).key]
    return { value: undefined }
  })
  const glasses: unknown[] = []
  on('theme.set', (_, e) => {
    glasses.push((e as { backdrop?: { glass?: unknown } }).backdrop?.glass)
    return { value: { isDrawn: true, requestId: 't' } }
  })
  on('command.run', () => ({}))
  const run = (args: string) =>
    $.command.run({ command: 'wallpaper', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })

  await run('glass 20')
  expect(stored['glass']).toBe(0.2)
  expect((glasses.at(-1) as { opacity: number }).opacity).toBe(0.2)
  await run('glass default')
  expect(stored['glass']).toBeUndefined()
  expect((glasses.at(-1) as { opacity: number }).opacity).toBe(0.6)
  await run('glass 250')
  expect(glasses.length).toBe(2)
})

// The app remembers a scene it held still: each release names its scenes after
// the plugin's version and says it in their markup, and frosts no panel.
test('a scene is named and marked after the release, under a glass with no blur', async ($, on) => {
  const stored: Record<string, unknown> = { scene: 'autumn' }
  on('store.get', (_, e) => ({ value: stored[(e as { key: string }).key] }))
  on('store.set', (_, e) => {
    const { key, value } = e as { key: string; value: unknown }
    stored[key] = value
    return { value: undefined }
  })
  const sets: { scene?: string; glass?: { blur?: number } }[] = []
  on('theme.set', (_, e) => {
    sets.push((e as { backdrop: { scene?: string; glass?: { blur?: number } } }).backdrop)
    return { value: { isDrawn: true, requestId: 't' } }
  })
  on('command.run', () => ({}))
  on('ui.status', () => ({ value: undefined }))
  await $.command.run({ command: 'wallpaper', args: 'autumn', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 100 } })
  const scene = sets.at(-1)?.scene ?? ''
  const release = /^autumn-(\w+)$/.exec(scene)?.[1]
  expect(release === undefined).toBe(false)
  expect(sets.at(-1)?.glass?.blur).toBe(0)
  const ui = await $.ui.mount({
    plugin: 'wallpaper',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'desktop',
    props: { scene, plugin: 'wallpaper', glass: { blur: 0, opacity: 0.6 } },
  })
  const source = String(((await ui.find({ type: 'Svg' }))?.props as { source?: string } | undefined)?.source ?? '')
  const marked = /<!-- wallpaper ([\w.]+) -->/.exec(source)?.[1] ?? ''
  expect(marked.replace(/\W/g, '_')).toBe(release)
  await ui.unmount()
})

// The app holds a scene still when it costs too much to draw, glyphs first:
// the autumn night froze with about 3,700 of them, and draws 809 now.
test('the cell-art scenes keep under a thousand glyphs', () => {
  for (const name of ['AUTUMN_SVG', 'NIGHT_SVG'] as const) {
    const glyphs = [...SCENES[name].matchAll(/<text[^>]*>([^<]*)<\/text>/g)]
      .map(m => m[1]!.replace(/&(amp|lt|gt|quot|apos);/g, '&'))
      .join('').length
    expect(`${name}: ${glyphs < 1000}`).toBe(`${name}: true`)
  }
})

// A walker's frames each show for an exact share of its cycle: delays rounded
// to a tenth of a second left a gap where none showed, and the fox blinked.
test('the frames of a walker leave no gap between them', () => {
  for (const [name, svg] of Object.entries(SCENES)) {
    for (const m of svg.matchAll(/animation:fr(\d) ([\d.]+)s steps\(1,end\) (-?[\d.]+)s/g)) {
      const [count, period, delay] = [Number(m[1]), Number(m[2]), -Number(m[3])]
      const share = (delay / period) * count
      expect(`${name}: ${Math.abs(share - Math.round(share)) < 0.001}`).toBe(`${name}: true`)
    }
  }
})
