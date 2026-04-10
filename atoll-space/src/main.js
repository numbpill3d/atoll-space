/**
 * atoll.space — main.js
 * entry point: initialises session, map, and event routing
 */

import { AtollMap } from './components/AtollMap.js';
import { DropForm } from './components/DropForm.js';
import { Popup }    from './components/Popup.js';
import { Minimap }  from './components/Minimap.js';
import { session }  from './store/session.js';
import { islandStore } from './store/islands.js';
import { dropStore }   from './store/drops.js';

// ── view routing ────────────────────────────

const views = {
  map:    document.getElementById('map-view'),
  island: document.getElementById('island-view'),
  about:  document.getElementById('about-view'),
};

document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const v = link.dataset.view;
    if (!views[v]) return;
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    Object.values(views).forEach(el => el.classList.remove('active'));
    views[v].classList.add('active');
  });
});

// ── initialise subsystems ────────────────────

const map     = new AtollMap();
const dropForm = new DropForm();
const popup   = new Popup();
const minimap = new Minimap();

// ── drop buttons ────────────────────────────

document.getElementById('drop-btn-map').addEventListener('click', () => dropForm.open());
document.getElementById('drop-trigger')?.addEventListener('click', () => dropForm.open());

// ── auth check ──────────────────────────────

session.init().then(user => {
  if (user) {
    document.getElementById('s-auth').textContent = user.island_label || 'signed in';
    document.getElementById('auth-overlay').classList.add('dismissed');
  }
});

document.getElementById('auth-explore').addEventListener('click', () => {
  document.getElementById('auth-overlay').classList.add('dismissed');
  islandStore.loadPublic().then(() => map.render());
});

document.getElementById('auth-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim();
  const name  = document.getElementById('auth-island-name').value.trim();
  const hint  = document.getElementById('auth-hint');
  if (!email) return;
  hint.textContent = 'sending magic link...';
  const { error } = await session.sendMagicLink(email, name);
  hint.textContent = error ? 'something went wrong. try again.' : 'check your email.';
});

// ── initial load ─────────────────────────────

islandStore.loadPublic().then(() => {
  map.render();
  minimap.render();
});
