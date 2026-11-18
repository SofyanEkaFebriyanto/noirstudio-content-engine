/**
 * Shot schemas — pure Zod, no React. Imported by both the renderer and the
 * Node pipeline scripts, so `npm run check` can validate an episode without
 * bundling Remotion.
 */
import { z } from 'zod';
import { MASCOT_POSES } from '../mascot/poses';

export const titleCardSchema = z.object({
  eyebrow: z.string().default(''),
  title: z.string().min(1),
  subtitle: z.string().default(''),
  footnote: z.string().default(''),
  align: z.enum(['left', 'center']).default('left'),
  ghost: z.string().default(''),
});

export const listStackSchema = z.object({
  header: z.string().default(''),
  items: z
    .array(
      z.object({
        index: z.string().default(''),
        text: z.string(),
        note: z.string().default(''),
      }),
    )
    .min(1),
  stagger: z.number().int().min(1).default(10),
  highlight: z.number().int().min(-1).default(-1),
});

export const statSlamSchema = z.object({
  value: z.string().min(1),
  unit: z.string().default(''),
  label: z.string().default(''),
  caption: z.string().default(''),
  align: z.enum(['left', 'center']).default('left'),
});

export const quoteSchema = z.object({
  quote: z.string().min(1),
  attribution: z.string().default(''),
  role: z.string().default(''),
});

export const wordCycleSchema = z.object({
  words: z.array(z.string()).min(2),
  framesPerWord: z.number().int().min(4).default(16),
  heading: z.string().default(''),
  accentIndex: z.number().int().default(-1),
});

export const endCardSchema = z.object({
  line: z.string().default('Follow for more.'),
  cta: z.string().default(''),
  handle: z.string().default(''),
});

export const footageFillSchema = z.object({
  src: z.string().default(''),
  trimStart: z.number().min(0).default(0),
  kenBurns: z.number().min(-0.2).max(0.3).default(0.05),
  focus: z.tuple([z.number(), z.number()]).default([0.5, 0.5]),
  headline: z.string().default(''),
  kicker: z.string().default(''),
  caption: z.string().default(''),
  scrim: z.number().min(0).max(0.9).default(0.34),
  fit: z.enum(['cover', 'contain']).default('cover'),
});

export const footageFrameSchema = z.object({
  src: z.string().default(''),
  trimStart: z.number().min(0).default(0),
  heading: z.string().default(''),
  body: z.string().default(''),
  side: z.enum(['left', 'right']).default('right'),
  width: z.number().min(0.3).max(0.8).default(0.54),
  aspect: z.number().min(0.5).max(2.2).default(0.8),
  label: z.string().default(''),
  offsetY: z.number().min(-0.3).max(0.3).default(0),
});

export const footageStripSchema = z.object({
  clips: z
    .array(
      z.object({
        src: z.string(),
        label: z.string().default(''),
      }),
    )
    .min(2)
    .max(5),
  heading: z.string().default(''),
  framesPerClip: z.number().int().min(6).default(24),
  filmstrip: z.boolean().default(true),
});

export const compareSchema = z.object({
  heading: z.string().default(''),
  left: z.object({
    label: z.string().default('Before'),
    title: z.string(),
    points: z.array(z.string()).default([]),
  }),
  right: z.object({
    label: z.string().default('After'),
    title: z.string(),
    points: z.array(z.string()).default([]),
  }),
  winner: z.enum(['left', 'right', 'none']).default('right'),
});

export const processSchema = z.object({
  heading: z.string().default(''),
  steps: z
    .array(
      z.object({
        title: z.string(),
        note: z.string().default(''),
      }),
    )
    .min(2)
    .max(5),
  orientation: z.enum(['horizontal', 'vertical']).default('vertical'),
});

export const gridMapSchema = z.object({
  heading: z.string().default(''),
  items: z.array(z.string()).min(4).max(24),
  columns: z.number().int().min(2).max(6).default(3),
  arrival: z.enum(['wave', 'scatter']).default('wave'),
  accentEvery: z.number().int().min(0).default(4),
});

export const timelineSchema = z.object({
  heading: z.string().default(''),
  events: z
    .array(
      z.object({
        when: z.string(),
        title: z.string(),
        note: z.string().default(''),
      }),
    )
    .min(2)
    .max(5),
  active: z.number().int().default(-1),
});

export const statementSchema = z.object({
  lines: z.array(z.string()).min(1).max(4),
  kicker: z.string().default(''),
  align: z.enum(['left', 'center']).default('center'),
  size: z.enum(['title', 'heading']).default('title'),
});

export const barSchema = z.object({
  heading: z.string().default(''),
  unit: z.string().default(''),
  bars: z
    .array(
      z.object({
        label: z.string(),
        value: z.number(),
        display: z.string().default(''),
      }),
    )
    .min(2)
    .max(8),
  highlight: z.number().int().default(-1),
  grow: z.enum(['stagger', 'together']).default('stagger'),
});

export const counterSchema = z.object({
  from: z.number().default(0),
  to: z.number().min(0),
  prefix: z.string().default(''),
  suffix: z.string().default(''),
  label: z.string().default(''),
  decimals: z.number().int().min(0).max(3).default(0),
  countFrames: z.number().int().min(6).default(36),
});

export const vsSchema = z.object({
  leftLabel: z.string(),
  rightLabel: z.string(),
  leftShare: z.number().min(0).max(1).default(0.62),
  heading: z.string().default(''),
  winnerNote: z.string().default(''),
});

export const brandOpenSchema = z.object({
  line: z.string().default(''),
  particles: z.number().int().min(0).max(60).default(26),
});

export const stingSchema = z.object({
  text: z.string().default('NOIR STUDIO'),
  sub: z.string().default(''),
});

export const mascotSchema = z.object({
  /** One of the 20 Noir poses; see brand/BRAND.md → Mascot. */
  pose: z.enum(MASCOT_POSES).default('idle'),
  /** One optional caption line under the mascot. Plain text; no accent word. */
  caption: z.string().default(''),
  /** Mirror the mascot so it faces the other way. Question marks and other glyphs are never mirrored. */
  flip: z.boolean().default(false),
  /** Show the pose's effect marks (question marks, sparkles, motion lines). */
  effects: z.boolean().default(true),
});

export const subscribeSchema = z.object({
  headline: z.string().default('Follow the build.'),
  sub: z.string().default(''),
  cta: z.string().default('Follow'),
});
