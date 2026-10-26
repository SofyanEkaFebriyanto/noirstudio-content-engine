/**
 * Frame — the canvas wrapper every shot renders inside. Owns the ground color,
 * grain, vignette and scanline texture so individual shots stay about content.
 */
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { ShotContext } from '../engine/theme';
import { noise1D } from '../engine/math';

export const Grain: React.FC<{ amount: number; seed?: number }> = ({ amount, seed = 0 }) => {
  const frame = useCurrentFrame();
  if (amount <= 0) return null;
  // Static per-frame grain: shifting the background position by a deterministic
  // value each frame reads as film grain without per-pixel rendering cost.
  const x = Math.round(noise1D(frame * 0.7, seed) * 100);
  const y = Math.round(noise1D(frame * 0.9, seed + 7) * 100);
  return (
    <AbsoluteFill
      style={{
        opacity: amount,
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        backgroundImage:
          'url("data:image/svg+xml;utf8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'160\' height=\'160\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'160\' height=\'160\' filter=\'url(%23n)\' opacity=\'0.55\'/%3E%3C/svg%3E")',
        backgroundPosition: `${x}px ${y}px`,
        backgroundRepeat: 'repeat',
      }}
    />
  );
};

export const Vignette: React.FC<{ amount: number }> = ({ amount }) => {
  if (amount <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 42%, rgba(0,0,0,${amount}) 100%)`,
      }}
    />
  );
};

export const Scanlines: React.FC<{ color: string }> = ({ color }) => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      opacity: 0.22,
      backgroundImage: `repeating-linear-gradient(0deg, ${color} 0px, ${color} 1px, transparent 1px, transparent 4px)`,
      mixBlendMode: 'soft-light',
    }}
  />
);

type FrameProps = {
  ctx: ShotContext;
  children: React.ReactNode;
  /** Override the ground color without changing the theme. */
  background?: string;
  /** Disable texture for data-clean layouts. */
  texture?: boolean;
  style?: React.CSSProperties;
};

export const Frame: React.FC<FrameProps> = ({ ctx, children, background, texture = true, style }) => {
  const { theme } = ctx;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: background ?? theme.colors.bg,
        color: theme.colors.text,
        overflow: 'hidden',
        fontFamily: theme.fonts.sans,
        ...style,
      }}
    >
      {texture && theme.texture.scanlines ? <Scanlines color={theme.colors.text} /> : null}
      {children}
      {texture ? <Grain amount={theme.texture.grain} /> : null}
      {texture ? <Vignette amount={theme.texture.vignette} /> : null}
    </AbsoluteFill>
  );
};
