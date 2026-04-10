/**
 * pixel.js — 1-bit pixel art helpers
 *
 * used for the "flower" drop type —
 * a 16x16 monochrome pixel grid the user draws.
 */

export const GRID_SIZE = 16;

/**
 * create an empty 16×16 pixel grid (all 0)
 * @returns {Uint8Array}
 */
export function createGrid() {
  return new Uint8Array(GRID_SIZE * GRID_SIZE);
}

/**
 * get pixel value at (x, y)
 * @param {Uint8Array} grid
 * @returns {0|1}
 */
export function getPixel(grid, x, y) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return 0;
  return grid[y * GRID_SIZE + x];
}

/**
 * set pixel value at (x, y)
 * @param {Uint8Array} grid
 * @param {0|1} value
 */
export function setPixel(grid, x, y, value) {
  if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
  grid[y * GRID_SIZE + x] = value ? 1 : 0;
}

/**
 * serialise grid to compact hex string for storage
 * 16×16 = 256 bits = 32 hex bytes
 * @param {Uint8Array} grid
 * @returns {string}  64-char hex string
 */
export function gridToHex(grid) {
  let result = '';
  for (let i = 0; i < grid.length; i += 8) {
    let byte = 0;
    for (let b = 0; b < 8; b++) {
      if (grid[i + b]) byte |= (1 << (7 - b));
    }
    result += byte.toString(16).padStart(2, '0');
  }
  return result;
}

/**
 * deserialise hex string back to grid
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function hexToGrid(hex) {
  const grid = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (let i = 0; i < 32; i++) {
    const byte = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    for (let b = 0; b < 8; b++) {
      grid[i * 8 + b] = (byte >> (7 - b)) & 1;
    }
  }
  return grid;
}

/**
 * render a 1-bit grid to a canvas context
 * @param {CanvasRenderingContext2D} ctx
 * @param {Uint8Array} grid
 * @param {number} cellSize  px per pixel
 * @param {number} ox  x offset
 * @param {number} oy  y offset
 * @param {string} inkColor    default '#1a1a1a'
 * @param {string} paperColor  default 'transparent'
 */
export function renderGrid(ctx, grid, cellSize = 2, ox = 0, oy = 0, inkColor = '#1a1a1a', paperColor = 'transparent') {
  if (paperColor !== 'transparent') {
    ctx.fillStyle = paperColor;
    ctx.fillRect(ox, oy, GRID_SIZE * cellSize, GRID_SIZE * cellSize);
  }
  ctx.fillStyle = inkColor;
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      if (grid[y * GRID_SIZE + x]) {
        ctx.fillRect(ox + x * cellSize, oy + y * cellSize, cellSize, cellSize);
      }
    }
  }
}

/**
 * built-in flower seed patterns (shown as suggestions in the draw UI)
 */
export const SEEDS = {
  blank: '0000000000000000000000000000000000000000000000000000000000000000',

  daisy: (() => {
    const g = createGrid();
    const center = 7;
    // petals
    [[center,center-3],[center,center+3],[center-3,center],[center+3,center],
     [center-2,center-2],[center+2,center-2],[center-2,center+2],[center+2,center+2]].forEach(([x,y]) => {
      setPixel(g, x, y, 1); setPixel(g, x+1, y, 1); setPixel(g, x, y+1, 1);
    });
    // centre
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) setPixel(g, center+dx, center+dy, 1);
    return gridToHex(g);
  })(),

  leaf: (() => {
    const g = createGrid();
    for (let i = 2; i <= 13; i++) { setPixel(g, i, 14-i+2, 1); setPixel(g, i, 15-i+2, 1); }
    for (let i = 2; i <= 7;  i++) setPixel(g, i+1, 14-i+2, 1);
    return gridToHex(g);
  })(),
};
