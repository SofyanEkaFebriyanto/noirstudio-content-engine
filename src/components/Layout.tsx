/**
 * Scene layout primitives.
 *
 * Vertical-first: 9:16 is the default format, so content is optically centered
 * in the safe area rather than anchored to top percentages. The same component
 * composes correctly on 16:9 because the box is bounded by the shorter axis.
 */
import React from 'react';
import type { ShotContext } from '../engine/theme';
import { captionBand, safeArea, typeScaleFor } from '../engine/theme';

type SceneBodyProps = {
  ctx: ShotContext;
  children: React.ReactNode;
  /** Align content to the top instead of centering (for long lists). */
  align?: 'center' | 'start';
  /** Extra bottom room when captions are on. */
  captionRoom?: boolean;
  /** Gap between direct children, in px. Defaults to one body line. */
  gap?: number;
  style?: React.CSSProperties;
};

/**
 * The inner box every content shot lives in. Handles safe margins, vertical
 * centering and the caption reserve in one place.
 */
export const SceneBody: React.FC<SceneBodyProps> = ({
  ctx,
  children,
  align = 'center',
  captionRoom = true,
  gap,
  style,
}) => {
  const safe = safeArea(ctx.theme, ctx.width, ctx.height);
  const scale = typeScaleFor(ctx.theme, ctx.width, ctx.height);
  const band = captionBand(ctx.theme, ctx.width, ctx.height);
  return (
    <div
      style={{
        position: 'absolute',
        left: safe.x,
        right: safe.x,
        top: safe.top,
        bottom: Math.max(safe.bottom, captionRoom ? band.bottomOffset + band.fontSize * 2.6 : 0),
        display: 'flex',
        flexDirection: 'column',
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        paddingTop: align === 'start' ? safe.height * 0.04 : 0,
        gap: gap ?? scale.body * 0.7,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

type SceneHeaderProps = {
  ctx: ShotContext;
  children: string;
  /** Accent-colored eyebrow above the header. */
  eyebrow?: string;
  color?: string;
  style?: React.CSSProperties;
};

export const SceneHeader: React.FC<SceneHeaderProps> = ({ ctx, children, eyebrow, color, style }) => {
  const scale = typeScaleFor(ctx.theme, ctx.width, ctx.height);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: scale.micro * 0.5, ...style }}>
      {eyebrow ? (
        <div
          style={{
            fontFamily: ctx.theme.fonts.mono,
            fontSize: scale.micro * 0.92,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: ctx.theme.colors.accent,
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <div
        style={{
          fontFamily: ctx.theme.fonts.sans,
          fontSize: scale.heading * 0.92,
          fontWeight: 600,
          lineHeight: 1.06,
          letterSpacing: '-0.015em',
          color: color ?? ctx.theme.colors.text,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/** Hairline rule used to separate a header from its body. */
export const Rule: React.FC<{ ctx: ShotContext; progress?: number; color?: string }> = ({
  ctx,
  progress = 1,
  color,
}) => {
  const scale = typeScaleFor(ctx.theme, ctx.width, ctx.height);
  return (
    <div
      style={{
        width: `${Math.max(0, Math.min(1, progress)) * 100}%`,
        height: 1,
        background: color ?? ctx.theme.colors.line,
        marginBlock: scale.caption * 0.2,
      }}
    />
  );
};
