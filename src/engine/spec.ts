/**
 * Episode contract — the single source of truth for a film.
 *
 * Everything downstream (Remotion composition, VO pipeline, audio cue sheet,
 * publishing metadata) is derived from this object. Nothing may invent timing
 * or copy that is not in here.
 */
import { z } from 'zod';

export const FORMAT_IDS = ['reel', 'wide', 'square', 'portrait'] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

export const FORMATS: Record<FormatId, { width: number; height: number; label: string; note: string }> = {
  reel: { width: 1080, height: 1920, label: '9:16 vertical', note: 'TikTok, Reels, Shorts, Stories' },
  wide: { width: 1920, height: 1080, label: '16:9 wide', note: 'YouTube, web hero, presentations' },
  square: { width: 1080, height: 1080, label: '1:1 square', note: 'Feed posts, carousels' },
  portrait: { width: 1080, height: 1350, label: '4:5 portrait', note: 'Instagram feed' },
};

export const TRANSITION_TYPES = ['none', 'fade', 'wipe', 'slide', 'flip', 'clock-wipe'] as const;
export type TransitionType = (typeof TRANSITION_TYPES)[number];

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, 'use kebab-case: lowercase letters, digits and dashes');

export const TransitionSchema = z.object({
  type: z.enum(TRANSITION_TYPES).default('fade'),
  durationInFrames: z.number().int().min(1).max(120).default(15),
  direction: z.enum(['from-left', 'from-right', 'from-top', 'from-bottom']).optional(),
  /** Wipe geometry for the `wipe` presentation. */
  wipe: z.enum(['linear', 'clock']).optional(),
});
export type Transition = z.input<typeof TransitionSchema>;

export const SceneSchema = z.object({
  id,
  /** Shot registry id, e.g. `type-slide`. See `src/shots/index.ts`. */
  shot: z.string().min(1),
  /** Omit to inherit the shot's default duration. */
  durationInFrames: z.number().int().min(1).optional(),
  /** Shot-specific content. Validated against the shot's own schema. */
  props: z.record(z.string(), z.unknown()).default({}),
  /** Transition INTO this scene. Ignored on the first scene. */
  transition: TransitionSchema.optional(),
  /** Only used to keep the cue sheet readable; never rendered. */
  label: z.string().optional(),
});
export type SceneSpec = z.input<typeof SceneSchema>;
export type SceneSpecParsed = z.infer<typeof SceneSchema>;

export const VoiceSegmentSchema = z.object({
  id,
  /** Which scene this line belongs to. Used for placement + validation. */
  scene: z.string().optional(),
  text: z.string().min(1),
  /** Silence before the line, inside its scene. */
  leadInFrames: z.number().int().min(0).default(12),
  gainDb: z.number().min(-24).max(24).default(0),
});
export type VoiceSegment = z.input<typeof VoiceSegmentSchema>;

export const VoiceSchema = z.object({
  provider: z.literal('elevenlabs').default('elevenlabs'),
  /** Falls back to ELEVENLABS_VOICE_ID when omitted. */
  voiceId: z.string().optional(),
  modelId: z.string().default('eleven_multilingual_v2'),
  languageCode: z.string().optional(),
  settings: z
    .object({
      stability: z.number().min(0).max(1).default(0.5),
      similarityBoost: z.number().min(0).max(1).default(0.75),
      style: z.number().min(0).max(1).default(0),
      speed: z.number().min(0.7).max(1.2).default(1),
      useSpeakerBoost: z.boolean().default(true),
    })
    .prefault({}),
  segments: z.array(VoiceSegmentSchema).default([]),
});
export type VoiceSpec = z.input<typeof VoiceSchema>;

export const CaptionSchema = z.object({
  mode: z.enum(['words', 'lines', 'off']).default('words'),
  style: z.enum(['kinetic', 'plain', 'none']).default('kinetic'),
  /** Max words held on screen at once in `words` mode. */
  windowWords: z.number().int().min(1).max(12).default(5),
  /** Caption blocks not tied to VO. Times are frame-accurate, film-absolute. */
  extra: z
    .array(
      z.object({
        from: z.number().int().min(0),
        to: z.number().int().min(0),
        text: z.string(),
      }),
    )
    .default([]),
});
export type CaptionSpec = z.input<typeof CaptionSchema>;

