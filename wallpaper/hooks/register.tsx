import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { MASCOT_SIZE, mascotSvg } from './mascot'
import type { Mood } from './mascot'
import { DEFAULT_THEME, THEMES, themeById } from './themes'
import type { Theme } from './themes'

const SCENE_KEY = 'scene'
const SOUND_KEY = 'sound'
const MOTION_KEY = 'motion'
const PET_KEY = 'pet'

const isPickerOpen = atom({ plugin: 'wallpaper', key: 'isPickerOpen' } as const, false)
const turnsDone = atom({ plugin: 'wallpaper', key: 'turnsDone' } as const, 0)

// The creature's three drawings, built once.
const MASCOT: Record<Mood, string> = { idle: mascotSvg('idle'), working: mascotSvg('working'), happy: mascotSvg('happy') }

// The rule each scene carries to freeze when the system asks for reduced motion.
const REDUCED_MOTION = /@media \(prefers-reduced-motion:reduce\)\{\*\{[^}]*\}\}/g

async function apply($: EngineInterface, t: Theme) {
  const args: ThemeSetArgs = {
    colors: t.colors,
    overrideColorScheme: 'dark',
    backdrop: { scene: t.id, glass: t.glass },
  }
  const set = await $.theme.set(args)
  $.ui.status(set.isDrawn ? undefined : set.reason)
  const unpainted = t.problems[0]
  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }

  return set
}

// The chosen theme, or undefined when the wallpaper is turned off.
async function current($: EngineInterface): Promise<Theme | undefined> {
  const saved = await $.store.get(SCENE_KEY)
  if (saved === 'off') return undefined
  return themeById(saved) ?? themeById(DEFAULT_THEME)
}

