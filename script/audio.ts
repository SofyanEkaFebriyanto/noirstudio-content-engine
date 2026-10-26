/**
 * npm run audio -- [--generate-pack] [--list]
 *
 * Maintains the cue pack manifest and can synthesize a starter pack with
 * ElevenLabs Sound Effects. The manifest (`src/generated/audio-pack.json`)
 * records duration, license and the prompt used, so a cue can always be
 * traced back to how it was made.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, flag, log, fail } from './lib/cli';
import { abs, ensureDir, readJson, writeJson } from './lib/fsx';
import { hasElevenLabs } from './lib/env';
import { generateSoundEffect } from './lib/elevenlabs';
import { probeDuration } from './lib/audio-tools';
import type { AudioPackManifest } from '../src/engine/audio';
import { TONE_NOTES, writeTonePack } from './lib/tone-pack';

const args = parseArgs(process.argv.slice(2), ['list', 'generate-pack', 'tone-pack', 'force']);
const packDir = abs('public', 'audio', 'pack');
const manifestPath = abs('src', 'generated', 'audio-pack.json');

/**
 * The starter pack. These prompts are the studio's sound vocabulary — change
 * the prompt, not the id, so episodes never break.
 */
const STARTER_PACK: { id: string; text: string; durationSeconds?: number; loop?: boolean; note: string }[] = [
  { id: 'whoosh-soft', text: 'A soft cinematic whoosh for a title transition, airy and short, no tone', durationSeconds: 1.6, note: 'scene changes' },
  { id: 'whoosh-fast', text: 'A fast sharp swoosh past camera, tight and dry, cinematic', durationSeconds: 0.9, note: 'fast cuts' },
  { id: 'swoosh-quick', text: 'A quick UI swoosh, smooth and modern, subtle, close', durationSeconds: 0.6, note: 'element arrivals' },
  { id: 'impact', text: 'A deep cinematic braam impact with a short tail, powerful but not distorted', durationSeconds: 2.2, note: 'keyword landings' },
  { id: 'riser', text: 'A rising tension riser, 3 seconds, building energy, cinematic film trailer', durationSeconds: 3.0, note: 'before a reveal' },
  { id: 'sparkle', text: 'A delicate bright sparkle shimmer, glassy, short, magical but restrained', durationSeconds: 1.4, note: 'logo reveal' },
  { id: 'pop', text: 'A single soft muted pop, rounded, close, no reverb', durationSeconds: 0.4, note: 'list items' },
  { id: 'click', text: 'A clean mechanical click, tight and dry, like a camera shutter at low volume', durationSeconds: 0.3, note: 'precision beats' },
  { id: 'type', text: 'Fast quiet keyboard typing, mechanical, close-up, steady rhythm, no voices', durationSeconds: 2.5, note: 'typing reveals' },
  { id: 'transition-snap', text: 'A short tape-stop snap transition, warm analog character', durationSeconds: 0.8, note: 'hard cuts' },
  { id: 'transition-soft', text: 'A gentle paper-like rustle transition, soft and warm, very short', durationSeconds: 1.0, note: 'paper theme' },
  { id: 'bed-tension', text: 'A low dark ambient tension bed, sparse pulsing bass, no melody, seamless loop', durationSeconds: 30, loop: true, note: 'music bed' },
];

function hashOf(text: string) {
  return createHash('sha1').update(text).digest('hex').slice(0, 12);
}

