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

  return { css: cssRules.join('\n'), js: jsStatements.join('\n'), backgroundAssetFilename }
}
