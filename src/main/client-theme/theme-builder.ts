import type { ClientThemePackage } from '../../shared/client-theme-types'
import type { Settings } from '../../shared/settings-types'

// The League Client's actual DOM structure and class names aren't public
// and drift between client versions — these selectors are best-effort
// placeholders that still need verifying against a live client (now that
// the injector exists, via its own DevTools — Pengu's core exposes these,
// see its docs) before shipping for real. Kept as a pure function so fixing
// selectors later never has to touch the settings or IPC layers around it.

type BackgroundKind = 'image' | 'gif' | 'video'

const BACKGROUND_ASSET_PATTERN = /^background\.(png|jpg|webp|gif|mp4|webm)$/

function classifyBackground(value: string): { kind: BackgroundKind; url: string } | null {
  if (value.startsWith('data:image/')) return { kind: 'image', url: value }

  const match = BACKGROUND_ASSET_PATTERN.exec(value)
  if (!match) return null
  // Plugins reference their own bundled assets via this //plugins/<name>/
  // form — confirmed directly against PenguLoader's docs, not guessed.
  const url = `//plugins/ultk-theme/assets/${value}`
  const ext = match[1]
  if (ext === 'gif') return { kind: 'gif', url }
  if (ext === 'mp4' || ext === 'webm') return { kind: 'video', url }
  return { kind: 'image', url }
}

function imageBackgroundRule(url: string): string {
  return `body { background-image: url(${JSON.stringify(url)}) !important; background-size: cover; background-position: center; }`
}

const CUSTOM_FONT_ASSET_PATTERN = /^custom-font\.(ttf|otf|woff2?)$/
const CUSTOM_FONT_FAMILY = 'ULTKCustomFont'

const FONT_FORMATS: Record<string, string> = {
  ttf: 'truetype',
  otf: 'opentype',
  woff: 'woff',
  woff2: 'woff2'
}

// A fixed, ULTK-chosen font-family name means no user-supplied CSS
// identifier ever needs validating — the uploaded file is always referred
// to as CUSTOM_FONT_FAMILY, never a name the renderer provides.
function customFontRule(filename: string): string {
  const ext = CUSTOM_FONT_ASSET_PATTERN.exec(filename)?.[1]
  const format = ext ? FONT_FORMATS[ext] : undefined
  const url = `//plugins/ultk-theme/assets/${filename}`
  const src = format ? `url(${JSON.stringify(url)}) format(${JSON.stringify(format)})` : `url(${JSON.stringify(url)})`
  return `@font-face { font-family: '${CUSTOM_FONT_FAMILY}'; src: ${src}; }\n* { font-family: '${CUSTOM_FONT_FAMILY}' !important; }`
}

// Muted/no-controls/no-PiP per the user's "nobody wants audio" ask, plus a
// visibilitychange pause — the concrete form of CLAUDE.md §4's "no feature
// may assume a high-resource machine" for anything this visually heavy.
function videoBackgroundScript(url: string): string {
  return `(() => {
  const video = document.createElement('video');
  video.src = ${JSON.stringify(url)};
  video.muted = true;
  video.volume = 0;
  video.autoplay = true;
  video.loop = true;
  video.disablePictureInPicture = true;
  video.setAttribute('playsinline', '');
  Object.assign(video.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', objectFit: 'cover', zIndex: '-1', pointerEvents: 'none' });
  document.body.prepend(video);
  video.play().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) video.pause(); else video.play().catch(() => {});
  });
})();`
}

export function buildThemePackage(settings: Settings): ClientThemePackage {
  const cssRules: string[] = []
  const jsStatements: string[] = []
  let backgroundAssetFilename: string | null = null
  let fontAssetFilename: string | null = null

  if (settings.clientThemeEnabled && settings.clientThemeBackground) {
    const background = classifyBackground(settings.clientThemeBackground)
    const skipForReducedMotion =
      background !== null && background.kind !== 'image' && settings.clientThemeReducedMotion

    if (background && !skipForReducedMotion) {
      if (background.kind === 'video') {
        jsStatements.push(videoBackgroundScript(background.url))
      } else {
        cssRules.push(imageBackgroundRule(background.url))
      }
      if (!background.url.startsWith('data:')) {
        backgroundAssetFilename = settings.clientThemeBackground
      }
    }
  }

  if (settings.clientThemeEnabled && settings.clientThemeAccentColor) {
    cssRules.push(`:root { --accent-color: ${settings.clientThemeAccentColor} !important; }`)
  }

  // A custom uploaded font takes precedence over the preset dropdown — the
  // UI keeps these mutually exclusive, but this order makes that true even
  // if settings ever end up with both set.
  if (settings.clientThemeEnabled && settings.clientThemeCustomFontAsset) {
    cssRules.push(customFontRule(settings.clientThemeCustomFontAsset))
    fontAssetFilename = settings.clientThemeCustomFontAsset
  } else if (settings.clientThemeEnabled && settings.clientThemeFont) {
    cssRules.push(`* { font-family: ${settings.clientThemeFont} !important; }`)
  }

  // Best-effort per the user's own read of the live client: the banner is a
  // CSS background-image (not an <img>) on ".hover-card-header", part of the
  // rcp-fe-lol-hover-card plugin — not confirmed against a full DOM dump the
  // way the profile icon selector below was, so re-check in-client if this
  // doesn't take.
  if (settings.clientThemeEnabled && settings.clientThemeBannerImage) {
    jsStatements.push(
      `document.querySelectorAll('.hover-card-header').forEach((el) => { el.style.setProperty('background-image', 'url(' + ${JSON.stringify(settings.clientThemeBannerImage)} + ')', 'important') })`
    )
  }

  // Confirmed against a live client's DOM: the icon lives inside a
  // <lol-uikit-radial-progress class="summoner-level-icon"> web component,
  // as <img class="icon-image ...">, not the ".lol-profile-summoner-icon"
  // placeholder this used to target.
  if (settings.clientThemeEnabled && settings.clientThemeIconImage) {
    jsStatements.push(
      `document.querySelectorAll('lol-uikit-radial-progress.summoner-level-icon img.icon-image').forEach((img) => { img.src = ${JSON.stringify(settings.clientThemeIconImage)} })`
    )
  }

  return { css: cssRules.join('\n'), js: jsStatements.join('\n'), backgroundAssetFilename, fontAssetFilename }
}
