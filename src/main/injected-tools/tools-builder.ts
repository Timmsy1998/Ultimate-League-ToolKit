import type { Settings } from '../../shared/settings-types'

// Renders the fixed, closed list of tools CLAUDE.md §5b permits (Dodge,
// Invite Friends, Loot Helper) — nothing else — as native-looking buttons
// inserted directly into the League Client's own real toolbars, rather
// than a separate floating overlay. The insertion points
// (.bottom-right-buttons in champ select, .lobby-header-buttons-container
// in the lobby, .loot-display-category-tabs-container on the loot page)
// and the watch-for-element-creation approach are grounded in a real,
// working PenguLoader plugin (github.com/Elaina69/Elaina-theme, MIT —
// see src/plugins/dodgeButton.ts, inviteAllFriends.ts, lootHelper.ts)
// rather than guessed.
//
// Every action here is a thin fetch() to the loopback bridge in
// server.ts; the actual LCU calls all live in already-reviewed
// main-process code (lobby.ts/friends.ts/loot.ts via LcuConnectionManager),
// same as the Tools page — no LCU logic is duplicated here. Written as
// plain JS (not compiled TS) since this is the literal file content
// PenguLoader loads into LeagueClientUx — no bundler in that path, same as
// theme-builder.ts's generated scripts.
//
// Every action requires an explicit click, plus a native confirm() for
// dodge (can cost LP) and disenchant (can't be undone) — no passive
// triggers, no auto-fire on phase or element changes.
export function buildToolsScript(baseUrl: string, token: string): string {
  return `(() => {
  const BASE_URL = ${JSON.stringify(baseUrl)};
  const TOKEN = ${JSON.stringify(token)};

  function api(path, options) {
    const opts = options || {};
    const headers = Object.assign({ 'Authorization': 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, opts.headers || {});
    return fetch(BASE_URL + path, Object.assign({}, opts, { headers })).then((res) => {
      return res.json().catch(() => ({})).then((body) => {
        if (!res.ok) throw new Error((body && body.error) || ('Request failed (' + res.status + ')'));
        return body;
      });
    });
  }

  function alertError(err) {
    window.alert('ULTK: ' + (err && err.message ? err.message : 'Something went wrong.'));
  }

  // Watches for elements matching selector, both already on the page and
  // added later — these components mount dynamically as the user
  // navigates, so a one-shot querySelectorAll at load time misses almost
  // everything.
  function watchSelector(selector, onFound) {
    document.querySelectorAll(selector).forEach(onFound);
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(selector)) onFound(node);
          node.querySelectorAll(selector).forEach(onFound);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ---- Dodge ----
  // .bottom-right-buttons also appears outside champ select, so this
  // checks the live phase (one bridge call, not a poll) before inserting
  // rather than trusting the selector alone.
  function insertDodgeButton(container) {
    if (document.querySelector('.ultk-dodge-button-container')) return;
    api('/status').then((status) => {
      if (status.phase !== 'ChampSelect' || document.querySelector('.ultk-dodge-button-container')) return;

      const wrap = document.createElement('div');
      wrap.className = 'ultk-dodge-button-container';
      wrap.style.cssText = 'position:absolute;right:10px;bottom:100px;display:flex;align-items:flex-end;z-index:1000;';

      const button = document.createElement('lol-uikit-flat-button');
      button.textContent = 'Dodge (ULTK)';
      button.style.cssText = 'cursor:pointer;';
      button.onclick = () => {
        if (!window.confirm('Dodging in champion select may cost LP and apply a queue-dodge penalty. Leave now?')) return;
        api('/leave-lobby', { method: 'POST' }).catch(alertError);
      };

      wrap.appendChild(button);
      container.parentNode.insertBefore(wrap, container);
    }).catch(() => {});
  }

  watchSelector('.bottom-right-buttons', insertDodgeButton);

  // ---- Invite friends ----
  function insertInviteButton(container) {
    if (document.querySelector('.ultk-invite-button')) return;

    const button = document.createElement('lol-uikit-flat-button');
    button.className = 'ultk-invite-button';
    button.textContent = 'Invite Friends (ULTK)';
    button.style.cssText = 'margin-right:10px;cursor:pointer;';
    button.onclick = () => {
      api('/friends').then((data) => {
        const online = (data.friends || []).filter((friend) => friend.availability !== 'offline');
        if (online.length === 0) {
          window.alert('ULTK: No online friends to invite.');
          return null;
        }
        if (!window.confirm('Invite ' + online.length + ' online friend(s) to this lobby?')) return null;
        return api('/invite-friends', {
          method: 'POST',
          body: JSON.stringify({ summonerIds: online.map((friend) => friend.summonerId) })
        });
      }).catch(alertError);
    };

    container.insertBefore(button, container.firstChild);
  }

  watchSelector('.lobby-header-buttons-container', insertInviteButton);

  // ---- Loot helper ----
  function insertLootButton(container) {
    if (document.querySelector('.ultk-loot-button-container')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ultk-loot-button-container';
    wrap.style.cssText = 'display:flex;align-items:center;';

    const button = document.createElement('div');
    button.className = 'ultk-loot-button';
    button.title = 'Disenchant all duplicate/owned shards (ULTK)';
    button.textContent = 'ULTK';
    button.style.cssText =
      'cursor:pointer;padding:4px 10px;margin-left:8px;border-radius:6px;background:rgba(10,200,185,0.18);border:1px solid #0ac8b9;color:#0ac8b9;font-weight:700;font-size:11px;';

    button.onclick = () => {
      api('/loot').then((data) => {
        const items = (data.items || []).filter(
          (item) => item.disenchantRecipeName && item.disenchantValue !== null && item.disenchantValue !== undefined
        );
        if (items.length === 0) {
          window.alert('ULTK: Nothing disenchantable right now.');
          return null;
        }
        const total = items.reduce((sum, item) => sum + (item.disenchantValue || 0) * item.count, 0);
        if (!window.confirm('Disenchant ' + items.length + ' item type(s) for ' + total + ' total essence? This can\\'t be undone.')) {
          return null;
        }
        return items.reduce(
          (chain, item) =>
            chain.then(() =>
              api('/disenchant-loot', {
                method: 'POST',
                body: JSON.stringify({
                  recipeName: item.disenchantRecipeName,
                  lootIds: new Array(item.count).fill(item.lootId)
                })
              })
            ),
          Promise.resolve()
        );
      }).catch(alertError);
    };

    wrap.appendChild(button);
    container.appendChild(wrap);
  }

  watchSelector('.loot-display-category-tabs-container', insertLootButton);
})();`
}

export function buildToolsPackage(settings: Settings, baseUrl: string, token: string): string | null {
  if (!settings.injectedToolsEnabled) return null
  return buildToolsScript(baseUrl, token)
}
