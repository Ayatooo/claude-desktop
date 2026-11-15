import { expect, test } from 'claude-code/testing'

const SPINNER = {
  plugin: 'wallpaper',
  component: 'Spinner',
  requestId: 'agent-1',
  props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' },
} as const

// Stands for the engine: draws the word and suffix it is handed.
function engine(on: Parameters<Parameters<typeof test>[1]>[1]) {
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

test('the lake backdrop is drawn on the 24-hour cycle, in sync with the time', async ($, on) => {
  on('store.get', () => ({ value: undefined }))
  const ui = await $.ui.mount({
    plugin: 'wallpaper',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'desktop',
    props: { scene: 'lake', plugin: 'wallpaper', glass: { blur: 12, opacity: 0.72 } },
  })
  const svg = await ui.find({ type: 'Svg' })
  const source = String((svg?.props as { source?: string } | undefined)?.source ?? '')
  expect(source.includes('86400s linear -')).toBe(true)
  expect(source.length < 131072).toBe(true)
  await ui.unmount()
})

test('the coast backdrop is drawn on the 24-hour cycle and fits a backdrop', async ($, on) => {
  on('store.get', () => ({ value: undefined }))
  const ui = await $.ui.mount({
    plugin: 'wallpaper',
    component: 'Backdrop',
    requestId: 'backdrop',
    surface: 'mobile',
    props: { scene: 'coast', plugin: 'wallpaper', glass: { blur: 12, opacity: 0.72 } },
  })
  const svg = await ui.find({ type: 'Svg' })
  const source = String((svg?.props as { source?: string } | undefined)?.source ?? '')
  expect(source.includes('86400s linear -')).toBe(true)
  expect(source.length < 131072).toBe(true)
  await ui.unmount()
})

test('the realistic lake sets a still picture of the moment as backdrop', async ($, on) => {
  let sent: unknown
  on('store.get', () => ({ value: 'lake-photo' }))
  on('command.register', () => ({ value: { command: 'wallpaper' } }))
  on('theme.set', (_, e) => {
    sent = e
    return { value: { isDrawn: true, requestId: 'theme' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  const source = (sent as { backdrop?: { image?: { source?: string } } } | undefined)?.backdrop?.image?.source ?? ''
  expect(/^photos\/lake-(dawn|day|dusk|night)\.jpg$/.test(source)).toBe(true)
})
