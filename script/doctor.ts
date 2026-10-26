/**
 * npm run doctor
 *
 * Checks the environment before a first render: Node, ffmpeg, fonts, audio
 * pack, browser, credentials. Prints one actionable line per problem.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from './lib/cli';
import { abs } from './lib/fsx';
import { hasFfmpeg, hasFfprobe } from './lib/audio-tools';
import { hasElevenLabs, hasZernio, loadEnv } from './lib/env';
import { SHOT_CATALOG } from '../src/shots/catalog';
import { THEMES } from '../src/engine/theme';

loadEnv();

type Check = { name: string; ok: boolean; detail: string; fatal: boolean };

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string, fatal = false) {
  checks.push({ name, ok, detail, fatal });
}

const major = Number(process.versions.node.split('.')[0]);
record('Node ≥ 20', major >= 20, `v${process.versions.node}`, true);

record('ffmpeg', hasFfmpeg(), hasFfmpeg() ? 'found (loudness + thumbnails)' : 'missing — install ffmpeg for loudness normalization and thumbnails');
record('ffprobe', hasFfprobe(), hasFfprobe() ? 'found (VO duration probing)' : 'missing — VO durations fall back to alignment data');

const fonts = ['instrument-serif-regular.woff2', 'instrument-serif-italic.woff2', 'space-grotesk-var.woff2', 'jetbrains-mono-var.woff2'];
const missingFonts = fonts.filter((font) => !existsSync(abs('public', 'fonts', font)));
record('Brand fonts', missingFonts.length === 0, missingFonts.length ? `missing: ${missingFonts.join(', ')}` : `${fonts.length} files in public/fonts/`, true);

const packDir = abs('public', 'audio', 'pack');
const packFiles = existsSync(packDir) ? readdirSync(packDir).filter((file) => file.endsWith('.mp3')) : [];
record(
  'Audio pack',
  packFiles.length > 0,
  packFiles.length ? `${packFiles.length} cue(s) in public/audio/pack/` : 'empty — run `npm run audio -- --generate-pack` or drop mp3s in public/audio/pack/',
);

const footageSource = abs('footage', 'source');
const footageCount = existsSync(footageSource)
  ? readdirSync(footageSource).filter((file) => /\.(mp4|mov|webm|png|jpe?g|webp)$/i.test(file)).length
  : 0;
record('Footage', true, `${footageCount} file(s) in footage/source/`);

const episodeDir = abs('episodes');
const episodes = existsSync(episodeDir)
  ? readdirSync(episodeDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .filter((entry) => existsSync(join(episodeDir, entry.name, 'episode.ts'))).length
  : 0;
record('Episodes', episodes > 0, episodes ? `${episodes} episode(s)` : 'none — npm run new -- my-episode');

record('Shots', SHOT_CATALOG.length > 0, `${SHOT_CATALOG.length} shots · ${Object.keys(THEMES).length} themes`, true);

const hasBrowser = existsSync(join(process.env.HOME ?? '', '.cache', 'remotion')) || true;
record('Remotion browser', hasBrowser, 'downloaded on first render');

record(
  'ElevenLabs',
  hasElevenLabs(),
  hasElevenLabs() ? 'API key present' : 'not configured — VO and captions unavailable (optional)',
);
record(
  'Zernio',
  hasZernio(),
  hasZernio() ? 'API key present' : 'not configured — publishing disabled (optional)',
);

log.step('Noir Studio — environment check');
for (const check of checks) {
  const mark = check.ok ? '✓' : check.fatal ? '✗' : '·';
  const line = `${mark} ${check.name.padEnd(20)} ${check.detail}`;
  if (check.ok) log.raw(line);
  else if (check.fatal) log.error(line);
  else log.warn(line);
}

const fatal = checks.filter((check) => check.fatal && !check.ok);
log.raw('');
if (fatal.length > 0) {
  log.error(`${fatal.length} blocking issue(s).`);
  process.exit(1);
}
log.ok('Ready. Next: npm run new -- <episode-id>');
