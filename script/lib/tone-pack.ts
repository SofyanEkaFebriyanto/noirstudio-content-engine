/**
 * Synthesized fallback cue pack.
 *
 * The real pack is generated with ElevenLabs (`npm run audio -- --generate-pack`),
 * which needs a key and credits. This fallback writes usable, clearly-labelled
 * placeholder cues with ffmpeg so the pipeline — mix, timeline, publish —
 * can be exercised without any credentials.
 *
 * These are deliberately plain tones, not imitations: nobody should mistake them
 * for the final sound design.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ensureDir } from './fsx';
import { hasFfmpeg } from './audio-tools';

type Tone = {
  id: string;
  /** ffmpeg `aevalsrc` or `sine` expression. */
  expr: string;
  duration: number;
  fade?: number;
  note: string;
};

const TONES: Tone[] = [
  {
    id: 'whoosh-soft',
    expr: 'anoisesrc=color=brown:amplitude=0.5,lowpass=f=900,volume=0.35',
    duration: 1.4,
    fade: 0.7,
    note: 'filtered noise sweep',
  },
  {
    id: 'whoosh-fast',
    expr: 'anoisesrc=color=pink:amplitude=0.5,highpass=f=1200,volume=0.3',
    duration: 0.7,
    fade: 0.3,
    note: 'short bright noise',
  },
  {
    id: 'swoosh-quick',
    expr: 'anoisesrc=color=pink:amplitude=0.45,bandpass=f=2200:width_type=h:w=800,volume=0.24',
    duration: 0.5,
    fade: 0.2,
    note: 'band-passed tick',
  },
  {
    id: 'impact',
    expr: 'sine=frequency=58:duration=1.6,volume=0.5',
    duration: 1.6,
    fade: 0.9,
    note: 'low sine thump',
  },
  {
    id: 'riser',
    expr: 'sine=frequency=220:duration=3,volume=0.22',
    duration: 3,
    fade: 1.2,
    note: 'steady tone (riser placeholder)',
  },
  {
    id: 'sparkle',
    expr: 'sine=frequency=2093:duration=1.2,volume=0.18',
    duration: 1.2,
    fade: 0.8,
    note: 'high bell-ish tone',
  },
  {
    id: 'pop',
    expr: 'sine=frequency=660:duration=0.25,volume=0.3',
    duration: 0.25,
    fade: 0.12,
    note: 'short blip',
  },
  {
    id: 'click',
    expr: 'anoisesrc=color=white:amplitude=0.4,highpass=f=3000,volume=0.2',
    duration: 0.12,
    fade: 0.05,
    note: 'noise tick',
  },
  {
    id: 'type',
    expr: 'anoisesrc=color=white:amplitude=0.3,highpass=f=2000,volume=0.15',
    duration: 2.0,
    fade: 0.2,
    note: 'keyboard-ish hiss',
  },
  {
    id: 'transition-snap',
    expr: 'anoisesrc=color=brown:amplitude=0.6,lowpass=f=600,volume=0.28',
    duration: 0.6,
    fade: 0.25,
    note: 'muted transient',
  },
  {
    id: 'transition-soft',
    expr: 'anoisesrc=color=brown:amplitude=0.5,lowpass=f=1400,volume=0.22',
    duration: 0.9,
    fade: 0.4,
    note: 'soft noise swish',
  },
  {
    id: 'bed-tension',
    expr: 'sine=frequency=55:duration=30,volume=0.1',
    duration: 30,
    fade: 2,
    note: 'low drone bed',
  },
];

/** Write every placeholder cue into `dir`. Returns how many succeeded. */
export function writeTonePack(dir: string): { written: string[]; failed: string[] } {
  ensureDir(dir);
  const written: string[] = [];
  const failed: string[] = [];
  if (!hasFfmpeg()) return { written, failed: TONES.map((tone) => tone.id) };

  for (const tone of TONES) {
    const out = join(dir, `${tone.id}.mp3`);
    const fade = tone.fade ?? 0.1;
    const fadeOutStart = Math.max(0, tone.duration - fade - 0.01);
    // The source expression belongs to -i only; -af carries the processing chain.
    const filter = [
      `afade=t=in:st=0:d=${fade}`,
      `afade=t=out:st=${fadeOutStart.toFixed(2)}:d=${fade}`,
      'alimiter=limit=0.8',
    ].join(',');
    try {
      execFileSync(
        'ffmpeg',
        [
          '-y',
          '-f',
          'lavfi',
          '-i',
          tone.expr,
          '-t',
          String(tone.duration),
          '-af',
          filter,
          '-ac',
          '2',
          '-ar',
          '44100',
          '-b:a',
          '128k',
          out,
        ],
        { stdio: 'ignore' },
      );
      written.push(tone.id);
    } catch {
      failed.push(tone.id);
    }
  }
  return { written, failed };
}

export const TONE_NOTES = TONES.map((tone) => ({
  id: tone.id,
  note: tone.note,
  duration: tone.duration,
  /** Beds back a music track; everything else is a one-shot cue. */
  kind: tone.id.startsWith('bed-') ? ('bed' as const) : ('cue' as const),
}));
