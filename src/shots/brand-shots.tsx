/**
 * Brand shots. Openers and outros that carry the studio identity.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { z } from 'zod';
import { Frame } from '../components/Frame';
import { Text } from '../components/Text';
import { Lockup, Mark, Wordmark } from '../components/Logo';
import { Mascot, mascotDefaultSize } from '../components/Mascot';
import { mascotFitHeight } from '../mascot/character';
import { SceneBody } from '../components/Layout';
import { BRAND } from '../engine/brand';
import { captionBand, safeArea, typeScaleFor } from '../engine/theme';
import { EASE } from '../engine/ease';
import { progress, seededRandom } from '../engine/math';
import type { ShotContext } from '../engine/theme';
import {
  brandOpenSchema,
  mascotSchema,
  stingSchema,
  subscribeSchema,
} from './schemas';

/* ──────────────────────────── brand-open ──────────────────────────── */


type BrandOpenProps = z.infer<typeof brandOpenSchema>;

export const BrandOpen: React.FC<{ props: BrandOpenProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const rand = seededRandom(90210);
  const dots = Array.from({ length: props.particles }, () => ({
    x: rand(),
    y: rand(),
    size: 1 + rand() * 2.5,
    delay: rand() * 20,
    drift: (rand() - 0.5) * 30,
  }));
  const lineIn = EASE.out(progress(frame, 34, 22));

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill>
        {dots.map((dot, index) => {
          const p = EASE.out(progress(frame, dot.delay, 24));
          return (
            <div
              key={index}
              style={{
                position: 'absolute',
                left: dot.x * ctx.width,
                top: dot.y * ctx.height + (frame - dot.delay) * dot.drift * 0.03,
                width: dot.size * (ctx.width / 1080),
                height: dot.size * (ctx.width / 1080),
                borderRadius: '50%',
                background: index % 5 === 0 ? theme.colors.accent : theme.colors.text,
                opacity: p * (index % 5 === 0 ? 0.8 : 0.22),
              }}
            />
          );
        })}
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: scale.heading * 0.7 }}>
        <Lockup ctx={ctx} at={4} markSize={scale.display * 0.5} wordSize="title" tagline={false} align="center" />
        {props.line ? (
          <div
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: scale.micro,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: theme.colors.textMuted,
              opacity: lineIn,
              transform: `translateY(${(1 - lineIn) * 10}px)`,
              textAlign: 'center',
              maxWidth: safe.width * 0.8,
            }}
          >
            {props.line}
          </div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};


/* ──────────────────────────── mascot ──────────────────────────── */

type MascotShotProps = z.infer<typeof mascotSchema>;

export const MascotShot: React.FC<{ props: MascotShotProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const band = captionBand(theme, ctx.width, ctx.height);

  // One entrance motion, decelerating into place; then a push well under 8%.
  const enter = EASE.out(progress(frame, 2, 24));
  const captionIn = EASE.out(progress(frame, 12, 18));
  const push = 1 + 0.03 * EASE.inOut(progress(frame, 0, ctx.durationInFrames));

  // Fit the art box into what SceneBody leaves free, so every format works.
  const caption = props.caption.replace(/\*/g, '').trim();
  const bodyHeight = ctx.height - safe.top - Math.max(safe.bottom, band.bottomOffset + band.fontSize * 2.6);
  const captionRoom = caption ? scale.heading * 2.2 : 0;
  const size = Math.min(mascotDefaultSize(ctx), bodyHeight - captionRoom, mascotFitHeight(props.pose, safe.width));

  return (
    <Frame ctx={ctx}>
      <SceneBody ctx={ctx} gap={scale.body * 0.4} style={{ alignItems: 'center' }}>
        <div
          style={{
            opacity: enter,
            transform: `translateY(${(1 - enter) * scale.body * 1.4}px) scale(${push})`,
            transformOrigin: '50% 80%',
          }}
        >
          <Mascot ctx={ctx} pose={props.pose} size={size} flip={props.flip} effects={props.effects} />
        </div>
        {caption ? (
          <Text
            ctx={ctx}
            variant="heading"
            align="center"
            maxWidth="86%"
            style={{ opacity: captionIn, transform: `translateY(${(1 - captionIn) * scale.body * 0.6}px)` }}
          >
            {caption}
          </Text>
        ) : null}
      </SceneBody>
    </Frame>
  );
};

