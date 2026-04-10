/**
 * Island.js
 * draws a single isometric 1-bit island onto a canvas context
 * and returns the bounding box for hit-testing
 */

export class Island {
  /**
   * @param {Object} data  island row from db
   * @param {number} data.x
   * @param {number} data.y
   * @param {number} data.size   0.5–1.5 scale multiplier
   * @param {number} data.opacity  0–1 (sinking state)
   * @param {string} data.label
   * @param {number} data.sinking  0=alive 1=fading 2=ghost
   */
  constructor(data) {
    this.data = data;
  }

  /**
   * returns a set of tile positions for the island shape.
   * islands are defined as a mask of isometric tiles.
   * each tile is a diamond shape in iso projection.
   *
   * mask[row][col] = 1 means tile exists
   * different sizes get different mask shapes
   */
  getTileMask() {
    const s = Math.round(this.data.size * 10);

    if (s <= 6) {
      // tiny 2×3 island
      return [
        [0,1,0],
        [1,1,1],
      ];
    } else if (s <= 9) {
      // small 3×4
      return [
        [0,1,1,0],
        [1,1,1,1],
        [0,1,1,0],
      ];
    } else {
      // standard 4×6
      return [
        [0,0,1,1,0,0],
        [0,1,1,1,1,0],
        [1,1,1,1,1,1],
        [0,1,1,1,1,0],
      ];
    }
  }

  /**
   * draws the island onto a canvas 2d context
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenX  center x on canvas
   * @param {number} screenY  center y on canvas
   */
  draw(ctx, screenX, screenY) {
    const mask   = this.getTileMask();
    const scale  = this.data.size;
    const op     = this.data.opacity ?? 1;

    const tw = Math.round(18 * scale); // tile width (iso diamond)
    const th = Math.round(9  * scale); // tile height (iso diamond half)
    const rows = mask.length;
    const cols = mask[0].length;

    // offset so island is centered on screenX/screenY
    const totalW = (cols + rows) * tw / 2;
    const totalH = (cols + rows) * th / 2;
    const ox = screenX - totalW / 2;
    const oy = screenY - totalH / 2;

    ctx.save();
    ctx.globalAlpha = op;

    // shadow pass
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!mask[r][c]) continue;
        const { x, y } = isoProject(r, c, tw, th, ox, oy);
        drawTile(ctx, x + 2, y + 2, tw, th, 'rgba(0,0,0,0.06)', 'transparent');
      }
    }

    // tile pass — top faces with slight shading variation
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!mask[r][c]) continue;
        const { x, y } = isoProject(r, c, tw, th, ox, oy);

        // shade: top row lighter, bottom row darker
        const shade = r === 0 ? '#d0cfca'
                    : r === rows - 1 ? '#b5b4ae'
                    : '#c4c3bd';

        drawTile(ctx, x, y, tw, th, shade, '#999');

        // left face (darker)
        drawLeftFace(ctx, x, y, tw, th, '#a8a7a1', '#999');

        // right face (mid)
        drawRightFace(ctx, x, y, tw, th, '#bab9b3', '#999');
      }
    }

    ctx.restore();
  }

  /** returns approximate bounding circle for hover detection */
  getBounds(screenX, screenY) {
    const scale = this.data.size;
    const tw = Math.round(18 * scale);
    const mask = this.getTileMask();
    const r = (mask[0].length * tw) / 2 + 4;
    return { cx: screenX, cy: screenY, r };
  }
}

// ── iso helpers ─────────────────────────────

function isoProject(row, col, tw, th, ox, oy) {
  const x = (col - row) * (tw / 2) + ox + (/* center offset */ tw * 0.5);
  const y = (col + row) * (th / 2) + oy;
  return { x, y };
}

function drawTile(ctx, cx, cy, tw, th, fill, stroke) {
  const hw = tw / 2, hh = th / 2;
  ctx.beginPath();
  ctx.moveTo(cx,       cy - hh);
  ctx.lineTo(cx + hw,  cy);
  ctx.lineTo(cx,       cy + hh);
  ctx.lineTo(cx - hw,  cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke !== 'transparent') {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

function drawLeftFace(ctx, cx, cy, tw, th, fill, stroke) {
  const hw = tw / 2, hh = th / 2;
  const depth = Math.round(th * 0.7);
  ctx.beginPath();
  ctx.moveTo(cx - hw,  cy);
  ctx.lineTo(cx,       cy + hh);
  ctx.lineTo(cx,       cy + hh + depth);
  ctx.lineTo(cx - hw,  cy + depth);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

function drawRightFace(ctx, cx, cy, tw, th, fill, stroke) {
  const hw = tw / 2, hh = th / 2;
  const depth = Math.round(th * 0.7);
  ctx.beginPath();
  ctx.moveTo(cx,       cy + hh);
  ctx.lineTo(cx + hw,  cy);
  ctx.lineTo(cx + hw,  cy + depth);
  ctx.lineTo(cx,       cy + hh + depth);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.5;
  ctx.stroke();
}
