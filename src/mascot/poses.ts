/**
 * Pose manifest for Noir. Pure data, no React, so `schemas.ts` can import the
 * names and the Node scripts can validate them without bundling Remotion.
 *
 * The artwork for each pose lives in `sprites.ts` (traced from the reference
 * sheet); this file is the vocabulary: names, labels, and which episode moment
 * each pose fits.
 */

export const MASCOT_POSES = [
  'idle',
  'idle-2',
  'cross-arms',
  'wave',
  'thumbs-up',
  'point',
  'peace',
  'thinking',
  'confused',
  'shocked',
  'walk',
  'run',
  'jump',
  'sit',
  'crouch',
  'lie-down',
  'lying-back',
  'kneel',
  'angry',
  'victory',
] as const;

export type MascotPose = (typeof MASCOT_POSES)[number];

export type PoseEntry = {
  name: MascotPose;
  /** Label as it reads on the reference sheet. */
  label: string;
  /** One line: which episode moment this pose fits. */
  usage: string;
  /** Whether the pose carries effect marks (question marks, sparkles, motion lines...). */
  hasEffects: boolean;
};

export const MASCOT_MANIFEST: Record<MascotPose, PoseEntry> = {
  idle: {
    name: 'idle',
    label: '1. Idle',
    usage: 'The default stance: any beat where Noir is simply present, beside a stat or under a title.',
    hasEffects: false,
  },
  'idle-2': {
    name: 'idle-2',
    label: '2. Idle 2',
    usage: 'Relaxed variant of idle, one hand on the hip. Alternate with idle in a long scene so it never freezes.',
    hasEffects: false,
  },
  'cross-arms': {
    name: 'cross-arms',
    label: '3. Cross Arms',
    usage: 'Skeptical or unimpressed: testing a claim, a "does it really work" beat before the proof.',
    hasEffects: false,
  },
  wave: {
    name: 'wave',
    label: '4. Wave',
    usage: 'Greeting and sign-off: the first beat of an episode, or the goodbye on the end card.',
    hasEffects: true,
  },
  'thumbs-up': {
    name: 'thumbs-up',
    label: '5. Thumbs Up',
    usage: 'Confirms a result that held up: a check that passed, a render that matched, a fix that worked.',
    hasEffects: true,
  },
  point: {
    name: 'point',
    label: '6. Point',
    usage: 'Directs attention to a stat, list or panel placed to the left of Noir. Use flip to point right.',
    hasEffects: true,
  },
  peace: {
    name: 'peace',
    label: '7. Peace',
    usage: 'Light sign-off or a casual aside; softer than wave. Good for the outro after the ask.',
    hasEffects: true,
  },
  thinking: {
    name: 'thinking',
    label: '8. Thinking',
    usage: 'The question beat before an answer, a trade-off, or a decision the viewer is weighing.',
    hasEffects: true,
  },
  confused: {
    name: 'confused',
    label: '9. Confused',
    usage: 'Honest uncertainty: something that did not behave, an unexpected output, an open question.',
    hasEffects: true,
  },
  shocked: {
    name: 'shocked',
    label: '10. Shocked',
    usage: 'A surprising number or a failure nobody saw coming. Keep it short and pair it with the explanation.',
    hasEffects: true,
  },
  walk: {
    name: 'walk',
    label: '11. Walk',
    usage: 'Transitions and progress: moving from one chapter to the next, or into a new section.',
    hasEffects: true,
  },
  run: {
    name: 'run',
    label: '12. Run',
    usage: 'Speed and urgency that is real: a fast pipeline, a quick build, racing a deadline we actually had.',
    hasEffects: true,
  },
  jump: {
    name: 'jump',
    label: '13. Jump',
    usage: 'A milestone earned and shown: shipped, published, goal met.',
    hasEffects: true,
  },
  sit: {
    name: 'sit',
    label: '14. Sit',
    usage: 'Quiet, low-stakes beats: a pause between chapters, a calm aside, listening to the voiceover.',
    hasEffects: false,
  },
  crouch: {
    name: 'crouch',
    label: '15. Crouch',
    usage: 'Looking closely or getting ready: inspecting a detail, or the beat just before a launch.',
    hasEffects: false,
  },
  'lie-down': {
    name: 'lie-down',
    label: '16. Lie Down',
    usage: 'Rest and downtime: the build is running, nothing to do but wait. Never on a claim.',
    hasEffects: true,
  },
  'lying-back': {
    name: 'lying-back',
    label: '17. Lying Back',
    usage: 'Deep calm or giving up gracefully: the long wait, the end of a long night, a closing aside.',
    hasEffects: false,
  },
  kneel: {
    name: 'kneel',
    label: '18. Kneel',
    usage: 'Defeat or humility: a mistake we own, a thing that broke. Pair with the fix.',
    hasEffects: true,
  },
  angry: {
    name: 'angry',
    label: '19. Angry',
    usage: 'Bloopers and fail moments played for the joke: the bug that cost an hour. Always paired with the fix.',
    hasEffects: true,
  },
  victory: {
    name: 'victory',
    label: '20. Victory',
    usage: 'The earned win at the end of a hard build. One fist up; no confetti, no hype.',
    hasEffects: true,
  },
};

/** The 20 poses in canonical order, for sheets and docs. */
export const MASCOT_POSE_LIST: PoseEntry[] = MASCOT_POSES.map((name) => MASCOT_MANIFEST[name]);

export const isMascotPose = (value: string): value is MascotPose =>
  (MASCOT_POSES as readonly string[]).includes(value);
