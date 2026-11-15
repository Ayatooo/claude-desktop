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
