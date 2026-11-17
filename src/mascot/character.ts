/**
 * Mascot character — the single source of truth for Noir's geometry.
 *
 * The mascot is the studio's actual avatar: a small chibi robot in dark
 * streetwear, drawn as PIXEL ART to match Sofyan's reference pose sheet
 * (17 Nov 2026: "gw pengen 100% mirip kaya gini"). It is NOT the
 * hexagon+N logo mark: no hexagon head, no N chest badge, no gold anywhere
 * on the mascot. Gold stays reserved for on-screen text and numbers.
 *
 * PIXEL-ART RENDERING (rebuild 17 Nov 2026): every shape is built from
 * axis-aligned rectangles snapped to a 4-unit grid (see pixels.ts) and
 * rendered with shapeRendering="crispEdges" — no smooth curves, no
 * anti-aliasing, no blur filters. Curves are stepped-row approximations,
 * diagonals are staircases. At the 1080px reel render one mascot pixel is
 * ~18 screen px: the character reads as pixel art at a glance, like the
 * reference sheet.
 *
 * PROPORTIONS (from the reference sheet, chibi and chunky): the head is
 * huge — about 40% of total height — the torso is short and compact, the
 * arms and legs are short and thick, the sneakers are relatively big.
 * The old smooth-vector mascot was too tall, narrow and long-limbed; the
 * whole silhouette is rebuilt here.
 *
 * Revision history (Sofyan's direct instructions, override the original
 * prompt): NO backpack (removed 17 Nov 2026 — it got in the way). The head
 * is clean black with NO reflection and NO highlight anywhere (revised
 * 17 Nov 13:39 — Sofyan does not want any reflection on the head). The
 * ONLY thing that glows is the eyes. The eyes are SMALL half-moons like
 * the reference — not the oversized domes the old vector version had —
 * with a subtle smile line under them where the reference has one.
 *
 * Limb rules (kept from the 17 Nov limb rebuild): limbs are SHORT, THICK
 * and TUCKED CLOSE to the torso. Every arm is two segments with a real
 * elbow tucked near the shoulder (upper arm short, forearm folds to the
 * hand). Legs are dead-straight thick columns, hip to foot, with no knee
 * point at all — except sit-relaxed, which folds the legs out to the
 * knees like the reference Sit pose. Hands are compact mitts flush with
 * the sleeve; finger details are short pixel stubs, never long sticks.
 *
 * Everything in this file is pure data / pure math: no React, no Remotion,
 * no Math.random, no Date. Every pose reuses these exact numbers and
 * changes only limb positions, head shift (max 1 pixel) and one held prop.
 *
 * Coordinate space: viewBox 0 0 240 320 (a 60 x 80 pixel grid). The
 * character stands on y = 308 (soles) and its hood tops out near y = 12.
 * Sizes in shots derive from the theme scale at reference width 1080
 * (see Mascot.tsx); nothing here is in screen pixels.
 */

/** 2D point in mascot space. */
export type Vec = { x: number; y: number };

export const MASCOT_VIEWBOX = '0 0 240 320' as const;
export const MASCOT_WIDTH = 240;
export const MASCOT_HEIGHT = 320;

/**
 * Mascot palette. Fixed identity colors, deliberately NOT theme tokens:
 * the character must read as the same avatar on the noir, paper and signal
 * themes. Near-monochrome black and charcoal; the only bright elements are
 * the glowing white-blue eyes and the white sneaker panels/soles.
 */
export const MASCOT_PALETTE = {
  /** Black robot face, gloves, headphones. */
  headBlack: '#0b0b0c',
  headphone: '#0a0a0a',
  headphonePad: '#1d1d1f',
  glove: '#0d0d0e',
  /** Hood up, charcoal, with a lighter grey rim around the face opening. */
  hood: '#2b2b2d',
  hoodDark: '#1e1e20',
  hoodRim: '#4a4a4e',
  /** Oversized charcoal hoodie and its tonal patches. */
  hoodie: '#262628',
  hoodieDark: '#1b1b1d',
  pocket: '#202022',
  drawstring: '#17171a',
  /** Baggy black cargo pants. Light enough to read against charcoal ground. */
  pants: '#232327',
  pantsDark: '#0a0a0b',
  /** Sleeves read against the hoodie; the edge line separates both. */
  sleeve: '#2e2e32',
  limbEdge: '#131314',
  /** Black-and-white high-top sneakers. */
  sneakerWhite: '#f2f2ee',
  sneakerBlack: '#0d0d0e',
  sneakerSole: '#e8e8e2',
  sneakerOutsole: '#0a0a0a',
  /** The signature eyes: small glowing white-blue half-moons. The ONLY
      glow on the mascot — drawn as a flat translucent halo, never a blur
      filter, so the pixel edges stay crisp. */
  eyeGlow: '#cfeeff',
  eyeCore: '#eaf7ff',
  /** Subtle smile line under the eyes, like the reference sheet. */
  smile: '#3a3a3d',
  /** Props. Bone for paper, white-blue for the idea bulb and phone screen. */
  paper: '#f4f1ea',
  propDark: '#17171a',
  propLine: '#3a3a3d',
} as const;

