/**
 * Data shots. Bar races, animated counters and mini charts — drawn in code,
 * no chart library and no randomness so every render is identical.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { z } from 'zod';
import { Frame } from '../components/Frame';
import { Text } from '../components/Text';
import { safeArea, typeScaleFor } from '../engine/theme';
import { EASE } from '../engine/ease';
import { progress } from '../engine/math';
import type { ShotContext } from '../engine/theme';
import {
  barSchema,
  counterSchema,
  vsSchema,
} from './schemas';

/* ──────────────────────────── bar-chart ──────────────────────────── */


type BarChartProps = z.infer<typeof barSchema>;

export const BarChart: React.FC<{ props: BarChartProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const max = Math.max(...props.bars.map((b) => b.value), 1);
  const headingIn = EASE.out(progress(frame, 0, 16));
  const count = props.bars.length;
  const rowGap = scale.body * 0.72;

  return (
    <Frame ctx={ctx}>
      {props.heading ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            right: safe.x,
            top: safe.top + safe.height * 0.06,
            opacity: headingIn,
          }}
        >
          <Text ctx={ctx} variant="heading">
            {props.heading}
          </Text>
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: safe.x,
          right: safe.x,
          top: safe.top + safe.height * 0.24,
          display: 'flex',
          flexDirection: 'column',
          gap: rowGap,
        }}
      >
        {props.bars.map((bar, index) => {
          const start = props.grow === 'stagger' ? 10 + index * 9 : 10;
          const p = EASE.snappy(progress(frame, start, 26));
          const width = (bar.value / max) * 100 * p;
          const isHighlight = index === props.highlight;
          return (
            <div key={index}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: scale.micro * 0.35,
                  opacity: p,
                }}
              >
                <span style={{ fontFamily: theme.fonts.sans, fontSize: scale.caption * 0.95, fontWeight: 500 }}>
                  {bar.label}
                </span>
                <span
                  style={{
                    fontFamily: theme.fonts.mono,
                    fontSize: scale.caption * 0.9,
                    color: isHighlight ? theme.colors.accent : theme.colors.textMuted,
                  }}
                >
                  {bar.display || `${bar.value}${props.unit}`}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: scale.body * 0.66,
                  background: theme.colors.surface,
                  border: `1px solid ${theme.colors.line}`,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${width}%`,
                    height: '100%',
                    background: isHighlight ? theme.colors.accent : theme.colors.textFaint,
                    opacity: isHighlight ? 1 : 0.5,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {props.unit ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            bottom: safe.bottom + safe.height * 0.06,
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro * 0.85,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: theme.colors.textFaint,
            opacity: headingIn,
          }}
        >
          unit: {props.unit}
        </div>
      ) : null}
      <div style={{ position: 'absolute', left: safe.x, right: safe.x, top: safe.top + safe.height * 0.2, height: 1, background: theme.colors.line }} />
      <div style={{ position: 'absolute', display: 'none' }}>{count}</div>
    </Frame>
  );
};


/* ──────────────────────────── counter ──────────────────────────── */


type CounterProps = z.infer<typeof counterSchema>;

export const Counter: React.FC<{ props: CounterProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const p = EASE.out(progress(frame, 6, props.countFrames));
  const value = props.from + (props.to - props.from) * p;
  const display = value.toLocaleString('en-US', {
    minimumFractionDigits: props.decimals,
    maximumFractionDigits: props.decimals,
  });
  const labelIn = EASE.out(progress(frame, 6 + props.countFrames, 18));

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingLeft: safe.x, paddingRight: safe.x }}>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: scale.display * 1.05,
            lineHeight: 0.9,
            letterSpacing: '-0.045em',
            display: 'flex',
            alignItems: 'baseline',
            gap: scale.body * 0.16,
          }}
        >
          {props.prefix ? (
            <span style={{ fontFamily: theme.fonts.mono, fontSize: scale.heading, color: theme.colors.accent }}>
              {props.prefix}
            </span>
          ) : null}
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{display}</span>
          {props.suffix ? (
            <span style={{ fontFamily: theme.fonts.mono, fontSize: scale.heading, color: theme.colors.accent }}>
              {props.suffix}
            </span>
          ) : null}
        </div>
        {props.label ? (
          <div
            style={{
              marginTop: scale.body * 0.8,
              fontFamily: theme.fonts.sans,
              fontSize: scale.body * 0.82,
              color: theme.colors.textMuted,
              textAlign: 'center',
              maxWidth: safe.width * 0.78,
              opacity: labelIn,
              transform: `translateY(${(1 - labelIn) * 12}px)`,
            }}
          >
            {props.label}
          </div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};


/* ──────────────────────────── vs-meter ──────────────────────────── */


type VsProps = z.infer<typeof vsSchema>;

export const VsMeter: React.FC<{ props: VsProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const p = EASE.inOut(progress(frame, 12, 34));
  const share = props.leftShare * p;
  const leftWins = props.leftShare >= 0.5;
  const headingIn = EASE.out(progress(frame, 0, 16));
  const noteIn = EASE.out(progress(frame, 46, 18));

  return (
    <Frame ctx={ctx}>
      {props.heading ? (
        <div style={{ position: 'absolute', left: safe.x, right: safe.x, top: safe.top + safe.height * 0.08, opacity: headingIn }}>
          <Text ctx={ctx} variant="heading">
            {props.heading}
          </Text>
        </div>
      ) : null}

      <AbsoluteFill style={{ justifyContent: 'center', paddingLeft: safe.x, paddingRight: safe.x }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: scale.body * 0.5 }}>
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: scale.body * 0.8,
              fontWeight: 600,
              color: leftWins ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            {props.leftLabel}
          </div>
          <div
            style={{
              fontFamily: theme.fonts.sans,
              fontSize: scale.body * 0.8,
              fontWeight: 600,
              color: !leftWins ? theme.colors.accent : theme.colors.textMuted,
            }}
          >
            {props.rightLabel}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            width: '100%',
            height: scale.body * 0.9,
            border: `1px solid ${theme.colors.line}`,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${share * 100}%`,
              background: leftWins ? theme.colors.accent : theme.colors.textFaint,
              opacity: leftWins ? 1 : 0.45,
            }}
          />
          <div
            style={{
              width: `${(1 - share) * 100}%`,
              background: !leftWins ? theme.colors.accent : theme.colors.textFaint,
              opacity: !leftWins ? 1 : 0.45,
            }}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: scale.caption * 0.5,
            fontFamily: theme.fonts.mono,
            fontSize: scale.caption * 0.85,
            color: theme.colors.textMuted,
          }}
        >
          <span>{Math.round(share * 100)}%</span>
          <span>{Math.round((1 - share) * 100)}%</span>
        </div>

        {props.winnerNote ? (
          <div
            style={{
              marginTop: scale.body * 0.8,
              textAlign: 'center',
              fontFamily: theme.fonts.sans,
              fontSize: scale.caption,
              color: theme.colors.textMuted,
              opacity: noteIn,
            }}
          >
            {props.winnerNote}
          </div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};

