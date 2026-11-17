/**
 * Mascot pose manifest — all 20 poses.
 *
 * Pure data, no React. Each pose reuses the locked geometry from
 * character.ts and changes ONLY limb positions, head tilt (max 8 degrees)
 * and one held prop. Headphones, hoodie, cargo pants and
 * sneakers are present in ALL 20 poses; a pose never removes them.
 *
 * Coordinates are in mascot space (viewBox 0 0 240 320). Hands and feet are
 * explicit points; elbows/knees are derived deterministically in Mascot.tsx.
 *
 * Revision 17 Nov 2026: NO backpack in any pose (removed on Sofyan's
 * instruction). Headphones, hoodie, cargo pants and sneakers are present
 * in ALL 20 poses.
 *
 * Limb rebuild 17 Nov 2026 (from Sofyan's reference pose sheet): hands
 * are kept CLOSE to the body — a raised hand sits near the head, a
 * pointing hand just outside the shoulder, never a long diagonal bar
 * stretched far from the torso. Feet stay under the hips except for a
 * short walk stride. Poses read through arm position and body lean, not
 * through reach.
 */
import type { Vec } from './character';

export const POSE_NAMES = [
  'wave-hello',
  'point-right',
  'present',
  'think',
  'type',
  'read',
  'thumbs-up',
  'celebrate',
  'shrug',
  'idea',
  'phone',
  'wave-goodbye',
  'subscribe-point',
  'laugh',
  'explain',
  'inspect',
  'launch',
  'sit-relaxed',
  'walk',
  'facepalm',
] as const;

export type PoseName = (typeof POSE_NAMES)[number];

export type MascotProp = 'none' | 'keyboard' | 'document' | 'phone' | 'bulb' | 'magnifier';

export type PoseDef = {
  name: PoseName;
  /** One-line usage note: which episode moment this pose fits. */
  usage: string;
  /** Head tilt in degrees, clamped to ±8 by the renderer. */
  headTilt: number;
  /** Whole-upper-body lean in degrees (positive = forward). */
  lean: number;
  /** Upper-body vertical lift in mascot px (negative = jump up). */
  lift: number;
  leftHand: Vec;
  rightHand: Vec;
  leftFoot: Vec;
  rightFoot: Vec;
  /** Optional knee fold: when set, the leg is drawn hip -> knee -> foot
      (two pixel staircases). Only sit-relaxed uses it — knees fold out
      to the sides like the reference Sit pose. Every other pose keeps
      dead-straight leg columns. */
  leftKnee: Vec | undefined;
  rightKnee: Vec | undefined;
  /** Elbow bend in px: the elbow's base outward distance from the
      shoulder (see elbowPoint in character.ts). Default 10; folded
      forearms (hand to the temple) use 12, wide shrugs 12. */
  armBend: number;
  prop: MascotProp;
  /** Eyes shift down (reading / looking at a phone). */
  eyesDown: boolean;
  /** The only pose where the eyes are covered. */
  eyesHidden: boolean;
};

const DEFAULT_HANDS = {
  left: { x: 72, y: 224 },
  right: { x: 168, y: 224 },
} as const;

const DEFAULT_FEET = {
  left: { x: 96, y: 296 },
  right: { x: 144, y: 296 },
} as const;

const base = (overrides: Partial<PoseDef> & Pick<PoseDef, 'name' | 'usage'>): PoseDef => ({
  headTilt: 0,
  lean: 0,
  lift: 0,
  leftHand: { ...DEFAULT_HANDS.left },
  rightHand: { ...DEFAULT_HANDS.right },
  leftFoot: { ...DEFAULT_FEET.left },
  rightFoot: { ...DEFAULT_FEET.right },
  leftKnee: undefined,
  rightKnee: undefined,
  // Limbs are short, thick and tucked (rebuild 17 Nov 2026): the elbow
  // sits near the shoulder and the forearm folds to the hand, so no arm
  // is a long bar with a mid kink. Legs are dead-straight columns.
  armBend: 10,
  prop: 'none',
  eyesDown: false,
  eyesHidden: false,
  ...overrides,
});

