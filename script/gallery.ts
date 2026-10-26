/**
 * npm run gallery -- [--still 3] [--format reel|wide]
 *
 * Renders the shot gallery: every registered shot once, labelled. Use it to
 * review the vocabulary after adding a shot, and to show a client what the
 * studio can do before an episode exists.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, flagValue, log, fail } from './lib/cli';
import { abs } from './lib/fsx';
import { SHOT_CATALOG } from '../src/shots/catalog';
import { getShot } from '../src/shots/registry';
import '../src/shots';

const args = parseArgs();
const stillAt = flagValue(args, 'still');
const format = (flagValue(args, 'format') ?? 'wide') as 'reel' | 'wide';

async function main() {
  const { bundle } = await import('@remotion/bundler');
  const { getCompositions, renderStill, renderMedia, ensureBrowser } = await import('@remotion/renderer');

  await ensureBrowser();
  log.step('Bundling gallery');
  const serveUrl = await bundle({ entryPoint: abs('src', 'index.ts'), publicDir: abs('public') });
  const compositions = await getCompositions(serveUrl);
  const composition = compositions.find((item) => item.id === 'shot-gallery');
  if (!composition) fail('Composition "shot-gallery" missing. Check src/Root.tsx.');

  const outDir = abs('out', 'gallery');
  mkdirSync(outDir, { recursive: true });
  const inputProps = { format };

  if (stillAt) {
    const time = Number.parseFloat(stillAt);
    const frame = Math.round(time * composition.fps);
    const output = join(outDir, `still-${time.toFixed(2)}.png`);
    await renderStill({ composition, serveUrl, output, frame, inputProps, chromiumOptions: { gl: 'swangle' } });
    log.ok(output);
    return;
  }

  const totalFrames = SHOT_CATALOG.reduce((sum, meta) => sum + (getShot(meta.id)?.defaultDurationInFrames ?? 0), 0);
  const output = join(outDir, `gallery-${format}.mp4`);
  log.step(`Rendering ${SHOT_CATALOG.length} shots · ${(totalFrames / composition.fps).toFixed(1)}s`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: output,
    inputProps,
    chromiumOptions: { gl: 'swangle' },
  });
  log.ok(output);
}

main().catch((error) => {
  log.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
