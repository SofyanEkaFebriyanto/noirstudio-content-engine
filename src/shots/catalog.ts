/**
 * Shot catalog — metadata only, no React. This is what the Node pipeline reads.
 * The React implementations are paired with these entries in `defs.ts`.
 */
import type { ZodType } from 'zod';
import * as S from './schemas';

export type ShotCategory = 'type' | 'footage' | 'data' | 'layout' | 'brand';

export type ShotMeta = {
  id: string;
  label: string;
  category: ShotCategory;
  description: string;
  /** Frames at 30fps. The renderer scales this by the episode's fps. */
  defaultDurationInFrames: number;
  schema: ZodType<unknown>;
  /** Short guidance shown by `npm run shots` and read by the script skill. */
  hints: string;
};

export const SHOT_CATALOG: ShotMeta[] = [
  {
    id: 'title-card',
    label: 'Title card',
    category: 'type',
    description: 'Eyebrow + large serif title + subtitle + footnote rule. The default breath beat between content scenes.',
    defaultDurationInFrames: 54,
    schema: S.titleCardSchema,
    hints: 'title supports *accent words*; keep it under 8 words. ghost = a single letter/number behind the copy.',
  },
  {
    id: 'list-stack',
    label: 'List stack',
    category: 'type',
    description: 'Numbered rows dealing in one at a time with a highlighted row. For steps, rules, feature lists.',
    defaultDurationInFrames: 84,
    schema: S.listStackSchema,
    hints: '3–5 items reads best. highlight = index of the row to mark in the accent color.',
  },
  {
    id: 'stat-slam',
    label: 'Stat slam',
    category: 'data',
    description: 'One large number with a hard settle, a rule and a label. The highest-energy type shot in the kit.',
    defaultDurationInFrames: 60,
    schema: S.statSlamSchema,
    hints: 'Number in value, qualifier in unit ("%", "x", "/s"). One stat per scene.',
  },
  {
    id: 'quote-beat',
    label: 'Quote beat',
    category: 'type',
    description: 'Large pull-quote with attribution. Use once per film, as the emotional turn.',
    defaultDurationInFrames: 78,
    schema: S.quoteSchema,
    hints: 'Keep the quote under 18 words; it should read in one glance.',
  },
  {
    id: 'word-cycle',
    label: 'Word cycle',
    category: 'type',
    description: 'One word at a time, hard-cut on a beat, with progress rules. For three-to-five word hooks.',
    defaultDurationInFrames: 64,
    schema: S.wordCycleSchema,
    hints: 'Set framesPerWord to the music beat (15 at 120bpm/30fps). 3–5 words.',
  },
  {
    id: 'end-card',
    label: 'End card',
    category: 'brand',
    description: 'Brand lockup, closing line, optional CTA button and handle. Every film ends here.',
    defaultDurationInFrames: 90,
    schema: S.endCardSchema,
    hints: 'Hold at least 60 frames so the wordmark registers. CTA should be a verb.',
  },
  {
    id: 'footage-fill',
    label: 'Footage fill',
    category: 'footage',
    description: 'Full-bleed b-roll with a Ken Burns push, scrim, kicker, headline and caption.',
    defaultDurationInFrames: 96,
    schema: S.footageFillSchema,
    hints: 'src = media id from footage/source/. Headline ≤ 5 words. kenBurns 0.03–0.08 is subtle.',
  },
  {
    id: 'footage-frame',
    label: 'Footage frame',
    category: 'footage',
    description: 'A clip in a bordered window with type beside it. Workhorse for talking-head or screen-capture b-roll.',
    defaultDurationInFrames: 96,
    schema: S.footageFrameSchema,
    hints: 'Alternate side between consecutive scenes. width 0.5–0.6 keeps type readable on a phone.',
  },
  {
    id: 'footage-strip',
    label: 'Footage strip',
    category: 'footage',
    description: 'Two to five clips cut in sequence with a filmstrip navigator. For montage beats and proof-of-work reels.',
    defaultDurationInFrames: 120,
    schema: S.footageStripSchema,
    hints: 'framesPerClip 15–30. Keep labels to one or two words.',
  },
  {
    id: 'compare-split',
    label: 'Compare split',
    category: 'layout',
    description: 'Before/after or A/B panels with an animated divider. Winner gets the accent border and fill.',
    defaultDurationInFrames: 90,
    schema: S.compareSchema,
    hints: 'Two or three points per side max. On 9:16 it stacks vertically.',
  },
  {
    id: 'process-flow',
    label: 'Process flow',
    category: 'layout',
    description: 'Numbered steps joined by growing connectors. For how-it-works and pipeline explainers.',
    defaultDurationInFrames: 96,
    schema: S.processSchema,
    hints: '3–4 steps fits a vertical phone frame. Step one is accented automatically.',
  },
  {
    id: 'grid-map',
    label: 'Grid map',
    category: 'layout',
    description: 'A grid of labelled cells arriving in a wave. For ecosystems, skill maps, tool inventories.',
    defaultDurationInFrames: 84,
    schema: S.gridMapSchema,
    hints: '9–12 items is the sweet spot. accentEvery 3–4 highlights anchors without noise.',
  },
  {
    id: 'timeline-bar',
    label: 'Timeline bar',
    category: 'layout',
    description: 'A vertical timeline whose line draws down through dated events, one highlighted.',
    defaultDurationInFrames: 96,
    schema: S.timelineSchema,
    hints: 'Three or four events. `when` should be short: "DAY 1", "10:42", "BEFORE".',
  },
  {
    id: 'big-statement',
    label: 'Big statement',
    category: 'type',
    description: 'One to four lines of large type with a kicker. The cleanest way to land a single idea.',
    defaultDurationInFrames: 72,
    schema: S.statementSchema,
    hints: 'One idea per scene. Use `lines` for a deliberate line break, not a paragraph.',
  },
  {
    id: 'bar-chart',
    label: 'Bar chart',
    category: 'data',
    description: 'Horizontal bars that grow to their values, one bar accented. For comparisons and progress.',
    defaultDurationInFrames: 84,
    schema: S.barSchema,
    hints: 'Use `display` for suffixes. Highlight the bar you want remembered.',
  },
  {
    id: 'counter',
    label: 'Counter',
    category: 'data',
    description: 'A single number counting up to its target, with prefix/suffix and a label.',
    defaultDurationInFrames: 72,
    schema: S.counterSchema,
    hints: 'Keep the target under six digits. decimals 1–2 for rates, 0 for counts.',
  },
  {
    id: 'vs-meter',
    label: 'Vs meter',
    category: 'data',
    description: 'A single split bar resolving to a share, with both sides labelled. Fast, legible comparison.',
    defaultDurationInFrames: 72,
    schema: S.vsSchema,
    hints: 'leftShare 0.55–0.75 gives a clear winner without looking rigged.',
  },
  {
    id: 'brand-open',
    label: 'Brand open',
    category: 'brand',
    description: 'Lockup assembles over a field of drifting particles. A cold open that establishes authorship fast.',
    defaultDurationInFrames: 50,
    schema: S.brandOpenSchema,
    hints: 'line is a micro tagline in caps, e.g. "EPISODE 04". Under six words.',
  },
  {
    id: 'brand-sting',
    label: 'Brand sting',
    category: 'brand',
    description: 'A one-beat accent-colored card with the mark. Use as a section divider, not as an opener.',
    defaultDurationInFrames: 36,
    schema: S.stingSchema,
    hints: 'Run it between chapters. More than two per film feels like a bumper reel.',
  },
  {
    id: 'mascot',
    label: 'Mascot',
    category: 'brand',
    description:
      'Noir, the studio mascot (pixel art, glowing eyes), in one of 20 poses with an optional caption line.',
    defaultDurationInFrames: 66,
    schema: S.mascotSchema,
    hints:
      'Pick the pose from the manifest (brand/BRAND.md → Mascot) that fits the beat: wave greets and signs off, point directs attention, thinking and confused carry a question. Use sparingly; one or two per film. Set flip to face the other way, effects false to drop the marks.',
  },
  {
    id: 'subscribe-cta',
    label: 'Subscribe CTA',
    category: 'brand',
    description: 'Closing ask with wordmark, headline, accent button and handle. Pairs with end-card.',
    defaultDurationInFrames: 78,
    schema: S.subscribeSchema,
    hints: 'cta should be a verb ("Follow", "Subscribe", "Get the kit"). One ask only.',
  },
];

const byId = new Map(SHOT_CATALOG.map((shot) => [shot.id, shot]));

export const getShotMeta = (id: string): ShotMeta | undefined => byId.get(id);

export const listShotIds = (): string[] => SHOT_CATALOG.map((shot) => shot.id);

export const shotIdsByCategory = (category: ShotCategory): string[] =>
  SHOT_CATALOG.filter((shot) => shot.category === category).map((shot) => shot.id);
