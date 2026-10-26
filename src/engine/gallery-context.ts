/**
 * A ShotContext factory for compositions that are not episodes (the shot
 * gallery, future template previews). Keeps gallery code free of episode
 * plumbing.
 */
import { FORMATS, type FormatId } from './spec';
import { getTheme, type ShotContext } from './theme';

export function typeShotContext(options: {
  format?: FormatId;
  theme?: string;
  durationInFrames: number;
  fps?: number;
  sceneId?: string;
}): ShotContext {
  const format = options.format ?? 'wide';
  const size = FORMATS[format];
  const theme = getTheme(options.theme ?? 'noir');
  return {
    theme,
    format,
    width: size.width,
    height: size.height,
    fps: options.fps ?? 30,
    durationInFrames: options.durationInFrames,
    sceneId: options.sceneId ?? 'gallery',
    episodeId: 'gallery',
    media: (id) => {
      throw new Error(`Gallery shot requested media "${id}" — supply a real clip to preview footage shots.`);
    },
    audio: (id) => id,
  };
}
