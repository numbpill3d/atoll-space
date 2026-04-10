/**
 * NodeDot.js
 * SVG node dot for a dropped item — handles shape, hover, click
 */

export class NodeDot {
  constructor(drop, island, pan) {
    this.drop   = drop;
    this.island = island;
    this.pan    = pan;
  }

  appendTo(svgEl, { onHover, onLeave, onClick }) {
    const sx = this.island.x + this.pan.x + (this.drop.offset_x ?? 0);
    const sy = this.island.y + this.pan.y + (this.drop.offset_y ?? 0);

    const el = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    el.setAttribute('class', 'node-dot-group');
    el.setAttribute('transform', `translate(${sx},${sy})`);
    el.style.cursor = 'pointer';

    const shape = this._makeShape();
    el.appendChild(shape);

    el.addEventListener('mouseenter', e => onHover(e.clientX, e.clientY, this.drop));
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('click', e => { e.stopPropagation(); onClick(this.drop); });

    svgEl.appendChild(el);
  }

  _makeShape() {
    const ns   = 'http://www.w3.org/2000/svg';
    const type = this.drop.type;

    let el;
    if (type === 'thought') {
      el = document.createElementNS(ns, 'circle');
      el.setAttribute('r', '4');
    } else if (type === 'flower') {
      el = document.createElementNS(ns, 'polygon');
      el.setAttribute('points', '0,-5 1.8,-1.2 5.3,-1.6 2.8,1.5 3.9,5 0,2.8 -3.9,5 -2.8,1.5 -5.3,-1.6 -1.8,-1.2');
    } else if (type === 'image') {
      el = document.createElementNS(ns, 'polygon');
      el.setAttribute('points', '-4,-4 4,-4 4,2 2,4 -4,4');
    } else {
      // link — square
      el = document.createElementNS(ns, 'rect');
      el.setAttribute('x', '-4');
      el.setAttribute('y', '-4');
      el.setAttribute('width', '8');
      el.setAttribute('height', '8');
    }

    el.setAttribute('fill', '#f5f4f0');
    el.setAttribute('stroke', '#1a1a1a');
    el.setAttribute('stroke-width', '1');
    el.style.transition = 'fill 80ms';

    el.addEventListener('mouseenter', () => { el.setAttribute('fill', '#1a1a1a'); });
    el.addEventListener('mouseleave', () => { el.setAttribute('fill', '#f5f4f0'); });

    return el;
  }
}
