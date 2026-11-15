import type { EngineInterface, Register, ThemeSetArgs } from 'claude-code'

import { DEFAULT_PLACE } from './daylight'
import type { Place } from './daylight'
import { DEFAULT_THEME, THEMES, lookOf, themeById } from './themes'
import type { Theme } from './themes'

const SCENE_KEY = 'scene'
const SOUND_KEY = 'sound'
const PLACE_KEY = 'place'

// How often a theme whose look follows the time is checked.
const LOOK_CHECK_MS = 5 * 60 * 1000

async function placeOf($: EngineInterface): Promise<Place> {
  const saved = (await $.store.get(PLACE_KEY)) as Partial<Place> | undefined
  return { ...DEFAULT_PLACE, ...(saved ?? {}) }
}

// The key of the look last applied, to re-apply only when it changes.
let appliedLook = ''

async function apply($: EngineInterface, t: Theme) {
  const l = lookOf(t, Date.now(), await placeOf($))
  const args: ThemeSetArgs = {
    colors: l.colors,
    overrideColorScheme: 'dark',
    backdrop: l.backdrop ?? { scene: t.id, glass: l.glass },
  }
  const set = await $.theme.set(args)
  appliedLook = `${t.id}:${l.key}`
  $.ui.status(set.isDrawn ? undefined : set.reason)
  const unpainted = l.problems[0]
  if (unpainted !== undefined) {
    $.ui.toast(unpainted)
  }

  return set
}

function validTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
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
      description: `Change le fond : /wallpaper ${THEMES.map(t => t.id).join(' | ')} | off · /wallpaper sound on|off · /wallpaper place <lat> <lon> [fuseau]`,
    })

    const t = await current($)
    if (t !== undefined) {
      await apply($, t)
    }

    // A theme whose look follows the time (the lake) changes palette at dawn,
    // day, dusk and night.
    $.clock.every(LOOK_CHECK_MS, () => {
      void (async () => {
        const now = await current($)
        if (now?.lookAt === undefined) return
        const key = `${now.id}:${now.lookAt(Date.now(), await placeOf($)).key}`
        if (key !== appliedLook) await apply($, now)
      })()
    })

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
    if (first === 'place') {
      const [lat, lon, tz] = e.args.trim().split(/\s+/).slice(1)
      const place: Place = { lat: Number(lat), lon: Number(lon), tz: tz ?? DEFAULT_PLACE.tz }
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon) || Math.abs(place.lat) > 90 || Math.abs(place.lon) > 180 || !validTimeZone(place.tz)) {
        const p = await placeOf($)
        return { text: `Lieu actuel : ${p.lat}, ${p.lon} (${p.tz}). Usage : /wallpaper place <latitude> <longitude> [fuseau IANA], par ex. /wallpaper place 45.76 4.84 Europe/Paris.` }
      }
      await $.store.set(PLACE_KEY, place)
      const t = await current($)
      if (t?.lookAt !== undefined) await apply($, t)
      return { text: `Lieu enregistré : ${place.lat}, ${place.lon} (${place.tz}). Le lever et le coucher du soleil suivent ce lieu.` }
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
  on('ui.render', { component: 'Backdrop' }, async ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const t = themeById(e.props.scene)
    if (t === undefined) {
      return next(e)
    }
    const { Svg } = $.ui.resolve(e)
    const source = t.render ? t.render(Date.now(), await placeOf($)) : t.svg

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
      const t = await current($)
      if (t?.sound !== undefined && (await $.store.get(SOUND_KEY)) !== 'off') {
        void $.audio.play({ asset: t.sound }, { gain: 0.6 }).catch(() => undefined)
      }
    }

    return result
  })
}
