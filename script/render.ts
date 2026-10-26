/**
 * npm run render -- <episode> [--version v2] [--still 3.5,12] [--no-music] [--no-vo] [--no-captions]
 *
 * Renders one composition through Remotion's Node API so the output path,
 * loudness pass and manifest are handled consistently.
 *
 * `--still` renders frames only — the fast visual check used during iteration.
 */
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, flag, flagValue, log, fail, formatDuration } from './lib/cli';
import { abs, writeJson } from './lib/fsx';
import { loudnorm, hasFfmpeg, extractFrame } from './lib/audio-tools';
import type { EpisodeEntry } from '../src/generated/episodes';
import { getShotMeta } from '../src/shots/catalog';

const args = parseArgs(process.argv.slice(2), ['no-music', 'no-vo', 'no-captions']);

// `--still 3,10` as the first argument (rather than a time list) means the user
// wrote `npm run still -- <episode> …` without `--`: the time list became the
// positional and the episode name became the flag value. Catch it loudly — a
// silently wrong render is worse than an error.
const maybeStyledTimes = args.positional[0];
const stillValue = flagValue(args, 'still');
if (maybeStyledTimes && /\d/.test(maybeStyledTimes) && /[,.]/.test(maybeStyledTimes) && stillValue) {
  fail(
    `Looks like the arguments are swapped: got --still "${stillValue}" and "${maybeStyledTimes}".\n` +
      'Use one of:\n' +
      '  npm run still -- <episode> --still 3,10\n' +
      '  npx tsx script/render.ts --still 3,10 <episode>',
  );
}

const episodeArg = args.positional[0];
const version = flagValue(args, 'version') ?? 'v1';
const stillArg = flagValue(args, 'still');
const withMusic = !flag(args, 'no-music');
const withVo = !flag(args, 'no-vo');
const withCaptions = !flag(args, 'no-captions');
const concurrency = Number(flagValue(args, 'concurrency') ?? 2);

async function loadEntry(): Promise<EpisodeEntry> {
  const { EPISODES } = await import('../src/generated/episodes');
  if (!episodeArg) {
    if (EPISODES.length === 1) return EPISODES[0]!;
    fail(
      `Which episode?\n${EPISODES.map((entry) => `  ${entry.episode.id}`).join('\n') || '  (none — run npm run sync)'}`,
    );
  }
  const entry = EPISODES.find((item) => item.episode.id === episodeArg);
  if (!entry) {
    fail(`No episode "${episodeArg}". Known: ${EPISODES.map((item) => item.episode.id).join(', ') || '(none)'}`);
  }
  return entry;
}

function assertRendered(entry: EpisodeEntry) {
  const bundleDir = abs('src', 'index.ts');
  if (!bundleDir) fail('src/index.ts missing');
  const publicDir = abs('public');
  for (const relative of Object.values(entry.media as Record<string, string>)) {
    const full = join(publicDir, relative);
    if (!existsSync(full)) {
      log.warn(`Missing media: public/${relative} — run npm run sync`);
    }
  }
}

