/**
 * Deterministic math. No Math.random, no Date — see the determinism rule in
 * CLAUDE.md. Every "random" value in a film is a pure function of its seed.
 */

export const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

export const invLerp = (from: number, to: number, value: number) =>
  from === to ? 0 : clamp((value - from) / (to - from));

export const mapRange = (
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
) => lerp(outMin, outMax, invLerp(inMin, inMax, value));

/** 0→1 progress of `frame` across a window, clamped at both ends. */
export const progress = (frame: number, start: number, duration: number) =>
  duration <= 0 ? (frame >= start ? 1 : 0) : clamp((frame - start) / duration);

/** mulberry32 — small, fast, stable across platforms. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic value in [-1, 1] from an integer seed. */
export function hashSigned(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return (x - Math.floor(x)) * 2 - 1;
}

/** Deterministic value in [0, 1]. */
export function hash01(seed: number): number {
  return (hashSigned(seed) + 1) / 2;
}

/** Smooth 1D value noise in [0, 1]; useful for grain, drift, breathing. */
export function noise1D(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash01(i + seed * 1013);
  const b = hash01(i + 1 + seed * 1013);
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
}

/** Pick from a list deterministically. */
export function pick<T>(items: readonly T[], seed: number): T {
  if (items.length === 0) throw new Error('pick() called with an empty list');
  return items[Math.floor(hash01(seed) * items.length) % items.length] as T;
}

export const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
