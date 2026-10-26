/**
 * Caption layer. Rendered above every scene at the film level, so a scene
 * never has to know whether captions exist.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { ShotContext } from '../engine/theme';
import { captionBand, safeArea, typeScaleFor } from '../engine/theme';
import type { CaptionLine } from '../engine/captions';
import { EASE } from '../engine/ease';
import { progress } from '../engine/math';

type Props = {
  ctx: ShotContext;
  lines: CaptionLine[];
  style: 'kinetic' | 'plain';
};

export const Captions: React.FC<Props> = ({ ctx, lines, style }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const safe = safeArea(theme, ctx.width, ctx.height);
  const band = captionBand(theme, ctx.width, ctx.height);

  const active = lines.find((line) => frame >= line.from && frame < line.to);
  if (!active) return null;

  const inP = EASE.out(progress(frame, active.from, 8));
  const outP = 1 - progress(frame, active.to - 6, 6);
  const opacity = Math.min(inP, outP);

  const words = active.text.split(' ');
  // For long lines, dim words that are not the current one — a cheap karaoke
  // effect that works without per-word timings.
  const focusIndex = Math.min(
    words.length - 1,
    Math.floor(((frame - active.from) / Math.max(1, active.to - active.from)) * words.length),
  );

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: safe.x,
          right: safe.x,
          bottom: band.bottomOffset,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            padding: `${band.fontSize * 0.34}px ${band.fontSize * 0.7}px`,
            background: theme.dark ? 'rgba(7,8,10,0.66)' : 'rgba(251,248,242,0.88)',
            border: `1px solid ${theme.colors.line}`,
            borderRadius: 4,
            backdropFilter: 'blur(2px)',
            opacity,
            transform: `translateY(${(1 - inP) * 10}px)`,
            fontFamily: theme.fonts.sans,
            fontSize: band.fontSize,
            lineHeight: 1.26,
            letterSpacing: '0.002em',
            fontWeight: 600,
            textAlign: 'center',
            color: theme.colors.text,
          }}
        >
          {style === 'kinetic' && active.to - active.from > 24
            ? words.map((word, index) => (
                <span
                  key={index}
                  style={{
                    color:
                      index === focusIndex
                        ? theme.colors.text
                        : index < focusIndex
                          ? theme.colors.textMuted
                          : theme.colors.textFaint,
                    transition: 'none',
                  }}
                >
                  {word}
                  {index < words.length - 1 ? ' ' : ''}
                </span>
              ))
            : active.text}
        </div>
      </div>
    </AbsoluteFill>
  );
};