async function main() {
  const entry = await loadEntry();
  const { episode } = entry;
  assertRendered(entry);

  const { bundle } = await import('@remotion/bundler');
  const { getCompositions, renderStill, renderMedia, ensureBrowser } = await import('@remotion/renderer');

  await ensureBrowser();
  log.step(`Bundling ${episode.id}`);
  const serveUrl = await bundle({ entryPoint: abs('src', 'index.ts'), publicDir: abs('public') });

  const compositions = await getCompositions(serveUrl, {
    inputProps: {
      episode,
      media: entry.media,
      alignments: entry.alignments,
      voAvailable: entry.voAvailable,
      music: withMusic,
      vo: withVo,
      captions: withCaptions,
    },
  });
  const composition = compositions.find((item) => item.id === episode.id);
  if (!composition) fail(`Composition "${episode.id}" not found in the bundle.`);

  const outDir = abs('out', episode.id);
  mkdirSync(outDir, { recursive: true });

  const inputProps = {
    episode,
    media: entry.media,
    alignments: entry.alignments,
    voAvailable: entry.voAvailable,
    music: withMusic,
    vo: withVo,
    captions: withCaptions,
  };

  // ── Stills ────────────────────────────────────────────────────────────
  if (stillArg) {
    const times = stillArg
      .split(',')
      .map((value) => Number.parseFloat(value.trim()))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (times.length === 0) fail('--still needs at least one time in seconds, e.g. --still 3.5,12');

    for (const time of times) {
      const frame = Math.min(composition.durationInFrames - 1, Math.round(time * composition.fps));
      const output = join(outDir, `still-${time.toFixed(2)}.png`);
      await renderStill({
        composition,
        serveUrl,
        output,
        frame,
        inputProps,
        chromiumOptions: { gl: 'swangle' },
      });
      log.ok(`${output}  (frame ${frame})`);
    }
    return;
  }

  // ── Film ──────────────────────────────────────────────────────────────
  const rawOutput = join(outDir, `film-${version}-raw.mp4`);
  const finalOutput = join(outDir, `film-${version}.mp4`);
  const started = Date.now();

  log.step(`Rendering ${episode.id} ${version}`);
  log.dim(
    `  ${composition.width}×${composition.height} · ${composition.fps}fps · ${composition.durationInFrames}f (${formatDuration(
      composition.durationInFrames / composition.fps,
    )})`,
  );

  let lastPercent = 0;
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: rawOutput,
    inputProps,
    concurrency,
    chromiumOptions: { gl: 'swangle' },
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      if (percent >= lastPercent + 10) {
        lastPercent = percent;
        log.dim(`  ${percent}%`);
      }
    },
  });

  // ── Loudness ──────────────────────────────────────────────────────────
  let finalFile = rawOutput;
  let normalized = false;
  if (episode.audio.master && hasFfmpeg()) {
    const { targetLufs, truePeakDb } = episode.audio.master as { targetLufs: number; truePeakDb: number };
    log.step(`Normalizing to ${targetLufs} LUFS`);
    if (loudnorm(rawOutput, finalOutput, targetLufs, truePeakDb)) {
      finalFile = finalOutput;
      normalized = true;
    } else {
      log.warn('ffmpeg loudnorm failed; keeping the raw render.');
    }
  } else if (!hasFfmpeg()) {
    log.warn('ffmpeg not found — skipping loudness normalization.');
  }

  // ── Thumbnail + manifest ──────────────────────────────────────────────
  const thumbnail = join(outDir, `thumb-${version}.jpg`);
  extractFrame(finalFile, Math.min(1.5, composition.durationInFrames / composition.fps / 3), thumbnail);

  // Scene frames, so downstream tools (master) can pick settled frames without
  // importing the React shot registry.
  let cursor = 0;
  const sceneFrames = episode.scenes.map((scene, index) => {
    const meta = getShotMeta(scene.shot);
    const durationInFrames = scene.durationInFrames ?? meta?.defaultDurationInFrames ?? 30;
    const transitionIn =
      index > 0 && scene.transition && scene.transition.type !== 'none'
        ? Math.min(scene.transition.durationInFrames, durationInFrames - 1)
        : 0;
    const startFrame = index === 0 ? 0 : cursor - transitionIn;
    cursor = startFrame + durationInFrames;
    return { id: scene.id, shot: scene.shot, startFrame, durationInFrames, transitionIn };
  });

  const manifest = {
    episodeId: episode.id,
    version,
    scenes: sceneFrames,
    file: finalFile,
    thumbnail,
    renderedAt: new Date().toISOString(),
    durationSeconds: composition.durationInFrames / composition.fps,
    width: composition.width,
    height: composition.height,
    fps: composition.fps,
    music: withMusic,
    vo: withVo,
    captions: withCaptions,
    /** Master must not normalize again — a second pass moves the peak. */
    normalized,
    elapsedSeconds: Math.round((Date.now() - started) / 1000),
  };
  writeJson(join(outDir, `render-${version}.json`), manifest);

  const size = statSync(finalFile).size;
  log.ok(`${finalFile}  (${(size / 1e6).toFixed(1)} MB · ${manifest.elapsedSeconds}s)`);
  log.dim(`  Next: npm run publish -- ${episode.id} --version ${version} --dry-run`);
}

main().catch((error) => {
  log.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
