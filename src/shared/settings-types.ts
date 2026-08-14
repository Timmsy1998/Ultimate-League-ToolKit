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
  // Either a legacy data URI (old settings, images only) or an asset-store
  // filename like "background.mp4" — kind is inferred from the extension
  // wherever it's needed, see client-theme/theme-builder.ts.
  clientThemeBackground: string | null
  // Video/gif backgrounds are visually heavy — this pauses/omits them for
  // lower-resource machines (CLAUDE.md §4).
  clientThemeReducedMotion: boolean
  clientThemeAccentColor: string | null
  clientThemeFont: string | null
  // Filename of an uploaded custom font in the asset store, e.g.
  // "custom-font.woff2" — mutually exclusive with clientThemeFont in the
  // UI (picking a preset clears this, and vice versa). Takes precedence
  // over clientThemeFont when both are set. See theme-builder.ts.
  clientThemeCustomFontAsset: string | null
  clientThemeBannerImage: string | null // data URI
  clientThemeIconImage: string | null // data URI
  inviteFriendsEnabled: boolean
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
  clientThemeReducedMotion: false,
  clientThemeAccentColor: null,
  clientThemeFont: null,
  clientThemeCustomFontAsset: null,
  clientThemeBannerImage: null,
  clientThemeIconImage: null,
  inviteFriendsEnabled: true
}