/* ──────────────────────────── brand-sting ──────────────────────────── */


type StingProps = z.infer<typeof stingSchema>;

export const BrandSting: React.FC<{ props: StingProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const sweep = EASE.inOut(progress(frame, 4, 30));
  const textIn = EASE.out(progress(frame, 8, 18));
  const subIn = EASE.out(progress(frame, 22, 16));

  return (
    <Frame ctx={ctx} background={theme.colors.accent}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.colors.bg,
            transform: `translateX(${-100 + sweep * 100}%)`,
          }}
        />
        <div style={{ opacity: textIn, transform: `translateY(${(1 - textIn) * 20}px)`, display: 'flex', alignItems: 'center', gap: scale.heading * 0.3 }}>
          <Mark ctx={ctx} size={scale.display * 0.3} color={theme.colors.accentInk} />
          <span
            style={{
              fontFamily: theme.fonts.sans,
              fontWeight: 700,
              fontSize: scale.title * 0.78,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase',
              color: theme.colors.accentInk,
            }}
          >
            {props.text}
          </span>
        </div>
        {props.sub ? (
          <div
            style={{
              position: 'absolute',
              bottom: safeArea(theme, ctx.width, ctx.height).bottom + scale.heading,
              fontFamily: theme.fonts.mono,
              fontSize: scale.micro,
              letterSpacing: '0.26em',
              textTransform: 'uppercase',
              color: theme.colors.accentInk,
              opacity: subIn * 0.8,
            }}
          >
            {props.sub}
          </div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};


/* ──────────────────────────── subscribe-cta ──────────────────────────── */


type SubscribeProps = z.infer<typeof subscribeSchema>;

export const SubscribeCta: React.FC<{ props: SubscribeProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const headlineIn = EASE.out(progress(frame, 6, 22));
  const ctaIn = EASE.out(progress(frame, 24, 20));
  const pulse = 1 + 0.02 * Math.sin((frame / ctx.fps) * Math.PI * 2 * 0.7);

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          gap: scale.heading * 0.5,
          paddingLeft: safe.x,
          paddingRight: safe.x,
        }}
      >
        <Wordmark ctx={ctx} showAt={0} size="heading" align="center" />

        <div
          style={{
            fontFamily: theme.fonts.display,
            fontSize: scale.title * 0.9,
            lineHeight: 1,
            letterSpacing: '-0.02em',
            textAlign: 'center',
            opacity: headlineIn,
            transform: `translateY(${(1 - headlineIn) * 18}px)`,
          }}
        >
          {props.headline}
        </div>

        {props.sub ? (
          <Text ctx={ctx} variant="caption" align="center" color={theme.colors.textMuted} style={{ opacity: headlineIn }}>
            {props.sub}
          </Text>
        ) : null}

        <div
          style={{
            marginTop: scale.body * 0.6,
            padding: `${scale.body * 0.5}px ${scale.body * 1.5}px`,
            background: theme.colors.accent,
            color: theme.colors.accentInk,
            fontFamily: theme.fonts.sans,
            fontWeight: 700,
            fontSize: scale.body * 0.86,
            letterSpacing: '0.01em',
            opacity: ctaIn,
            transform: `scale(${0.92 + 0.08 * ctaIn * pulse})`,
          }}
        >
          {props.cta}
        </div>

        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: theme.colors.textFaint,
            opacity: ctaIn,
          }}
        >
          {BRAND.handle} · {BRAND.domain}
        </div>
      </AbsoluteFill>
    </Frame>
  );
};

