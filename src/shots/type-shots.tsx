/**
 * Typography shots. Copy-led scenes; the work is in hierarchy and reveal.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { z } from 'zod';
import { Frame } from '../components/Frame';
import { Mark, Wordmark } from '../components/Logo';
import { RichReveal, Text } from '../components/Text';
import { footerAnchor, safeArea, typeScaleFor } from '../engine/theme';
import { EASE } from '../engine/ease';
import { progress } from '../engine/math';
import {
  endCardSchema,
  listStackSchema,
  quoteSchema,
  statSlamSchema,
  titleCardSchema,
  wordCycleSchema,
} from './schemas';
import type { ShotContext } from '../engine/theme';

/* ──────────────────────────── title-card ──────────────────────────── */

type TitleCardProps = z.infer<typeof titleCardSchema>;

export const TitleCard: React.FC<{ props: TitleCardProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const centered = props.align === 'center';

  const rule = EASE.snappy(progress(frame, 0, 22));
  const eyebrowIn = EASE.out(progress(frame, 4, 18));
  const footnoteIn = EASE.out(progress(frame, 30, 20));
  const ghostIn = EASE.inOut(progress(frame, 0, 40));

  return (
    <Frame ctx={ctx}>
      {props.ghost ? (
        <div
          style={{
            position: 'absolute',
            right: -scale.display * 0.12,
            bottom: -scale.display * 0.3,
            fontFamily: theme.fonts.display,
            fontSize: scale.display * 2.6,
            lineHeight: 0.8,
            color: theme.colors.text,
            opacity: 0.04 * ghostIn,
            fontStyle: 'italic',
          }}
        >
          {props.ghost}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: safe.x,
          top: safe.top + safe.height * 0.32,
          width: safe.width,
          display: 'flex',
          flexDirection: 'column',
          alignItems: centered ? 'center' : 'flex-start',
          gap: scale.heading * 0.36,
        }}
      >
        {props.eyebrow ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: scale.micro * 0.8, opacity: eyebrowIn }}>
            <div
              style={{
                width: scale.micro * 3.2 * rule,
                height: 2,
                background: theme.colors.accent,
              }}
            />
            <span
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: scale.micro,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: theme.colors.accent,
              }}
            >
              {props.eyebrow}
            </span>
          </div>
        ) : null}

        <RichReveal
          ctx={ctx}
          text={props.title}
          variant="title"
          startFrame={8}
          stagger={theme.motion.stagger + 1}
          duration={theme.motion.slow}
          distance={56}
          blur={16}
          align={props.align}
        />

        {props.subtitle ? (
          <Text
            ctx={ctx}
            variant="body"
            color={theme.colors.textMuted}
            align={props.align}
            maxWidth={centered ? safe.width * 0.86 : safe.width * 0.82}
            style={{
              opacity: EASE.out(progress(frame, 26, 20)),
              transform: `translateY(${(1 - EASE.out(progress(frame, 26, 20))) * 14}px)`,
            }}
          >
            {props.subtitle}
          </Text>
        ) : null}
      </div>

      {props.footnote ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            right: safe.x,
            bottom: footerAnchor(theme, ctx.width, ctx.height),
            display: 'flex',
            justifyContent: centered ? 'center' : 'space-between',
            alignItems: 'flex-end',
            opacity: footnoteIn,
            borderTop: `1px solid ${theme.colors.line}`,
            paddingTop: scale.micro * 0.8,
          }}
        >
          <span
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: scale.micro * 0.88,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: theme.colors.textFaint,
            }}
          >
            {props.footnote}
          </span>
          <Mark ctx={ctx} size={scale.micro * 1.5} color={theme.colors.textFaint} glyph={false} />
        </div>
      ) : null}
    </Frame>
  );
};


/* ──────────────────────────── list-stack ──────────────────────────── */

type ListStackProps = z.infer<typeof listStackSchema>;

