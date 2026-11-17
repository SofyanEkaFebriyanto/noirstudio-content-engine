/**
 * Pixel raster core — the mascot is PIXEL ART, not smooth vector.
 *
 * Every shape the mascot draws is built from axis-aligned rectangles
 * snapped to a 4-unit grid (one grid cell = one visible pixel), rendered
 * with shapeRendering="crispEdges" so nothing is anti-aliased. Curves
 * (head, hood, eyes, shoes, headphone band) are stepped-row
 * approximations; diagonals are staircases. All functions here are pure
 * and deterministic: no Math.random, no Date.
 *
 * Coordinate space is the mascot viewBox 0 0 240 320, so the grid is
 * 60 x 80 pixels. At the 1080px-wide reel render one pixel is ~18 screen
 * px — chunky and unmistakably pixel art, like the reference pose sheet.
 */

/** One mascot pixel, in mascot units. All rects are multiples of this. */
export const PX = 4;

/** One grid-aligned rectangle, in mascot units. */
export type PxRect = { x: number; y: number; w: number; h: number };

/** Snap a coordinate down to the grid. */
export const snapDown = (n: number): number => Math.floor(n / PX) * PX;
/** Snap a coordinate up to the grid. */
export const snapUp = (n: number): number => Math.ceil(n / PX) * PX;
/** Snap a coordinate to the nearest grid line. */
export const snap = (n: number): number => Math.round(n / PX) * PX;

/** A single grid-aligned rectangle. */
export function block(x: number, y: number, w: number, h: number): PxRect {
  return { x: snap(x), y: snap(y), w: Math.max(PX, snap(w)), h: Math.max(PX, snap(h)) };
}

/**
 * Stepped rows of a filled ellipse (disc) centred at (cx, cy) with radii
 * (rx, ry). One row per pixel, each row a single rectangle — the classic
 * pixel-art circle: wide in the middle, stepping in toward the poles.
 */
export function discRows(cx: number, cy: number, rx: number, ry: number): PxRect[] {
  const rows: PxRect[] = [];
  const y0 = snapDown(cy - ry);
  const y1 = snapUp(cy + ry);
  for (let y = y0; y < y1; y += PX) {
    const midY = y + PX / 2;
    const dy = (midY - cy) / ry;
    if (Math.abs(dy) >= 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const x0 = snapDown(cx - half);
    const x1 = snapUp(cx + half);
    rows.push({ x: x0, y, w: x1 - x0, h: PX });
  }
  return rows;
}

/**
 * Stepped rows of an elliptical ring: the outer disc minus the inner
 * disc, `t` thick (in mascot units). Pass `topOnly` to keep only rows
 * above the centre line (headphone band, hood rim arc).
 */
export function ringRows(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  t: number,
  topOnly = false,
): PxRect[] {
  const rows: PxRect[] = [];
  const y0 = snapDown(cy - ry);
  const y1 = snapUp(cy + ry);
  for (let y = y0; y < y1; y += PX) {
    const midY = y + PX / 2;
    if (topOnly && midY > cy + PX / 2) continue;
    const dy = (midY - cy) / ry;
    if (Math.abs(dy) >= 1) continue;
    const half = rx * Math.sqrt(1 - dy * dy);
    const x0 = snapDown(cx - half);
    const x1 = snapUp(cx + half);
    const dyIn = (midY - cy) / (ry - t);
    let ix0 = x0;
    let ix1 = x1;
    if (Math.abs(dyIn) < 1) {
      const halfIn = (rx - t) * Math.sqrt(1 - dyIn * dyIn);
      ix0 = snapUp(cx - halfIn);
      ix1 = snapDown(cx + halfIn);
    }
    if (ix0 > x0) rows.push({ x: x0, y, w: ix0 - x0, h: PX });
    if (ix1 < x1) rows.push({ x: ix1, y, w: x1 - ix1, h: PX });
  }
  return rows;
}

/**
 * A thick line from (x0, y0) to (x1, y1), `wPx` pixels wide, rasterized
 * as a staircase of square pixel blocks merged into horizontal runs.
 * This is how every limb is drawn: a diagonal limb is a staircase, never
 * a smooth anti-aliased stroke — that is what makes it read as pixel art
 * instead of a bent stick.
 */
export function thickLine(x0: number, y0: number, x1: number, y1: number, wPx: number): PxRect[] {
  const gx0 = Math.round(x0 / PX);
  const gy0 = Math.round(y0 / PX);
  const gx1 = Math.round(x1 / PX);
  const gy1 = Math.round(y1 / PX);
  const dx = gx1 - gx0;
  const dy = gy1 - gy0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const half = Math.floor(wPx / 2);
  const cells = new Set<string>();
  for (let i = 0; i <= steps; i++) {
    const cx = Math.round(gx0 + (dx * i) / steps);
    const cy = Math.round(gy0 + (dy * i) / steps);
    for (let ox = -half; ox <= half; ox++) {
      for (let oy = -half; oy <= half; oy++) {
        cells.add(`${cx + ox},${cy + oy}`);
      }
    }
  }
  // Merge each row's cells into horizontal runs.
  const byRow = new Map<number, number[]>();
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number);
    const row = byRow.get(y);
    if (row) row.push(x);
    else byRow.set(y, [x]);
  }
  const rects: PxRect[] = [];
  for (const [y, xs] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b);
    let start = xs[0]!;
    let prev = xs[0]!;
    for (let i = 1; i <= xs.length; i++) {
      const x = xs[i];
      if (x === undefined || x !== prev + 1) {
        rects.push({ x: start * PX, y: y * PX, w: (prev - start + 1) * PX, h: PX });
        start = x!;
        prev = x!;
      } else {
        prev = x;
      }
    }
  }
  return rects;
}

