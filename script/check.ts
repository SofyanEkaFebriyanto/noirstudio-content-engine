/**
 * npm run check
 *
 * Validates every episode without rendering. Fast enough to run in a loop:
 *   spec shape → scene props → timing → audio references → media presence
 *   → publish metadata → VO alignment coverage
 *
 * Exits non-zero on errors; warnings never fail the build.
 */
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, flag, log } from './lib/cli';
import { abs, readJson } from './lib/fsx';
import { episodeIssues, FORMATS, parseEpisode, type EpisodeParsed } from '../src/engine/spec';
import { getShotMeta } from '../src/shots/catalog';
import { THEMES } from '../src/engine/theme';
import { BED_ROLES, CUE_ROLES, isBedRole } from '../src/engine/audio';

type Problem = { level: 'error' | 'warn'; where: string; message: string };

const args = parseArgs(process.argv.slice(2), ['verbose']);
const verbose = flag(args, 'verbose');
const only = args.positional[0];

async function loadSpec(dir: string): Promise<unknown> {
  const file = join(dir, 'episode.ts');
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  return mod.default ?? mod.episode;
}

/**
 * Real film length in frames. Scene durations overlap wherever a transition
 * joins them, so the sum of durations is not the answer — this mirrors
 * resolveTimeline without importing Remotion.
 */
function timelineFrames(spec: EpisodeParsed): number {
  let cursor = 0;
  spec.scenes.forEach((scene, index) => {
    const shot = getShotMeta(scene.shot);
    const duration = scene.durationInFrames ?? shot?.defaultDurationInFrames ?? 0;
    const overlap =
      index > 0 && scene.transition && scene.transition.type !== 'none'
        ? Math.min(scene.transition.durationInFrames, duration - 1)
        : 0;
    const start = index === 0 ? 0 : cursor - overlap;
    cursor = start + duration;
  });
  return cursor;
}

