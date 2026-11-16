import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage, SessionRateLimit } from 'claude-code'

import type { Repo, Window } from '../types'
import { countdown, level, ticksSvg, ticksText } from './ticks'

const PLUGIN = 'statusbar'
const usageAtom = atom({ plugin: 'statusbar', key: 'usage' } as const, {})
const repoAtom = atom({ plugin: 'statusbar', key: 'repo' } as const, null)
const nowAtom = atom({ plugin: 'statusbar', key: 'now' } as const, 0)

// Keeps what the engine measured: the context fill and the two usage windows.
async function keep($: EngineInterface, context: SessionContextUsage, limits: readonly SessionRateLimit[]) {
  const win = (kind: string): Window | undefined => {
    const w = limits.find(l => l.kind === kind)
    return w === undefined ? undefined : { percent: w.percentUsed, resetsAt: w.resetsAt }
  }
  await update($, usageAtom, () => ({ context: context.percent, fiveHour: win('five_hour'), week: win('seven_day') }))
}

// The project (the repository's folder, or the session's) and its branch.
async function readRepo($: EngineInterface): Promise<Repo> {
  const cwd = await $.session.cwd()
  const run = async (argv: string[]) => {
    try {
      const r = await $.process.run(argv, { timeoutMs: 4000 })
      return r.exitCode === 0 ? r.stdout.trim() : ''
    } catch {
      return ''
    }
  }
  const top = (await run(['git', 'rev-parse', '--show-toplevel'])) || cwd
  const branch = (await run(['git', 'branch', '--show-current'])) || (await run(['git', 'rev-parse', '--short', 'HEAD']))
  const project = top.split(/[\\/]/).filter(Boolean).pop() ?? top
  return { project, branch: branch || undefined }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await update($, nowAtom, () => Date.now())
    // The countdowns move every minute.
    $.clock.every(60_000, () => void update($, nowAtom, () => Date.now()).catch(() => undefined))
    try {
      const u = await $.session.usage()
      await keep($, u.context, u.rateLimits)
    } catch {
      // No reading yet: the bar shows what it has.
    }
    await update($, repoAtom, () => null)
    const repo = await readRepo($)
    await update($, repoAtom, () => repo)
    return result
  })

  // Pushed by the engine after each turn and when a window moves.
  on('session.measure', async ($, e, next) => {
    await keep($, e.context, e.rateLimits).catch(() => undefined)
    return next(e)
  })

  // A turn may have switched branches.
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined) {
      const repo = await readRepo($)
      await update($, repoAtom, () => repo).catch(() => undefined)
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const usage = await read($, usageAtom)
    const repo = await read($, repoAtom)
    const now = (await read($, nowAtom)) || Date.now()
    const table = $.ui.resolve(e)
    const { Box, Text } = table
    // The terminal draws no vector strips: it gets them in characters.
    const Svg = e.surface !== 'terminal' && 'Svg' in table ? table.Svg : undefined

    const quota = (key: string, label: string, percent: number | undefined, resetsAt?: string) => {
      if (percent === undefined) return null
      const shown = Math.round(percent)
      const left = countdown(resetsAt, now)
      const color = level(percent) === 'calm' ? 'text' : level(percent) === 'warm' ? 'warning' : 'error'
      let strip
      if (Svg !== undefined) {
        const t = ticksSvg(percent)
        strip = <Svg source={t.source} alt={`${label} ${shown} %`} width={t.width} height={t.height} />
      } else {
        const t = ticksText(percent)
        strip = (
          <Text>
            <Text color={t.color}>{t.filled}</Text>
            <Text dimColor>{t.rest}</Text>
            <Text color="warning" dimColor>
              {t.tail}
            </Text>
          </Text>
        )
      }
      return (
        <Box key={key} flexDirection="row" alignItems="center" gap={1}>
          <Text mono size="footnote" dimColor>
            {label}
          </Text>
          {strip}
          <Text mono tabular size="footnote" color={color}>
            {String(shown)}
            <Text dimColor>%</Text>
          </Text>
          {left !== undefined ? (
            <Text mono size="footnote" dimColor>
              {`↻ ${left}`}
            </Text>
          ) : null}
        </Box>
      )
    }

    const quotas = [
      quota('ctx', 'ctx', usage.context),
      quota('5h', '5h', usage.fiveHour?.percent, usage.fiveHour?.resetsAt),
      quota('sem', 'sem', usage.week?.percent, usage.week?.resetsAt),
    ].filter(q => q !== null)

    if (repo === null && quotas.length === 0) return next(e)

    // Project / branch.
    const left = []
    if (repo !== null) {
      left.push(
        <Text key="project" mono size="footnote" color="subtle">
          {repo.project}
        </Text>,
      )
      if (repo.branch !== undefined) {
        left.push(
          <Text key="slash" mono size="footnote" dimColor>
            /
          </Text>,
          <Text key="branch" mono size="footnote" weight="medium" wrap="truncate-end">
            {repo.branch}
          </Text>,
        )
      }
    }

    return (
      <Box flexDirection="row" justifyContent="space-between" alignItems="center" borderStyle="round" borderColor="promptBorder" paddingX={1} gap={2}>
        <Box flexDirection="row" alignItems="center" gap={1}>
          {left}
        </Box>
        <Box flexDirection="row" alignItems="center" gap={2}>
          {quotas}
        </Box>
      </Box>
    )
  })

  // The bar sits last in the band, right above the prompt.
  on('ui.render', { component: 'AbovePromptList' }, ($, e, next) => {
    const mine = e.props.rows.filter(r => r.plugin === PLUGIN)
    if (mine.length === 0) return next(e)
    const others = e.props.rows.filter(r => r.plugin !== PLUGIN)
    return next({ ...e, props: { ...e.props, rows: [...others, ...mine] } })
  })
}
