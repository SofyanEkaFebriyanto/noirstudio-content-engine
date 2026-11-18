/**
 * demo-engine — the engine's own launch film.
 *
 * This episode exists to prove every layer end to end: brand open, type,
 * layout, data, captions, cues, end card. Treat it as the reference episode
 * when writing a new one.
 */
import { defineEpisode } from '../../src/engine/spec';

export default defineEpisode({
  id: 'demo-engine',
  title: 'The Noir Content Engine',
  logline: 'A 45-second explainer that shows how one typed spec becomes a finished, publishable film.',
  status: 'draft',
  format: 'reel',
  fps: 30,
  theme: 'noir',

  scenes: [
    {
      id: 'open',
      shot: 'brand-open',
      durationInFrames: 54,
      props: { line: 'engine · episode 01', particles: 34 },
    },
    {
      id: 'promise',
      shot: 'big-statement',
      durationInFrames: 210,
      props: {
        kicker: 'One file, one film',
        lines: ['Type the *episode*.', 'The engine does the rest.'],
      },
      transition: { type: 'fade', durationInFrames: 12 },
    },
    {
      id: 'problem',
      shot: 'compare-split',
      durationInFrames: 228,
      props: {
        heading: 'Editing by hand does not scale',
        left: {
          label: 'Before',
          title: 'One long export',
          points: ['Copy pasted per platform', 'One typo, full re-render', 'Sound mixed by ear'],
        },
        right: {
          label: 'After',
          title: 'Scenes are data',
          points: ['Same spec, every format', 'Fix a scene, re-render it', 'Cues pinned to frames'],
        },
        winner: 'right',
      },
      transition: { type: 'slide', durationInFrames: 12, direction: 'from-right' },
    },
    {
      id: 'vocabulary',
      shot: 'grid-map',
      durationInFrames: 225,
      props: {
        heading: 'Twenty shots, one voice',
        items: [
          'Title',
          'Statement',
          'Evidence',
          'Quote',
          'Counter',
          'Compare',
          'Process',
          'Timeline',
          'Chart',
          'Footage',
          'Grid',
          'End card',
        ],
        columns: 3,
        accentEvery: 4,
      },
      transition: { type: 'wipe', durationInFrames: 14, direction: 'from-left' },
    },
    {
      id: 'pipeline',
      shot: 'process-flow',
      durationInFrames: 225,
      props: {
        heading: 'From spec to scheduled',
        steps: [
          { title: 'Write the spec', note: 'Scenes, copy, narration.' },
          { title: 'Voice + cues', note: 'ElevenLabs writes the track.' },
          { title: 'Render once', note: 'Every format, same timeline.' },
          { title: 'Publish', note: 'One schedule per platform.' },
        ],
        orientation: 'vertical',
      },
      transition: { type: 'fade', durationInFrames: 12 },
    },
    {
      id: 'proof',
      shot: 'counter',
      durationInFrames: 105,
      props: {
        from: 0,
        to: 1240,
        suffix: '+',
        label: 'episodes that can ship from this one repository',
        countFrames: 40,
      },
      transition: { type: 'fade', durationInFrames: 10 },
    },
    {
      id: 'rule',
      shot: 'word-cycle',
      durationInFrames: 130,
      props: {
        words: ['Write.', 'Check.', 'Render.', 'Ship.'],
        framesPerWord: 16,
        heading: 'The loop',
        accentIndex: 3,
      },
      transition: { type: 'fade', durationInFrames: 10 },
    },
    {
      id: 'close',
      shot: 'end-card',
      durationInFrames: 96,
      props: {
        line: 'Full episodes from one typed file.',
        cta: 'Follow the build',
        handle: '@noirstudio',
      },
      transition: { type: 'fade', durationInFrames: 14 },
    },
  ],

  voice: {
    // Pinned here rather than left to .env so the film sounds the same on any
    // machine. Brian: deep, unhurried, no upward inflection — the studio
    // register. Swap for another id from `npm run vo -- --list`.
    voiceId: 'nPczCjzI2devNBz1zQrb',
    modelId: 'eleven_multilingual_v2',
    settings: { stability: 0.5, similarityBoost: 0.75, style: 0.1, speed: 1, useSpeakerBoost: true },
    segments: [
      {
        id: 'promise-1',
        scene: 'promise',
        text: 'Every film in the studio starts as one typed file: scenes, copy, narration, and cues.',
        leadInFrames: 10,
      },
      {
        id: 'problem-1',
        scene: 'problem',
        text: 'Hand editing does not scale. The same change has to be made on every platform, every time.',
        leadInFrames: 10,
      },
      {
        id: 'vocabulary-1',
        scene: 'vocabulary',
        text: 'So the engine ships a vocabulary of twenty shots. Every episode is a sentence written with them.',
        leadInFrames: 10,
      },
      {
        id: 'pipeline-1',
        scene: 'pipeline',
        text: 'Narration is synthesized, captions are timed from the alignment, and the cut is pinned to real frames.',
        leadInFrames: 10,
      },
      {
        id: 'proof-1',
        scene: 'proof',
        text: 'One timeline. Every episode.',
        leadInFrames: 8,
      },
      {
        id: 'rule-1',
        scene: 'rule',
        text: 'Write, check, render, ship. That is the whole loop.',
        leadInFrames: 8,
      },
      {
        id: 'close-1',
        scene: 'close',
        text: 'One file. Every frame. Every platform.',
        leadInFrames: 10,
      },
    ],
  },

  captions: { mode: 'words', style: 'kinetic', windowWords: 5 },

  audio: {
    music: [{ src: 'bed-tension', volume: 0.26, loop: true, fadeInFrames: 30, fadeOutFrames: 50 }],
    cues: [
      // open
      { at: 0.2, cue: 'whoosh-soft', volume: 0.6 },
      { at: 1.2, cue: 'sparkle', volume: 0.45 },
      // promise (content starts 2.2s)
      { at: 2.2, cue: 'whoosh-soft', volume: 0.55 },
      { at: 2.5, cue: 'impact', volume: 0.45 },
      // problem (content starts 8.4s)
      { at: 8.2, cue: 'whoosh-soft', volume: 0.5 },
      { at: 9.6, cue: 'pop', volume: 0.4 },
      { at: 10.6, cue: 'pop', volume: 0.4 },
      { at: 12.4, cue: 'swoosh-quick', volume: 0.45 },
      // vocabulary (content starts 15.6s)
      { at: 15.3, cue: 'swoosh-quick', volume: 0.5 },
      { at: 16.6, cue: 'sparkle', volume: 0.4 },
      { at: 18.0, cue: 'transition-soft', volume: 0.4 },
      // pipeline (content starts 22.6s)
      { at: 22.0, cue: 'riser', volume: 0.35 },
      { at: 23.4, cue: 'impact', volume: 0.5 },
      { at: 25.0, cue: 'pop', volume: 0.35 },
      { at: 26.0, cue: 'pop', volume: 0.35 },
      // proof (content starts 29.7s)
      { at: 29.6, cue: 'click', volume: 0.35 },
      { at: 31.2, cue: 'sparkle', volume: 0.4 },
      // rule (content starts 31.9s)
      { at: 32.2, cue: 'pop', volume: 0.4 },
      { at: 32.8, cue: 'pop', volume: 0.4 },
      { at: 33.5, cue: 'pop', volume: 0.4 },
      { at: 34.2, cue: 'whoosh-fast', volume: 0.45 },
      // close (content starts 35.9s)
      { at: 35.8, cue: 'whoosh-soft', volume: 0.5 },
      { at: 37.4, cue: 'sparkle', volume: 0.45 },
      { at: 38.2, cue: 'impact', volume: 0.4 },
    ],
  },

  publish: {
    title: 'The Noir Content Engine',
    caption:
      'One typed file becomes the whole film: scenes, narration, captions, cues, and a scheduled post on every platform.',
    hashtags: ['noirstudio', 'motiondesign', 'contentengine'],
    extra: { isAiGenerated: true, shareToFeed: true },
  },

  notes:
    'Reference episode. The cue sheet is deliberately dense so `npm run check` exercises boundary conditions.',
});
