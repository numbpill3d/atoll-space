/**
 * AtollMap.js
 * orchestrates the ocean canvas: pan, zoom, island placement,
 * node dot overlay, connection lines, tag cluster labels,
 * tooltip and popup wiring
 */

import { Island }      from './Island.js';
import { NodeDot }     from './NodeDot.js';
import { Tooltip }     from './Tooltip.js';
import { Popup }       from './Popup.js';
import { islandStore } from '../store/islands.js';
import { dropStore }   from '../store/drops.js';

const WORLD_W = 3000;
const WORLD_H = 2000;

export class AtollMap {
  constructor() {
    this.canvas   = document.getElementById('ocean-canvas');
    this.ctx      = this.canvas.getContext('2d');
    this.nodeLayer = document.getElementById('node-layer');
    this.connLayer = document.getElementById('conn-layer');
    this.mapArea  = document.getElementById('map-area');

    this.pan      = { x: 0, y: 0 };
    this.dragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.panStart  = { x: 0, y: 0 };

    this.tooltip  = new Tooltip();
    this.popup    = new Popup();

    this._bindEvents();
    this._resize();
    window.addEventListener('resize', () => this._resize());

    this._startAmbientAnimation();
  }

  /** main render pass — call after data load */
  render() {
    this._drawOcean();
    this._drawConnections();
    this._placeNodes();
    this._placeTagLabels();
    this._updateStatusCount();
  }

  // ── ocean canvas ──────────────────────────

  _drawOcean() {
    const { width: W, height: H } = this.canvas;
    this.ctx.clearRect(0, 0, W, H);
    this.ctx.fillStyle = '#f5f4f0';
    this.ctx.fillRect(0, 0, W, H);

    // place islands
    const islands = islandStore.getAll();
    islands.forEach(idata => {
      const isl = new Island(idata);
      const sx = idata.x + this.pan.x;
      const sy = idata.y + this.pan.y;
      isl.draw(this.ctx, sx, sy);

      // label
      this.ctx.font = '9px "Share Tech Mono", monospace';
      this.ctx.fillStyle = idata.sinking > 0 ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.45)';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(idata.label, sx, sy + 38);
    });
  }

  // ── connections svg ───────────────────────

  _drawConnections() {
    while (this.connLayer.firstChild) this.connLayer.removeChild(this.connLayer.firstChild);

    const adjacencies = islandStore.getAdjacencies();
    adjacencies.forEach(({ a, b }) => {
      const ia = islandStore.getById(a);
      const ib = islandStore.getById(b);
      if (!ia || !ib) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', ia.x + this.pan.x);
      line.setAttribute('y1', ia.y + this.pan.y);
      line.setAttribute('x2', ib.x + this.pan.x);
      line.setAttribute('y2', ib.y + this.pan.y);
      line.setAttribute('class', 'conn-line');
      this.connLayer.appendChild(line);
    });
  }

  // ── node dots svg ─────────────────────────

  _placeNodes() {
    while (this.nodeLayer.firstChild) this.nodeLayer.removeChild(this.nodeLayer.firstChild);

    const drops = dropStore.getAll();
    drops.forEach(drop => {
      const island = islandStore.getById(drop.island_id);
      if (!island) return;

      const dot = new NodeDot(drop, island, this.pan);
      dot.appendTo(this.nodeLayer, {
        onHover: (x, y, d) => this.tooltip.show(x, y, d),
        onLeave: ()          => this.tooltip.hide(),
        onClick: (d)         => this.popup.open(d),
      });
    });
  }

  // ── tag cluster labels ────────────────────

  _placeTagLabels() {
    document.querySelectorAll('.tag-cluster-label').forEach(el => el.remove());

    const clusters = islandStore.getTagClusters();
    clusters.forEach(({ tag, cx, cy }) => {
      const el = document.createElement('div');
      el.className = 'tag-cluster-label';
      el.textContent = '#' + tag;
      el.style.left = (cx + this.pan.x) + 'px';
      el.style.top  = (cy + this.pan.y) + 'px';
      this.mapArea.appendChild(el);
    });
  }

  // ── pan & drag ────────────────────────────

  _bindEvents() {
    this.mapArea.addEventListener('mousedown', e => {
      if (e.target !== this.canvas && e.target !== this.mapArea) return;
      this.dragging = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.panStart  = { ...this.pan };
    });

    window.addEventListener('mousemove', e => {
      if (!this.dragging) return;
      this.pan.x = this.panStart.x + (e.clientX - this.dragStart.x);
      this.pan.y = this.panStart.y + (e.clientY - this.dragStart.y);
      this._clampPan();
      this.render();
      this._updateStatusCoords(e);
    });

    window.addEventListener('mouseup', () => { this.dragging = false; });

    this.mapArea.addEventListener('mousemove', e => {
      if (!this.dragging) this._updateStatusCoords(e);
    });
  }

  _clampPan() {
    const { width: W, height: H } = this.canvas;
    this.pan.x = Math.max(-(WORLD_W - W), Math.min(0, this.pan.x));
    this.pan.y = Math.max(-(WORLD_H - H), Math.min(0, this.pan.y));
  }

  // ── ambient ripple animation ──────────────

  _startAmbientAnimation() {
    const ripples = [
      { x: 0.12, y: 0.2,  r: 40, delay: 0   },
      { x: 0.85, y: 0.15, r: 30, delay: 1.8 },
      { x: 0.5,  y: 0.75, r: 50, delay: 0.9 },
      { x: 0.25, y: 0.6,  r: 35, delay: 2.5 },
      { x: 0.7,  y: 0.45, r: 45, delay: 0.4 },
    ];

    ripples.forEach(rp => {
      const el = document.createElement('div');
      el.className = 'water-ripple';
      const W = this.canvas.width, H = this.canvas.height;
      el.style.width  = (rp.r * 2) + 'px';
      el.style.height = (rp.r * 2) + 'px';
      el.style.left   = (rp.x * W) + 'px';
      el.style.top    = (rp.y * H) + 'px';
      el.style.marginLeft = (-rp.r) + 'px';
      el.style.marginTop  = (-rp.r) + 'px';
      el.style.animationDelay = rp.delay + 's';
      this.mapArea.appendChild(el);
    });
  }

  // ── helpers ───────────────────────────────

  _resize() {
    const rect = this.mapArea.getBoundingClientRect();
    this.canvas.width  = rect.width;
    this.canvas.height = rect.height;
    this.nodeLayer.setAttribute('width',  rect.width);
    this.nodeLayer.setAttribute('height', rect.height);
    this.connLayer.setAttribute('width',  rect.width);
    this.connLayer.setAttribute('height', rect.height);
    this.render();
  }

  _updateStatusCoords(e) {
    const rect = this.mapArea.getBoundingClientRect();
    const wx = Math.round(e.clientX - rect.left - this.pan.x);
    const wy = Math.round(e.clientY - rect.top  - this.pan.y);
    document.getElementById('s-coords').textContent = wx + ', ' + wy;
  }

  _updateStatusCount() {
    const n = islandStore.getAll().length;
    document.getElementById('s-count').textContent = n + ' island' + (n === 1 ? '' : 's');
  }
}
