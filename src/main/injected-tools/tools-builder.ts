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

  // Pengu runs this plugin file before the client's own <body> exists yet
  // (confirmed live: observer.observe(document.body, ...) above threw "not
  // of type Node" at load, aborting the whole script before any watcher
  // below ever got set up) — defer starting each watcher until it does.
  function whenBodyReady(fn) {
    if (document.body) fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
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
        // Leaving champ select on its own leaves the client showing stale
        // gameflow state (still looks queued/in champ select) for a beat —
        // reload right after so the client actually reflects having left.
        api('/leave-lobby', { method: 'POST' })
          .then(() => api('/restart-client', { method: 'POST' }))
          .catch(alertError);
      };

      wrap.appendChild(button);
      container.parentNode.insertBefore(wrap, container);
    }).catch(() => {});
  }

  whenBodyReady(() => watchSelector('.bottom-right-buttons', insertDodgeButton));

  // ---- Invite friends ----
  // A click opens a picker (group, or all online) rather than blind-inviting
  // every online friend at once — nothing gets invited until a specific
  // option in the panel is clicked, keeping this an explicit action same as
  // everything else here.
  function closeInvitePanel(wrap) {
    const panel = wrap.querySelector('.ultk-invite-panel');
    if (panel) panel.remove();
    document.removeEventListener('mousedown', wrap.__ultkOnDocMouseDown, true);
  }

  function doInvite(wrap, friends, label) {
    if (friends.length === 0) return;
    if (!window.confirm('Invite ' + friends.length + ' friend(s) from "' + label + '" to this lobby?')) return;
    api('/invite-friends', {
      method: 'POST',
      body: JSON.stringify({ summonerIds: friends.map((friend) => friend.summonerId) })
    }).catch(alertError);
    closeInvitePanel(wrap);
  }

  function buildInvitePanel(wrap, data) {
    const online = (data.friends || []).filter((friend) => friend.availability !== 'offline');
    if (online.length === 0) {
      window.alert('ULTK: No online friends to invite.');
      return;
    }

    const groupNameById = {};
    (data.groups || []).forEach((group) => { groupNameById[group.id] = group.name; });

    const byGroup = {};
    online.forEach((friend) => {
      const key = friend.groupId && groupNameById[friend.groupId] ? friend.groupId : '';
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push(friend);
    });

    const buckets = [{ label: 'All online friends', friends: online }];
    Object.keys(byGroup).forEach((key) => {
      buckets.push({ label: key ? groupNameById[key] : 'Ungrouped', friends: byGroup[key] });
    });

    const panel = document.createElement('div');
    panel.className = 'ultk-invite-panel';
    panel.style.cssText =
      'position:absolute;top:100%;left:0;margin-top:4px;min-width:200px;background:#0a1428;border:1px solid #0ac8b9;border-radius:6px;padding:6px;z-index:1000;box-shadow:0 4px 12px rgba(0,0,0,0.4);';

    buckets.forEach((bucket) => {
      const row = document.createElement('div');
      row.textContent = bucket.label + ' (' + bucket.friends.length + ')';
      row.style.cssText = 'padding:6px 8px;cursor:pointer;color:#f0f0f0;font-size:12px;border-radius:4px;';
      row.onmouseenter = () => { row.style.background = 'rgba(10,200,185,0.18)'; };
      row.onmouseleave = () => { row.style.background = 'transparent'; };
      row.onclick = () => doInvite(wrap, bucket.friends, bucket.label);
      panel.appendChild(row);
    });

    wrap.appendChild(panel);
    wrap.__ultkOnDocMouseDown = (event) => {
      if (!panel.contains(event.target)) closeInvitePanel(wrap);
    };
    document.addEventListener('mousedown', wrap.__ultkOnDocMouseDown, true);
  }

  function insertInviteButton(container) {
    if (document.querySelector('.ultk-invite-wrap')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ultk-invite-wrap';
    wrap.style.cssText = 'position:relative;display:inline-block;margin-right:10px;';

    const button = document.createElement('lol-uikit-flat-button');
    button.textContent = 'Invite Friends (ULTK)';
    button.style.cssText = 'cursor:pointer;';
    button.onclick = (event) => {
      event.stopPropagation();
      if (wrap.querySelector('.ultk-invite-panel')) {
        closeInvitePanel(wrap);
        return;
      }
      api('/friends').then((data) => buildInvitePanel(wrap, data)).catch(alertError);
    };

    wrap.appendChild(button);
    container.insertBefore(wrap, container.firstChild);
  }

  whenBodyReady(() => watchSelector('.lobby-header-buttons-container', insertInviteButton));

  // ---- Loot helper ----
  function insertLootButton(container) {
    if (document.querySelector('.ultk-loot-button-container')) return;

    const wrap = document.createElement('div');
    wrap.className = 'ultk-loot-button-container';
    wrap.style.cssText = 'display:flex;align-items:center;';

    const button = document.createElement('div');
    button.className = 'ultk-loot-button';
    button.title = 'Disenchant all duplicate/owned shards (ULTK)';
    button.textContent = 'Loot Tools';
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

  whenBodyReady(() => watchSelector('.loot-display-category-tabs-container', insertLootButton));
})();`
}

export function buildToolsPackage(settings: Settings, baseUrl: string, token: string): string | null {
  if (!settings.injectedToolsEnabled) return null
  return buildToolsScript(baseUrl, token)
}
