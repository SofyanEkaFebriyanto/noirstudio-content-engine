/**
 * Composition registry. One composition per episode, plus the shot gallery
 * and the mascot character sheet.
 *
 * `src/generated/episodes.ts` is written by `npm run sync` — never edit it by
 * hand; edit `episodes/<id>/episode.ts` and re-run sync.
 */
import React from 'react';
import { Composition } from 'remotion';
import { Film } from './Film';
import { Gallery } from './Gallery';
import { MASCOT_SHEET, MascotSheet } from './MascotSheet';
import { FORMATS } from './engine/spec';
import { resolveTimeline } from './engine/timeline';
import { loadBrandFonts } from './engine/fonts';
import { EPISODES } from './generated/episodes';
import { SHOT_CATALOG } from './shots/catalog';
import { getShot } from './shots/registry';
import './shots';

loadBrandFonts();

const GALLERY_FRAMES = SHOT_CATALOG.reduce((sum, meta) => sum + (getShot(meta.id)?.defaultDurationInFrames ?? 30), 0);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {EPISODES.map((entry) => {
        const format = FORMATS[entry.episode.format];
        const timeline = resolveTimeline(entry.episode, { width: format.width, height: format.height });
        return (
          <Composition
            key={entry.episode.id}
            id={entry.episode.id}
            component={Film}
            durationInFrames={timeline.durationInFrames}
            fps={entry.episode.fps}
            width={format.width}
            height={format.height}
            defaultProps={{
              episode: entry.episode,
              media: entry.media,
              alignments: entry.alignments,
              voAvailable: entry.voAvailable,
              audioPack: entry.audioPack,
              music: true,
              vo: true,
              captions: true,
            }}
          />
        );
      })}

      {/*
        Shot gallery — the living documentation of the shot vocabulary.
        Browse in Studio, or render with `npm run gallery`.
      */}
      <Composition
        id="shot-gallery"
        component={Gallery}
        durationInFrames={Math.max(1, GALLERY_FRAMES)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ format: 'wide' as const }}
      />

      {/* Character sheet: all 20 mascot poses on one still. `npm run mascot:sheet`. */}
      <Composition
        id="mascot-sheet"
        component={MascotSheet}
        durationInFrames={1}
        fps={30}
        width={MASCOT_SHEET.width}
        height={MASCOT_SHEET.height}
        defaultProps={{ theme: 'noir' }}
      />
    </>
  );
};
