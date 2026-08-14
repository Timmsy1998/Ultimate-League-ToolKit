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

// The client renders its own opaque background layer (#background-ambient,
// .background) in front of a plain `body` background, which otherwise
// makes any custom background (image, gif, or the video element below)
// invisible regardless of z-index — confirmed against a real, working
// PenguLoader theme plugin (github.com/Elaina69/Elaina-theme, MIT) rather
// than guessed; it hides these same two layers for the same reason.
// Applies to every background kind, not just images.
const BACKGROUND_OVERRIDE_RULE = '#background-ambient { display: none !important; } .background { background-image: unset !important; }'

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

// The profile icon and banner both live several shadow-DOM boundaries deep
// inside web components (lol-regalia-*-v2-element), created dynamically as
// the user navigates — a flat document.querySelectorAll() never reaches
// them and a one-shot script misses elements that mount later. This
// structure (element/shadowRoot chain, class names, watch-and-retry
// pattern) is grounded in a real, working PenguLoader theme plugin
// (github.com/Elaina69/Elaina-theme, MIT), not guessed — see
// customUI/customIcon.ts's CustomAvatar/CustomBanner classes there. Scoped
// down from that reference to just the local user's own summoner (matched
// by summoner-id/puuid) since we're only reskinning what the local user
// sees of themselves, never touching how anyone else's icon/banner render.
function regaliaProfileScript(bannerDataUri: string | null, iconDataUri: string | null): string {
  if (!bannerDataUri && !iconDataUri) return ''
  return `(() => {
  const BANNER_URL = ${JSON.stringify(bannerDataUri)};
  const ICON_URL = ${JSON.stringify(iconDataUri)};
  let ownSummonerId = null;
  let ownPuuid = null;

  fetch('/lol-summoner/v1/current-summoner').then((res) => res.json()).then((data) => {
    ownSummonerId = data && typeof data.summonerId === 'number' ? data.summonerId : null;
    ownPuuid = data && typeof data.puuid === 'string' ? data.puuid : null;
  }).catch(() => {});

  function isOwn(element) {
    const sid = element.getAttribute('summoner-id');
    if (sid !== null && ownSummonerId !== null && Number(sid) === ownSummonerId) return true;
    const puuid = element.getAttribute('puuid') || element.getAttribute('voice-puuid');
    if (puuid && ownPuuid && puuid === ownPuuid) return true;
    return false;
  }

  function getRegaliaIcon(element) {
    const direct = element.shadowRoot && element.shadowRoot.querySelector('.lol-regalia-summoner-icon');
    if (direct) return direct;
    const crest = element.shadowRoot && element.shadowRoot.querySelector('lol-regalia-crest-v2-element');
    return (crest && crest.shadowRoot && crest.shadowRoot.querySelector('.lol-regalia-summoner-icon')) || null;
  }

  function getRegaliaBanner(element) {
    const bannerEl = element.shadowRoot && element.shadowRoot.querySelector('lol-regalia-banner-v2-element');
    return (bannerEl && bannerEl.shadowRoot && bannerEl.shadowRoot.querySelector('.regalia-banner-asset-static-image')) || null;
  }

  // The client's own JS re-renders these elements on various internal
  // updates, which resets a plain property assignment back to default —
  // freezing the property with a getter/setter that silently ignores
  // further writes is how the reference plugin keeps a custom icon/banner
  // from reverting after that happens.
  function freezeProperty(object, property) {
    const value = object[property];
    try {
      Object.defineProperty(object, property, {
        configurable: false,
        get: () => value,
        set: () => {}
      });
    } catch (e) {}
  }

  function applyIcon(element) {
    if (!ICON_URL || !isOwn(element)) return false;
    const icon = getRegaliaIcon(element);
    if (!icon) return false;
    icon.style.backgroundImage = 'url(' + JSON.stringify(ICON_URL) + ')';
    freezeProperty(icon.style, 'backgroundImage');
    return true;
  }

  function applyBanner(element) {
    if (!BANNER_URL || !isOwn(element)) return false;
    const banner = getRegaliaBanner(element);
    if (!banner) return false;
    banner.src = BANNER_URL;
    freezeProperty(banner, 'src');
    return true;
  }

  function applyBoth(element) {
    const didIcon = applyIcon(element);
    const didBanner = applyBanner(element);
    return didIcon || didBanner;
  }

  // Shadow roots fill in asynchronously as the component finishes
  // rendering, so a single attempt right at creation often finds nothing
  // yet. A MutationObserver on element only ever sees that element's own
  // light DOM though — the icon/banner actually live several shadow-root
  // boundaries down (element.shadowRoot -> lol-regalia-*-v2-element -> its
  // own shadowRoot -> the image), and shadow-tree mutations never bubble
  // out to an observer scoped outside them. Regalia data also resolves via
  // its own async fetch (observed retrying after a 404 against a live
  // client), so there's no single light-DOM event guaranteed to follow the
  // image actually appearing. A short, bounded poll alongside the observer
  // is the simple, correct fallback: it always eventually finds the image
  // once the client finishes rendering it, however many shadow roots deep
  // that is, then stops itself — this is a one-shot burst tied to a single
  // element mounting, not an ongoing background loop.
  function watch(element) {
    let attempts = 0;
    const startedAt = Date.now();
    let debounceTimer = null;
    let pollTimer = null;
    let stopped = false;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      if (pollTimer !== null) clearInterval(pollTimer);
      observer.disconnect();
    };

    const tryApply = () => {
      if (stopped) return;
      if (!element.isConnected) {
        stop();
        return;
      }
      attempts++;
      const applied = applyBoth(element);
      if (applied || Date.now() - startedAt >= 8000 || attempts >= 50) stop();
    };

    const observer = new MutationObserver(() => {
      if (stopped) return;
      if (debounceTimer !== null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(tryApply, 50);
    });
    observer.observe(element, { attributes: true, childList: true, subtree: true });
    pollTimer = setInterval(tryApply, 150);
    tryApply();
  }

  const REGALIA_SELECTORS = [
    'lol-regalia-hovercard-v2-element',
    'lol-regalia-identity-customizer-element',
    'lol-regalia-parties-v2-element',
    'lol-regalia-profile-v2-element'
  ];

  function watchWithin(root) {
    REGALIA_SELECTORS.forEach((selector) => {
      root.querySelectorAll(selector).forEach(watch);
    });
  }

  // Pengu runs this plugin file before the client's own <body> exists yet
  // (confirmed live: document.body.prepend/observe(document.body) both
  // threw "not of type Node" / "null" at load, aborting the whole script
  // before this ever ran) — defer starting until it actually does.
  function start() {
    watchWithin(document);

    const rootObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          REGALIA_SELECTORS.forEach((selector) => {
            if (node.matches(selector)) watch(node);
          });
          watchWithin(node);
        });
      });
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();`
}

// Muted/no-controls/no-PiP per the user's "nobody wants audio" ask, plus a
// visibilitychange pause — the concrete form of CLAUDE.md §4's "no feature
// may assume a high-resource machine" for anything this visually heavy.
function videoBackgroundScript(url: string): string {
  return `(() => {
  // Same document.body-not-ready-yet issue as the regalia watcher below —
  // confirmed live, not theoretical: this threw "Cannot read properties of
  // null (reading 'prepend')" at plugin load.
  function start() {
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
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
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
      cssRules.push(BACKGROUND_OVERRIDE_RULE)
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

  if (settings.clientThemeEnabled && (settings.clientThemeBannerImage || settings.clientThemeIconImage)) {
    const script = regaliaProfileScript(settings.clientThemeBannerImage, settings.clientThemeIconImage)
    if (script) jsStatements.push(script)
  }

  return { css: cssRules.join('\n'), js: jsStatements.join('\n'), backgroundAssetFilename, fontAssetFilename }
}