function checkEpisode(spec: EpisodeParsed, dir: string): Problem[] {
  const problems: Problem[] = [];
  const add = (level: Problem['level'], where: string, message: string) => problems.push({ level, where, message });

  if (!THEMES[spec.theme]) {
    add('error', 'theme', `Unknown theme "${spec.theme}". Available: ${Object.keys(THEMES).join(', ')}`);
  }

  // ── Scenes ────────────────────────────────────────────────────────────
  const ids = new Set<string>();
  let cursor = 0;
  let totalFrames = 0;

  spec.scenes.forEach((scene, index) => {
    const where = `scenes[${index}] (${scene.id})`;
    if (ids.has(scene.id)) add('error', where, `Duplicate scene id "${scene.id}"`);
    ids.add(scene.id);

    const shot = getShotMeta(scene.shot);
    if (!shot) {
      add('error', where, `Unknown shot "${scene.shot}"`);
      return;
    }

    const parsed = shot.schema.safeParse(scene.props ?? {});
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        add('error', where, `props.${issue.path.join('.') || '(root)'}: ${issue.message}`);
      }
    }

    const duration = scene.durationInFrames ?? shot.defaultDurationInFrames;
    if (duration < 8) add('warn', where, `${duration} frames is very short; viewers will not register it.`);

    if (index > 0 && scene.transition && scene.transition.type !== 'none') {
      const prev = spec.scenes[index - 1]!;
      const prevShot = getShotMeta(prev.shot);
      const prevDuration = prev.durationInFrames ?? prevShot?.defaultDurationInFrames ?? 0;
      if (scene.transition.durationInFrames >= Math.min(duration, prevDuration)) {
        add(
          'error',
          where,
          `Transition (${scene.transition.durationInFrames}f) is longer than the scene it joins (${Math.min(duration, prevDuration)}f).`,
        );
      }
    }

    const overlap =
      index > 0 && scene.transition && scene.transition.type !== 'none'
        ? Math.min(scene.transition.durationInFrames, duration - 1)
        : 0;
    const start = index === 0 ? 0 : cursor - overlap;
    cursor = start + duration;
    totalFrames = cursor;

    // Shot-specific sanity checks that schemas cannot express.
    const props = (parsed.success ? parsed.data : scene.props) as Record<string, unknown>;
    if (shot.id.startsWith('footage-') && !props.src) {
      add('warn', where, 'Footage shot has an empty src; it will render a placeholder.');
    }
    if (shot.id === 'word-cycle') {
      const words = props.words as string[] | undefined;
      if (words && words.length > 6) add('warn', where, `${words.length} words is a lot for one cycle; 3–5 reads better.`);
      const framesPerWord = (props.framesPerWord as number | undefined) ?? 16;
      if (words && words.length * framesPerWord > duration) {
        add('warn', where, `word-cycle needs ${words.length * framesPerWord}f but the scene is ${duration}f; later words never show.`);
      }
    }
    if (shot.id === 'bar-chart' || shot.id === 'vs-meter') {
      const highlight = props.highlight as number | undefined;
      if (typeof highlight === 'number' && highlight >= 0) {
        const bars = props.bars as unknown[] | undefined;
        if (bars && highlight >= bars.length) add('error', where, `highlight index ${highlight} is out of range.`);
      }
    }
  });

  const seconds = totalFrames / spec.fps;
  if (seconds < 5) add('warn', 'duration', `Film is only ${seconds.toFixed(1)}s; too short for most platforms.`);
  if (spec.format === 'reel' && seconds > 180) {
    add('warn', 'duration', `${seconds.toFixed(0)}s exceeds 3 minutes, which is outside the Reels sweet spot.`);
  }

  // ── Film-level visual rhythm ──────────────────────────────────────────
  const shotCounts = new Map<string, number>();
  spec.scenes.forEach((scene) => shotCounts.set(scene.shot, (shotCounts.get(scene.shot) ?? 0) + 1));
  for (const [shotId, count] of shotCounts) {
    if (count > 4 && !shotId.startsWith('footage-')) {
      add('warn', 'rhythm', `"${shotId}" appears ${count} times. Vary the shot vocabulary.`);
    }
  }
  if (shotCounts.size < 3 && spec.scenes.length >= 5) {
    add('warn', 'rhythm', `Only ${shotCounts.size} distinct shots across ${spec.scenes.length} scenes; the film will feel monotone.`);
  }

  // ── Media ─────────────────────────────────────────────────────────────
  const manifestPath = abs('docs', 'media', `${spec.id}.json`);
  const manifest: Record<string, string> = readJson(manifestPath, {});
  const sceneSrcs = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        if (key === 'src' && typeof inner === 'string') sceneSrcs.add(inner);
        else visit(inner);
      }
    }
  };
  spec.scenes.forEach((scene) => visit(scene.props));
  for (const src of sceneSrcs) {
    if (!src || src.startsWith('path:')) continue;
    if (!manifest[src]) {
      add('warn', `media "${src}"`, `No source file mapped. Add footage/source/${src}.<ext> or episodes/${basename(dir)}/media.json`);
    }
  }

  // ── Audio ─────────────────────────────────────────────────────────────
  for (const [index, track] of spec.audio.music.entries()) {
    const where = `audio.music[${index}]`;
    if (!track.src) {
      add('error', where, 'Missing src');
    } else if (!track.src.startsWith('path:')) {
      // A bed must be a loopable file. Pointing music at a one-shot cue is the
      // mistake this check exists to catch.
      if (isBedRole(track.src)) {
        // fine
      } else if (CUE_ROLES.includes(track.src as never)) {
        add(
          'error',
          where,
          `"${track.src}" is a one-shot cue, not a music bed. Beds: ${BED_ROLES.join(', ')}. Use a cue in audio.cues, or add a loopable file.`,
        );
      }
    }
    if (track.volume > 0.6) add('warn', where, `Volume ${track.volume} will bury the VO; keep beds under 0.4.`);
  }
  for (const [index, cue] of spec.audio.cues.entries()) {
    const where = `audio.cues[${index}] (${cue.cue})`;
    if (!cue.cue) add('error', where, 'Missing cue id');
    const role = cue.cue.startsWith('path:') ? null : cue.cue;
    if (role && !CUE_ROLES.includes(role as never) && !existsSync(abs('public', 'audio', 'pack', `${role}.mp3`))) {
      add('warn', where, `"${role}" is not in the audio pack. Add public/audio/pack/${role}.mp3 or use a known role.`);
    }
    if (cue.at < 0 || cue.at * spec.fps > totalFrames) {
      add('error', where, `Cue at ${cue.at}s falls outside the film (0–${seconds.toFixed(1)}s).`);
    }
  }

  // ── VO ────────────────────────────────────────────────────────────────
  if (spec.voice) {
    const segments = spec.voice.segments;
    const segIds = new Set<string>();
    if (segments.length === 0) {
      add('warn', 'voice', 'Voice block exists but has no segments; captions will be empty.');
    }
    for (const [index, segment] of segments.entries()) {
      const where = `voice.segments[${index}] (${segment.id})`;
      if (segIds.has(segment.id)) add('error', where, 'Duplicate segment id');
      segIds.add(segment.id);
      if (segment.scene && !ids.has(segment.scene)) {
        add('error', where, `Scene "${segment.scene}" does not exist.`);
      }
      const wordCount = segment.text.trim().split(/\s+/).length;
      if (wordCount > 42) {
        add('warn', where, `${wordCount} words in one segment; split it so captions can breathe.`);
      }
      const estimate = Math.max(0.45, wordCount / 2.55 + 0.18);
      if (segment.scene) {
        const scene = spec.scenes.find((item) => item.id === segment.scene);
        const shot = scene ? getShotMeta(scene.shot) : undefined;
        const duration = scene ? (scene.durationInFrames ?? shot?.defaultDurationInFrames ?? 0) : 0;
        const available = duration / spec.fps - segment.leadInFrames / 30;
        if (estimate > available) {
          // Slightly over is normal — the real measurement in `vo` is the
          // authority. Well over is a script problem.
          add(
            estimate > available * 1.25 ? 'error' : 'warn',
            where,
            `Approx. ${estimate.toFixed(1)}s of speech in a ${available.toFixed(1)}s scene. Shorten the line or lengthen the scene.`,
          );
        }
      }
    }

    /*
     * Overlap check.
     *
     * Each segment is placed at its scene's content start plus its lead-in, so
     * a short scene can push one segment into the next. Nothing complained
     * when proof-1 and rule-1 collided; the film just had two voices at once.
     *
     * Compare on the *estimate*, since check must not depend on rendered audio.
     */
    const placed = segments
      .map((segment) => {
        const sceneIndex = segment.scene ? spec.scenes.findIndex((item) => item.id === segment.scene) : -1;
        if (sceneIndex === -1) return null;
        const scene = spec.scenes[sceneIndex]!;
        const shot = getShotMeta(scene.shot);
        const duration = scene.durationInFrames ?? shot?.defaultDurationInFrames ?? 0;
        const overlap =
          sceneIndex > 0 && scene.transition && scene.transition.type !== 'none'
            ? Math.min(scene.transition.durationInFrames, duration - 1)
            : 0;

        // Rebuild the scene's content start the same way the timeline does.
        let cursor = 0;
        for (let i = 0; i <= sceneIndex; i++) {
          const item = spec.scenes[i]!;
          const itemShot = getShotMeta(item.shot);
          const itemDuration = item.durationInFrames ?? itemShot?.defaultDurationInFrames ?? 0;
          const itemOverlap =
            i > 0 && item.transition && item.transition.type !== 'none'
              ? Math.min(item.transition.durationInFrames, itemDuration - 1)
              : 0;
          const start = i === 0 ? 0 : cursor - itemOverlap;
          cursor = start + itemDuration;
          if (i === sceneIndex) {
            const contentStart = (start + itemOverlap) / spec.fps;
            const words = segment.text.trim().split(/\s+/).length;
            const seconds = Math.max(0.45, words / 2.55 + 0.18);
            return {
              id: segment.id,
              start: contentStart + segment.leadInFrames / 30,
              end: contentStart + segment.leadInFrames / 30 + seconds,
              sceneEnd: (start + itemDuration) / spec.fps,
            };
          }
        }
        return null;
      })
      .filter((item): item is { id: string; start: number; end: number; sceneEnd: number } => item !== null)
      .sort((a, b) => a.start - b.start);

    for (let i = 1; i < placed.length; i++) {
      const prev = placed[i - 1]!;
      const current = placed[i]!;
      if (current.start < prev.end - 0.05) {
        add(
          'error',
          `voice (${prev.id} → ${current.id})`,
          `Overlapping narration: "${prev.id}" runs to ~${prev.end.toFixed(2)}s but "${current.id}" starts at ${current.start.toFixed(2)}s. Lengthen the scene or shorten a line.`,
        );
      }
    }

    /*
     * A line that runs past its scene bleeds into the next cut. This is an
     * estimate (2.55 words/s), and real timing varies by roughly +/-10%, so
     * only flag a genuine overshoot — the measured warning in `npm run vo`
     * is the precise one.
     */
    for (const item of placed) {
      const overshoot = item.end - item.sceneEnd;
      if (overshoot > 0.35) {
        add(
          'warn',
          `voice (${item.id})`,
          `Speech runs ~${overshoot.toFixed(2)}s past the end of its scene. It will bleed into the next cut.`,
        );
      }
    }
  } else if (spec.captions.mode !== 'off') {
    add('warn', 'captions', 'Captions are on but there is no voice block; only `captions.extra` lines will show.');
  }

  // ── Publish ───────────────────────────────────────────────────────────
  if (spec.publish) {
    if (!spec.publish.caption) add('warn', 'publish', 'Empty caption; Zernio needs content for a post without per-platform overrides.');
    if (spec.publish.caption.length > 2200) add('warn', 'publish', 'Caption exceeds 2,200 characters (Instagram limit).');
  }
  if (spec.status === 'final' && !spec.publish) {
    add('warn', 'publish', 'Status is final but no publish block exists.');
  }

  // ── Captions ──────────────────────────────────────────────────────────
  // `captions.extra` is hand-timed, so two blocks can silently overlap — and
  // the renderer only ever draws the first match.
  const extraLines = [...spec.captions.extra].sort((a, b) => a.from - b.from);
  for (let i = 1; i < extraLines.length; i++) {
    const prev = extraLines[i - 1]!;
    const current = extraLines[i]!;
    if (current.from < prev.to) {
      add(
        'error',
        `captions.extra[${i}]`,
        `Overlaps the previous line (${prev.from}–${prev.to}f vs ${current.from}f). Only the first would ever show.`,
      );
    }
  }

  return problems;
}

