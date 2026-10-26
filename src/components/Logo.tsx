/**
 * Brand mark and wordmark, drawn from code. No image assets, no loading
 * states — the logo can never fail to render.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { ShotContext } from '../engine/theme';
import { BRAND, MARK, glyphPath, hexagonPath } from '../engine/brand';
import { typeScaleFor } from '../engine/theme';
import { EASE } from '../engine/ease';
import { progress } from '../engine/math';

type MarkProps = {
  ctx: ShotContext;
  /** Width in px. Height follows the hexagon's native 1.158 ratio. */
  size: number;
  color?: string;
  /** 0–1 draw-on progress for the hexagon stroke. */
  draw?: number;
  /** Render the N inside the hexagon. Off gives a bare hexagon. */
  glyph?: boolean;
  /** Fill the hexagon instead of stroking it (for small sizes and watermarks). */
  solid?: boolean;
};

/**
 * The studio mark: a regular hexagon with a solid "N" centered inside.
 * Geometry lives in `engine/brand.ts`, measured from the source PNG.
 */
export const Mark: React.FC<MarkProps> = ({
  ctx,
  size,
  color,
  draw = 1,
  glyph = true,
  solid = false,
}) => {
  const { theme } = ctx;
  const ink = color ?? theme.colors.accent;
  const height = size * (MARK.hexagon.height / MARK.hexagon.width);
  // The hexagon perimeter is ~518 units. The dash must be *longer* than the
  // path: a shorter dash repeats and leaves stray segments where the pattern
  // laps around, which shows up as a notch and a tail at the start corner.
  const outlineLength = 640;

  return (
    <svg
      width={size}
      height={height}
      viewBox={MARK.viewBox}
      fill="none"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      {solid ? (
        <path d={hexagonPath(0)} fill={ink} />
      ) : (
        <path
          d={hexagonPath()}
          stroke={ink}
          strokeWidth={MARK.hexagon.strokeWidth}
          strokeLinejoin="miter"
          // At full draw, omit the dash entirely: a dash pattern applied to a
          // closed path can leave a seam at the start vertex.
          strokeDasharray={draw >= 0.999 ? undefined : `${outlineLength} ${outlineLength}`}
          strokeDashoffset={draw >= 0.999 ? undefined : outlineLength * (1 - draw)}
        />
      )}
      {/* The glyph is three overlapping shapes (two stems, one diagonal), so it
          needs the default nonzero rule — even-odd would punch holes where they
          overlap. On a solid badge the N knocks out to the ground color. */}
      {glyph ? <path d={glyphPath()} fill={solid ? theme.colors.bg : ink} /> : null}
    </svg>
  );
};

type WordmarkProps = {
  ctx: ShotContext;
  /** Frame at which the wordmark should be fully visible. */
  showAt?: number;
  size?: 'title' | 'heading' | 'display';
  align?: 'left' | 'center';
  color?: string;
};

export const Wordmark: React.FC<WordmarkProps> = ({
  ctx,
  showAt = 0,
  size = 'heading',
  align = 'left',
  color,
}) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const p = EASE.out(progress(frame, showAt, 18));

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: `${scale[size] * 0.18}px`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
        fontFamily: theme.fonts.sans,
        fontWeight: 700,
        fontSize: scale[size],
        letterSpacing: '-0.01em',
        textTransform: 'uppercase',
        color: color ?? theme.colors.text,
        lineHeight: 1,
      }}
    >
      <span>{BRAND.wordmarkParts[0]!.text}</span>
      <span style={{ color: theme.colors.accent }}>{BRAND.wordmarkParts[1]!.text}</span>
    </div>
  );
};

type LockupProps = {
  ctx: ShotContext;
  /** Start frame of the assembly animation. */
  at?: number;
  markSize?: number;
  wordSize?: 'title' | 'heading' | 'display';
  tagline?: boolean;
  align?: 'left' | 'center';
};

/** Mark + wordmark + optional tagline, assembled in a single motion. */
export const Lockup: React.FC<LockupProps> = ({
  ctx,
  at = 0,
  markSize = 96,
  wordSize = 'heading',
  tagline = true,
  align = 'left',
}) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const centered = align === 'center';

  const grow = EASE.backOut(progress(frame, at, 26));
  const draw = EASE.inOut(progress(frame, at + 4, 30));
  const wordsIn = EASE.out(progress(frame, at + 14, 24));
  const tagIn = EASE.out(progress(frame, at + 26, 20));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: centered ? 'center' : 'flex-start',
        gap: scale.heading * 0.28,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: scale.heading * 0.34,
          transform: `scale(${0.86 + 0.14 * grow})`,
          opacity: Math.min(1, grow * 1.4),
        }}
      >
        {/* The hexagon is 1.158:1, so a 0.82 factor keeps the optical block
            the same size as the square mark it replaced. */}
        <Mark ctx={ctx} size={markSize * 0.82} draw={draw} color={theme.colors.accent} />
        <div
          style={{
            opacity: wordsIn,
            transform: `translateX(${(1 - wordsIn) * -16}px)`,
          }}
        >
          <Wordmark ctx={ctx} showAt={at + 14} size={wordSize} color={theme.colors.text} />
        </div>
      </div>
      {tagline ? (
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: theme.colors.textMuted,
            opacity: tagIn,
            transform: `translateY(${(1 - tagIn) * 8}px)`,
          }}
        >
          {BRAND.tagline}
        </div>
      ) : null}
    </div>
  );
};
