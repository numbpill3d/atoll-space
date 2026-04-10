/**
 * isometric.js — iso projection math helpers
 *
 * atoll uses a standard 2:1 isometric projection.
 * world tiles map to screen diamonds.
 */

/**
 * convert iso grid coords to screen pixel coords
 * @param {number} col   tile column
 * @param {number} row   tile row
 * @param {number} tileW  tile width in px (full diamond width)
 * @param {number} tileH  tile height in px (full diamond height)
 * @param {number} originX  screen x of grid origin
 * @param {number} originY  screen y of grid origin
 * @returns {{ x: number, y: number }}  screen center of tile top face
 */
export function isoToScreen(col, row, tileW, tileH, originX = 0, originY = 0) {
  return {
    x: originX + (col - row) * (tileW / 2),
    y: originY + (col + row) * (tileH / 2),
  };
}

/**
 * convert screen coords back to iso grid coords (for hit-testing)
 * @returns {{ col: number, row: number }}  (may be fractional — floor to snap)
 */
export function screenToIso(sx, sy, tileW, tileH, originX = 0, originY = 0) {
  const relX = sx - originX;
  const relY = sy - originY;
  return {
    col: relX / tileW + relY / tileH,
    row: relY / tileH - relX / tileW,
  };
}

/**
 * draw a single isometric top-face diamond
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  center x
 * @param {number} cy  center y (top of diamond)
 * @param {number} tileW
 * @param {number} tileH
 * @param {string} fill
 * @param {string} stroke
 */
export function drawIsoDiamond(ctx, cx, cy, tileW, tileH, fill, stroke) {
  const hw = tileW / 2;
  const hh = tileH / 2;
  ctx.beginPath();
  ctx.moveTo(cx,      cy - hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx,      cy + hh);
  ctx.lineTo(cx - hw, cy);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/**
 * draw the left (west) vertical face of an iso tile
 */
export function drawIsoLeftFace(ctx, cx, cy, tileW, tileH, depth, fill, stroke) {
  const hw = tileW / 2;
  const hh = tileH / 2;
  ctx.beginPath();
  ctx.moveTo(cx - hw, cy);
  ctx.lineTo(cx,      cy + hh);
  ctx.lineTo(cx,      cy + hh + depth);
  ctx.lineTo(cx - hw, cy + depth);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/**
 * draw the right (east) vertical face of an iso tile
 */
export function drawIsoRightFace(ctx, cx, cy, tileW, tileH, depth, fill, stroke) {
  const hw = tileW / 2;
  const hh = tileH / 2;
  ctx.beginPath();
  ctx.moveTo(cx,      cy + hh);
  ctx.lineTo(cx + hw, cy);
  ctx.lineTo(cx + hw, cy + depth);
  ctx.lineTo(cx,      cy + hh + depth);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }
}

/**
 * returns the bounding box of an island cluster in screen space
 * @param {Array} tiles  [{ col, row }]
 * @param {number} tileW
 * @param {number} tileH
 * @param {number} depth  vertical face depth
 */
export function islandBounds(tiles, tileW, tileH, depth = 8, originX = 0, originY = 0) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  tiles.forEach(({ col, row }) => {
    const { x, y } = isoToScreen(col, row, tileW, tileH, originX, originY);
    minX = Math.min(minX, x - tileW / 2);
    minY = Math.min(minY, y - tileH / 2);
    maxX = Math.max(maxX, x + tileW / 2);
    maxY = Math.max(maxY, y + tileH / 2 + depth);
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}
