export type ThemePreference = 'dark' | 'light' | 'system'

export interface Settings {
  theme: ThemePreference
  launchOnStartup: boolean
  notificationsEnabled: boolean
  autoAcceptReadyCheck: boolean
  dodgeToolEnabled: boolean
  lootHelperEnabled: boolean
  // Client Theme — reskins the League Client's own UI (see CLAUDE.md §5a).
  // Off by default, and each customization is independently toggleable —
  // turning one off just omits it from the theme package rather than
  // reverting the whole feature.
  clientThemeEnabled: boolean
  clientThemeBackground: string | null // data URI
  clientThemeAccentColor: string | null
  clientThemeFont: string | null
  clientThemeBannerImage: string | null // data URI
  clientThemeIconImage: string | null // data URI
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  launchOnStartup: false,
  notificationsEnabled: true,
  autoAcceptReadyCheck: false,
  dodgeToolEnabled: true,
  lootHelperEnabled: true,
  clientThemeEnabled: false,
  clientThemeBackground: null,
  clientThemeAccentColor: null,
  clientThemeFont: null,
  clientThemeBannerImage: null,
  clientThemeIconImage: null
}
