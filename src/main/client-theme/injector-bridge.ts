import type { ClientThemePackage } from '../../shared/client-theme-types'

// The seam between theme configuration (this branch) and the native
// injector that actually applies a theme package to a running League
// Client (a separate, later effort — see CLAUDE.md §5a and the plan notes
// for why that's native systems work, not something to stub out blind).
// Rejecting here — rather than silently no-op'ing — gives the renderer a
// real, honest status to show instead of a fake success.
export async function applyTheme(_pkg: ClientThemePackage): Promise<void> {
  throw new Error('Client theming engine is not wired up yet — this is coming in a future update.')
}