/**
 * A compact mitt: a 5x5 pixel block with the corners stepped off, so the
 * hand caps the forearm flush instead of bulging like a joint ball.
 * Centred at (cx, cy) in mascot units.
 */
export function mittRows(cx: number, cy: number): PxRect[] {
  const gx = Math.round(cx / PX);
  const gy = Math.round(cy / PX);
  // Rows (width in px, centred): 3, 5, 5, 5, 3.
  const widths = [3, 5, 5, 5, 3];
  return widths.map((w, i) => {
    const x = gx - Math.floor(w / 2);
    const y = gy - 2 + i;
    return { x: x * PX, y: y * PX, w: w * PX, h: PX };
  });
}

/**
 * A glowing half-moon eye: a dome, flat side down, 5px wide and 3px
 * tall. Rows (width in px, centred): 3, 5, 5. Centred at (cx, cy).
 * The halo is the same dome 1px bigger, drawn translucent behind it.
 */
export function eyeRows(cx: number, cy: number, growPx = 0): PxRect[] {
  const gx = Math.round(cx / PX);
  const gy = Math.round(cy / PX);
  const widths = [3 + growPx * 2, 5 + growPx * 2, 5 + growPx * 2];
  return widths.map((w, i) => {
    const x = gx - Math.floor(w / 2);
    const y = gy - 1 + i;
    return { x: x * PX, y: y * PX, w: w * PX, h: PX };
  });
}

/**
 * The subtle smile under the eyes: a shallow stepped arc, 10px wide and
 * 2px deep, 1px thick. Centred at (cx, cy).
 */
export function smileRows(cx: number, cy: number): PxRect[] {
  const gx = Math.round(cx / PX);
  const gy = Math.round(cy / PX);
  return [
    { x: (gx - 5) * PX, y: gy * PX, w: 2 * PX, h: PX },
    { x: (gx - 3) * PX, y: (gy + 1) * PX, w: 3 * PX, h: PX },
    { x: gx * PX, y: (gy + 1) * PX, w: 3 * PX, h: PX },
    { x: (gx + 3) * PX, y: gy * PX, w: 2 * PX, h: PX },
  ];
}
