/**
 * npm run footage -- [--sheet <name>] [--all]
 *
 * Inventory of `footage/` plus contact sheets: a grid of thumbnails every N
 * seconds for each clip, written to footage/contact/<name>.jpg.
 *
 * Contact sheets are how you pick a b-roll moment without scrubbing the file
 * in a player — and the same sheet is what the agent reads when it storyboards
 * a footage shot.
 */
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { parseArgs, flag, flagValue, log, fail } from './lib/cli';
import { abs, ensureDir } from './lib/fsx';
import { hasFfmpeg, hasFfprobe, probeDuration } from './lib/audio-tools';

const VIDEO = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v']);
const IMAGE = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif']);

const args = parseArgs(process.argv.slice(2), ['all']);
const only = flagValue(args, 'sheet');
const all = flag(args, 'all');
const everySeconds = Number(flagValue(args, 'every') ?? 3);
const cols = Number(flagValue(args, 'cols') ?? 4);

function clipFiles(): string[] {
  const source = abs('footage', 'source');
  const inbox = abs('footage', 'inbox');
  const files: string[] = [];
  for (const dir of [source, inbox]) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      const ext = extname(file).toLowerCase();
      if (VIDEO.has(ext) || IMAGE.has(ext)) files.push(join(dir, file));
    }
  }
  return files.sort();
}

function contactSheet(file: string): boolean {
  const name = basename(file, extname(file));
  const out = join(abs('footage', 'contact'), `${name}.jpg`);
  ensureDir(abs('footage', 'contact'));

  if (IMAGE.has(extname(file).toLowerCase())) {
    try {
      execFileSync('ffmpeg', ['-y', '-i', file, '-vf', 'scale=480:-1', '-q:v', '3', out], { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  const duration = probeDuration(file);
  const rows = duration ? Math.max(1, Math.ceil(Math.min(12, duration / everySeconds) / cols)) : 3;
  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-i',
        file,
        '-vf',
        `fps=1/${everySeconds},scale=480:-1,tile=${cols}x${rows}:padding=4:margin=4`,
        '-frames:v',
        '1',
        '-q:v',
        '3',
        out,
      ],
      { stdio: 'ignore' },
    );
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!hasFfmpeg()) fail('ffmpeg is required to build contact sheets.');

  const files = clipFiles();
  if (files.length === 0) {
    log.warn('No footage found. Drop clips into footage/source/ (curated) or footage/inbox/ (raw).');
    return;
  }

  log.step('Footage inventory');
  for (const file of files) {
    const size = statSync(file).size / 1e6;
    const duration = probeDuration(file);
    const kind = VIDEO.has(extname(file).toLowerCase()) ? 'video' : 'image';
    console.log(
      `  ${basename(file).padEnd(34)} ${kind.padEnd(6)} ${duration ? `${duration.toFixed(1)}s`.padStart(7) : '      '}  ${size.toFixed(1)} MB`,
    );
  }

  const targets = only
    ? files.filter((file) => basename(file, extname(file)) === only)
    : all
      ? files
      : files;

  if (only && targets.length === 0) fail(`No footage named "${only}"`);

  log.step(`Contact sheets (every ${everySeconds}s, ${cols} columns)`);
  let made = 0;
  for (const file of targets) {
    if (contactSheet(file)) {
      made++;
      log.ok(`  footage/contact/${basename(file, extname(file))}.jpg`);
    } else {
      log.warn(`  could not sheet ${basename(file)}`);
    }
  }
  log.raw('');
  log.ok(`${made} contact sheet(s).`);
  log.dim('  Use the sheet to choose a moment, then set trimStart on a footage-* shot.');
}

if (!hasFfprobe()) log.warn('ffprobe missing — durations will be blank.');

try {
  main();
} catch (error) {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
