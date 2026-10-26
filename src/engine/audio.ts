/**
 * Audio pack manifest. `npm run sync` writes this file from whatever mp3s are
 * present in `public/audio/pack/`. Ids are the file basenames.
 */
export type AudioPackEntry = {
  id: string;
  file: string;
  /** Seconds; filled in by sync via ffprobe when available. */
  duration?: number;
  /**
   * What the file is used for. `bed` files can back a music track; everything
   * else is a one-shot cue. Defaults to `cue` when absent.
   */
  kind?: 'cue' | 'bed';
  category?: string;
  license?: string;
  source?: string;
  prompt?: string;
};

export type AudioPackManifest = {
  generatedAt: string;
  entries: AudioPackEntry[];
};

/**
 * The sound design vocabulary. Shots and episodes may only reference cues by
 * these roles; the pack maps roles to files so a re-voiced pack keeps working.
 */
export const CUE_ROLES = [
  'whoosh-soft',
  'whoosh-fast',
  'impact',
  'riser',
  'sparkle',
  'pop',
  'click',
  'type',
  'swoosh-quick',
  'transition-snap',
  'transition-soft',
  'bed-tension',
] as const;

export type CueRole = (typeof CUE_ROLES)[number];

/**
 * Roles that are beds rather than one-shots. A music track must point at one
 * of these; a cue must not. Kept next to CUE_ROLES so the two never drift.
 */
export const BED_ROLES = ['bed-tension'] as const;

export const isBedRole = (id: string): boolean => (BED_ROLES as readonly string[]).includes(id);
