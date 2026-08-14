export interface ClientThemePackage {
  css: string
  js: string
  // Set when the background references a file in the asset store (gif,
  // video, or an uploaded image) rather than a data URI — tells
  // injector-bridge.ts what to copy into the plugin's own assets folder.
  backgroundAssetFilename: string | null
  // Same idea for an uploaded custom font, e.g. "custom-font.woff2".
  fontAssetFilename: string | null
}

// Why a live reload didn't happen, when it didn't — lets the UI explain
// itself instead of just saying "saved" every time.
export type ClientThemeApplySkipReason = 'hook-disabled' | 'not-connected' | 'unsafe-phase' | 'restart-failed'

export type ClientThemeApplyResult = { reloaded: true } | { reloaded: false; reason: ClientThemeApplySkipReason }
