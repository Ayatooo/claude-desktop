import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { DEFAULT_THEME, THEMES, themeById } from './themes'
import type { Theme } from './themes'

const SCENE_KEY = 'scene'
const SOUND_KEY = 'sound'

function look(t: Theme): ThemeSetArgs {
  return {
    colors: t.colors,
    overrideColorScheme: 'dark',
    backdrop: { scene: t.id, glass: t.glass },
  }
}

async function apply($: EngineInterface, t: Theme) {
  const set = await $.theme.set(look(t))
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
      description: `Change le fond : /wallpaper ${THEMES.map(t => t.id).join(' | ')} | off · /wallpaper sound on|off`,
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
      return { text: "Fond retiré, retour au look de l'app." }
    }

    const t = themeById(first)
    if (t === undefined) {
      return { text: `Fond inconnu « ${first} ». Disponibles : ${list}, ou off.` }
    }
    await $.store.set(SCENE_KEY, t.id)
    const set = await apply($, t)

    return {
      text: set.isDrawn ? `Fond : ${t.label}.` : `Fond enregistré (${t.label}), mais rien ne le dessine ici : ${set.reason}`,
    }
  })

  // The animated backdrop.
  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const t = themeById(e.props.scene)
    if (t === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)

    return <Svg source={t.svg} alt={t.alt} isInteractive />
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
      const t = await current($)
      if (t?.sound !== undefined && (await $.store.get(SOUND_KEY)) !== 'off') {
        void $.audio.play({ asset: t.sound }, { gain: 0.6 }).catch(() => undefined)
      }
    }

    return result
  })
}
