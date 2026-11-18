/**
 * Noir: a hooded figure with headphones, glowing eyes, cargo pants and white
 * sneakers, drawn as pixel art. SINGLE SOURCE OF TRUTH for how the character
 * is built and turned into geometry.
 *
 * The artwork is data (`sprites.ts`, traced from the reference sheet). This
 * module turns a pose's pixel grid into a handful of SVG paths:
 *
 *   - one path per palette color, rectangles merged horizontally then vertically
 *   - one rim path: a 1-pixel halo around the silhouette, for dark grounds
 *
 * Pure and deterministic: no React, no randomness, no clock. The same pose
 * always produces byte-identical paths.
 */
import { EYE_KEYS, SPRITES, SPRITE_CANVAS, SPRITE_PALETTE, type SpriteLayer } from './sprites';
import type { MascotPose } from './poses';

export const CHARACTER = {
  name: 'Noir',
  /** Shared canvas, in grid pixels. Symmetric about the foot anchor so a flip never clips. */
  canvas: SPRITE_CANVAS,
  /** Grid pixels of breathing room around the canvas (room for the rim). */
  pad: 3,
  /** The glowing eyes. Noir's identity: never recolor. */
  eyeKeys: EYE_KEYS,
  /** Where every pose stands: the x of the foot anchor on the canvas. */
  anchorX: SPRITE_CANVAS.width / 2,
} as const;

/** ViewBox of the art box, in grid pixels. */
export const MASCOT_VIEWBOX = {
  x: -CHARACTER.pad,
  y: -CHARACTER.pad,
  width: CHARACTER.canvas.width + CHARACTER.pad * 2,
  height: CHARACTER.canvas.height + CHARACTER.pad * 2,
} as const;

/** Width / height of the art box. */
export const MASCOT_ASPECT = MASCOT_VIEWBOX.width / MASCOT_VIEWBOX.height;

export type Rect = readonly [x: number, y: number, w: number, h: number];

export type LayerGeometry = {
  /** One path per palette key, in a stable order. */
  paths: ReadonlyArray<{ key: string; d: string }>;
  /** 1-pixel halo around the silhouette. */
  rim: string;
};

export type EffectGeometry = LayerGeometry & {
  glyph: boolean;
  /** Canvas-space bounding box of the effect, before any flip. */
  box: Rect;
};

export type PoseGeometry = {
  body: LayerGeometry;
  fx: EffectGeometry[];
};

/* ───────────────────────────── decoding ───────────────────────────── */

/** "a12b3" → ['a','a',...,'b','b','b'] per row. `_` is transparent. */
export function decodeRow(row: string): string[] {
  const out: string[] = [];
  const re = /([A-Za-z_])(\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(row)) !== null) {
    const key = match[1]!;
    const count = Number(match[2]);
    for (let i = 0; i < count; i++) out.push(key);
  }
  return out;
}

export const decodeLayer = (layer: SpriteLayer): string[][] => layer.rows.map(decodeRow);

/* ───────────────────────────── geometry ───────────────────────────── */

/** Greedy merge: horizontal runs per row, then identical runs stacked vertically. */
function mergeRects(cells: ReadonlyArray<ReadonlyArray<boolean>>): Rect[] {
  const rects: Rect[] = [];
  const open = new Map<string, number>(); // "x:w" → index into rects of the run still growing
  cells.forEach((row, y) => {
    const next = new Map<string, number>();
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      let end = x;
      while (end < row.length && row[end]) end++;
      const id = `${x}:${end - x}`;
      const prior = open.get(id);
      if (prior !== undefined) {
        const r = rects[prior]!;
        rects[prior] = [r[0], r[1], r[2], r[3] + 1];
        next.set(id, prior);
      } else {
        rects.push([x, y, end - x, 1]);
        next.set(id, rects.length - 1);
      }
      x = end;
    }
    open.clear();
    next.forEach((v, k) => open.set(k, v));
  });
  return rects;
}

const rectsToPath = (rects: readonly Rect[], dx: number, dy: number): string =>
  rects.map(([x, y, w, h]) => `M${x + dx} ${y + dy}h${w}v${h}h${-w}z`).join('');

/** Cells that touch the silhouette on a side but are not part of it. */
function haloCells(grid: ReadonlyArray<ReadonlyArray<string>>): boolean[][] {
  const h = grid.length;
  const w = Math.max(...grid.map((r) => r.length));
  const solid = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < (grid[y]?.length ?? 0) && grid[y]![x] !== '_';
  const out: boolean[][] = [];
  for (let y = -1; y <= h; y++) {
    const row: boolean[] = [];
    for (let x = -1; x <= w; x++) {
      row.push(!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)));
    }
    out.push(row);
  }
  return out;
}

function buildLayer(layer: SpriteLayer, ox: number, oy: number): LayerGeometry {
  const grid = decodeLayer(layer);
  const keys = Array.from(new Set(grid.flat().filter((k) => k !== '_'))).sort();
  const paths = keys.map((key) => ({
    key,
    d: rectsToPath(
      mergeRects(grid.map((row) => row.map((k) => k === key))),
      ox,
      oy,
    ),
  }));
  // The halo grid is offset by one cell (it starts at -1).
  const rim = rectsToPath(mergeRects(haloCells(grid)), ox - 1, oy - 1);
  return { paths, rim };
}

const cache = new Map<MascotPose, PoseGeometry>();

/** Geometry for one pose, in canvas grid pixels. Memoized; deterministic. */
export function poseGeometry(pose: MascotPose): PoseGeometry {
  const hit = cache.get(pose);
  if (hit) return hit;
  const sprite = SPRITES[pose];
  if (!sprite) throw new Error(`No sprite for mascot pose "${pose}"`);
  const body = buildLayer(sprite, sprite.x, sprite.y);
  const fx = sprite.fx.map((effect): EffectGeometry => {
    const ox = sprite.x + effect.x;
    const oy = sprite.y + effect.y;
    return { ...buildLayer(effect, ox, oy), glyph: effect.glyph, box: [ox, oy, effect.width, effect.height] };
  });
  const geometry = { body, fx };
  cache.set(pose, geometry);
  return geometry;
}

/**
 * Largest art-box height at which this pose's actual drawing (not the shared
 * canvas) fits in `maxWidth` pixels. A standing pose is far narrower than the
 * canvas, which has to be wide enough for the poses lying down.
 */
export function mascotFitHeight(pose: MascotPose, maxWidth: number): number {
  const sprite = SPRITES[pose];
  if (!sprite) throw new Error(`No sprite for mascot pose "${pose}"`);
  let left = sprite.x;
  let right = sprite.x + sprite.width;
  for (const fx of sprite.fx) {
    left = Math.min(left, sprite.x + fx.x);
    right = Math.max(right, sprite.x + fx.x + fx.width);
  }
  // Flipping mirrors about the anchor, so keep the wider side on both sides.
  const half = Math.max(CHARACTER.anchorX - left, right - CHARACTER.anchorX);
  return (maxWidth * MASCOT_VIEWBOX.height) / (2 * half);
}

/** Fill for a palette key. Traced colors; the theme only recolors the rim. */
export const paletteColor = (key: string): string => {
  const color = SPRITE_PALETTE[key];
  if (!color) throw new Error(`Unknown mascot palette key "${key}"`);
  return color;
};

export { SPRITES, SPRITE_PALETTE };