// A stable integer drawn from a text, to pick one word per turn.
function pick(text: string, count: number): number {
  let h = 0
  for (const ch of text) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0
  return h % count
}

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'wallpaper',
      description: `Ouvre le sélecteur de fonds · /wallpaper ${THEMES.map(t => t.id).join(' | ')} | off · /wallpaper pet on|off · /wallpaper sound on|off · /wallpaper motion on|auto · /wallpaper status`,
    })

    const t = await current($)
    if (t !== undefined) {
      await apply($, t)
    }

    return next(e)
  })

  on('command.run', { command: 'wallpaper' }, async ($, e) => {
    const [first = '', second = ''] = fold(e.args.trim()).split(/\s+/)
    const list = THEMES.map(t => `${t.id} (${t.label})`).join(', ')

    if (first === '') {
      // The picker, drawn above the prompt.
      await update($, isPickerOpen, open => !open)
      return {}
    }
    if (first === 'status') {
      const t = await current($)
      const sound = (await $.store.get(SOUND_KEY)) !== 'off'
      return {
        text: `Fond actuel : ${t?.label ?? 'aucun'}. Son de fin de tour : ${sound ? 'activé' : 'coupé'}. Disponibles : ${list}, ou off.`,
      }
    }
    if (first === 'sound') {
      if (second !== 'on' && second !== 'off') {
        return { text: 'Usage : /wallpaper sound on, ou /wallpaper sound off.' }
      }
      await $.store.set(SOUND_KEY, second)
      return {
        text:
          second === 'on'
            ? "Son de fin de tour activé (il n'est joué que là où Claude Code tourne sur un Mac)."
            : 'Son de fin de tour coupé.',
      }
    }
    if (first === 'pet') {
      if (second !== 'on' && second !== 'off') {
        return { text: 'Usage : /wallpaper pet on, ou /wallpaper pet off.' }
      }
      await $.store.set(PET_KEY, second)
      return { text: second === 'on' ? 'La bestiole revient au-dessus du champ de saisie.' : 'La bestiole est partie se reposer.' }
    }
    if (first === 'motion') {
      if (second !== 'on' && second !== 'auto') {
        const m = (await $.store.get(MOTION_KEY)) === 'on' ? 'on' : 'auto'
        return { text: `Animations du fond : ${m}. Usage : /wallpaper motion on (toujours animé), ou /wallpaper motion auto (figé si le système demande de réduire les animations).` }
      }
      await $.store.set(MOTION_KEY, second)
      const t = await current($)
      if (t !== undefined) await apply($, t)
      return {
        text:
          second === 'on'
            ? 'Le fond reste animé même si le système demande de réduire les animations.'
            : 'Le fond suit le réglage du système : figé quand il demande de réduire les animations.',
      }
    }
    if (first === 'diag') {
      const t = (await current($)) ?? themeById(DEFAULT_THEME)!
      const set = await apply($, t)
      return {
        text: set.isDrawn
          ? `Diag : thème « ${t.id} » accepté par un client qui dessine les thèmes (requestId ${set.requestId}). Si tu ne vois rien, essaie /wallpaper test.`
          : `Diag : thème NON dessiné. Raison donnée par l'app : ${set.reason}`,
      }
    }
    if (first === 'test') {
      // A loud still gradient, with no scene and no render hook: isolates a display problem.
      const set = await $.theme.set({
        backdrop: { gradient: { stops: ['#ff3d7f', '#7b2cff', '#00c2ff'], angle: 135 } },
      })
      return {
        text: set.isDrawn
          ? `Test : dégradé rose → bleu envoyé. Tu le vois ? (/wallpaper ${DEFAULT_THEME} pour revenir)`
          : `Test : non dessiné. Raison : ${set.reason}`,
      }
    }
    if (first === 'off') {
      await $.store.set(SCENE_KEY, 'off')
      await $.theme.clear()
      await update($, isPickerOpen, () => false)
      return { text: "Fond retiré, retour au look de l'app." }
    }

    const t = themeById(first)
    if (t === undefined) {
      return { text: `Fond inconnu « ${first} ». Disponibles : ${list}, ou off.` }
    }
    await $.store.set(SCENE_KEY, t.id)
    const set = await apply($, t)
    await update($, isPickerOpen, () => false)

    return {
      text: set.isDrawn ? `Fond : ${t.label}.` : `Fond enregistré (${t.label}), mais rien ne le dessine ici : ${set.reason}`,
    }
  })

  // The animated backdrop.
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const t = themeById(e.props.scene)
    if (t === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    let source = t.svg
    // Asked to keep moving: drop the scene's reduced-motion rule.
    if ((await $.store.get(MOTION_KEY)) === 'on') source = source.replace(REDUCED_MOTION, '')

    return <Svg source={source} alt={t.alt} isInteractive />
  })

  // The thinking indicator, matched to the theme. On the desktop the row says
  // what the current step does ("Creating notes.md"): only the generic
  // "Working" is replaced.
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const t = await current($)
    if (t?.spinner === undefined || e.props.message !== null) {
      return next(e)
    }
    const generic = e.surface !== 'desktop' || e.props.word === 'Working'
    const word = generic ? t.spinner.words[pick(e.requestId + e.props.word, t.spinner.words.length)]! : e.props.word

    return next({ ...e, props: { ...e.props, word, suffix: t.spinner.suffix } })
  })

  // A quiet sound when Claude has finished answering (main turn only).
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined && !e.isAborted && e.reason === 'answer') {
      await update($, turnsDone, k => k + 1)
      const t = await current($)
      if (t?.sound !== undefined && (await $.store.get(SOUND_KEY)) !== 'off') {
        void $.audio.play({ asset: t.sound }, { gain: 0.6 }).catch(() => undefined)
      }
    }

    return result
  })

  // Sending a prompt closes the picker.
  on('prompt.submit', async ($, e, next) => {
    // Never hold a prompt back over the picker.
    await update($, isPickerOpen, () => false).catch(() => undefined)
    return next(e)
  })

  // The band above the prompt: the wallpaper picker when open, and the
  // little creature.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }
    const graphic = e.surface === 'desktop' || e.surface === 'mobile'
    const showPicker = await read($, isPickerOpen)
    const showPet = graphic && (await $.store.get(PET_KEY)) !== 'off'
    if (!showPicker && !showPet) {
      return next(e)
    }
    const t = await current($)
    const keepMoving = (await $.store.get(MOTION_KEY)) === 'on'
    const still = (svg: string) => (keepMoving ? svg.replace(REDUCED_MOTION, '') : svg)
    const table = $.ui.resolve(e)
    const { Box, Text, Button } = table
    // The terminal has no vector drawings: the picker is buttons alone there.
    const Svg = graphic && 'Svg' in table ? table.Svg : undefined
    const close = () => update($, isPickerOpen, () => false)
    const choose = async (picked: Theme | undefined) => {
      if (picked === undefined) {
        await $.store.set(SCENE_KEY, 'off')
        await $.theme.clear()
      } else {
        await $.store.set(SCENE_KEY, picked.id)
        await apply($, picked)
      }
      await close()
    }

    let picker = null
    if (showPicker) {
      const tiles = THEMES.map((theme, i) => {
        const isActive = theme.id === t?.id
        const label = `${theme.label}${isActive ? ' ✓' : ''}`
        return (
          <Box key={`tile-${theme.id}`} flexDirection="column" alignItems="center" gap={0}>
            {Svg !== undefined ? <Svg source={still(theme.thumb)} alt={theme.alt} width={144} height={81} isInteractive /> : null}
            <Button key={`pick-${theme.id}`} label={label} hotkey={String(i + 1)} variant={isActive ? 'primary' : 'secondary'} onPress={() => choose(theme)} />
          </Box>
        )
      })
      picker = (
        <Box key="picker" flexDirection="column" borderStyle="round" paddingX={1} gap={1}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text>
              <Text bold>/wallpaper</Text>
              <Text dimColor> Fonds animés en ASCII · touche 1{THEMES.length > 1 ? ` à ${THEMES.length}` : ''} pour choisir, 0 pour aucun</Text>
            </Text>
            <Button key="close" label="Fermer" role="dismiss" onPress={close} />
          </Box>
          <Box flexDirection="row" flexWrap="wrap" gap={1} alignItems="flex-end">
            {tiles}
            <Button key="pick-off" label={t === undefined ? 'Aucun fond ✓' : 'Aucun fond'} hotkey="0" dimColor onPress={() => choose(undefined)} />
          </Box>
        </Box>
      )
    }

    let pet = null
    if (showPet && Svg !== undefined) {
      const turns = await read($, turnsDone)
      const mood: Mood = e.props.isWorking ? 'working' : turns > 0 ? 'happy' : 'idle'
      pet = (
        <Box flexDirection="row" justifyContent="flex-end">
          <Svg source={still(MASCOT[mood])} alt="La petite bestiole de Claude" width={MASCOT_SIZE.width} height={MASCOT_SIZE.height} isInteractive />
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        {picker}
        {pet}
      </Box>
    )
  })
}
