/**
 * Easing. Shared curves keep the whole studio's motion feeling like one hand.
 * Cubic-bezier solver adapted for frame-deterministic evaluation.
 */
export type EaseFn = (t: number) => number;

const cubicBezier = (x1: number, y1: number, x2: number, y2: number, samples = 24): EaseFn => {
  const at = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * t * p1 + 3 * (1 - t) * t * t * p2 + t * t * t;

  const solve = (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let low = 0;
    let high = 1;
    let mid = x;
    for (let i = 0; i < samples; i++) {
      const estimate = at(mid, x1, x2);
      if (Math.abs(estimate - x) < 1e-5) return mid;
      if (estimate < x) low = mid;
      else high = mid;
      mid = (low + high) / 2;
    }
    return mid;
  };

  return (t: number) => at(solve(t), y1, y2);
};

export const EASE = {
  /** Fast start, long tail. The studio default for entrances. */
  out: cubicBezier(0.16, 1, 0.3, 1),
  /** Symmetric, calm. For camera pushes and fades. */
  inOut: cubicBezier(0.65, 0, 0.35, 1),
  /** Very quick attack, used for cuts and stamps. */
  snappy: cubicBezier(0.2, 1, 0.2, 1),
  /** Slow and weighty; for large type and hero elements. */
  soft: cubicBezier(0.22, 0.61, 0.36, 1),
  /** Tiny overshoot; never more than ~1.04. Use sparingly. */
  backOut: cubicBezier(0.34, 1.28, 0.64, 1),
  linear: (t: number) => t,
  in: cubicBezier(0.55, 0, 1, 0.45),
} as const;

export type EaseName = keyof typeof EASE;

export const ease = (name: EaseName | EaseFn): EaseFn =>
  typeof name === 'function' ? name : EASE[name];

/**
 * Spring-ish settle without Remotion's spring(): deterministic, frame-based,
 * and safe to use outside React. Overshoot bounded by `amount`.
 */
export const springSettle = (
  frame: number,
  start: number,
  duration: number,
  amount = 0.08,
): number => {
  const p = Math.min(1, Math.max(0, (frame - start) / Math.max(1, duration)));
  if (p >= 1) return 1;
  const decay = Math.exp(-6 * p);
  return 1 - Math.cos(p * Math.PI * 1.5) * decay * (1 + amount) * (1 - p) - (1 - p) * 0;
};
