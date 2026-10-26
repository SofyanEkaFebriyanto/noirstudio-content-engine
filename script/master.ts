/**
 * npm run master -- <episode> [--version v1]
 *
 * Produces the platform deliverables from a rendered film:
 *   - the master mp4
 *   - a vertical 9:16 crop when the master is not already vertical
 *   - a poster frame
 *   - a delivery.json with everything publish.ts needs
 *
 * Uses ffmpeg only. Fails loudly when ffmpeg is missing, because a "master"
 * without a poster and loudness pass is not a master.
 */
import { existsSync, mkdirSync, statSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, flagValue, log, fail } from './lib/cli';
import { abs, readJson, writeJson } from './lib/fsx';
import { extractFrame, hasFfmpeg, loudnorm, hasFfprobe } from './lib/audio-tools';
import { execFileSync } from 'node:child_process';

const args = parseArgs();
const episodeId = args.positional[0];
const version = flagValue(args, 'version') ?? 'v1';

type RenderManifest = {
  file: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  /** true when `render` already applied the loudness pass. */
  normalized?: boolean;
  scenes?: {
    id: string;
    shot: string;
    startFrame: number;
    durationInFrames: number;
    transitionIn: number;
  }[];
};

if (!episodeId) fail('Usage: npm run master -- <episode> [--version v1]');
if (!hasFfmpeg() || !hasFfprobe()) fail('ffmpeg and ffprobe are required for mastering. Install ffmpeg first.');

const outDir = abs('out', episodeId);
const renderPath = join(outDir, `render-${version}.json`);
if (!existsSync(renderPath)) fail(`No render manifest at out/${episodeId}/render-${version}.json`);
const render = readJson<RenderManifest>(renderPath);
if (!existsSync(render.file)) fail(`Rendered file missing: ${render.file}`);

const deliveryDir = join(outDir, 'delivery');
mkdirSync(deliveryDir, { recursive: true });

const master = join(deliveryDir, `${episodeId}-${version}-master.mp4`);
const vertical = join(deliveryDir, `${episodeId}-${version}-vertical.mp4`);
const square = join(deliveryDir, `${episodeId}-${version}-square.mp4`);
const poster = join(deliveryDir, `${episodeId}-${version}-poster.jpg`);

log.step(`Mastering ${episodeId} ${version}`);

// Master: stream-copy video, and normalize audio only once.
//
// `npm run render` already normalized. Running loudnorm again on an already
// normalized file moves the integrated loudness and pushes the true peak up
// (−1.5 dBTP became −0.5 dBTP on the second pass). So: if the render manifest
// says normalized, copy; otherwise normalize here.
if (render.normalized) {
  log.info('Render was already normalized — copying without a second pass.');
  copyFileSync(render.file, master);
} else if (!loudnorm(render.file, master)) {
  log.warn('Loudness pass failed; copying the render as the master.');
  copyFileSync(render.file, master);
}
log.ok(`master  ${master}`);

const isVertical = render.height > render.width;
const isSquare = render.width === render.height;

if (!isVertical) {
  // 9:16 crop from the centre. Uses lanczos so the crop survives scaling.
  const targetH = Math.round((render.width * 16) / 9);
  const pad = Math.max(0, targetH - render.height);
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-i',
      master,
      '-vf',
      `scale=${render.width}:${targetH}:flags=lanczos,crop=${render.width}:${render.height}:0:${Math.round(pad / 2)}`,
      '-c:a',
      'copy',
      vertical,
    ], { stdio: 'ignore' });
    log.ok(`vertical ${vertical}`);
  } catch {
    log.warn('Vertical crop failed; skipping.');
  }
}

if (!isSquare) {
  const side = Math.min(render.width, render.height);
  try {
    execFileSync('ffmpeg', [
      '-y',
      '-i',
      master,
      '-vf',
      `crop=${side}:${side}:(iw-${side})/2:(ih-${side})/2`,
      '-c:a',
      'copy',
      square,
    ], { stdio: 'ignore' });
    log.ok(`square   ${square}`);
  } catch {
    log.warn('Square crop failed; skipping.');
  }
}

/**
 * Choose a poster time that is guaranteed to be a settled frame.
 *
 * A percentage of the runtime can land inside a transition (two scenes blended,
 * type mid-blur) or during an entrance. Instead, use the scene frames that
 * `npm run render` recorded and take the middle of the longest scene's
 * *content* window — past its transition, before its end.
 */
function posterTime(explicit: number | undefined): number {
  if (explicit !== undefined && Number.isFinite(explicit)) return explicit;

  const scenes = render.scenes ?? [];
  if (scenes.length === 0) return render.durationSeconds * 0.4;

  let best: { start: number; end: number } | null = null;
  for (const scene of scenes) {
    const contentStart = (scene.startFrame + scene.transitionIn) / render.fps;
    const contentEnd = (scene.startFrame + scene.durationInFrames) / render.fps;
    if (!best || contentEnd - contentStart > best.end - best.start) {
      best = { start: contentStart, end: contentEnd };
    }
  }
  if (!best) return render.durationSeconds * 0.4;
  const b = best as { start: number; end: number };
  return b.start + (b.end - b.start) * 0.55;
}

const posterAt = Math.min(posterTime(Number(flagValue(args, 'poster-at') ?? NaN)), render.durationSeconds - 0.1);
if (extractFrame(master, posterAt, poster)) {
  log.ok(`poster   ${poster}  (t=${posterAt.toFixed(1)}s)`);
}

const delivery = {
  episodeId,
  version,
  masteredAt: new Date().toISOString(),
  master,
  vertical,
  square,
  poster,
  durationSeconds: render.durationSeconds,
  width: render.width,
  height: render.height,
  fps: render.fps,
  sizeBytes: statSync(master).size,
};
writeJson(join(deliveryDir, 'delivery.json'), delivery);

log.raw('');
log.ok('Delivery ready.');
log.dim(`  ${deliveryDir}`);
log.dim(`  Next: npm run publish -- ${episodeId} --version ${version} --dry-run`);
