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
    this.overlay   = document.getElementById('popup-overlay');
    this.titleEl   = document.getElementById('popup-title');
    this.islandEl  = document.getElementById('pop-island');
    this.metaEl    = document.getElementById('pop-meta');
    this.contentEl = document.getElementById('pop-content');
    this.linkWrap  = document.getElementById('pop-link-wrap');
    this.linkEl    = document.getElementById('pop-link');
    this.tagsEl    = document.getElementById('pop-tags');
    this.pixelEl   = document.getElementById('pop-pixel');

    document.getElementById('popup-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.close();
    });
  }

  open(drop) {
    this.titleEl.textContent  = drop.type.toUpperCase();
    this.islandEl.textContent = drop._islandLabel ? '@ ' + drop._islandLabel : '';
    this.metaEl.textContent   = drop.dropped_ago ?? '';
    this.pixelEl.innerHTML    = '';

    if (drop.type === 'flower' && drop.content) {
      // render pixel art
      import('../utils/pixel.js').then(({ hexToGrid, renderGrid }) => {
        const grid   = hexToGrid(drop.content);
        const canvas = document.createElement('canvas');
        canvas.width  = 16 * 8;
        canvas.height = 16 * 8;
        canvas.style.imageRendering = 'pixelated';
        renderGrid(canvas.getContext('2d'), grid, 8, 0, 0, '#1a1a1a', '#f5f4f0');
        this.pixelEl.appendChild(canvas);
        this.contentEl.textContent = '';
      });
    } else {
      this.contentEl.textContent = drop.content ?? '';
    }

    if (drop.type === 'link' && drop.url) {
      this.linkEl.href = drop.url;
      try { this.linkEl.textContent = new URL(drop.url).hostname; }
      catch { this.linkEl.textContent = drop.url; }
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
    this.overlay    = document.getElementById('drop-overlay');
    this.form       = document.getElementById('drop-form');
    this.activeType = 'link';
    this.pixelGrid  = null;   // Uint8Array grid for flower type

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
    const pixelField   = document.getElementById('field-pixel');

    if (this.activeType === 'link') {
      urlField.style.display     = '';
      contentField.style.display = '';
      pixelField.style.display   = 'none';
      document.getElementById('input-url').placeholder = 'https://';
      document.getElementById('input-content').placeholder = 'a short description (optional)';
    } else if (this.activeType === 'thought') {
      urlField.style.display     = 'none';
      contentField.style.display = '';
      pixelField.style.display   = 'none';
      document.getElementById('input-content').placeholder = 'a thought, max 280 chars';
    } else {
      // flower — pixel art editor
      urlField.style.display     = 'none';
      contentField.style.display = 'none';
      pixelField.style.display   = '';
      this._initPixelEditor();
    }
  }

  async _initPixelEditor() {
    const { createGrid, renderGrid, getPixel, setPixel } = await import('../utils/pixel.js');
    const fieldEl  = document.getElementById('field-pixel');
    const existing = fieldEl.querySelector('.pixel-editor');
    if (existing) return; // already built

    if (!this.pixelGrid) this.pixelGrid = createGrid();

    const CELL = 10;
    const SIZE = 16;
    const canvas = document.createElement('canvas');
    canvas.width  = SIZE * CELL;
    canvas.height = SIZE * CELL;
    canvas.className = 'pixel-editor';
    canvas.style.imageRendering = 'pixelated';
    canvas.style.cursor = 'crosshair';
    canvas.style.display = 'block';
    canvas.style.border  = '1px solid #1a1a1a';

    const redraw = () => {
      renderGrid(canvas.getContext('2d'), this.pixelGrid, CELL, 0, 0, '#1a1a1a', '#f5f4f0');
      // draw grid lines
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE * CELL); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE * CELL, i * CELL); ctx.stroke();
      }
    };

    let painting = false;
    let paintValue = 1;

    const getCell = e => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.floor((e.clientX - rect.left) / CELL),
        y: Math.floor((e.clientY - rect.top)  / CELL),
      };
    };

    canvas.addEventListener('mousedown', e => {
      const { x, y } = getCell(e);
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
      painting   = true;
      paintValue = getPixel(this.pixelGrid, x, y) ? 0 : 1;
      setPixel(this.pixelGrid, x, y, paintValue);
      redraw();
    });

    canvas.addEventListener('mousemove', e => {
      if (!painting) return;
      const { x, y } = getCell(e);
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
      setPixel(this.pixelGrid, x, y, paintValue);
      redraw();
    });

    window.addEventListener('mouseup', () => { painting = false; });

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn-ghost pixel-clear';
    clearBtn.textContent = 'CLEAR';
    clearBtn.style.marginTop = '6px';
    clearBtn.style.fontSize  = '9px';
    clearBtn.addEventListener('click', () => {
      this.pixelGrid = createGrid();
      redraw();
    });

    fieldEl.appendChild(canvas);
    fieldEl.appendChild(clearBtn);
    redraw();
  }

  async _submit() {
    const { dropStore } = await import('../store/drops.js');

    const tags = document.getElementById('input-tags').value
      .split(/\s+/).map(t => t.trim().replace(/^#/, '')).filter(Boolean);

    let content = null;

    if (this.activeType === 'flower') {
      const { gridToHex } = await import('../utils/pixel.js');
      content = this.pixelGrid ? gridToHex(this.pixelGrid) : null;
    } else {
      content = document.getElementById('input-content')?.value || null;
    }

    const payload = {
      type:    this.activeType,
      url:     document.getElementById('input-url')?.value || null,
      content,
      tags,
    };

    try {
      await dropStore.create(payload);
      this.close();
      this.form.reset();
      this.pixelGrid = null;
      // clear pixel editor so it rebuilds fresh next open
      const fieldEl = document.getElementById('field-pixel');
      fieldEl.innerHTML = '';
      document.getElementById('char-count').textContent = '0 / 280';
    } catch (err) {
      console.error('[DropForm] submit error', err);
      const hint = document.getElementById('drop-form-hint');
      if (hint) hint.textContent = err.message ?? 'something went wrong.';
    }
  }
}


/**
 * Minimap.js — small overview in bottom-left corner
 */
export class Minimap {
  constructor() {
    this.canvas  = document.getElementById('minimap-canvas');
    this.ctx     = this.canvas.getContext('2d');
    this.W       = this.canvas.width;
    this.H       = this.canvas.height;
    this.WORLD_W = 3000;
    this.WORLD_H = 2000;
  }

  async render(pan = { x: 0, y: 0 }) {
    const { islandStore } = await import('../store/islands.js');
    this._draw(islandStore.getAll(), pan);
  }

  _draw(islands, pan) {
    const { W, H, ctx } = this;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#f0efeb';
    ctx.fillRect(0, 0, W, H);

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
    const vw = window.innerWidth  * scaleX;
    const vh = window.innerHeight * scaleY;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth   = 0.5;
    ctx.strokeRect(vx, vy, vw, vh);
  }
}
