// GENERATED FILE — do not edit. Run `npm run sync`.
import type { EpisodeParsed } from '../engine/spec';
import { parseEpisode } from '../engine/spec';
import type { VoAlignment } from '../engine/captions';
export type EpisodeEntry = {
  episode: EpisodeParsed;
  media: Record<string, string>;
  alignments: VoAlignment[];
  voAvailable: string[];
  audioPack: { cues: string[]; music: string[] };
};

import episode0 from '../../episodes/demo-engine/episode';
import episode1 from '../../episodes/mascot-poses/episode';

export const EPISODES = [
  { episode: parseEpisode(episode0), media: {}, alignments: [] as VoAlignment[], voAvailable: [], audioPack: {"cues":["bed-tension","click","impact","pop","riser","sparkle","swoosh-quick","transition-snap","transition-soft","type","whoosh-fast","whoosh-soft"],"music":["bed-tension"]} },
  { episode: parseEpisode(episode1), media: {}, alignments: [] as VoAlignment[], voAvailable: [], audioPack: {"cues":["bed-tension","click","impact","pop","riser","sparkle","swoosh-quick","transition-snap","transition-soft","type","whoosh-fast","whoosh-soft"],"music":["bed-tension"]} },
];