export const MusicTrackSchema = z.object({
  /** Pack id (`bed-tension`) or `path:`-prefixed public path. */
  src: z.string(),
  volume: z.number().min(0).max(1).default(0.32),
  loop: z.boolean().default(true),
  startAtFrame: z.number().int().min(0).default(0),
  fadeInFrames: z.number().int().min(0).default(24),
  fadeOutFrames: z.number().int().min(0).default(48),
});
export type MusicTrack = z.input<typeof MusicTrackSchema>;

export const CueSchema = z.object({
  /** Film-absolute time in seconds. Kept in seconds so it is readable to editors. */
  at: z.number().min(0),
  /** Pack id (`whoosh-soft`) or `path:`-prefixed public path. */
  cue: z.string(),
  volume: z.number().min(0).max(1).default(0.8),
  /** Trim the source; omit to play the whole file. */
  durationInFrames: z.number().int().min(1).optional(),
  offsetFrames: z.number().int().min(0).default(0),
});
export type AudioCue = z.input<typeof CueSchema>;

export const AudioSchema = z.object({
  music: z.array(MusicTrackSchema).default([]),
  cues: z.array(CueSchema).default([]),
  /** Loudness target for the mastered mux. Set `false` to skip ffmpeg loudnorm. */
  master: z
    .union([
      z.literal(false),
      z.object({
        targetLufs: z.number().default(-14),
        truePeakDb: z.number().default(-1.5),
      }),
    ])
    .default({ targetLufs: -14, truePeakDb: -1.5 }),
});
export type AudioSpec = z.input<typeof AudioSchema>;

export const PublishSchema = z.object({
  title: z.string().default(''),
  caption: z.string().default(''),
  hashtags: z.array(z.string()).default([]),
  /** Platform → Zernio accountId. Usually filled by publish.config.json. */
  accounts: z.record(z.string(), z.string()).default({}),
  /** ISO 8601. Omit to publish as soon as possible (`now`). */
  scheduleAt: z.string().optional(),
  /** Save as a draft in Zernio instead of publishing. */
  draft: z.boolean().default(false),
  extra: z
    .object({
      isAiGenerated: z.boolean().default(true),
      shareToFeed: z.boolean().default(false),
      targetCountries: z.array(z.string()).default([]),
      collaborators: z.array(z.string()).default([]),
      mentions: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
    })
    .prefault({}),
});
export type PublishSpec = z.input<typeof PublishSchema>;

export const EpisodeSpecSchema = z.object({
  id,
  title: z.string().min(1),
  /** One-line promise of the film; used by docs and by `check`. */
  logline: z.string().default(''),
  status: z.enum(['draft', 'review', 'final', 'published']).default('draft'),
  format: z.enum(FORMAT_IDS).default('reel'),
  fps: z.number().int().min(12).max(60).default(30),
  theme: z.string().default('noir'),
  /** Optional per-episode override of the brand theme tokens. */
  themeOverrides: z.record(z.string(), z.unknown()).optional(),
  scenes: z.array(SceneSchema).min(1),
  voice: VoiceSchema.optional(),
  captions: CaptionSchema.prefault({}),
  audio: AudioSchema.prefault({}),
  publish: PublishSchema.optional(),
  /** Freeform notes for humans; ignored by the renderer. */
  notes: z.string().default(''),
});

export type EpisodeSpec = z.input<typeof EpisodeSpecSchema>;
export type EpisodeParsed = z.infer<typeof EpisodeSpecSchema>;

/** Author helper — keeps editor completion while preserving literal types. */
export function defineEpisode(spec: EpisodeSpec): EpisodeSpec {
  return spec;
}

export function parseEpisode(spec: unknown): EpisodeParsed {
  return EpisodeSpecSchema.parse(spec);
}

export function episodeIssues(spec: unknown): string[] {
  const result = EpisodeSpecSchema.safeParse(spec);
  if (result.success) return [];
  return result.error.issues.map((issue) => {
    const path = issue.path.join('.') || '(root)';
    return `${path}: ${issue.message}`;
  });
}