/** Locked proportions and anchor points, in mascot space. */
export const MASCOT_GEOMETRY = {
  /** Face: black robot face, a stepped disc. */
  head: { cx: 120, cy: 80, rx: 50, ry: 46 },
  /** Hood up, a bigger stepped disc behind and around the face. */
  hood: { cx: 120, cy: 74, rx: 62, ry: 58 },
  /** Lighter grey rim around the face opening (1px ring). */
  hoodRim: { rx: 54, ry: 50, thickness: 4 },
  /** Short dark neck segment below the head. */
  neck: { x: 108, y: 126, width: 24, height: 16 },
  /** Eyes: exactly two SMALL glowing half-moon eyes, flat side down —
      5px wide, 3px tall, like the reference (the old vector eyes were
      oversized domes). Centres 44 units apart on a 100-wide face. */
  eyes: {
    left: { x: 98, y: 84 },
    right: { x: 142, y: 84 },
    /** Eyes sit slightly half-lidded; shift down this far when looking down. */
    lookDownShift: 4,
  },
  /** Subtle smile line under the eyes, like the reference sheet. */
  smile: { cx: 120, cy: 104 },
  /** Over-ear headphones worn OVER the hood. */
  headphones: {
    /** Band: a half-ring over the top of the hood. */
    band: { cx: 120, cy: 78, outerRx: 68, outerRy: 64, thickness: 8 },
    /** Chunky ear cups, stepped rounded rects on the sides of the head. */
    cup: { width: 28, height: 40 },
    leftCup: { x: 36, y: 80 },
    rightCup: { x: 176, y: 80 },
    pad: { width: 12, height: 24 },
  },
  /** Torso: oversized hoodie, short and compact (chibi). Rows widen
      slightly from the shoulders to the hem. */
  torso: { topY: 146, bottomY: 242, topHalfWidth: 48, bottomHalfWidth: 54 },
  shoulders: { left: { x: 76, y: 158 }, right: { x: 164, y: 158 } },
  hips: { left: { x: 96, y: 240 }, right: { x: 144, y: 240 } },
  /** Kangaroo pocket on the belly; the chest carries nothing else. */
  pocket: { x: 92, y: 202, width: 56, height: 36, rx: 8 },
  /** Drawstrings hang to the chest. */
  drawstrings: [
    { from: { x: 108, y: 158 }, to: { x: 108, y: 186 } },
    { from: { x: 132, y: 158 }, to: { x: 132, y: 186 } },
  ],
  /**
   * No head reflection, no highlight: the head is clean black.
   * (No backpack either: removed 17 Nov 2026 on Sofyan's instruction.)
   */
  /** Default stance: one hand tucked at the pocket, one hanging relaxed. */
  defaultHands: { left: { x: 72, y: 224 }, right: { x: 168, y: 224 } },
  defaultFeet: { left: { x: 96, y: 296 }, right: { x: 144, y: 296 } },
  /** Limb widths in pixels (1px = 4 mascot units). Arms and legs are
      THICK: thin bars read as broken sticks. */
  limb: { armWidthPx: 5, legWidthPx: 6, gloveSizePx: 5 },
  /** Shoes: chunky high-tops, 11px wide, 6px tall (sole included). */
  shoe: { widthPx: 11, heightPx: 6 },
  /** Head tilt is capped at 8 degrees, per the character spec. In the
      pixel renderer a tilt is a 1-pixel horizontal shift of the head, not
      a rotation — a rotated rectangle would break the pixel grid. */
  maxHeadTiltDeg: 8,
} as const;

/**
 * Elbow position for an arm from shoulder to hand. The elbow is TUCKED
 * NEAR THE SHOULDER, not at the midpoint: the upper arm is a short stub
 * going down-and-out from the shoulder, and the forearm does the reaching
 * to the hand. That is the reference anatomy — in the reference pose sheet
 * every arm reads as a clear deliberate fold (upper arm short, forearm
 * folded up/across), never as one long bar with a slight mid kink.
 *
 * `bend` is the elbow's base outward distance from the shoulder. It grows
 * a little with how high the hand is raised (a hand at the temple needs
 * the elbow further out and lower than a hand at the pocket), so a raised
 * arm folds like the reference wave/thinking poses instead of stretching
 * straight. For a hanging hand the elbow sits just outside the shoulder
 * and the forearm drops straight down — a dead-straight tube, no kink.
 * Deterministic: pure function of its inputs.
 */
export function elbowPoint(shoulder: Vec, hand: Vec, bend: number): Vec {
  const out = shoulder.x < 120 ? -1 : 1;
  const raise = Math.max(0, shoulder.y - hand.y);
  const outDist = bend + Math.min(raise, 40) * 0.2;
  const drop = 6 + Math.min(raise, 50) * 0.3;
  return { x: shoulder.x + out * outDist, y: shoulder.y + drop };
}

/**
 * Legs have NO knee point. A leg is a dead-straight thick column from hip
 * to foot: in front view a knee bends in depth, so any sideways knee
 * displacement reads as a break. The stride or seated look comes from foot
 * placement only — except sit-relaxed, whose knees fold out to the sides
 * like the reference Sit pose (see the pose's knee fields).
 */

/** Clamp a head tilt to the locked maximum. */
export function clampHeadTilt(deg: number): number {
  const max = MASCOT_GEOMETRY.maxHeadTiltDeg;
  return Math.max(-max, Math.min(max, deg));
}

/**
 * Head tilt as a pixel shift: +1px right for a positive tilt, -1px for
 * negative, 0 when level. A rotation would break the pixel grid, so the
 * head slides one pixel instead — the same readable lean at a glance.
 */
export function tiltShiftPx(deg: number): number {
  if (deg >= 4) return 1;
  if (deg <= -4) return -1;
  return 0;
}

/**
 * Upper-body lean as a pixel shift: the lifted group slides 1px in the
 * lean direction. Same reason as tiltShiftPx — no rotation on the grid.
 */
export function leanShiftPx(deg: number): number {
  if (deg >= 4) return 1;
  if (deg <= -4) return -1;
  return 0;
}
