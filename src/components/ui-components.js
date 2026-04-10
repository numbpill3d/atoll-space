/**
 * Tooltip.js — hover tooltip above node dots
 */
export class Tooltip {
  constructor() {
    this.el      = document.getElementById('tooltip');
    this.typeEl  = document.getElementById('tt-type');
    this.labelEl = document.getElementById('tt-label');
    this.statusEl = document.getElementById('s-hover');
  }

  show(clientX, clientY, drop) {
    const root = document.getElementById('app');
    const rect = root.getBoundingClientRect();
    this.el.style.left = (clientX - rect.left + 12) + 'px';
    this.el.style.top  = (clientY - rect.top - 36) + 'px';
    this.typeEl.textContent  = drop.type.toUpperCase();
    this.labelEl.textContent = drop.label || drop.content?.slice(0, 40) || '';
    this.el.classList.add('visible');
    if (this.statusEl) this.statusEl.textContent = drop.label || '--';
  }

  hide() {
    this.el.classList.remove('visible');
    if (this.statusEl) this.statusEl.textContent = '--';
  }
}


/**
 * Popup.js — node detail popup window
 */
export class Popup {
  constructor() {
    this.overlay  = document.getElementById('popup-overlay');
    this.titleEl  = document.getElementById('popup-title');
    this.metaEl   = document.getElementById('pop-meta');
    this.contentEl = document.getElementById('pop-content');
    this.linkWrap = document.getElementById('pop-link-wrap');
    this.linkEl   = document.getElementById('pop-link');
    this.tagsEl   = document.getElementById('pop-tags');

    document.getElementById('popup-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });
  }

  open(drop) {
    this.titleEl.textContent = drop.type.toUpperCase();
    this.metaEl.textContent  = drop.dropped_ago ?? '';
    this.contentEl.textContent = drop.content ?? '';

    if (drop.type === 'link' && drop.url) {
      this.linkEl.href = drop.url;
      this.linkEl.textContent = new URL(drop.url).hostname;
      this.linkWrap.removeAttribute('hidden');
    } else {
      this.linkWrap.setAttribute('hidden', '');
    }

    this.tagsEl.innerHTML = '';
    (drop.tags ?? []).forEach(t => {
      const tag = document.createElement('span');
      tag.className = 'pop-tag';
      tag.textContent = '#' + t;
      this.tagsEl.appendChild(tag);
    });

    this.overlay.classList.add('open');
    this.overlay.setAttribute('aria-hidden', 'false');
  }

  close() {
    this.overlay.classList.remove('open');
    this.overlay.setAttribute('aria-hidden', 'true');
  }
}


/**
 * DropForm.js — overlay form for dropping a new item
 */
export class DropForm {
  constructor() {
    this.overlay   = document.getElementById('drop-overlay');
    this.form      = document.getElementById('drop-form');
    this.activeType = 'link';

    document.getElementById('drop-form-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });

    document.querySelectorAll('.type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeType = btn.dataset.type;
        this._updateFieldVisibility();
      });
    });

    const textarea = document.getElementById('input-content');
    const counter  = document.getElementById('char-count');
    textarea.addEventListener('input', () => {
      counter.textContent = textarea.value.length + ' / 280';
    });

    this.form.addEventListener('submit', e => {
      e.preventDefault();
      this._submit();
    });
  }

  open() {
    this.overlay.classList.add('open');
    this.overlay.setAttribute('aria-hidden', 'false');
    this._updateFieldVisibility();
  }

  close() {
    this.overlay.classList.remove('open');
    this.overlay.setAttribute('aria-hidden', 'true');
  }

  _updateFieldVisibility() {
    const urlField     = document.getElementById('field-url');
    const contentField = document.getElementById('field-content');
    if (this.activeType === 'link') {
      urlField.style.display     = '';
      contentField.style.display = '';
      document.getElementById('input-url').placeholder = 'https://';
      document.getElementById('input-content').placeholder = 'a short description (optional)';
    } else if (this.activeType === 'thought') {
      urlField.style.display     = 'none';
      contentField.style.display = '';
      document.getElementById('input-content').placeholder = 'a thought, max 280 chars';
    } else {
      urlField.style.display     = 'none';
      contentField.style.display = 'none';
      // flower — pixel editor would go here
    }
  }

  async _submit() {
    const { dropStore } = await import('../store/drops.js');
    const tags = document.getElementById('input-tags').value
      .split(' ').map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    const payload = {
      type:    this.activeType,
      url:     document.getElementById('input-url')?.value || null,
      content: document.getElementById('input-content')?.value || null,
      tags,
    };

    await dropStore.create(payload);
    this.close();
    this.form.reset();
    document.getElementById('char-count').textContent = '0 / 280';
  }
}


/**
 * Minimap.js — small overview in bottom-left corner
 */
export class Minimap {
  constructor() {
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx    = this.canvas.getContext('2d');
    this.W      = this.canvas.width;
    this.H      = this.canvas.height;
    this.WORLD_W = 3000;
    this.WORLD_H = 2000;
  }

  render(pan = { x: 0, y: 0 }) {
    const { W, H, ctx } = this;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f0efeb';
    ctx.fillRect(0, 0, W, H);

    const { islandStore } = window._atoll ?? {};
    if (!islandStore) {
      this._lazyRender(pan);
      return;
    }
    this._draw(islandStore.getAll(), pan);
  }

  async _lazyRender(pan) {
    const { islandStore } = await import('../store/islands.js');
    this._draw(islandStore.getAll(), pan);
  }

  _draw(islands, pan) {
    const { W, H, ctx } = this;
    const scaleX = W / this.WORLD_W;
    const scaleY = H / this.WORLD_H;

    islands.forEach(i => {
      ctx.fillStyle = i.sinking > 0 ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.5)';
      const mx = i.x * scaleX;
      const my = i.y * scaleY;
      ctx.fillRect(mx - 2, my - 1, 6, 3);
    });

    // viewport rect
    const vx = (-pan.x) * scaleX;
    const vy = (-pan.y) * scaleY;
    const vw = (window.innerWidth)  * scaleX;
    const vh = (window.innerHeight) * scaleY;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }
}
