export interface ClientThemePackage {
  css: string
  js: string
}

// Why a live reload didn't happen, when it didn't — lets the UI explain
// itself instead of just saying "saved" every time.
export type ClientThemeApplySkipReason = 'hook-disabled' | 'not-connected' | 'unsafe-phase' | 'restart-failed'

export type ClientThemeApplyResult = { reloaded: true } | { reloaded: false; reason: ClientThemeApplySkipReason }