export const ListStack: React.FC<{ props: ListStackProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const start = 8;

  return (
    <Frame ctx={ctx}>
      {props.header ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            top: safe.top + safe.height * 0.1,
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: theme.colors.accent,
            opacity: EASE.out(progress(frame, 0, 16)),
          }}
        >
          {props.header}
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: safe.x,
          top: safe.top + safe.height * 0.2,
          width: safe.width,
          display: 'flex',
          flexDirection: 'column',
          gap: scale.body * 0.5,
        }}
      >
        {props.items.map((item, index) => {
          const itemStart = start + index * props.stagger;
          const p = EASE.out(progress(frame, itemStart, theme.motion.base));
          const isHighlight = index === props.highlight;
          return (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: scale.body * 0.48,
                padding: `${scale.body * 0.34}px ${scale.body * 0.42}px`,
                borderLeft: `3px solid ${isHighlight ? theme.colors.accent : theme.colors.line}`,
                background: isHighlight ? theme.colors.accentSoft : 'transparent',
                opacity: p,
                transform: `translateX(${(1 - p) * -28}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: scale.caption,
                  color: isHighlight ? theme.colors.accent : theme.colors.textFaint,
                  minWidth: scale.caption * 1.8,
                }}
              >
                {item.index || String(index + 1).padStart(2, '0')}
              </span>
              <div style={{ flex: 1 }}>
                <Text ctx={ctx} variant="heading" style={{ fontSize: scale.heading * 0.84, lineHeight: 1.1 }}>
                  {item.text}
                </Text>
                {item.note ? (
                  <Text ctx={ctx} variant="caption" color={theme.colors.textMuted} style={{ marginTop: scale.caption * 0.24 }}>
                    {item.note}
                  </Text>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Frame>
  );
};


/* ──────────────────────────── stat-slam ──────────────────────────── */

type StatSlamProps = z.infer<typeof statSlamSchema>;

export const StatSlam: React.FC<{ props: StatSlamProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const centered = props.align === 'center';

  const slam = EASE.snappy(progress(frame, 4, 14));
  const rule = EASE.inOut(progress(frame, 12, 20));
  const label = EASE.out(progress(frame, 16, 18));

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill style={{ alignItems: centered ? 'center' : 'flex-start', justifyContent: 'center' }}>
        <div
          style={{
            paddingLeft: centered ? 0 : safe.x,
            paddingRight: centered ? 0 : safe.x,
            display: 'flex',
            flexDirection: 'column',
            alignItems: centered ? 'center' : 'flex-start',
            gap: scale.heading * 0.2,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: scale.display * 0.06,
              transform: `scale(${1.18 - 0.18 * slam})`,
              opacity: Math.min(1, slam * 1.6),
            }}
          >
            <span
              style={{
                fontFamily: theme.fonts.display,
                fontSize: scale.display,
                lineHeight: 0.86,
                letterSpacing: '-0.04em',
                color: theme.colors.text,
              }}
            >
              {props.value}
            </span>
            {props.unit ? (
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: scale.body,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: theme.colors.accent,
                }}
              >
                {props.unit}
              </span>
            ) : null}
          </div>

          <div
            style={{
              width: scale.display * 0.62 * rule,
              height: 2,
              background: theme.colors.accent,
              marginTop: scale.caption * 0.2,
            }}
          />

          {props.label ? (
            <div
              style={{
                fontFamily: theme.fonts.sans,
                fontSize: scale.heading * 0.62,
                fontWeight: 500,
                lineHeight: 1.1,
                maxWidth: safe.width * 0.82,
                textAlign: centered ? 'center' : 'left',
                color: theme.colors.text,
                opacity: label,
                transform: `translateY(${(1 - label) * 14}px)`,
              }}
            >
              {props.label}
            </div>
          ) : null}

          {props.caption ? (
            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: scale.caption * 0.86,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: theme.colors.textMuted,
                opacity: label,
              }}
            >
              {props.caption}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>
    </Frame>
  );
};


/* ──────────────────────────── quote-beat ──────────────────────────── */

type QuoteProps = z.infer<typeof quoteSchema>;

export const QuoteBeat: React.FC<{ props: QuoteProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const markIn = EASE.out(progress(frame, 0, 20));
  const attrIn = EASE.out(progress(frame, 30, 18));

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill style={{ paddingLeft: safe.x, paddingRight: safe.x, justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: scale.display * 0.9,
            lineHeight: 0.6,
            color: theme.colors.accent,
            opacity: markIn * 0.9,
            marginBottom: scale.body * 0.4,
          }}
        >
          “
        </div>
        <RichReveal
          ctx={ctx}
          text={props.quote}
          variant="heading"
          startFrame={6}
          stagger={3}
          duration={24}
          distance={30}
          blur={10}
          style={{ lineHeight: 1.16, maxWidth: safe.width }}
        />
        {props.attribution ? (
          <div
            style={{
              marginTop: scale.body * 1.1,
              display: 'flex',
              alignItems: 'center',
              gap: scale.caption * 0.6,
              opacity: attrIn,
              transform: `translateY(${(1 - attrIn) * 10}px)`,
            }}
          >
            <div style={{ width: scale.caption * 2.4, height: 1, background: theme.colors.lineStrong }} />
            <span style={{ fontFamily: theme.fonts.sans, fontSize: scale.caption, fontWeight: 600 }}>
              {props.attribution}
            </span>
            {props.role ? (
              <span
                style={{
                  fontFamily: theme.fonts.mono,
                  fontSize: scale.micro * 0.9,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: theme.colors.textMuted,
                }}
              >
                {props.role}
              </span>
            ) : null}
          </div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};


/* ──────────────────────────── word-cycle ──────────────────────────── */

type WordCycleProps = z.infer<typeof wordCycleSchema>;

export const WordCycle: React.FC<{ props: WordCycleProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const index = Math.floor(frame / props.framesPerWord) % props.words.length;
  const local = frame % props.framesPerWord;
  const p = EASE.out(progress(local, 0, Math.min(10, props.framesPerWord * 0.6)));
  const out = EASE.in(progress(local, props.framesPerWord - 6, 6));
  const word = props.words[index]!;

  return (
    <Frame ctx={ctx}>
      {props.heading ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            top: safe.top + safe.height * 0.16,
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: theme.colors.textMuted,
          }}
        >
          {props.heading}
        </div>
      ) : null}
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: scale.title * 1.35,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            color: index === props.accentIndex ? theme.colors.accent : theme.colors.text,
            opacity: p * (1 - out),
            transform: `translateY(${(1 - p) * 40 - out * 30}px)`,
            filter: `blur(${(1 - p) * 8 + out * 6}px)`,
            whiteSpace: 'nowrap',
          }}
        >
          {word}
        </div>
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: safe.x,
          bottom: footerAnchor(theme, ctx.width, ctx.height),
          display: 'flex',
          gap: scale.micro * 0.5,
        }}
      >
        {props.words.map((_, i) => (
          <div
            key={i}
            style={{
              width: scale.micro * 1.2,
              height: 2,
              background: i === index ? theme.colors.accent : theme.colors.lineStrong,
            }}
          />
        ))}
      </div>
    </Frame>
  );
};


/* ──────────────────────────── end-card ──────────────────────────── */

type EndCardProps = z.infer<typeof endCardSchema>;

export const EndCard: React.FC<{ props: EndCardProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const ctaIn = EASE.out(progress(frame, 40, 22));
  const pulse = 1 + 0.025 * Math.sin((frame / ctx.fps) * Math.PI * 2 * 0.8);

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          gap: scale.heading * 0.8,
          paddingLeft: safe.x,
          paddingRight: safe.x,
        }}
      >
        <div style={{ transform: 'scale(1)', opacity: EASE.out(progress(frame, 0, 20)) }}>
          <Wordmark ctx={ctx} showAt={0} size="title" align="center" />
        </div>

        <Text
          ctx={ctx}
          variant="body"
          align="center"
          color={theme.colors.textMuted}
          style={{
            opacity: EASE.out(progress(frame, 18, 20)),
            transform: `translateY(${(1 - EASE.out(progress(frame, 18, 20))) * 12}px)`,
            maxWidth: safe.width * 0.8,
          }}
        >
          {props.line}
        </Text>

        {props.cta ? (
          <div
            style={{
              marginTop: scale.body * 0.4,
              padding: `${scale.body * 0.44}px ${scale.body * 1.1}px`,
              border: `1px solid ${theme.colors.accent}`,
              background: theme.colors.accent,
              color: theme.colors.accentInk,
              fontFamily: theme.fonts.sans,
              fontWeight: 600,
              fontSize: scale.body * 0.82,
              letterSpacing: '0.02em',
              opacity: ctaIn,
              transform: `scale(${0.96 + 0.04 * ctaIn * pulse})`,
            }}
          >
            {props.cta}
          </div>
        ) : null}
      </AbsoluteFill>

      {props.handle ? (
        <div
          style={{
            position: 'absolute',
            bottom: footerAnchor(theme, ctx.width, ctx.height),
            width: '100%',
            textAlign: 'center',
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: theme.colors.textFaint,
            opacity: ctaIn,
          }}
        >
          {props.handle}
        </div>
      ) : null}
    </Frame>
  );
};

