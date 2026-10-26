/**
 * Brand kit — logo, wordmark and the rules that keep them recognizable.
 * The logo is drawn from code (SVG), so it stays crisp at every size and has
 * no external dependency.
 */
import type { Theme } from './theme';

export type BrandKit = {
  name: string;
  wordmark: string;
  /** Split so the accent can color one half. */
  wordmarkParts: { text: string; accent: boolean }[];
  tagline: string;
  domain: string;
  handle: string;
  /** Monogram used for avatars, watermarks, end cards. */
  monogram: string;
};

export const BRAND: BrandKit = {
  name: 'Noir Studio',
  wordmark: 'NOIR STUDIO',
  wordmarkParts: [
    { text: 'NOIR', accent: false },
    { text: 'STUDIO', accent: true },
  ],
  tagline: 'Motion for people who ship.',
  domain: 'noirstudio.id',
  handle: '@noirstudio',
  monogram: 'N',
};

/**
 * Geometry for the brand mark, in a 100×100 box.
 *
 * Measured from `brand/logo/noir-studio.png` (1024²): a regular pointy-left/right
 * hexagon with a thick, solid "N" centered inside it. The hexagon's bounding box
 * is 600×518 px in the source (ratio 1.158 = 2/√3 exactly), so the `viewBox` is
 * widened to 100×86.4 — squashing that ratio into a square would read as a
 * stretched logo.
 *
 * Interpreting it as 100 units:
 *   hexagon  x 0–100, y 0–86.4, stroke 7.33 (44 px in the source)
 *   N        x 32.7–67.3, y 21.3–65.3, stem 11.7, diagonal ≈ 20.5 wide
 */
export const MARK = {
  viewBox: '0 0 100 86.4',
  /** Regular hexagon, flat top and bottom; vertices on the horizontal axis. */
  hexagon: {
    width: 100,
    height: 86.4,
    strokeWidth: 7.33,
  },
  /** Solid "N" glyph, drawn as a filled path. */
  glyph: {
    x: 32.7,
    y: 21.3,
    width: 34.6,
    height: 44,
    stemWidth: 11.7,
    /** The diagonal is as wide as a stem, measured horizontally too. */
    diagonalWidth: 11.7,
  },
  /** Source asset, for tools that need a raster. */
  asset: 'brand/logo/noir-studio.png',
};

/**
 * The hexagon path, inset by half the stroke so the drawn edge lands on the
 * bounding box instead of straddling it.
 */
export function hexagonPath(inset = MARK.hexagon.strokeWidth / 2): string {
  const half = MARK.hexagon.strokeWidth / 2;
  const w = MARK.hexagon.width - inset * 2;
  const h = MARK.hexagon.height - inset * 2;
  const cx = MARK.hexagon.width / 2;
  const cy = MARK.hexagon.height / 2;
  const r = w / 2;
  const v = h / 2;
  // Vertices clockwise from the left point.
  const pts: [number, number][] = [
    [cx - r, cy],
    [cx - r / 2, cy - v],
    [cx + r / 2, cy - v],
    [cx + r, cy],
    [cx + r / 2, cy + v],
    [cx - r / 2, cy + v],
  ];
  return `M${pts.map(([x, y]) => `${round(x)} ${round(y)}`).join(' L')} Z`;
}

/**
 * The "N" as a solid glyph with two triangular counters.
 *
 * Built as one outer rectangle plus two triangular holes, filled with the
 * even-odd rule. Drawn as three subpaths rather than an outline-with-one-hole
 * because an N has *two* counters (upper-left and lower-right of the diagonal),
 * and a single-contour approach cannot express that.
 *
 * Proportions come from the pixel map of the source logo: stem and diagonal are
 * the same width (both 18 of 52 sampled columns), and the diagonal spans the
 * full box corner to corner.
 */
export function glyphPath(): string {
  const { x, y, width, height, stemWidth, diagonalWidth } = MARK.glyph;
  const L = x;
  const R = x + width;
  const T = y;
  const B = y + height;
  const s = stemWidth;
  const Rs = R - s;

  const poly = (pts: [number, number][]) =>
    `M${pts.map(([px, py]) => `${round(px)} ${round(py)}`).join(' L')} Z`;

  // Two stems...
  const leftStem: [number, number][] = [
    [L, T],
    [L + s, T],
    [L + s, B],
    [L, B],
  ];
  const rightStem: [number, number][] = [
    [Rs, T],
    [R, T],
    [R, B],
    [Rs, B],
  ];
  // ...and one diagonal band running corner to corner, on top of them. The
  // band's width is measured horizontally; together with the stems it fills
  // the middle of the glyph and leaves the two triangular counters the source
  // logo shows.
  const diagonal: [number, number][] = [
    [L, T],
    [L + diagonalWidth, T],
    [R, B],
    [R - diagonalWidth, B],
  ];

  // Subpaths overlap, so the default nonzero fill rule unions them correctly.
  return [leftStem, rightStem, diagonal].map(poly).join(' ');
}

const round = (n: number, places = 3) => {
  const f = 10 ** places;
  return Math.round(n * f) / f;
};

export function brandAccent(theme: Theme) {
  return theme.colors.accent;
}