async function generatePack() {
  if (!hasElevenLabs()) {
    fail('ELEVENLABS_API_KEY is required for --generate-pack. Add it to .env.');
  }
  const force = flag(args, 'force');
  ensureDir(packDir);
  const existing = readJson<AudioPackManifest>(manifestPath, { generatedAt: '', entries: [] });
  const entries = new Map(existing.entries.map((entry) => [entry.id, entry]));

  let made = 0;
  let kept = 0;

  for (const cue of STARTER_PACK) {
    const file = join(packDir, `${cue.id}.mp3`);
    const hash = hashOf(cue.text);
    const prior = entries.get(cue.id);
    if (!force && existsSync(file) && prior?.prompt === cue.text) {
      kept++;
      log.dim(`  ${cue.id} · up to date`);
      continue;
    }

    log.info(`  ${cue.id} · generating (${cue.durationSeconds ?? 'auto'}s)…`);
    try {
      const audio = await generateSoundEffect({
        text: cue.text,
        durationSeconds: cue.durationSeconds,
        loop: cue.loop,
        promptInfluence: 0.45,
      });
      writeFileSync(file, audio);
      entries.set(cue.id, {
        id: cue.id,
        file: `audio/pack/${cue.id}.mp3`,
        duration: probeDuration(file) ?? cue.durationSeconds,
        kind: cue.loop ? 'bed' : 'cue',
        category: cue.note,
        license: 'ElevenLabs Sound Effects — commercial use per plan terms',
        source: 'elevenlabs:sound-generation',
        prompt: cue.text,
      });
      made++;
    } catch (error) {
      log.warn(`  ${cue.id} · failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const manifest: AudioPackManifest = {
    generatedAt: new Date().toISOString(),
    entries: [...entries.values()].sort((a, b) => a.id.localeCompare(b.id)),
  };
  ensureDir(abs('src', 'generated'));
  writeJson(manifestPath, manifest);
  log.ok(`Pack: ${made} generated · ${kept} up to date · ${manifest.entries.length} total`);
  log.dim(`  Manifest: src/generated/audio-pack.json`);
}

function listPack() {
  const manifest = readJson<AudioPackManifest>(manifestPath, { generatedAt: '', entries: [] });
  const onDisk = existsSync(packDir) ? readdirSync(packDir).filter((file) => file.endsWith('.mp3')) : [];
  log.step('Audio pack');
  for (const entry of manifest.entries) {
    const present = existsSync(join(packDir, `${entry.id}.mp3`));
    console.log(
      `${present ? '✓' : '·'} ${entry.id.padEnd(18)} ${String(entry.duration?.toFixed(1) ?? '?').padStart(5)}s  ${entry.category ?? ''}`,
    );
  }
  const unmapped = onDisk
    .map((file) => file.replace(/\.mp3$/, ''))
    .filter((id) => !manifest.entries.some((entry) => entry.id === id));
  if (unmapped.length) {
    log.warn(`Unregistered files (usable by id anyway): ${unmapped.join(', ')}`);
  }
  if (manifest.entries.length === 0) {
    log.warn('No manifest. Run `npm run audio -- --generate-pack` (needs ElevenLabs) or drop mp3s into public/audio/pack/.');
  }
}

/**
 * Offline placeholder pack. No credentials, no credits — explicitly labelled in
 * the manifest so nobody ships these thinking they are the real design.
 */
function generateTonePack() {
  log.step('Writing placeholder cue pack (ffmpeg tones)');
  const { written, failed } = writeTonePack(packDir);
  if (written.length === 0) {
    fail('Could not write any cues. Is ffmpeg installed? Use --generate-pack for ElevenLabs instead.');
  }
  const existing = readJson<AudioPackManifest>(manifestPath, { generatedAt: '', entries: [] });
  const byId = new Map(existing.entries.map((entry) => [entry.id, entry]));
  for (const id of written) {
    const meta = TONE_NOTES.find((tone) => tone.id === id);
    byId.set(id, {
      id,
      file: `audio/pack/${id}.mp3`,
      duration: meta?.duration,
      kind: meta?.kind,
      category: meta?.note,
      license: 'Generated locally with ffmpeg — placeholder, replace before publishing',
      source: 'ffmpeg:lavfi',
      prompt: `placeholder: ${meta?.note ?? ''}`,
    });
  }
  writeJson(manifestPath, {
    generatedAt: new Date().toISOString(),
    entries: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id)),
  } satisfies AudioPackManifest);
  log.ok(`${written.length} placeholder cue(s) written to public/audio/pack/`);
  if (failed.length) log.warn(`failed: ${failed.join(', ')}`);
  log.warn('These are flat tones for pipeline testing. Replace them with --generate-pack before publishing.');
  log.dim('  Next: npm run sync');
}

async function main() {
  if (flag(args, 'generate-pack')) {
    await generatePack();
    return;
  }
  if (flag(args, 'tone-pack')) {
    generateTonePack();
    return;
  }
  if (flag(args, 'list') || process.argv.length <= 2) {
    listPack();
    return;
  }
  log.error('Usage: npm run audio -- [--generate-pack | --tone-pack] [--list]');
  process.exit(1);
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
