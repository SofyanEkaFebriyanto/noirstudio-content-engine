/**
 * Mascot — Noir's avatar as hand-authored PIXEL ART, drawn from code.
 *
 * The character is the studio's actual avatar: a small chibi robot in dark
 * streetwear, rebuilt 17 Nov 2026 to match Sofyan's reference pose sheet
 * pixel for pixel ("gw pengen 100% mirip kaya gini"). It is NOT the
 * hexagon+N logo mark, and there is NO gold anywhere on the mascot.
 *
 * RENDERING: every shape is built from axis-aligned rectangles snapped to
 * a 4-unit grid (see src/mascot/pixels.ts) and the svg uses
 * shapeRendering="crispEdges" — no smooth curves, no anti-aliasing, no
 * blur filters. Curves are stepped rows, diagonals are staircases. At the
 * 1080px reel render one mascot pixel is ~18 screen px, so the character
 * reads as pixel art at a glance, like the reference sheet.
 *
 * All geometry comes from `src/mascot/character.ts` and all limb positions
 * from `src/mascot/poses.ts`. This component only turns that data into
 * pixel rects. Pure function of (pose, size, flip): no Math.random, no
 * Date, no state. The eye glow is the ONLY glow in the artwork, drawn as
 * a flat translucent halo — never a blur, which would smear the pixels.
 *
 * Head tilt and body lean are 1-pixel horizontal shifts, not rotations:
 * a rotated rectangle would break the pixel grid.
 *
 * Limb language (from the reference pose sheet): arms are TWO segments —
 * a short upper-arm stub from the shoulder to an elbow tucked near the
 * shoulder, then a forearm folding to the hand — so a bent arm reads as a
 * clear deliberate fold and a hanging arm reads as a dead-straight tube.
 * Legs are dead-straight thick columns, hip to foot, with no knee point
 * (except sit-relaxed, whose knees fold out like the reference Sit pose).
 * Hands are compact mitts flush with the sleeve; finger details are short
 * pixel stubs.
 */
import React from 'react';
import {
  MASCOT_GEOMETRY as G,
  MASCOT_HEIGHT,
  MASCOT_PALETTE as P,
  MASCOT_VIEWBOX,
  MASCOT_WIDTH,
  clampHeadTilt,
  elbowPoint,
  leanShiftPx,
  tiltShiftPx,
} from '../mascot/character';
import { PX, block, discRows, eyeRows, mittRows, ringRows, smileRows, thickLine, type PxRect } from '../mascot/pixels';
import { getPose, type PoseName } from '../mascot/poses';
import type { ShotContext } from '../engine/theme';

export type MascotProps = {
  /** One of the 20 pose names. */
  pose: PoseName;
  /** Width in px. Height follows the 240:320 viewBox. Defaults from ctx. */
  size?: number;
  /** Mirror the pose horizontally (point-right becomes point-left). */
  flip?: boolean;
  /** Shot context; used only to derive a default size for the format. */
  ctx?: ShotContext;
};

/** Render a list of pixel rects as <rect> elements. */
function Rects({ rects, fill, opacity }: { rects: PxRect[]; fill: string; opacity?: number }) {
  return (
    <>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={fill} opacity={opacity} />
      ))}
    </>
  );
}

/**
 * Chunky high-top sneaker, 13px wide and 6px tall (sole included), drawn
 * as stepped pixel rows. The toe points outward (`outward` +1 = right,
 * -1 = left). The foot point (x, y) is the ankle: the leg ends inside
 * the shoe and the sole bottoms out 2px below it.
 */
