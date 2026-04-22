/**
 * atoll.space — main.js
 * entry point: initialises session, map, and event routing
 */

import { AtollMap }  from './components/AtollMap.js';
import { DropForm, Minimap } from './components/ui-components.js';
import { session }   from './store/session.js';
import { islandStore } from './store/islands.js';
import { dropStore }   from './store/drops.js';

// ── view routing ────────────────────────────

const views = {
  map:    document.getElementById('map-view'),
  island: document.getElementById('island-view'),
  nearby: document.getElementById('nearby-view'),
  about:  document.getElementById('about-view'),
};

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const v = link.dataset.view;
    if (!views[v]) return;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    Object.values(views).forEach(el => el?.classList.remove('active'));
    views[v].classList.add('active');

    if (v === 'island') populateIslandView();
    if (v === 'nearby') populateNearbyView();
  });
});

// ── initialise subsystems ────────────────────

const map      = new AtollMap();
const dropForm = new DropForm();
const minimap  = new Minimap();

// ── drop button ──────────────────────────────

function openDropOrAuth() {
  if (session.isAuthenticated()) {
    dropForm.open();
  } else {
    document.getElementById('auth-overlay').classList.remove('dismissed');
  }
}

document.getElementById('drop-btn-map').addEventListener('click', openDropOrAuth);
document.getElementById('drop-trigger')?.addEventListener('click', openDropOrAuth);

// ── map bootstrap (runs immediately, independent of auth) ────

let _mapLoaded = false;

async function _loadMap() {
  if (_mapLoaded) return;
  _mapLoaded = true;
  try {
    await islandStore.loadPublic();
  } catch (e) {
    console.error('[atoll] loadPublic failed', e);
  }
  map.render();
  minimap.render(map.pan);
  _wireRealtimeDrift();
}

_loadMap();

// ── auth flow ────────────────────────────────

session.init().then(user => {
  if (user) _onSignedIn(user);
}).catch(e => console.error('[atoll] session init failed', e));

document.getElementById('auth-explore').addEventListener('click', () => {
  document.getElementById('auth-overlay').classList.add('dismissed');
});

document.getElementById('auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const name     = document.getElementById('auth-island-name').value.trim();
  const hint     = document.getElementById('auth-hint');
  if (!email || !password) return;
  hint.textContent = 'signing in...';
  const { error } = await session.signIn(email, password, name);
  if (error) {
    const msg = error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential'
      ? 'wrong password.'
      : (error.message ?? 'something went wrong. try again.');
    hint.textContent = msg;
  } else {
    _onSignedIn(session.user);
  }
});

document.getElementById('auth-signout')?.addEventListener('click', async () => {
  await session.signOut();
  document.getElementById('s-auth').textContent = 'not signed in';
  document.getElementById('auth-overlay').classList.remove('dismissed');
  // clear island view
  document.getElementById('island-name-display').textContent = '---';
  document.getElementById('island-drops-list').innerHTML = '';
});

// ── realtime drift ───────────────────────────

function _wireRealtimeDrift() {
  islandStore.subscribe(() => {
    map.render();
    minimap.render(map.pan);
  });
}

// ── signed-in state ──────────────────────────

function _onSignedIn(user) {
  document.getElementById('auth-overlay').classList.add('dismissed');
  document.getElementById('s-auth').textContent = user.island_label || 'signed in';
  const signout = document.getElementById('auth-signout');
  if (signout) signout.style.display = '';
}

// ── island view (YOURS) ──────────────────────

