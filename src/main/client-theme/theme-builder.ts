import type { ClientThemePackage } from '../../shared/client-theme-types'
import type { Settings } from '../../shared/settings-types'

// The League Client's actual DOM structure and class names aren't public
// and drift between client versions — these selectors are best-effort
// placeholders that still need verifying against a live client (now that
// the injector exists, via its own DevTools — Pengu's core exposes these,
// see its docs) before shipping for real. Kept as a pure function so fixing
// selectors later never has to touch the settings or IPC layers around it.
export function buildThemePackage(settings: Settings): ClientThemePackage {
  const cssRules: string[] = []
  const jsStatements: string[] = []

  if (settings.clientThemeEnabled && settings.clientThemeBackground) {
    cssRules.push(
      `body { background-image: url("${settings.clientThemeBackground}") !important; background-size: cover; background-position: center; }`
    )
  }

  if (settings.clientThemeEnabled && settings.clientThemeAccentColor) {
    cssRules.push(`:root { --accent-color: ${settings.clientThemeAccentColor} !important; }`)
  }

  if (settings.clientThemeEnabled && settings.clientThemeFont) {
    cssRules.push(`* { font-family: ${settings.clientThemeFont} !important; }`)
  }

  if (settings.clientThemeEnabled && settings.clientThemeBannerImage) {
    jsStatements.push(
      `document.querySelectorAll('.lol-regalia-banner img').forEach((img) => { img.src = ${JSON.stringify(settings.clientThemeBannerImage)} })`
    )
  }

  if (settings.clientThemeEnabled && settings.clientThemeIconImage) {
    jsStatements.push(
      `document.querySelectorAll('.lol-profile-summoner-icon img').forEach((img) => { img.src = ${JSON.stringify(settings.clientThemeIconImage)} })`
    )
  }

  return { css: cssRules.join('\n'), js: jsStatements.join('\n') }
}
