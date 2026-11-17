/**
 * mascot-poses — the mascot pose gallery.
 *
 * One scene per pose, in catalog order, so every pose can be checked with
 * `npm run still -- mascot-poses --still <seconds>` and the whole set with
 * `npm run render -- mascot-poses`. No voice, no music: this is a visual
 * reference film, not a published episode.
 */
import { defineEpisode } from '../../src/engine/spec';
import { POSE_LIST } from '../../src/mascot/poses';

export default defineEpisode({
  id: 'mascot-poses',
  title: 'Noir — twenty poses',
  logline: 'Every mascot pose, once, so the character can be checked frame by frame.',
  status: 'draft',
  format: 'reel',
  fps: 30,
  theme: 'noir',

  scenes: POSE_LIST.map((pose, index) => ({
    id: pose.name,
    shot: 'mascot',
    durationInFrames: 40,
    props: {
      pose: pose.name,
      caption: `${pose.name} — ${pose.usage}`,
    },
    ...(index > 0 ? { transition: { type: 'fade', durationInFrames: 8 } } : {}),
  })),

  captions: { mode: 'off', style: 'none', windowWords: 5 },

  notes: 'Pose gallery. Headphones are on in every scene by construction; no backpack anywhere.',
});