function Shoe({ x, y, outward }: { x: number; y: number; outward: 1 | -1 }) {
  const gx = Math.round(x / PX);
  const gy = Math.round(y / PX);
  const s = outward;
  // Rows are [dx, dy, width] in pixels, relative to the ankle cell.
  // Upper: white, stepping out toward the toe. Sole: white midsole on a
  // dark outsole. Heel (inner) and toe cap (outer) are black blocks.
  // The shoe is 11px wide: at the default 48-unit stance the two soles
  // keep a 1px gap, so they never merge into one white bar (the 13px
  // version did exactly that in every standing pose).
  const heelX = s > 0 ? gx - 3 : gx + 1;
  const toeX = s > 0 ? gx + 4 : gx - 5;
  const laceX1 = gx + s * 1;
  const laceX2 = gx + s * 3;
  return (
    <g>
      <rect x={(gx - 3) * PX} y={(gy - 3) * PX} width={7 * PX} height={PX} fill={P.sneakerWhite} />
      <rect x={(gx - 3) * PX} y={(gy - 2) * PX} width={9 * PX} height={PX} fill={P.sneakerWhite} />
      <rect x={(gx - 3) * PX} y={(gy - 1) * PX} width={9 * PX} height={PX} fill={P.sneakerWhite} />
      <rect x={heelX * PX} y={(gy - 1) * PX} width={2 * PX} height={PX} fill={P.sneakerBlack} />
      <rect x={toeX * PX} y={(gy - 1) * PX} width={2 * PX} height={PX} fill={P.sneakerBlack} />
      {/* Laces: two dark pixel blocks on the white upper. */}
      <rect x={laceX1 * PX} y={(gy - 3) * PX} width={PX} height={PX} fill={P.sneakerBlack} />
      <rect x={laceX2 * PX} y={(gy - 3) * PX} width={PX} height={PX} fill={P.sneakerBlack} />
      <rect x={(gx - 4) * PX} y={gy * PX} width={11 * PX} height={PX} fill={P.sneakerSole} />
      <rect x={(gx - 4) * PX} y={(gy + 1) * PX} width={11 * PX} height={PX} fill={P.sneakerSole} />
      <rect x={(gx - 4) * PX} y={(gy + 2) * PX} width={11 * PX} height={PX} fill={P.sneakerOutsole} />
    </g>
  );
}

