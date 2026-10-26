/**
 * __TITLE__ — episode spec.
 *
 * Timing is in frames (@30fps by default). A scene either names its duration
 * or inherits the shot default. Transitions overlap their neighbours, so the
 * film gets shorter than the sum of scene durations.
 *
 * Reference: .claude/skills/noir-script/SKILL.md
 */
import { defineEpisode } from '../../src/engine/spec';

export default defineEpisode({
  id: '__ID__',
  title: '__TITLE__',
  logline: 'One sentence describing what the viewer gets.',
  status: 'draft',
  format: '__FORMAT__',
  fps: 30,
  theme: 'noir',

  scenes: [
    {
      id: 'open',
      shot: 'brand-open',
      durationInFrames: 45,
      props: { line: 'EPISODE 01' },
    },
    {
      id: 'hook',
      shot: 'big-statement',
      durationInFrames: 75,
      props: {
        kicker: 'THE PROBLEM',
        lines: ['*One* idea.', 'Per scene.'],
      },
      transition: { type: 'fade', durationInFrames: 12 },
    },
    {
      id: 'body',
      shot: 'list-stack',
      durationInFrames: 96,
      props: {
        header: 'WHAT WE COVER',
        items: [
          { text: 'The first point', note: 'One line of support.' },
          { text: 'The second point', note: 'One line of support.' },
          { text: 'The third point', note: 'One line of support.' },
        ],
        highlight: 1,
      },
      transition: { type: 'slide', durationInFrames: 12, direction: 'from-right' },
    },
    {
      id: 'close',
      shot: 'end-card',
      durationInFrames: 84,
      props: {
        line: 'Built with the Noir engine.',
        cta: 'Follow',
        handle: '@noirstudio',
      },
      transition: { type: 'fade', durationInFrames: 12 },
    },
  ],

  // Optional narration. `npm run vo` synthesizes these and the timeline places
  // each segment at the start of its scene.
  // voice: {
  //   voiceId: 'YOUR_VOICE_ID',
  //   modelId: 'eleven_multilingual_v2',
  //   settings: { stability: 0.5, similarityBoost: 0.75, style: 0, speed: 1 },
  //   segments: [
  //     { id: 'hook-1', scene: 'hook', text: 'Most films say too much.' },
  //   ],
  // },

  captions: { mode: 'words', style: 'kinetic', windowWords: 5 },

  audio: {
    music: [
      // { src: 'bed-tension', volume: 0.28, loop: true, fadeInFrames: 24, fadeOutFrames: 40 },
    ],
    cues: [
      // { at: 1.5, cue: 'whoosh-soft', volume: 0.7 },
    ],
  },

  publish: {
    title: '__TITLE__',
    caption: 'Write the caption here. One idea, one ask.',
    hashtags: ['noirstudio', 'motiondesign'],
  },

  notes: '',
});
