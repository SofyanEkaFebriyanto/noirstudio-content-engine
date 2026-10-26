/**
 * Typography primitives. All copy in a film goes through these so the type
 * scale, tracking and weights stay one system.
 */
import React from 'react';
import { useCurrentFrame } from 'remotion';
import type { ShotContext } from '../engine/theme';
import { typeScaleFor } from '../engine/theme';
import { EASE, type EaseName } from '../engine/ease';
import { progress } from '../engine/math';
import { parseRichText } from '../engine/captions';

export type TextVariant = 'display' | 'title' | 'heading' | 'body' | 'caption' | 'micro';

type TextProps = {
  ctx: ShotContext;
  variant?: TextVariant;
  /** `*word*` marks an accent word. */
  children: string;
  color?: string;
  align?: React.CSSProperties['textAlign'];
  weight?: number;
  italic?: boolean;
  /** Uppercase + micro tracking. Defaults on for micro/caption. */
  caps?: boolean;
  style?: React.CSSProperties;
  maxWidth?: number | string;
  as?: 'div' | 'span' | 'p';
};

export const Text: React.FC<TextProps> = ({
  ctx,
  variant = 'body',
  children,
  color,
  align,
  weight,
  italic,
  caps,
  style,
  maxWidth,
  as = 'div',
}) => {
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const size = scale[variant];
  const tracking = theme.type.tracking[variant];
  const lineHeight = theme.type.lineHeight[variant];
  const family =
    variant === 'display' || variant === 'title'
      ? theme.fonts.display
      : variant === 'micro' || variant === 'caption'
        ? theme.fonts.sans
        : theme.fonts.sans;

  const tokens = parseRichText(children);
  const Tag = as;

  return (
    <Tag
      style={{
        fontFamily: family,
        fontSize: size,
        lineHeight,
        letterSpacing: `${tracking}em`,
        fontWeight: weight ?? (variant === 'display' || variant === 'title' ? 400 : 500),
        fontStyle: italic ? 'italic' : undefined,
        textTransform: caps ?? variant === 'micro' ? 'uppercase' : undefined,
        color: color ?? theme.colors.text,
        textAlign: align,
        maxWidth,
        margin: 0,
        textWrap: 'balance',
        ...style,
      }}
    >
      {tokens.map((token, index) => (
        <React.Fragment key={index}>
          {token.accent ? (
            <span style={{ color: theme.colors.accent, fontStyle: 'italic' }}>{token.text}</span>
          ) : (
            token.text
          )}
          {index < tokens.length - 1 ? ' ' : null}
        </React.Fragment>
      ))}
    </Tag>
  );
};

type RichRevealProps = {
  ctx: ShotContext;
  text: string;
  variant?: TextVariant;
  /** Frame at which the first word starts. */
  startFrame?: number;
  /** Frames between words. */
  stagger?: number;
  /** Frames each word takes to settle. */
  duration?: number;
  /** px of travel. */
  distance?: number;
  /** px of blur at the start. */
  blur?: number;
  ease?: EaseName;
  align?: React.CSSProperties['textAlign'];
  color?: string;
  style?: React.CSSProperties;
  /** Stagger from the end instead — useful on a shared timeline. */
  reverse?: boolean;
};

/**
 * Word-by-word blur/slide reveal. Three channels (opacity, y, blur) share one
 * progress value; splitting them into separate easings reads as broken.
 */
export const RichReveal: React.FC<RichRevealProps> = ({
  ctx,
  text,
  variant = 'title',
  startFrame = 0,
  stagger = 4,
  duration = 22,
  distance = 48,
  blur = 14,
  ease = 'out',
  align = 'left',
  color,
  style,
  reverse = false,
}) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const tokens = parseRichText(text);
  const easeFn = EASE[ease];

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        columnGap: `${0.26 * scale[variant]}px`,
        rowGap: `${0.06 * scale[variant]}px`,
        fontFamily: theme.fonts.display,
        fontSize: scale[variant],
        lineHeight: theme.type.lineHeight[variant],
        letterSpacing: `${theme.type.tracking[variant]}em`,
        color: color ?? theme.colors.text,
        textAlign: align,
        ...style,
      }}
    >
      {tokens.map((token, index) => {
        const order = reverse ? tokens.length - 1 - index : index;
        const p = easeFn(progress(frame, startFrame + order * stagger, duration));
        return (
          <span
            key={index}
            style={{
              display: 'inline-block',
              opacity: p,
              transform: `translateY(${(1 - p) * distance}px)`,
              filter: p >= 0.999 ? undefined : `blur(${(1 - p) * blur}px)`,
              color: token.accent ? theme.colors.accent : undefined,
              fontStyle: token.accent ? 'italic' : undefined,
            }}
          >
            {token.text}
          </span>
        );
      })}
    </div>
  );
};
