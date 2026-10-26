/**
 * Layout shots. Structure-led scenes drawn entirely in code: grids, diagrams,
 * timelines, comparisons. No images, no dependencies.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { z } from 'zod';
import { Frame } from '../components/Frame';
import { RichReveal, Text } from '../components/Text';
import { Rule, SceneBody, SceneHeader } from '../components/Layout';
import { safeArea, typeScaleFor } from '../engine/theme';
import { EASE } from '../engine/ease';
import { progress, seededRandom } from '../engine/math';
import type { ShotContext } from '../engine/theme';
import { compareSchema, processSchema, gridMapSchema, timelineSchema, statementSchema } from './schemas';

/* ──────────────────────────── compare-split ──────────────────────────── */

type CompareProps = z.infer<typeof compareSchema>;

export const CompareSplit: React.FC<{ props: CompareProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const vertical = ctx.height > ctx.width;

  const divider = EASE.inOut(progress(frame, 6, 22));

  const panel = (side: 'left' | 'right', data: CompareProps['left'], delay: number) => {
    const isWinner = props.winner === side;
    const p = EASE.out(progress(frame, delay, 22));
    return (
      <div
        style={{
          flex: 1,
          padding: `${scale.body * 0.78}px ${scale.body * 0.86}px`,
          border: `1px solid ${isWinner ? theme.colors.accent : theme.colors.line}`,
          background: isWinner ? theme.colors.accentSoft : theme.colors.surface,
          opacity: p,
          transform: `translateY(${(1 - p) * 26}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: scale.body * 0.42,
          minWidth: 0,
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro * 0.92,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: isWinner ? theme.colors.accent : theme.colors.textFaint,
          }}
        >
          {data.label}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: scale.heading * (vertical ? 0.86 : 0.92),
            lineHeight: 1.02,
            letterSpacing: '-0.015em',
            color: theme.colors.text,
          }}
        >
          {data.title}
        </div>
        {data.points.length ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: scale.caption * 0.42,
              marginTop: scale.caption * 0.2,
            }}
          >
            {data.points.map((point, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: scale.caption * 0.5,
                  fontFamily: theme.fonts.sans,
                  fontSize: scale.caption * 0.94,
                  lineHeight: 1.3,
                  color: theme.colors.textMuted,
                }}
              >
                <span style={{ color: isWinner ? theme.colors.accent : theme.colors.textFaint, flexShrink: 0 }}>—</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Frame ctx={ctx}>
      <SceneBody ctx={ctx} gap={scale.body * 0.6}>
        {props.heading ? <SceneHeader ctx={ctx} color={theme.colors.textMuted}>{props.heading}</SceneHeader> : null}
        <div
          style={{
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            gap: scale.body * 0.5,
            flex: vertical ? undefined : 1,
            minHeight: 0,
          }}
        >
          {panel('left', props.left, 10)}
          <div
            style={{
              alignSelf: 'center',
              width: vertical ? `${divider * 100}%` : 2,
              height: vertical ? 2 : `${divider * 100}%`,
              background: theme.colors.lineStrong,
              flexShrink: 0,
            }}
          />
          {panel('right', props.right, 18)}
        </div>
      </SceneBody>
    </Frame>
  );
};

/* ──────────────────────────── process-flow ──────────────────────────── */

type ProcessProps = z.infer<typeof processSchema>;

export const ProcessFlow: React.FC<{ props: ProcessProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const horizontal = props.orientation === 'horizontal';
  const stepStart = 12;
  const gapFrames = 14;
  const rowGap = scale.body * 1.05;
  const badge = scale.caption * 2.1;

  return (
    <Frame ctx={ctx}>
      <SceneBody ctx={ctx} gap={scale.body * 0.9}>
        {props.heading ? <SceneHeader ctx={ctx}>{props.heading}</SceneHeader> : null}

        <div
          style={{
            display: 'flex',
            flexDirection: horizontal ? 'row' : 'column',
            gap: horizontal ? scale.body * 0.5 : 0,
            alignItems: horizontal ? 'flex-start' : 'stretch',
          }}
        >
          {props.steps.map((step, index) => {
            const start = stepStart + index * gapFrames;
            const p = EASE.out(progress(frame, start, 20));
            const connector = EASE.inOut(progress(frame, start + 6, 14));
            const isLast = index === props.steps.length - 1;

            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  flexDirection: horizontal ? 'column' : 'row',
                  gap: scale.body * 0.42,
                  alignItems: horizontal ? 'stretch' : 'flex-start',
                  flex: horizontal ? 1 : undefined,
                  minWidth: 0,
                  paddingBottom: horizontal ? 0 : rowGap,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    flexShrink: 0,
                    // Stretch so the connector can fill the row and bridge the gap.
                    alignSelf: horizontal ? 'center' : 'stretch',
                  }}
                >
                  <div
                    style={{
                      width: badge,
                      height: badge,
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: index === 0 ? theme.colors.accent : theme.colors.surface,
                      color: index === 0 ? theme.colors.accentInk : theme.colors.text,
                      border: `1px solid ${index === 0 ? theme.colors.accent : theme.colors.line}`,
                      fontFamily: theme.fonts.mono,
                      fontSize: scale.caption * 0.78,
                      fontWeight: 600,
                      opacity: p,
                      transform: `scale(${0.82 + 0.18 * p})`,
                    }}
                  >
                    {index + 1}
                  </div>

                  {/*
                    The connector stretches to the row bottom and then bridges
                    the row gap with a negative margin. It can never detach
                    from the badge regardless of how long the copy gets.
                  */}
                  {!isLast && !horizontal ? (
                    <div
                      style={{
                        width: 2,
                        flex: 1,
                        minHeight: scale.micro * 0.6,
                        marginTop: scale.micro * 0.34,
                        marginBottom: -rowGap,
                        background: theme.colors.lineStrong,
                        transform: `scaleY(${connector})`,
                        transformOrigin: 'top',
                      }}
                    />
                  ) : null}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: scale.micro * 0.24,
                    opacity: p,
                    transform: `translateY(${(1 - p) * 10}px)`,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      fontFamily: theme.fonts.sans,
                      fontSize: scale.body * 0.84,
                      fontWeight: 600,
                      lineHeight: 1.14,
                    }}
                  >
                    {step.title}
                  </div>
                  {step.note ? (
                    <div
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: scale.caption * 0.9,
                        color: theme.colors.textMuted,
                        lineHeight: 1.28,
                      }}
                    >
                      {step.note}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </SceneBody>
    </Frame>
  );
};

/* ──────────────────────────── grid-map ──────────────────────────── */

type GridMapProps = z.infer<typeof gridMapSchema>;

export const GridMap: React.FC<{ props: GridMapProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const rand = seededRandom(1337);
  const delays = props.items.map(() => rand() * 14);

  return (
    <Frame ctx={ctx}>
      <SceneBody ctx={ctx} gap={scale.body * 0.7}>
        {props.heading ? <SceneHeader ctx={ctx}>{props.heading}</SceneHeader> : null}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${props.columns}, minmax(0, 1fr))`,
            gap: scale.micro * 0.6,
          }}
        >
          {props.items.map((item, index) => {
            const row = Math.floor(index / props.columns);
            const col = index % props.columns;
            const wave = row * 3 + col * 2;
            const start = props.arrival === 'wave' ? 8 + wave : 8 + delays[index]!;
            const p = EASE.out(progress(frame, start, 18));
            const accent = props.accentEvery > 0 && index % props.accentEvery === 0;
            return (
              <div
                key={index}
                style={{
                  padding: `${scale.micro * 0.8}px ${scale.micro * 0.7}px`,
                  border: `1px solid ${accent ? theme.colors.accent : theme.colors.line}`,
                  background: accent ? theme.colors.accentSoft : theme.colors.surface,
                  minHeight: scale.caption * 2.4,
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: theme.fonts.sans,
                  fontSize: scale.caption * 0.86,
                  fontWeight: 500,
                  lineHeight: 1.14,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 16}px) scale(${0.96 + 0.04 * p})`,
                }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </SceneBody>
    </Frame>
  );
};

/* ──────────────────────────── timeline-bar ──────────────────────────── */

type TimelineProps = z.infer<typeof timelineSchema>;

export const TimelineBar: React.FC<{ props: TimelineProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const lineProgress = EASE.inOut(progress(frame, 6, 30));
  const activeP = EASE.out(progress(frame, 8 + Math.max(0, props.active) * 10, 18));
  const stepGap = scale.body * 1.1;

  return (
    <Frame ctx={ctx}>
      <SceneBody ctx={ctx} gap={scale.body * 0.8}>
        {props.heading ? <SceneHeader ctx={ctx}>{props.heading}</SceneHeader> : null}

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              left: scale.micro * 0.52,
              top: scale.caption * 0.4,
              width: 2,
              height: `calc(${lineProgress * 100}% - ${stepGap * 0.4}px)`,
              background: theme.colors.accent,
              opacity: 0.55,
            }}
          />

          {props.events.map((event, index) => {
            const p = EASE.out(progress(frame, 6 + index * 10, 18));
            const isActive = index === props.active;
            return (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: scale.body * 0.5,
                  paddingBottom: index === props.events.length - 1 ? 0 : stepGap,
                  opacity: p,
                  transform: `translateX(${(1 - p) * -14}px)`,
                }}
              >
                <div
                  style={{
                    width: scale.micro * 1.05,
                    height: scale.micro * 1.05,
                    marginTop: scale.caption * 0.34,
                    background: isActive ? theme.colors.accent : theme.colors.bg,
                    border: `2px solid ${isActive ? theme.colors.accent : theme.colors.lineStrong}`,
                    flexShrink: 0,
                    position: 'relative',
                    zIndex: 1,
                    transform: isActive ? `scale(${1 + 0.3 * activeP})` : undefined,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: theme.fonts.mono,
                      fontSize: scale.micro * 0.9,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      color: isActive ? theme.colors.accent : theme.colors.textFaint,
                    }}
                  >
                    {event.when}
                  </div>
                  <div
                    style={{
                      fontFamily: theme.fonts.sans,
                      fontSize: scale.body * 0.8,
                      fontWeight: 600,
                      lineHeight: 1.16,
                      marginTop: scale.micro * 0.1,
                    }}
                  >
                    {event.title}
                  </div>
                  {event.note ? (
                    <div
                      style={{
                        fontFamily: theme.fonts.sans,
                        fontSize: scale.caption * 0.84,
                        color: theme.colors.textMuted,
                        lineHeight: 1.28,
                        marginTop: 2,
                      }}
                    >
                      {event.note}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <Rule ctx={ctx} progress={lineProgress} />
      </SceneBody>
    </Frame>
  );
};

/* ──────────────────────────── big-statement ──────────────────────────── */

type StatementProps = z.infer<typeof statementSchema>;

export const BigStatement: React.FC<{ props: StatementProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const centered = props.align === 'center';

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill style={{ alignItems: centered ? 'center' : 'flex-start', justifyContent: 'center' }}>
        <SceneBody ctx={ctx} style={{ alignItems: centered ? 'center' : 'flex-start', justifyContent: 'center', gap: scale.body * 0.5 }}>
          {props.kicker ? (
            <div
              style={{
                fontFamily: theme.fonts.mono,
                fontSize: scale.micro,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: theme.colors.accent,
                opacity: EASE.out(progress(frame, 0, 16)),
                textAlign: centered ? 'center' : 'left',
              }}
            >
              {props.kicker}
            </div>
          ) : null}
          {props.lines.map((line, index) => (
            <RichReveal
              key={index}
              ctx={ctx}
              text={line}
              variant={props.size}
              startFrame={6 + index * 8}
              stagger={3}
              duration={24}
              distance={40}
              blur={12}
              align={props.align}
              style={{ justifyContent: centered ? 'center' : 'flex-start', width: '100%' }}
            />
          ))}
        </SceneBody>
      </AbsoluteFill>
    </Frame>
  );
};
