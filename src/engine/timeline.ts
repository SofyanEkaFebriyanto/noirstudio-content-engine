/**
 * Timeline resolution — the only place that turns scenes into frames.
 *
 * Transitions overlap neighbouring scenes, so scene start times are not a
 * simple running sum. Everything downstream (VO, captions, cues) reads the
 * frames produced here.
 */
import type { EpisodeParsed } from './spec';
import { getShot, listShotIds } from './registry';

export type ResolvedScene = {
  id: string;
  shot: string;
  index: number;
  /** Scene-local length in frames, including transition overlap. */
  durationInFrames: number;
  /** Film-absolute frame where the transition into this scene starts. */
  startFrame: number;
  /** Film-absolute frame where the scene stops being visible. */
  endFrame: number;
  /** Transition INTO this scene. Null for the first scene. */
  transitionIn: { type: string; durationInFrames: number; direction?: string; wipe?: string } | null;
  props: Record<string, unknown>;
  label?: string;
};

export type ResolvedTimeline = {
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  durationInSeconds: number;
  scenes: ResolvedScene[];
  /** Frames consumed by transitions. */
  transitionFrames: number;
  warnings: string[];
};

export class TimelineError extends Error {}

export function resolveTimeline(episode: EpisodeParsed, size: { width: number; height: number }): ResolvedTimeline {
  const warnings: string[] = [];
  const scenes: ResolvedScene[] = [];
  let cursor = 0;
  let transitionFrames = 0;

  episode.scenes.forEach((scene, index) => {
    const shot = getShot(scene.shot);
    if (!shot) {
      throw new TimelineError(
        `Scene "${scene.id}" uses unknown shot "${scene.shot}". Known shots: ${listShotIds().join(', ')}`,
      );
    }

    const duration = scene.durationInFrames ?? shot.defaultDurationInFrames;
    if (duration < 1) throw new TimelineError(`Scene "${scene.id}" has non-positive duration`);

    let transitionIn: ResolvedScene['transitionIn'] = null;
    if (index > 0 && scene.transition && scene.transition.type !== 'none') {
      const tDur = Math.min(scene.transition.durationInFrames, duration - 1, scenes[index - 1]!.durationInFrames - 1);
      if (tDur < 1) {
        warnings.push(`Scene "${scene.id}": transition too long for neighbouring scenes, skipped.`);
      } else {
        transitionIn = {
          type: scene.transition.type,
          durationInFrames: tDur,
          direction: scene.transition.direction,
          wipe: scene.transition.wipe,
        };
        transitionFrames += tDur;
      }
    }

    const overlap = transitionIn?.durationInFrames ?? 0;
    const startFrame = index === 0 ? 0 : cursor - overlap;
    cursor = startFrame + duration;

    scenes.push({
      id: scene.id,
      shot: scene.shot,
      index,
      durationInFrames: duration,
      startFrame,
      endFrame: startFrame + duration,
      transitionIn,
      props: scene.props,
      label: scene.label,
    });
  });

  const durationInFrames = Math.max(1, cursor);

  // Scene prop validation is the shot's own business; surface it here so
  // `npm run check` fails before a render does.
  for (const scene of scenes) {
    const shot = getShot(scene.shot)!;
    const result = shot.schema.safeParse(scene.props ?? {});
    if (!result.success) {
      for (const issue of result.error.issues) {
        warnings.push(`Scene "${scene.id}" (${scene.shot}) props.${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
    }
  }

  return {
    fps: episode.fps,
    width: size.width,
    height: size.height,
    durationInFrames,
    durationInSeconds: durationInFrames / episode.fps,
    scenes,
    transitionFrames,
    warnings,
  };
}

/** Frame where a scene's main content is fully on screen (past any transition). */
export function contentStart(scene: ResolvedScene): number {
  return scene.startFrame + (scene.transitionIn?.durationInFrames ?? 0);
}

/** Frames between two scenes' content starts. */
export function contentGap(from: ResolvedScene, to: ResolvedScene): number {
  return contentStart(to) - contentStart(from);
}
