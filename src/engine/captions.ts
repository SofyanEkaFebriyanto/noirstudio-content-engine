/**
 * Caption grouping. ElevenLabs returns character alignments; films need
 * word groups that appear and disappear as a unit. This turns one into the
 * other deterministically.
 */
import type { CaptionSpec, EpisodeParsed } from './spec';
import type { ResolvedTimeline } from './timeline';

export type WordTiming = { word: string; startFrame: number; endFrame: number };

export type CaptionLine = {
  /** Film-absolute frames. */
  from: number;
  to: number;
  text: string;
  /** Line index for stagger styling. */
  index: number;
  /** True when this caption came from the `extra` list rather than VO. */
  extra: boolean;
};

export type VoAlignment = {
  segmentId: string;
  text: string;
  /** Seconds of audio. */
  durationSeconds: number;
  words: { word: string; start: number; end: number }[];
  /** Film-absolute frame where the audio file starts. */
  startFrame: number;
};

const FRAMES_PER_CHAR_FALLBACK = 0.055;

/** Rough estimate used before a VO render exists, so the film still lays out. */
export function estimateSpeechSeconds(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.45, words / 2.55 + 0.18);
}

export function estimateWordTimings(text: string): { word: string; start: number; end: number }[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const total = estimateSpeechSeconds(text);
  const slot = total / Math.max(1, words.length);
  return words.map((word, index) => ({
    word,
    start: index * slot,
    end: (index + 1) * slot - Math.min(0.04, slot * 0.15),
  }));
}

export function groupWords(
  alignment: VoAlignment,
  caption: CaptionSpec,
  fps: number,
): CaptionLine[] {
  const windowWords = Math.max(1, caption.windowWords ?? 5);
  const lines: CaptionLine[] = [];
  let buffer: WordTiming[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer
      .map((w) => w.word)
      .join(' ')
      .replace(/\s+([,.!?;:])/g, '$1')
      .trim();
    lines.push({
      from: buffer[0]!.startFrame,
      // Hold a beat after the last word so the block does not blink away.
      to: buffer[buffer.length - 1]!.endFrame + Math.round(fps * 0.22),
      text,
      index: lines.length,
      extra: false,
    });
    buffer = [];
  };

  for (const word of alignment.words) {
    buffer.push({
      word: word.word,
      startFrame: alignment.startFrame + Math.round(word.start * fps),
      endFrame: alignment.startFrame + Math.round(word.end * fps),
    });
    const endsSentence = /[.!?]$/.test(word.word);
    if (buffer.length >= windowWords || endsSentence) flush();
  }
  flush();

  return lines;
}

export function buildCaptions(
  episode: EpisodeParsed,
  timeline: ResolvedTimeline,
  alignments: VoAlignment[],
): CaptionLine[] {
  const mode = episode.captions.mode;
  if (mode === 'off' || episode.captions.style === 'none') return [];

  const lines: CaptionLine[] = [];

  if (mode === 'words' || mode === 'lines') {
    for (const alignment of alignments) {
      const windowWords = mode === 'lines' ? 999 : episode.captions.windowWords;
      lines.push(...groupWords(alignment, { ...episode.captions, windowWords }, episode.fps));
    }
  }

  for (const [index, extra] of episode.captions.extra.entries()) {
    const from = extra.from;
    const to = extra.to;
    if (to <= from) continue;
    lines.push({ from, to, text: extra.text, index: lines.length + index, extra: true });
  }

  /*
   * Sort by time, then trim each line so it ends where the next begins.
   *
   * Sorting is required, not cosmetic: segments are laid out by scene, but a
   * short scene can place a later-declared segment before an earlier one. The
   * `Captions` component draws the first line whose window contains the frame,
   * so an unsorted list shows whichever line happens to come first in the
   * array — a line that is still "on screen" can be skipped entirely.
   *
   * The trim handles the other half: `groupWords` holds a beat after the last
   * word, and on a short segment that hold can reach past the next line's
   * start. Without it the caption swaps early and the viewer reads the next
   * phrase while the voice is still on the previous one.
   */
  lines.sort((a, b) => a.from - b.from);
  for (let i = 0; i < lines.length - 1; i++) {
    const current = lines[i]!;
    const next = lines[i + 1]!;
    if (current.to > next.from) {
      // Keep at least a couple of frames on screen; if the gap is that tight
      // the line was too long for its window and check/vo will say so.
      current.to = Math.max(current.from + 2, next.from);
    }
  }

  // A caption must not run past the film; clamp rather than throw so a
  // slightly long line does not block a render.
  return lines.map((line) => ({
    ...line,
    to: Math.min(line.to, timeline.durationInFrames),
  }));
}

/** Strip emphasis markers from display text everywhere. */
export function plainText(text: string) {
  return text.replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1');
}

/**
 * Split copy into display tokens. `*word*` marks the accent token, matching
 * the convention used across the shot library.
 */
export type RichWord = { text: string; accent: boolean };

export function parseRichText(text: string): RichWord[] {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((raw) => {
      const accent = /^\*.*\*$/.test(raw) || /^_.*_$/.test(raw);
      return { text: plainText(raw), accent };
    });
}
