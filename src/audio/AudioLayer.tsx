/**
 * Audio layer. Music beds and cue hits live at the film level, so individual
 * shots never embed sound.
 *
 * Missing files never crash a render: the pack inventory is computed at sync
 * time and passed in, and anything absent is skipped with a console note.
 */
import React from 'react';
import { Audio, Sequence, interpolate, useCurrentFrame, staticFile } from 'remotion';
import type { MusicTrack } from '../engine/spec';

type Pack = { cues: string[]; music: string[] };

/** True when a spec reference resolves to a file that exists. */
export function hasAudio(src: string, pack: Pack): boolean {
  if (!src) return false;
  if (src.startsWith('path:')) return true;
  return pack.cues.includes(src) || pack.music.includes(src);
}

/** Resolve `pack id` or `path:` references to a staticFile URL. */
export function resolveAudioSrc(src: string): string {
  if (src.startsWith('path:')) return staticFile(src.slice('path:'.length));
  return staticFile(`audio/pack/${src}.mp3`);
}

/** Resolve a VO file written by `npm run vo`. */
export function resolveVoSrc(episodeId: string, segmentId: string): string {
  return staticFile(`episodes/${episodeId}/vo/${segmentId}.mp3`);
}

const trackDefaults = (track: MusicTrack) => ({
  volume: track.volume ?? 0.32,
  loop: track.loop ?? true,
  startAtFrame: track.startAtFrame ?? 0,
  fadeInFrames: track.fadeInFrames ?? 24,
  fadeOutFrames: track.fadeOutFrames ?? 48,
});

type MusicProps = {
  track: MusicTrack;
  totalFrames: number;
  fps: number;
  enabled: boolean;
  pack: Pack;
};

export const MusicBed: React.FC<MusicProps> = ({ track, totalFrames, enabled, pack }) => {
  if (!enabled || !hasAudio(track.src, pack)) return null;
  const startAtFrame = trackDefaults(track).startAtFrame;
  return (
    <Sequence from={startAtFrame} durationInFrames={Math.max(1, totalFrames - startAtFrame)} name="Music">
      <MusicVolume track={track} totalFrames={totalFrames} />
    </Sequence>
  );
};

const MusicVolume: React.FC<{ track: MusicTrack; totalFrames: number }> = ({ track, totalFrames }) => {
  const frame = useCurrentFrame();
  const { volume, loop, startAtFrame, fadeInFrames, fadeOutFrames } = trackDefaults(track);
  const absolute = frame + startAtFrame;
  const fadeInEnd = startAtFrame + fadeInFrames;
  const fadeOutStart = Math.max(fadeInEnd + 1, totalFrames - fadeOutFrames);

  const currentVolume = interpolate(
    absolute,
    [startAtFrame, fadeInEnd, fadeOutStart, totalFrames],
    [0, volume, volume, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return <Audio src={resolveAudioSrc(track.src)} volume={currentVolume} loop={loop} />;
};

type CueProps = {
  cue: { at: number; cue: string; volume?: number; durationInFrames?: number; offsetFrames?: number };
  fps: number;
  pack: Pack;
};

export const Cue: React.FC<CueProps> = ({ cue, fps, pack }) => {
  if (!hasAudio(cue.cue, pack)) return null;
  const from = Math.max(0, Math.round(cue.at * fps));
  const duration = cue.durationInFrames;
  const offsetFrames = cue.offsetFrames ?? 0;
  return (
    <Sequence from={from} durationInFrames={duration ?? undefined} name={`Cue: ${cue.cue}`}>
      <Audio
        src={resolveAudioSrc(cue.cue)}
        volume={cue.volume ?? 0.8}
        startFrom={offsetFrames > 0 ? offsetFrames : undefined}
      />
    </Sequence>
  );
};