export const POSES: Record<PoseName, PoseDef> = {
  'wave-hello': base({
    name: 'wave-hello',
    usage: 'Greetings / brand-open.',
    // Hand near the head, elbow tucked low: short folded wave, like
    // reference pose 4 (Wave) — not a long bar stretched up-out.
    rightHand: { x: 208, y: 84 },
  }),
  'point-right': base({
    name: 'point-right',
    usage: 'Directing attention to the right.',
    // Short extension just outside the shoulder, like reference pose 6.
    rightHand: { x: 196, y: 164 },
  }),
  present: base({
    name: 'present',
    usage: 'Presenting a board or result to the side.',
    rightHand: { x: 194, y: 188 },
    leftHand: { x: 72, y: 208 },
  }),
  think: base({
    name: 'think',
    usage: 'Considering, weighing an idea.',
    headTilt: 6,
    rightHand: { x: 156, y: 100 },
    armBend: 12,
  }),
  type: base({
    name: 'type',
    usage: 'Working at a keyboard.',
    leftHand: { x: 92, y: 204 },
    rightHand: { x: 148, y: 204 },
    prop: 'keyboard',
  }),
  read: base({
    name: 'read',
    usage: 'Reading a document.',
    headTilt: 4,
    leftHand: { x: 104, y: 192 },
    rightHand: { x: 136, y: 192 },
    prop: 'document',
    eyesDown: true,
  }),
  'thumbs-up': base({
    name: 'thumbs-up',
    usage: 'Approval, a thing that works.',
    // Fist up beside the head, like reference pose 5 — not stretched high.
    rightHand: { x: 204, y: 92 },
  }),
  celebrate: base({
    name: 'celebrate',
    usage: 'A win, a launch, a milestone.',
    lift: -12,
    // Fists up beside the head with bent elbows, like reference pose 20
    // (Victory) — not two straight vertical poles.
    leftHand: { x: 32, y: 88 },
    rightHand: { x: 208, y: 88 },
    leftFoot: { x: 88, y: 296 },
    rightFoot: { x: 152, y: 296 },
    armBend: 8,
  }),
  shrug: base({
    name: 'shrug',
    usage: 'Uncertain, "we do not know yet".',
    leftHand: { x: 66, y: 184 },
    rightHand: { x: 174, y: 184 },
    armBend: 12,
  }),
  idea: base({
    name: 'idea',
    usage: 'An idea lands.',
    rightHand: { x: 166, y: 100 },
    prop: 'bulb',
    armBend: 12,
  }),
  phone: base({
    name: 'phone',
    usage: 'Checking a phone, a notification arrives.',
    headTilt: 4,
    leftHand: { x: 108, y: 200 },
    rightHand: { x: 132, y: 200 },
    prop: 'phone',
    eyesDown: true,
  }),
  'wave-goodbye': base({
    name: 'wave-goodbye',
    usage: 'End-card farewell.',
    rightHand: { x: 182, y: 136 },
  }),
  'subscribe-point': base({
    name: 'subscribe-point',
    usage: 'Pointing down at a CTA.',
    rightHand: { x: 168, y: 244 },
  }),
  laugh: base({
    name: 'laugh',
    usage: 'Joyful beat; eyes stay half-moon, never change shape.',
    headTilt: -7,
    leftHand: { x: 68, y: 224 },
    rightHand: { x: 172, y: 224 },
  }),
  explain: base({
    name: 'explain',
    usage: 'Mid-explanation, one hand open.',
    rightHand: { x: 188, y: 184 },
    leftHand: { x: 72, y: 214 },
  }),
  inspect: base({
    name: 'inspect',
    usage: 'Looking closer at a detail.',
    rightHand: { x: 154, y: 92 },
    prop: 'magnifier',
    armBend: 12,
  }),
  launch: base({
    name: 'launch',
    usage: 'Take-off energy, shipping something.',
    lean: 5,
    // One fist up beside the head, elbow bent — not stretched to the sky.
    rightHand: { x: 204, y: 84 },
    leftFoot: { x: 88, y: 296 },
    rightFoot: { x: 150, y: 292 },
  }),
  'sit-relaxed': base({
    name: 'sit-relaxed',
    usage: 'Chill beat, a pause between chapters.',
    lift: 16,
    leftHand: { x: 84, y: 228 },
    rightHand: { x: 156, y: 228 },
    // Seated with feet tucked under the hips, like reference
    // pose 14 (Sit): short vertical leg columns, hands resting on the
    // knees. Feet are 56px apart so the two shoes never merge into one
    // blob (the first tucked version put them 40px apart and the shoes
    // overlapped). The old wide V spread the legs into long diagonal bars.
    leftFoot: { x: 92, y: 300 },
    rightFoot: { x: 148, y: 300 },
    // Cross-legged like reference pose 14 (Sit): knees fold OUT to the
    // sides, feet tuck IN under the body, shoes pointing out.
    leftKnee: { x: 68, y: 272 },
    rightKnee: { x: 172, y: 272 },
  }),
  walk: base({
    name: 'walk',
    usage: 'Mid-stride, moving to the next idea.',
    leftHand: { x: 84, y: 210 },
    rightHand: { x: 156, y: 210 },
    // Short stride like reference pose 11: feet stay near the hips,
    // legs are short sturdy columns, not long scissor bars.
    leftFoot: { x: 84, y: 296 },
    rightFoot: { x: 156, y: 292 },
  }),
  facepalm: base({
    name: 'facepalm',
    usage: 'Bloopers / fail moments; the only pose where the eyes are covered.',
    headTilt: 5,
    rightHand: { x: 144, y: 88 },
    eyesHidden: true,
    armBend: 12,
  }),
};

export const POSE_LIST: PoseDef[] = POSE_NAMES.map((name) => POSES[name]);

export function getPose(name: PoseName): PoseDef {
  return POSES[name];
}
