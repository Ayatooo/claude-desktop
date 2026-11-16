// The values the bar keeps in the session's state.
export type Window = { percent: number; resetsAt?: string }
export type Repo = { project: string; branch?: string }

declare module 'claude-code' {
  interface PluginState {
    statusbar: {
      // Context fill and the two usage windows, as the engine last measured them.
      usage: { context?: number; fiveHour?: Window; week?: Window }
      // The project folder and its current git branch.
      repo: Repo | null
      // The time the countdowns are drawn against, moved every minute.
      now: number
    }
  }
}
