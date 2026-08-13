export type ThemePreference = 'dark' | 'light' | 'system'

export interface Settings {
  theme: ThemePreference
  launchOnStartup: boolean
  notificationsEnabled: boolean
  autoAcceptReadyCheck: boolean
  dodgeToolEnabled: boolean
  lootHelperEnabled: boolean
  inviteFriendsEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  launchOnStartup: false,
  notificationsEnabled: true,
  autoAcceptReadyCheck: false,
  lootHelperEnabled: true,
  inviteFriendsEnabled: true
  dodgeToolEnabled: true
  lootHelperEnabled: true
}
