/**
 * Voice layer. One <Audio> per VO segment at its resolved frame.
 * Segments without files are skipped so a video render is never blocked by VO.
 */
import React from 'react';
import { Audio, Sequence } from 'remotion';
import type { VoAlignment } from '../engine/captions';
import { resolveVoSrc } from './AudioLayer';

type Props = {
  episodeId: string;
  alignments: VoAlignment[];
  fps: number;
  enabled: boolean;
  /** Segment ids that actually have files. */
  available: string[];
};

export const VoiceLayer: React.FC<Props> = ({ episodeId, alignments, fps, enabled, available }) => {
  if (!enabled) return null;
  return (
    <>
      {alignments.map((alignment) => {
        if (!available.includes(alignment.segmentId)) return null;
        const durationInFrames = Math.max(1, Math.round(alignment.durationSeconds * fps));
        return (
          <Sequence
            key={alignment.segmentId}
            from={alignment.startFrame}
            durationInFrames={durationInFrames + 2}
            name={`VO: ${alignment.segmentId}`}
          >
            <Audio src={resolveVoSrc(episodeId, alignment.segmentId)} />
          </Sequence>
        );
      })}
    </>
  );
};
