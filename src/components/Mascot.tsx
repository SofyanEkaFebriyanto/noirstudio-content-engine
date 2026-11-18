/**
 * Noir, the studio mascot. One component, 20 poses.
 *
 * Noir is pixel art: a hooded figure with headphones, glowing eyes, cargo
 * pants and white sneakers. The pixels are traced data (`src/mascot/sprites.ts`);
 * this file only paints them as flat SVG paths with crisp edges. No gradients,
 * no glow, no filters, no raster images: the same pose renders byte-identical
 * every time.
 *
 * Colors:
 *   - the figure keeps its own palette (near-black hoodie, white sneakers,
 *     and the ice-blue glowing eyes, which are Noir's identity and never change)
 *   - on a dark theme the figure gets a 1-pixel rim in `theme.colors.textMuted`,
 *     otherwise a near-black hoodie would vanish into the ground
 *   - on a light theme there is no rim; the figure sits on the ground as drawn
 *
 * Size: `size` is the pixel height of the art box. When omitted it derives from
 * the theme scale at the 1080 reference width.
 */
import React from 'react';
import type { ShotContext } from '../engine/theme';
import { typeScaleFor } from '../engine/theme';
import {
  CHARACTER,
  MASCOT_ASPECT,
  MASCOT_VIEWBOX,
  paletteColor,
  poseGeometry,
  type LayerGeometry,
} from '../mascot/character';
import type { MascotPose } from '../mascot/poses';

export type MascotProps = {
  ctx: ShotContext;
  pose: MascotPose;
  /** Pixel height of the art box. Defaults to a multiple of the theme's display size. */
  size?: number;
  /** Mirror the character. Letter-like effects (? ! z) move with it but are never mirrored. */
  flip?: boolean;
  /** Show the pose's effect marks (question marks, sparkles, motion lines). Default on. */
  effects?: boolean;
};

/** Default art-box height, in multiples of the theme's `display` size. */
export const MASCOT_DISPLAYS = 7;

/** Default art-box height: derived from the theme scale at reference width 1080. */
export const mascotDefaultSize = (ctx: ShotContext): number =>
  typeScaleFor(ctx.theme, ctx.width, ctx.height).display * MASCOT_DISPLAYS;

/** Width of the art box for a given height. */
export const mascotWidthFor = (height: number): number => height * MASCOT_ASPECT;

const isDarkColor = (hex: string): boolean => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return true;
  const n = parseInt(m[1]!, 16);
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return luminance < 0.35;
};

/** Palette keys dark enough to disappear into a dark ground. */
const isInk = (key: string): boolean => {
  const n = parseInt(paletteColor(key).slice(1), 16);
  return Math.max((n >> 16) & 255, (n >> 8) & 255, n & 255) <= 0x58;
};

const Layer: React.FC<{ layer: LayerGeometry; rim?: string; ink?: string }> = ({ layer, rim, ink }) => (
  <g>
    {rim ? <path d={layer.rim} fill={rim} /> : null}
    {layer.paths.map((p) => (
      <path key={p.key} d={p.d} fill={ink && isInk(p.key) ? ink : paletteColor(p.key)} />
    ))}
  </g>
);

export const Mascot: React.FC<MascotProps> = ({ ctx, pose, size, flip = false, effects = true }) => {
  const { colors } = ctx.theme;
  const darkGround = isDarkColor(colors.bg);
  const rim = darkGround ? colors.textMuted : undefined;
  // Effect marks are drawn in near-black on the reference sheet. On a dark
  // ground they flip to the theme's text color and lose the rim.
  const fxInk = darkGround ? colors.text : undefined;
  const geometry = poseGeometry(pose);

  const height = size ?? mascotDefaultSize(ctx);
  const width = mascotWidthFor(height);
  const mirror = CHARACTER.canvas.width; // flip about the foot anchor: x → width - x

  const shown = effects ? geometry.fx : [];
  // Mirrored effects ride along with the body; glyphs are re-placed without mirroring.
  const mirrored = shown.filter((fx) => !fx.glyph);
  const glyphs = shown.filter((fx) => fx.glyph);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`${MASCOT_VIEWBOX.x} ${MASCOT_VIEWBOX.y} ${MASCOT_VIEWBOX.width} ${MASCOT_VIEWBOX.height}`}
      shapeRendering="crispEdges"
      fill="none"
      style={{ display: 'block', overflow: 'visible' }}
      aria-hidden
    >
      <g transform={flip ? `translate(${mirror} 0) scale(-1 1)` : undefined}>
        <Layer layer={geometry.body} rim={rim} />
        {mirrored.map((fx, i) => (
          <Layer key={i} layer={fx} ink={fxInk} />
        ))}
      </g>
      {glyphs.map((fx, i) => {
        // Same footprint as the mirrored position, but the shape itself is untouched.
        const dx = flip ? mirror - 2 * fx.box[0] - fx.box[2] : 0;
        return (
          <g key={i} transform={dx ? `translate(${dx} 0)` : undefined}>
            <Layer layer={fx} ink={fxInk} />
          </g>
        );
      })}
    </svg>
  );
};
