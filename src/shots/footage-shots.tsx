/**
 * Footage shots. Real b-roll from `footage/`, framed by type. Every shot here
 * degrades gracefully: if the clip is missing, the scene renders a labelled
 * placeholder instead of crashing the render.
 */
import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import type { z } from 'zod';
import { Frame } from '../components/Frame';
import { Text } from '../components/Text';
import { safeArea, typeScaleFor } from '../engine/theme';
import { EASE } from '../engine/ease';
import { progress } from '../engine/math';
import type { ShotContext } from '../engine/theme';
import {
  footageFillSchema,
  footageFrameSchema,
  footageStripSchema,
} from './schemas';

const FootagePlaceholder: React.FC<{ ctx: ShotContext; label: string; note?: string }> = ({ ctx, label, note }) => {
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', padding: safe.x }}>
      <div
        style={{
          border: `1px dashed ${theme.colors.lineStrong}`,
          padding: `${scale.body}px ${scale.body * 1.4}px`,
          maxWidth: safe.width,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: theme.fonts.mono,
            fontSize: scale.micro,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: theme.colors.accent,
          }}
        >
          footage missing
        </div>
        <div style={{ fontFamily: theme.fonts.sans, fontSize: scale.body, marginTop: scale.caption * 0.5 }}>{label}</div>
        {note ? (
          <div style={{ fontFamily: theme.fonts.sans, fontSize: scale.caption, color: theme.colors.textMuted, marginTop: 6 }}>
            {note}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

/**
 * Resolve a media reference. `media` ids come from the episode manifest;
 * `path:` bypasses it for one-off files.
 */
function resolveClip(ctx: ShotContext, src: string): string | null {
  if (!src) return null;
  try {
    if (src.startsWith('path:')) {
      const rel = src.slice('path:'.length);
      // staticFile throws if the file is absent during a bundle, so probe the
      // manifest path first; path: is trusted (we cannot stat in the browser).
      return staticFile(rel);
    }
    return ctx.media(src);
  } catch {
    return null;
  }
}

/* ──────────────────────────── footage-fill ──────────────────────────── */


type FootageFillProps = z.infer<typeof footageFillSchema>;

export const FootageFill: React.FC<{ props: FootageFillProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const { fps } = useVideoConfig();
  const src = resolveClip(ctx, props.src);

  // Zoom across the whole scene, linear then eased at both ends.
  const k = props.kenBurns;
  const zoom = 1 + k * EASE.inOut(progress(frame, 0, ctx.durationInFrames));
  const headlineIn = EASE.out(progress(frame, 10, 20));
  const kickerIn = EASE.out(progress(frame, 2, 16));
  const captionIn = EASE.out(progress(frame, 22, 18));

  return (
    <Frame ctx={ctx} background={theme.colors.bg}>
      {src ? (
        <AbsoluteFill
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: `${props.focus[0] * 100}% ${props.focus[1] * 100}%`,
          }}
        >
          <OffthreadVideo
            src={src}
            startFrom={Math.round(props.trimStart * fps)}
            muted
            style={{
              width: '100%',
              height: '100%',
              objectFit: props.fit,
            }}
          />
        </AbsoluteFill>
      ) : (
        <FootagePlaceholder ctx={ctx} label={props.src || '(no src set)'} note="Put the file in footage/source/ and run npm run sync" />
      )}

      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, rgba(0,0,0,${props.scrim * 0.9}) 0%, rgba(0,0,0,${props.scrim * 0.2}) 38%, rgba(0,0,0,${props.scrim * 0.15}) 62%, rgba(0,0,0,${props.scrim}) 100%)`,
        }}
      />

      {props.kicker ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            top: safe.top + safe.height * 0.06,
            display: 'flex',
            alignItems: 'center',
            gap: scale.micro * 0.7,
            opacity: kickerIn,
          }}
        >
          <div style={{ width: scale.micro * 0.5, height: scale.micro * 0.5, background: theme.colors.accent }} />
          <span
            style={{
              fontFamily: theme.fonts.mono,
              fontSize: scale.micro,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: theme.colors.text,
            }}
          >
            {props.kicker}
          </span>
        </div>
      ) : null}

      {props.headline ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            right: safe.x,
            bottom: safe.bottom + safe.height * 0.16,
            opacity: headlineIn,
            transform: `translateY(${(1 - headlineIn) * 20}px)`,
          }}
        >
          <Text ctx={ctx} variant="title" color={theme.colors.text} style={{ lineHeight: 0.98 }}>
            {props.headline}
          </Text>
        </div>
      ) : null}

      {props.caption ? (
        <div
          style={{
            position: 'absolute',
            left: safe.x,
            right: safe.x,
            bottom: safe.bottom + safe.height * 0.09,
            fontFamily: theme.fonts.sans,
            fontSize: scale.caption,
            color: theme.colors.textMuted,
            opacity: captionIn,
            maxWidth: safe.width * 0.86,
          }}
        >
          {props.caption}
        </div>
      ) : null}
    </Frame>
  );
};


/* ──────────────────────────── footage-frame ──────────────────────────── */


type FootageFrameProps = z.infer<typeof footageFrameSchema>;

export const FootageFrame: React.FC<{ props: FootageFrameProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const { fps } = useVideoConfig();
  const src = resolveClip(ctx, props.src);

  const clipW = safe.width * props.width;
  const clipH = clipW / props.aspect;
  const left = props.side === 'right' ? safe.x + safe.width - clipW : safe.x;
  const textW = safe.width - clipW - scale.body * 0.8;

  const clipIn = EASE.out(progress(frame, 4, 26));
  const textIn = EASE.out(progress(frame, 14, 22));
  const drift = Math.sin((frame / ctx.durationInFrames) * Math.PI) * 6;

  return (
    <Frame ctx={ctx}>
      <div
        style={{
          position: 'absolute',
          left,
          top: safe.top + safe.height * 0.16 + props.offsetY * safe.height + drift,
          width: clipW,
          height: clipH,
          overflow: 'hidden',
          border: `1px solid ${theme.colors.line}`,
          background: theme.colors.surface,
          opacity: clipIn,
          transform: `translateY(${(1 - clipIn) * 30}px) scale(${0.98 + 0.02 * clipIn})`,
        }}
      >
        {src ? (
          <OffthreadVideo
            src={src}
            startFrom={Math.round(props.trimStart * fps)}
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <FootagePlaceholder ctx={ctx} label={props.src || '(no src set)'} />
        )}
        {props.label ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              padding: `${scale.micro * 0.5}px ${scale.micro * 0.8}px`,
              background: theme.dark ? 'rgba(7,8,10,0.8)' : 'rgba(251,248,242,0.9)',
              fontFamily: theme.fonts.mono,
              fontSize: scale.micro * 0.82,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: theme.colors.textMuted,
            }}
          >
            {props.label}
          </div>
        ) : null}
      </div>

      <div
        style={{
          position: 'absolute',
          left: props.side === 'right' ? safe.x : safe.x + clipW + scale.body * 0.8,
          top: safe.top + safe.height * 0.3 + props.offsetY * safe.height,
          width: textW,
          opacity: textIn,
          transform: `translateX(${(1 - textIn) * (props.side === 'right' ? -18 : 18)}px)`,
        }}
      >
        {props.heading ? (
          <Text ctx={ctx} variant="heading" style={{ lineHeight: 1.02, marginBottom: scale.body * 0.5 }}>
            {props.heading}
          </Text>
        ) : null}
        {props.body ? (
          <Text ctx={ctx} variant="body" color={theme.colors.textMuted}>
            {props.body}
          </Text>
        ) : null}
      </div>
    </Frame>
  );
};


/* ──────────────────────────── footage-strip ──────────────────────────── */


type FootageStripProps = z.infer<typeof footageStripSchema>;

export const FootageStrip: React.FC<{ props: FootageStripProps; ctx: ShotContext }> = ({ props, ctx }) => {
  const frame = useCurrentFrame();
  const { theme } = ctx;
  const scale = typeScaleFor(theme, ctx.width, ctx.height);
  const safe = safeArea(theme, ctx.width, ctx.height);
  const index = Math.min(props.clips.length - 1, Math.floor(frame / props.framesPerClip));
  const local = frame - index * props.framesPerClip;
  const cut = EASE.snappy(progress(local, 0, 6));
  const current = props.clips[index]!;
  const src = resolveClip(ctx, current.src);
  const headingIn = EASE.out(progress(frame, 0, 16));

  return (
    <Frame ctx={ctx}>
      <AbsoluteFill style={{ paddingLeft: safe.x, paddingRight: safe.x, paddingTop: safe.top + safe.height * 0.08 }}>
        {props.heading ? (
          <div style={{ opacity: headingIn }}>
            <Text ctx={ctx} variant="heading">
              {props.heading}
            </Text>
          </div>
        ) : null}

        <div
          style={{
            marginTop: scale.body,
            width: '100%',
            height: safe.height * 0.52,
            overflow: 'hidden',
            border: `1px solid ${theme.colors.line}`,
            position: 'relative',
            transform: `scale(${1.015 - 0.015 * cut})`,
          }}
        >
          {src ? (
            <OffthreadVideo
              key={current.src}
              src={src}
              muted
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <FootagePlaceholder ctx={ctx} label={current.src} />
          )}
          {current.label ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                padding: `${scale.micro * 0.5}px ${scale.micro * 0.8}px`,
                background: theme.colors.accent,
                color: theme.colors.accentInk,
                fontFamily: theme.fonts.mono,
                fontSize: scale.micro * 0.82,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
              }}
            >
              {current.label}
            </div>
          ) : null}
        </div>

        {props.filmstrip ? (
          <div style={{ display: 'flex', gap: scale.micro * 0.6, marginTop: scale.micro * 0.8 }}>
            {props.clips.map((clip, i) => {
              const thumb = resolveClip(ctx, clip.src);
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: scale.micro * 3.4,
                    border: `1px solid ${i === index ? theme.colors.accent : theme.colors.line}`,
                    opacity: i === index ? 1 : 0.45,
                    overflow: 'hidden',
                  }}
                >
                  {thumb ? (
                    <OffthreadVideo
                      src={thumb}
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: theme.colors.surface }} />
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
      </AbsoluteFill>
    </Frame>
  );
};

