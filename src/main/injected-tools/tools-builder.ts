import type { Settings } from '../../shared/settings-types'

// Renders a small floating panel inside the League Client's own UI for the
// fixed, closed list of tools CLAUDE.md §5b permits (Dodge, Invite Friends,
// Loot Helper) — nothing else. Every action in here is a thin fetch() to
// the loopback bridge in server.ts; the actual LCU calls all live in
// already-reviewed main-process code (lobby.ts/friends.ts/loot.ts via
// LcuConnectionManager), same as the Tools page. No LCU logic is
// duplicated here. Written as plain JS (not compiled TS) since this is the
// literal file content PenguLoader loads into LeagueClientUx — no bundler
// in that path, same as theme-builder.ts's generated scripts.
//
// Every action requires an explicit click in this panel, including a
// confirm step for dodge (which can cost LP) and loot disenchant (which
// can't be undone) — no passive triggers, no auto-fire on phase change.
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

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const style = document.createElement('style');
  style.textContent = '.ultk-fab{position:fixed;right:20px;bottom:20px;z-index:999999;width:48px;height:48px;border-radius:999px;background:#091428;border:2px solid #0ac8b9;color:#0ac8b9;font-family:Manrope,sans-serif;font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.45);transition:transform 120ms ease,box-shadow 120ms ease}' +
    '.ultk-fab:hover{transform:scale(1.06);box-shadow:0 6px 20px rgba(0,0,0,.55)}' +
    '.ultk-panel{position:fixed;right:20px;bottom:78px;z-index:999999;width:280px;max-height:420px;display:flex;flex-direction:column;background:#0a1428f0;border:1px solid #1e2a3d;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.55);overflow:hidden;font-family:Manrope,sans-serif;color:#cdd6e0}' +
    '.ultk-panel[hidden],.ultk-fab[hidden]{display:none}' +
    '.ultk-tabs{display:flex;border-bottom:1px solid #1e2a3d;flex-shrink:0}' +
    '.ultk-tab{flex:1;padding:10px 4px;background:transparent;border:none;color:#8a97a8;font-size:11px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent}' +
    '.ultk-tab.active{color:#0ac8b9;border-bottom-color:#0ac8b9}' +
    '.ultk-body{padding:12px;overflow-y:auto;flex:1;font-size:12px}' +
    '.ultk-body p{margin:0 0 6px}' +
    '.ultk-btn{width:100%;padding:8px 10px;margin-top:8px;background:#0ac8b9;color:#04211d;border:none;border-radius:6px;font-weight:700;font-size:12px;cursor:pointer}' +
    '.ultk-btn:disabled{opacity:.5;cursor:default}' +
    '.ultk-btn.danger{background:#e04747;color:#fff}' +
    '.ultk-btn.secondary{background:transparent;border:1px solid #2a3b52;color:#cdd6e0;margin-top:0}' +
    '.ultk-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 0;border-bottom:1px solid #16202f}' +
    '.ultk-row:last-child{border-bottom:none}' +
    '.ultk-muted{color:#8a97a8;font-size:11px}' +
    '.ultk-error{color:#ff8a8a;font-size:11px;margin-top:6px}';
  document.head.appendChild(style);

  const fab = el('button', 'ultk-fab', 'U');
  fab.title = 'ULTK tools';

  const panel = el('div', 'ultk-panel');
  panel.hidden = true;
  const tabsRow = el('div', 'ultk-tabs');
  const body = el('div', 'ultk-body');
  panel.appendChild(tabsRow);
  panel.appendChild(body);

  const TABS = [
    { id: 'dodge', label: 'Dodge' },
    { id: 'invite', label: 'Invite' },
    { id: 'loot', label: 'Loot' }
  ];
  let activeTab = 'dodge';
  let lastStatus = { status: 'offline', phase: 'None' };
  let statusPollTimer = null;

  function renderTabs() {
    tabsRow.innerHTML = '';
    TABS.forEach((tab) => {
      const btn = el('button', 'ultk-tab' + (tab.id === activeTab ? ' active' : ''), tab.label);
      btn.onclick = () => { activeTab = tab.id; renderTabs(); renderBody(); };
      tabsRow.appendChild(btn);
    });
  }

  function setBody(node) {
    body.innerHTML = '';
    body.appendChild(node);
  }

  // ---- Dodge ----
  let dodgeConfirming = false;
  let dodgeError = '';
  function renderDodge() {
    const wrap = document.createElement('div');
    const dodgeablePhases = ['Lobby', 'Matchmaking', 'ChampSelect'];
    if (dodgeablePhases.indexOf(lastStatus.phase) === -1) {
      wrap.appendChild(el('p', 'ultk-muted', 'Only available in a lobby or champion select.'));
      setBody(wrap);
      return;
    }
    const isChampSelect = lastStatus.phase === 'ChampSelect';
    wrap.appendChild(el('p', 'ultk-muted', isChampSelect ? 'Currently in champion select. Leaving now counts as a dodge.' : 'Currently in a lobby.'));
    if (dodgeConfirming) {
      wrap.appendChild(el('p', 'ultk-error', isChampSelect ? "Dodging may cost LP and apply a queue penalty. Can't be undone." : 'Leave the current lobby?'));
      const confirmBtn = el('button', 'ultk-btn danger', isChampSelect ? 'Dodge anyway' : 'Leave lobby');
      confirmBtn.onclick = () => {
        confirmBtn.disabled = true;
        api('/leave-lobby', { method: 'POST' }).then(() => {
          dodgeConfirming = false;
          dodgeError = '';
          renderDodge();
        }).catch((err) => {
          dodgeError = err.message;
          confirmBtn.disabled = false;
          renderDodge();
        });
      };
      const cancelBtn = el('button', 'ultk-btn secondary', 'Cancel');
      cancelBtn.onclick = () => { dodgeConfirming = false; renderDodge(); };
      wrap.appendChild(confirmBtn);
      wrap.appendChild(cancelBtn);
    } else {
      const btn = el('button', 'ultk-btn' + (isChampSelect ? ' danger' : ''), isChampSelect ? 'Dodge' : 'Leave lobby');
      btn.onclick = () => { dodgeConfirming = true; renderDodge(); };
      wrap.appendChild(btn);
    }
    if (dodgeError) wrap.appendChild(el('p', 'ultk-error', dodgeError));
    setBody(wrap);
  }

  // ---- Invite friends ----
  const inviteState = { loaded: false, friends: [], selected: {}, busy: false, error: '' };
  function renderInvite() {
    const wrap = document.createElement('div');
    if (lastStatus.phase !== 'Lobby') {
      wrap.appendChild(el('p', 'ultk-muted', 'Create or join a lobby to invite friends.'));
      setBody(wrap);
      return;
    }
    if (!inviteState.loaded) {
      const btn = el('button', 'ultk-btn', 'Load friends');
      btn.onclick = () => {
        btn.disabled = true;
        api('/friends').then((data) => {
          inviteState.loaded = true;
          inviteState.friends = data.friends || [];
          renderInvite();
        }).catch((err) => {
          inviteState.error = err.message;
          renderInvite();
        });
      };
      wrap.appendChild(btn);
      if (inviteState.error) wrap.appendChild(el('p', 'ultk-error', inviteState.error));
      setBody(wrap);
      return;
    }

    const online = inviteState.friends.filter((f) => f.availability !== 'offline');
    if (online.length === 0) {
      wrap.appendChild(el('p', 'ultk-muted', 'No online friends to show.'));
    }
    online.forEach((friend) => {
      const row = el('label', 'ultk-row');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!inviteState.selected[friend.summonerId];
      checkbox.onchange = () => {
        if (checkbox.checked) inviteState.selected[friend.summonerId] = true;
        else delete inviteState.selected[friend.summonerId];
      };
      row.appendChild(checkbox);
      row.appendChild(document.createTextNode(' ' + friend.name));
      wrap.appendChild(row);
    });

    const selectedIds = Object.keys(inviteState.selected);
    const inviteBtn = el('button', 'ultk-btn', 'Invite selected (' + selectedIds.length + ')');
    inviteBtn.disabled = selectedIds.length === 0 || inviteState.busy;
    inviteBtn.onclick = () => {
      inviteState.busy = true;
      renderInvite();
      api('/invite-friends', { method: 'POST', body: JSON.stringify({ summonerIds: selectedIds.map(Number) }) })
        .then(() => {
          inviteState.selected = {};
          inviteState.busy = false;
          inviteState.error = '';
          renderInvite();
        })
        .catch((err) => {
          inviteState.error = err.message;
          inviteState.busy = false;
          renderInvite();
        });
    };
    wrap.appendChild(inviteBtn);
    if (inviteState.error) wrap.appendChild(el('p', 'ultk-error', inviteState.error));
    setBody(wrap);
  }

  // ---- Loot helper ----
  const lootState = { loaded: false, items: [], confirmId: null, busyId: null, error: '' };
  function isDisenchantable(item) {
    return !!item.disenchantRecipeName && item.disenchantValue !== null && item.disenchantValue !== undefined;
  }
  function renderLoot() {
    const wrap = document.createElement('div');
    if (!lootState.loaded) {
      const btn = el('button', 'ultk-btn', 'Load loot');
      btn.onclick = () => {
        btn.disabled = true;
        api('/loot').then((data) => {
          lootState.loaded = true;
          lootState.items = (data.items || []).filter(isDisenchantable);
          renderLoot();
        }).catch((err) => {
          lootState.error = err.message;
          renderLoot();
        });
      };
      wrap.appendChild(btn);
      if (lootState.error) wrap.appendChild(el('p', 'ultk-error', lootState.error));
      setBody(wrap);
      return;
    }

    if (lootState.items.length === 0) {
      wrap.appendChild(el('p', 'ultk-muted', 'Nothing disenchantable right now.'));
    }
    lootState.items.forEach((item) => {
      const row = el('div', 'ultk-row');
      row.appendChild(el('span', null, item.localizedName + ' x' + item.count));
      if (lootState.confirmId === item.lootId) {
        const confirmBtn = el('button', 'ultk-btn danger', 'Confirm');
        confirmBtn.disabled = lootState.busyId === item.lootId;
        confirmBtn.onclick = () => {
          lootState.busyId = item.lootId;
          renderLoot();
          const lootIds = new Array(item.count).fill(item.lootId);
          api('/disenchant-loot', { method: 'POST', body: JSON.stringify({ recipeName: item.disenchantRecipeName, lootIds: lootIds }) })
            .then((data) => {
              lootState.items = (data.items || []).filter(isDisenchantable);
              lootState.confirmId = null;
              lootState.busyId = null;
              lootState.error = '';
              renderLoot();
            })
            .catch((err) => {
              lootState.error = err.message;
              lootState.busyId = null;
              renderLoot();
            });
        };
        row.appendChild(confirmBtn);
      } else {
        const btn = el('button', 'ultk-btn secondary', 'Disenchant');
        btn.onclick = () => { lootState.confirmId = item.lootId; renderLoot(); };
        row.appendChild(btn);
      }
      wrap.appendChild(row);
    });
    if (lootState.error) wrap.appendChild(el('p', 'ultk-error', lootState.error));
    setBody(wrap);
  }

  function renderBody() {
    if (activeTab === 'dodge') renderDodge();
    else if (activeTab === 'invite') renderInvite();
    else renderLoot();
  }

  function pollStatus() {
    api('/status').then((data) => {
      lastStatus = data;
      renderBody();
    }).catch(() => {});
  }

  function openPanel() {
    panel.hidden = false;
    renderTabs();
    pollStatus();
    renderBody();
    if (!statusPollTimer) statusPollTimer = setInterval(pollStatus, 5000);
  }

  function closePanel() {
    panel.hidden = true;
    if (statusPollTimer) {
      clearInterval(statusPollTimer);
      statusPollTimer = null;
    }
  }

  fab.onclick = () => { if (panel.hidden) openPanel(); else closePanel(); };

  document.body.appendChild(fab);
  document.body.appendChild(panel);
})();`
}

export function buildToolsPackage(settings: Settings, baseUrl: string, token: string): string | null {
  if (!settings.injectedToolsEnabled) return null
  return buildToolsScript(baseUrl, token)
}