export const Mascot: React.FC<MascotProps> = ({ pose, size, flip = false, ctx }) => {
  const def = getPose(pose);
  const headTilt = clampHeadTilt(def.headTilt);
  const headShift = tiltShiftPx(headTilt) * PX;
  const leanShift = leanShiftPx(def.lean) * PX;

  const width = size ?? (ctx
    ? Math.round(Math.min(ctx.width * 0.62, ctx.height * 0.72 * (MASCOT_WIDTH / MASCOT_HEIGHT)))
    : 360);
  const height = Math.round((width * MASCOT_HEIGHT) / MASCOT_WIDTH);

  // Hips ride with the lifted upper body; feet stay on the ground.
  const hipL = { x: G.hips.left.x, y: G.hips.left.y + def.lift };
  const hipR = { x: G.hips.right.x, y: G.hips.right.y + def.lift };

  const eyeY = G.eyes.left.y + (def.eyesDown ? G.eyes.lookDownShift : 0);

  const arm = (shoulder: { x: number; y: number }, hand: { x: number; y: number }) => {
    const elbow = elbowPoint(shoulder, hand, def.armBend);
    // TWO segments with a real elbow vertex: shoulder -> elbow (short
    // upper-arm stub) -> hand (forearm folds to the hand). Each segment is
    // a pixel staircase; the edge line is one pixel wider so the sleeve
    // reads against the hoodie.
    const edge = [
      ...thickLine(shoulder.x, shoulder.y, elbow.x, elbow.y, G.limb.armWidthPx + 2),
      ...thickLine(elbow.x, elbow.y, hand.x, hand.y, G.limb.armWidthPx + 2),
    ];
    const core = [
      ...thickLine(shoulder.x, shoulder.y, elbow.x, elbow.y, G.limb.armWidthPx),
      ...thickLine(elbow.x, elbow.y, hand.x, hand.y, G.limb.armWidthPx),
    ];
    return (
      <g>
        <Rects rects={edge} fill={P.limbEdge} />
        <Rects rects={core} fill={P.sleeve} />
        {/* Compact mitt, flush with the sleeve: a stepped 5x5 block, not
            a bulging circle — a circle would read as a joint ball. */}
        <Rects rects={mittRows(hand.x, hand.y)} fill={P.glove} />
      </g>
    );
  };

  const fingers = (hand: { x: number; y: number }, kind: 'wave' | 'point' | 'finger-up' | 'thumb' | 'down') => {
    // SHORT pixel stubs, clearly attached to the mitt: the old long finger
    // sticks read as snapped fingers at full size.
    const gx = Math.round(hand.x / PX);
    const gy = Math.round(hand.y / PX);
    if (kind === 'wave') {
      return (
        <g fill={P.glove}>
          <rect x={(gx - 2) * PX} y={(gy - 4) * PX} width={PX} height={2 * PX} />
          <rect x={gx * PX} y={(gy - 4) * PX} width={PX} height={2 * PX} />
          <rect x={(gx + 2) * PX} y={(gy - 4) * PX} width={PX} height={2 * PX} />
        </g>
      );
    }
    if (kind === 'thumb') {
      return <rect x={(gx - 1) * PX} y={(gy - 4) * PX} width={2 * PX} height={2 * PX} fill={P.glove} />;
    }
    if (kind === 'finger-up') {
      return <rect x={gx * PX} y={(gy - 4) * PX} width={PX} height={2 * PX} fill={P.glove} />;
    }
    if (kind === 'point') {
      return <rect x={(gx + 3) * PX} y={(gy - 1) * PX} width={2 * PX} height={PX} fill={P.glove} />;
    }
    return <rect x={gx * PX} y={(gy + 3) * PX} width={PX} height={2 * PX} fill={P.glove} />;
  };

  const handDetail = (side: 'left' | 'right') => {
    const hand = side === 'left' ? def.leftHand : def.rightHand;
    // Only the waving hand gets wave fingers; the other hand stays a plain glove.
    if ((pose === 'wave-hello' || pose === 'wave-goodbye') && side === 'right') return fingers(hand, 'wave');
    if (pose === 'thumbs-up' && side === 'right') return fingers(hand, 'thumb');
    if (pose === 'think' && side === 'right') return fingers(hand, 'finger-up');
    if (pose === 'idea' && side === 'right') return fingers(hand, 'finger-up');
    if (pose === 'point-right' && side === 'right') return fingers(hand, 'point');
    if (pose === 'subscribe-point' && side === 'right') return fingers(hand, 'down');
    return null;
  };

  const prop = () => {
    switch (def.prop) {
      case 'keyboard':
        return (
          <g>
            <rect x={80} y={204} width={80} height={16} fill={P.propDark} />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <rect key={i} x={88 + i * 11} y={208} width={8} height={8} fill={P.paper} opacity={0.75} />
            ))}
          </g>
        );
      case 'document':
        return (
          <g>
            <rect x={100} y={168} width={40} height={48} fill={P.paper} />
            <rect x={108} y={178} width={24} height={4} fill={P.propDark} />
            <rect x={108} y={186} width={24} height={4} fill={P.propDark} />
            <rect x={108} y={194} width={16} height={4} fill={P.propDark} />
          </g>
        );
      case 'phone':
        return (
          <g>
            <rect x={108} y={180} width={24} height={36} fill={P.propDark} />
            <rect x={112} y={184} width={16} height={24} fill={P.eyeGlow} opacity={0.85} />
          </g>
        );
      case 'bulb':
        return (
          <g>
            <Rects rects={discRows(172, 44, 16, 16)} fill={P.eyeGlow} opacity={0.3} />
            <Rects rects={discRows(172, 44, 10, 10)} fill={P.eyeGlow} />
            <rect x={168} y={56} width={8} height={4} fill={P.propDark} />
            <rect x={170} y={28} width={4} height={8} fill={P.eyeGlow} />
            <rect x={154} y={32} width={4} height={8} fill={P.eyeGlow} />
            <rect x={186} y={32} width={4} height={8} fill={P.eyeGlow} />
          </g>
        );
      case 'magnifier':
        return (
          <g>
            <Rects rects={ringRows(164, 82, 14, 14, 4)} fill={P.paper} />
            <Rects rects={thickLine(154, 94, 142, 108, 1)} fill={P.propDark} />
          </g>
        );
      default:
        return null;
    }
  };

  // Hoodie rows: the torso widens slightly from shoulders to hem.
  const torsoRows: PxRect[] = [];
  for (let y = G.torso.topY; y < G.torso.bottomY; y += PX) {
    const t = (y - G.torso.topY) / (G.torso.bottomY - G.torso.topY);
    const half = Math.round((G.torso.topHalfWidth + t * (G.torso.bottomHalfWidth - G.torso.topHalfWidth)) / PX) * PX;
    torsoRows.push({ x: 120 - half, y, w: half * 2, h: PX });
  }

  const leg = (hip: { x: number; y: number }, knee: { x: number; y: number } | undefined, foot: { x: number; y: number }) => {
    const points = knee ? [hip, knee, foot] : [hip, foot];
    const edge: PxRect[] = [];
    const core: PxRect[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i]!;
      const b = points[i + 1]!;
      edge.push(...thickLine(a.x, a.y, b.x, b.y, G.limb.legWidthPx + 2));
      core.push(...thickLine(a.x, a.y, b.x, b.y, G.limb.legWidthPx));
    }
    return (
      <g>
        <Rects rects={edge} fill={P.limbEdge} />
        <Rects rects={core} fill={P.pants} />
      </g>
    );
  };

  // Stepped rounded ear cup: rows step in at the top and bottom corners.
  const cupRows = (x: number, y: number): PxRect[] => [
    { x: x + PX, y, w: G.headphones.cup.width - 2 * PX, h: PX },
    { x, y: y + PX, w: G.headphones.cup.width, h: G.headphones.cup.height - 2 * PX },
    { x: x + PX, y: y + G.headphones.cup.height - PX, w: G.headphones.cup.width - 2 * PX, h: PX },
  ];

  return (
    <svg
      width={width}
      height={height}
      viewBox={MASCOT_VIEWBOX}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Noir mascot, pose ${pose}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <g transform={flip ? `translate(${MASCOT_WIDTH} 0) scale(-1 1)` : undefined}>
        {/* Legs: baggy cargo pants + high-top sneakers. Hips ride the lift.
            Each leg is ONE dead-straight thick pixel column, hip to foot —
            no knee point, no curve (except sit-relaxed, whose knees fold
            out like the reference Sit pose). */}
        <g>
          {leg(hipL, def.leftKnee, def.leftFoot)}
          {leg(hipR, def.rightKnee, def.rightFoot)}
          {/* Cargo flap pockets: small stepped rects on the OUTER edge of
              the upper thigh, never centred on the leg axis (a dark dot ON
              the axis read as a knee joint ball). */}
          <rect
            x={Math.round((hipL.x + (def.leftFoot.x - hipL.x) * 0.25 - 18) / PX) * PX}
            y={Math.round((hipL.y + (def.leftFoot.y - hipL.y) * 0.25) / PX) * PX}
            width={12}
            height={8}
            fill={P.pantsDark}
          />
          <rect
            x={Math.round((hipR.x + (def.rightFoot.x - hipR.x) * 0.25 + 6) / PX) * PX}
            y={Math.round((hipR.y + (def.rightFoot.y - hipR.y) * 0.25) / PX) * PX}
            width={12}
            height={8}
            fill={P.pantsDark}
          />
          <Shoe x={def.leftFoot.x} y={def.leftFoot.y} outward={-1} />
          <Shoe x={def.rightFoot.x} y={def.rightFoot.y} outward={1} />
        </g>

        {/* Upper body: hoodie, arms, head. Lifts and leans as one pixel
            shift — never a rotation, which would break the grid. */}
        <g transform={`translate(${leanShift} ${def.lift})`}>
          {/* Oversized hoodie. (No backpack: removed 17 Nov 2026.) */}
          <Rects rects={torsoRows} fill={P.hoodie} />
          {/* Flat tonal patches suggesting fleece texture. */}
          <rect x={88} y={188} width={32} height={12} fill={P.hoodieDark} opacity={0.45} />
          <rect x={140} y={196} width={24} height={8} fill={P.hoodieDark} opacity={0.45} />
          {/* Kangaroo pocket: the chest carries nothing else. Stepped
              corners so the pocket is a pixel block, not a rounded rect. */}
          <g fill={P.pocket}>
            <rect x={G.pocket.x + PX} y={G.pocket.y} width={G.pocket.width - 2 * PX} height={PX} />
            <rect x={G.pocket.x} y={G.pocket.y + PX} width={G.pocket.width} height={G.pocket.height - 2 * PX} />
            <rect x={G.pocket.x + PX} y={G.pocket.y + G.pocket.height - PX} width={G.pocket.width - 2 * PX} height={PX} />
          </g>
          {/* Pocket opening seams: short pixel staircases at the sides. */}
          <Rects rects={thickLine(G.pocket.x + 4, G.pocket.y + 8, G.pocket.x + 12, G.pocket.y + G.pocket.height - 8, 1)} fill={P.propLine} />
          <Rects rects={thickLine(G.pocket.x + G.pocket.width - 4, G.pocket.y + 8, G.pocket.x + G.pocket.width - 12, G.pocket.y + G.pocket.height - 8, 1)} fill={P.propLine} />
          {/* Drawstrings with tips: 1px vertical blocks. */}
          {G.drawstrings.map((s, i) => (
            <g key={i}>
              <rect x={s.from.x - 2} y={s.from.y} width={PX} height={s.to.y - s.from.y} fill={P.drawstring} />
              <rect x={s.to.x - 2} y={s.to.y} width={PX} height={PX} fill={P.hoodRim} />
            </g>
          ))}

          {/* Head: hood up, black robot face, small half-moon eyes,
              headphones. The head group shifts 1px with the tilt. */}
          <g transform={`translate(${headShift} 0)`}>
            {/* Neck, behind the face disc. */}
            <rect x={G.neck.x} y={G.neck.y} width={G.neck.width} height={G.neck.height} fill="#141416" />
            {/* Hood: big stepped disc. */}
            <Rects rects={discRows(G.hood.cx, G.hood.cy, G.hood.rx, G.hood.ry)} fill={P.hood} />
            <Rects rects={discRows(120, 58, 58, 30)} fill={P.hoodDark} opacity={0.55} />
            {/* Lighter grey rim around the face opening. */}
            <Rects rects={ringRows(G.head.cx, G.head.cy, G.hoodRim.rx, G.hoodRim.ry, G.hoodRim.thickness)} fill={P.hoodRim} />
            {/* Face: black stepped disc. No gloss, no reflection, no
                highlight on the head: the eyes are the only glow. */}
            <Rects rects={discRows(G.head.cx, G.head.cy, G.head.rx, G.head.ry)} fill={P.headBlack} />
            {def.eyesHidden ? null : (
              <g>
                {/* Flat translucent halos — the ONLY glow, never a blur. */}
                <Rects rects={eyeRows(G.eyes.left.x, eyeY, 1)} fill={P.eyeGlow} opacity={0.3} />
                <Rects rects={eyeRows(G.eyes.right.x, eyeY, 1)} fill={P.eyeGlow} opacity={0.3} />
                <Rects rects={eyeRows(G.eyes.left.x, eyeY)} fill={P.eyeCore} />
                <Rects rects={eyeRows(G.eyes.right.x, eyeY)} fill={P.eyeCore} />
                {/* Subtle smile under the eyes, like the reference sheet. */}
                <Rects rects={smileRows(G.smile.cx, G.smile.cy)} fill={P.smile} />
              </g>
            )}
            {/* Headphones OVER the hood: stepped half-ring band + chunky
                ear cups with inner pads. */}
            <Rects
              rects={ringRows(
                G.headphones.band.cx,
                G.headphones.band.cy,
                G.headphones.band.outerRx,
                G.headphones.band.outerRy,
                G.headphones.band.thickness,
                true,
              )}
              fill={P.headphone}
            />
            <Rects rects={cupRows(G.headphones.leftCup.x, G.headphones.leftCup.y)} fill={P.headphone} />
            <Rects rects={cupRows(G.headphones.rightCup.x, G.headphones.rightCup.y)} fill={P.headphone} />
            <rect
              x={G.headphones.leftCup.x + 8}
              y={G.headphones.leftCup.y + 8}
              width={G.headphones.pad.width}
              height={G.headphones.pad.height}
              fill={P.headphonePad}
            />
            <rect
              x={G.headphones.rightCup.x + 8}
              y={G.headphones.rightCup.y + 8}
              width={G.headphones.pad.width}
              height={G.headphones.pad.height}
              fill={P.headphonePad}
            />
          </g>

          {/* Arms + gloves, in front of the head so hands on the face
              (think, facepalm) and raised hands stay visible. */}
          {arm(G.shoulders.left, def.leftHand)}
          {arm(G.shoulders.right, def.rightHand)}
          {handDetail('left')}
          {handDetail('right')}

          {/* Held prop, in the hands. */}
          {prop()}
        </g>
      </g>
    </svg>
  );
};
