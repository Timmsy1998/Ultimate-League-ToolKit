export type ThemePreference = 'dark' | 'light' | 'system'

export interface Settings {
  theme: ThemePreference
  launchOnStartup: boolean
  notificationsEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  launchOnStartup: false,
  notificationsEnabled: true
}
