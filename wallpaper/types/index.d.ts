// The values the mod keeps in the session's state.
export type Mood = 'idle' | 'working' | 'happy'

declare module 'claude-code' {
  interface PluginState {
    wallpaper: {
      // Whether the wallpaper picker is open above the prompt.
      isPickerOpen: boolean
      // How many turns have ended in this session (the creature cheers at each).
      turnsDone: number
    }
  }
}