async function main() {
  const dirs = abs('episodes');
  const { readdirSync } = await import('node:fs');
  const episodes = existsSync(dirs)
    ? readdirSync(dirs, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
        .map((entry) => join(dirs, entry.name))
        .filter((dir) => existsSync(join(dir, 'episode.ts')))
    : [];

  const selected = only ? episodes.filter((dir) => basename(dir) === only || dir.endsWith(`/${only}`)) : episodes;

  if (selected.length === 0) {
    log.warn(only ? `No episode named "${only}".` : 'No episodes yet. Create one: npm run new -- my-episode');
    return;
  }

  let errors = 0;
  let warnings = 0;

  for (const dir of selected) {
    const name = basename(dir);
    log.step(`Checking ${name}`);

    const raw = await loadSpec(dir);
    const issues = episodeIssues(raw);
    if (issues.length > 0) {
      errors += issues.length;
      for (const issue of issues) log.error(`  spec · ${issue}`);
      continue;
    }

    const spec = parseEpisode(raw);
    const problems = checkEpisode(spec, dir);

    const shotCount = new Set(spec.scenes.map((scene) => scene.shot)).size;
    const format = FORMATS[spec.format];
    const realFrames = timelineFrames(spec);

    log.dim(
      `  ${spec.scenes.length} scenes · ${shotCount} shots · ${(realFrames / spec.fps).toFixed(1)}s · ${format.width}×${format.height} @ ${spec.fps}fps · theme ${spec.theme}`,
    );

    for (const problem of problems) {
      if (problem.level === 'error') {
        errors++;
        log.error(`  ${problem.where} · ${problem.message}`);
      } else {
        warnings++;
        if (verbose) log.warn(`  ${problem.where} · ${problem.message}`);
        else log.warn(`  ${problem.where} · ${problem.message}`);
      }
    }

    if (problems.length === 0) log.ok('  No issues.');
  }

  log.raw('');
  if (errors > 0) {
    log.error(`${errors} error(s), ${warnings} warning(s)`);
    process.exit(1);
  }
  log.ok(`${selected.length} episode(s) valid${warnings ? ` · ${warnings} warning(s)` : ''}`);
}

main().catch((error) => {
  log.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
