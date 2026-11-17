/**
 * Shot gallery — every registered shot rendered once, in sequence.
 *
 * Rendered with `npm run gallery` to a single mp4, and browsable live in
 * Remotion Studio as composition `shot-gallery`. This is how the agent and a
 * human agree on what "the type-slide shot" actually looks like.
 */
import React from 'react';
import { AbsoluteFill, Series, interpolate, useCurrentFrame } from 'remotion';
import { SHOT_CATALOG } from './shots/catalog';
import { getShot } from './shots/registry';
import { typeShotContext } from './engine/gallery-context';
import { THEMES } from './engine/theme';
import { Text } from './components/Text';

const SAMPLE_PROPS: Record<string, Record<string, unknown>> = {
  'title-card': {
    eyebrow: 'Chapter 01',
    title: 'Make it *move*.',
    subtitle: 'A shot catalog built for real episodes, not demos.',
    footnote: 'Noir Studio · shot gallery',
    ghost: '01',
  },
  'list-stack': {
    header: 'What ships',
    items: [
      { index: '01', text: 'Typed episode spec', note: 'Every frame derives from one file.' },
      { index: '02', text: 'Shot vocabulary', note: 'Twenty-one reusable scenes.' },
      { index: '03', text: 'Voice + sound', note: 'ElevenLabs, cue by cue.' },
    ],
    highlight: 1,
  },
  'stat-slam': { value: '98', unit: '%', label: 'of the timing lives in one timeline', caption: 'measured, not guessed' },
  'quote-beat': {
    quote: 'A studio is a *taste*, encoded.',
    attribution: 'Noir Studio',
    role: 'operating note',
  },
  'word-cycle': {
    words: ['Watch.', 'Understand.', 'Remember.', 'Ship.'],
    framesPerWord: 16,
    heading: 'Three beats',
    accentIndex: 3,
  },
  'footage-fill': { headline: 'Footage goes here', kicker: 'b-roll', caption: 'Drop clips into footage/source/ and sync.' },
  'footage-frame': {
    heading: 'Framed clips',
    body: 'Type on one side, motion on the other. Alternate sides between scenes.',
    label: 'screen capture',
  },
  'footage-strip': {
    heading: 'Montage',
    clips: [
      { src: '', label: 'take 1' },
      { src: '', label: 'take 2' },
      { src: '', label: 'take 3' },
    ],
  },
  'compare-split': {
    heading: 'Before / after',
    left: { label: 'Before', title: 'One long export', points: ['Everything in one pass', 'Change one word, re-render all'] },
    right: { label: 'After', title: 'Composable shots', points: ['Scenes are data', 'Fix a scene, re-render the scene'] },
    winner: 'right',
  },
  'process-flow': {
    heading: 'How an episode ships',
    steps: [
      { title: 'Write the spec', note: 'Scenes, copy, voice, cues.' },
      { title: 'Check + stills', note: 'Fast loops, no full renders.' },
      { title: 'Render + master', note: 'Loudness, poster, crops.' },
      { title: 'Publish', note: 'One schedule per platform.' },
    ],
  },
  'grid-map': {
    heading: 'Shot vocabulary',
    items: ['title', 'list', 'stat', 'quote', 'word', 'compare', 'process', 'grid', 'timeline', 'chart', 'counter', 'meter'],
    columns: 3,
    accentEvery: 4,
  },
  'timeline-bar': {
    heading: 'A week in the engine',
    events: [
      { when: 'Mon', title: 'Spec drafted', note: 'Scenes + copy' },
      { when: 'Wed', title: 'Voice rendered', note: 'Captions realigned' },
      { when: 'Fri', title: 'Published', note: 'Scheduled to 3 platforms' },
    ],
    active: 1,
  },
  'big-statement': { kicker: 'The rule', lines: ['One idea.', 'Per scene.'] },
  'bar-chart': {
    heading: 'Where time goes',
    unit: 'h',
    bars: [
      { label: 'Storyboard', value: 2, display: '2h' },
      { label: 'Animation', value: 6, display: '6h' },
      { label: 'Sound', value: 3, display: '3h' },
      { label: 'Publishing', value: 0.5, display: '0.5h' },
    ],
    highlight: 1,
  },
  counter: { from: 0, to: 1240, suffix: '+', label: 'episodes rendered by the engine', decimals: 0 },
  'vs-meter': { heading: 'Old way vs engine', leftLabel: 'Manual timeline', rightLabel: 'Spec + shots', leftShare: 0.72, winnerNote: 'same film, one revision loop' },
  'brand-open': { line: 'shot gallery', particles: 30 },
  'brand-sting': { text: 'NOIR STUDIO', sub: 'chapter two' },
  'subscribe-cta': { headline: 'Follow the build.', sub: 'New episodes weekly.', cta: 'Follow' },
  mascot: { pose: 'wave-hello', caption: 'Meet Noir. Twenty poses, one character.' },
  'end-card': { line: 'Built with the Noir engine.', cta: 'Follow', handle: '@noirstudio' },
};

const ShotSlide: React.FC<{ shotId: string; format: 'reel' | 'wide' }> = ({ shotId, format }) => {
  const frame = useCurrentFrame();
  const meta = SHOT_CATALOG.find((shot) => shot.id === shotId);
  const def = getShot(shotId);
  if (!meta || !def) return null;

  const parsed = meta.schema.safeParse(SAMPLE_PROPS[shotId] ?? {});
  const props = parsed.success ? (parsed.data as Record<string, unknown>) : (SAMPLE_PROPS[shotId] ?? {});
  const ctx = typeShotContext({ format: format === 'reel' ? 'reel' : 'wide', durationInFrames: def.defaultDurationInFrames });
  const Component = def.component as React.FC<{ props: Record<string, unknown>; ctx: typeof ctx }>;
  const label = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <Component props={props} ctx={ctx} />
      <div
        style={{
          position: 'absolute',
          left: 24,
          bottom: 22,
          padding: '8px 14px',
          background: 'rgba(0,0,0,0.72)',
          color: ctx.theme.colors.text,
          fontFamily: ctx.theme.fonts.mono,
          fontSize: 20,
          letterSpacing: '0.08em',
          opacity: label,
        }}
      >
        {shotId} · {meta.label} · {def.defaultDurationInFrames}f
      </div>
    </AbsoluteFill>
  );
};

export const Gallery: React.FC<{ format?: 'reel' | 'wide' }> = ({ format = 'wide' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: THEMES.noir.colors.bg }}>
      <Series>
        {SHOT_CATALOG.map((meta) => {
          const def = getShot(meta.id)!;
          return (
            <Series.Sequence key={meta.id} durationInFrames={def.defaultDurationInFrames}>
              <ShotSlide shotId={meta.id} format={format} />
            </Series.Sequence>
          );
        })}
      </Series>
      <AbsoluteFill style={{ pointerEvents: 'none', alignItems: 'flex-end', justifyContent: 'flex-start', padding: 24 }}>
        <Text
          ctx={typeShotContext({ format: format === 'reel' ? 'reel' : 'wide', durationInFrames: 100 })}
          variant="micro"
          style={{ opacity: 0.4 }}
        >
          noir studio · shot gallery
        </Text>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