function populateIslandView() {
  const user = session.user;
  const nameEl = document.getElementById('island-name-display');
  const list   = document.getElementById('island-drops-list');
  const sinkEl = document.getElementById('island-sink-status');

  if (!user) {
    nameEl.textContent  = '---';
    list.innerHTML      = '<p class="iv-empty">sign in to see your island</p>';
    if (sinkEl) sinkEl.textContent = '';
    return;
  }

  nameEl.textContent = user.island_label || '---';

  const island = user.island_id ? islandStore.getById(user.island_id) : null;
  if (island && sinkEl) {
    const sinkLabels = ['alive', 'fading', 'ghost'];
    sinkEl.textContent = sinkLabels[island.sinking] || '';
    sinkEl.dataset.sinking = island.sinking;
  }

  const drops = user.island_id ? dropStore.getByIsland(user.island_id) : [];

  list.innerHTML = '';

  if (drops.length === 0) {
    list.innerHTML = '<p class="iv-empty">no drops yet — drop something.</p>';
    return;
  }

  const SYM = { link: '□', thought: '○', flower: '✦', image: '▷' };

  drops.slice().reverse().forEach(drop => {
    const item = document.createElement('div');
    item.className = 'iv-drop';

    const tags = (drop.tags ?? []).map(t => `<span class="iv-tag">#${t}</span>`).join('');

    item.innerHTML =
      `<span class="iv-sym">${SYM[drop.type] || '?'}</span>` +
      `<div class="iv-body">` +
        `<span class="iv-content">${_escape(drop.label || drop.content?.slice(0, 80) || '---')}</span>` +
        (tags ? `<div class="iv-tags">${tags}</div>` : '') +
      `</div>` +
      `<span class="iv-time">${drop.dropped_ago || ''}</span>`;

    item.addEventListener('click', () => {
      // navigate to drop's island on map
      const isl = islandStore.getById(drop.island_id);
      if (isl) {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelector('[data-view="map"]').classList.add('active');
        Object.values(views).forEach(el => el?.classList.remove('active'));
        views.map.classList.add('active');
        map.panTo(isl.x, isl.y);
      }
    });

    list.appendChild(item);
  });
}

// ── nearby view ──────────────────────────────

function populateNearbyView() {
  const container = document.getElementById('nearby-list');
  container.innerHTML = '';

  const islands     = islandStore.getAll();
  const adjacencies = islandStore.getAdjacencies();

  // build a shared-tag-strength map per island
  const strength = {};
  adjacencies.forEach(({ a, b, shared }) => {
    if (!strength[a]) strength[a] = { count: 0, shared: new Set() };
    if (!strength[b]) strength[b] = { count: 0, shared: new Set() };
    strength[a].count += shared.length;
    strength[b].count += shared.length;
    shared.forEach(t => { strength[a].shared.add(t); strength[b].shared.add(t); });
  });

  const alive = islands.filter(i => i.sinking < 2);

  if (alive.length === 0) {
    container.innerHTML = '<p class="iv-empty">the ocean is quiet.</p>';
    return;
  }

  // sort by connection strength, then recency
  const sorted = [...alive].sort((a, b) => {
    const ca = strength[a.id]?.count ?? 0;
    const cb = strength[b.id]?.count ?? 0;
    if (cb !== ca) return cb - ca;
    return (a.age_days ?? 999) - (b.age_days ?? 999);
  });

  sorted.forEach(island => {
    const str  = strength[island.id];
    const tags = str ? [...str.shared].slice(0, 5) : [];

    const item = document.createElement('div');
    item.className = 'nb-island';

    const sinkCls = island.sinking === 1 ? ' nb-fading' : island.sinking === 2 ? ' nb-ghost' : '';
    item.classList.add(...(sinkCls.trim() ? sinkCls.trim().split(' ') : []));

    item.innerHTML =
      `<span class="nb-name">${_escape(island.label)}</span>` +
      `<span class="nb-tags">${tags.map(t => '#' + t).join(' ')}</span>` +
      `<span class="nb-age">${island.age_days}d</span>`;

    item.addEventListener('click', () => {
      // navigate to this island on the map
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      document.querySelector('[data-view="map"]').classList.add('active');
      Object.values(views).forEach(el => el?.classList.remove('active'));
      views.map.classList.add('active');
      map.panTo(island.x, island.y);
    });

    container.appendChild(item);
  });
}

// ── util ─────────────────────────────────────

function _escape(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
