/**
 * npm run vo -- <episode> [--force] [--voice <name|id>]
 *
 * Synthesizes every VO segment with ElevenLabs, writes mp3s into
 * public/episodes/<id>/vo/, and persists character alignments as
 * alignment.json for captions and timeline placement.
 *
 * Caching: a segment is skipped when its text, voice and model are unchanged.
 * `--force` re-renders everything.
 */
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, flag, flagValue, log, fail } from './lib/cli';
import { abs, ensureDir, exists, readJson, writeJson } from './lib/fsx';
import { hasElevenLabs, optionalEnv } from './lib/env';
import {
  listVoices,
  resolveVoice,
  textToSpeechWithTimestamps,
  type Alignment,
} from './lib/elevenlabs';
import { probeDuration, hasFfprobe } from './lib/audio-tools';
import { parseEpisode, type EpisodeParsed, type VoiceSegment } from '../src/engine/spec';

const args = parseArgs(process.argv.slice(2), ['force', 'list']);
const episodeFilter = args.positional[0];
const force = flag(args, 'force');
const voiceOverride = flagValue(args, 'voice');
const listOnly = flag(args, 'list');

type WordTiming = { word: string; start: number; end: number };
type AlignmentFile = {
  generatedAt: string;
  voiceId: string;
  modelId: string;
  alignments: {
    segmentId: string;
    text: string;
    /** Cache key so re-running never re-bills unchanged lines. */
    hash: string;
    durationSeconds: number;
    words: WordTiming[];
  }[];
  /** Segment ids whose mp3 exists on disk. */
  available: string[];
};

/** Character alignment → word timings. Words are delimited by whitespace. */
export function alignmentToWords(alignment: Alignment): WordTiming[] {
  const words: WordTiming[] = [];
  let current = '';
  let start = 0;
  let end = 0;

  for (let i = 0; i < alignment.characters.length; i++) {
    const char = alignment.characters[i]!;
    const charStart = alignment.character_start_times_seconds[i] ?? 0;
    const charEnd = alignment.character_end_times_seconds[i] ?? charStart;

    if (/\s/.test(char)) {
      if (current) {
        words.push({ word: current, start, end });
        current = '';
      }
      continue;
    }

    if (!current) start = charStart;
    current += char;
    end = charEnd;
  }

  if (current) words.push({ word: current, start, end });
  return words;
}

function hashSegment(segment: VoiceSegment, voiceId: string, modelId: string): string {
  return createHash('sha1')
    .update(`${voiceId}|${modelId}|${segment.text}|${JSON.stringify(segment.text.length)}`)
    .digest('hex')
    .slice(0, 16);
}

async function loadEpisode(dir: string): Promise<EpisodeParsed> {
  const mod = await import(pathToFileURL(join(dir, 'episode.ts')).href + `?t=${Date.now()}`);
  const raw = mod.default ?? mod.episode;
  return parseEpisode(raw);
}

async function synthesizeEpisode(dir: string): Promise<void> {
  const spec = await loadEpisode(dir);
  if (!spec.voice || spec.voice.segments.length === 0) {
    log.dim(`${spec.id}: no voice segments — skipping.`);
    return;
  }

  if (!hasElevenLabs()) {
    fail(
      'ELEVENLABS_API_KEY is not set.\nAdd it to .env — copy .env.example if you have not yet.\n' +
        'The film still renders; it just has no narration and no captions.',
    );
  }

  const requested = voiceOverride ?? spec.voice.voiceId ?? optionalEnv('ELEVENLABS_VOICE_ID');
  if (!requested) {
    const voices = await listVoices();
    fail(
      'No voice configured. Set `voice.voiceId` in episode.ts, ELEVENLABS_VOICE_ID in .env, or pass --voice.\n' +
        `Available voices:\n${voices
          .slice(0, 15)
          .map((voice) => `  ${voice.name.padEnd(22)} ${voice.voice_id}`)
          .join('\n')}`,
    );
  }

  const voice = await resolveVoice(requested);
  const modelId = spec.voice.modelId;
  log.info(`Voice: ${voice.name} (${voice.voice_id}) · model ${modelId}`);

  const voDir = abs('public', 'episodes', spec.id, 'vo');
  ensureDir(voDir);
  const alignmentFile = join(voDir, 'alignment.json');
  const previous = readJson<AlignmentFile>(alignmentFile, {
    generatedAt: '',
    voiceId: '',
    modelId: '',
    alignments: [],
    available: [],
  });

  const previousById = new Map(previous.alignments.map((item) => [item.segmentId, item]));
  const alignments: AlignmentFile['alignments'] = [];
  const available: string[] = [];

  let synthesized = 0;
  let cached = 0;

  for (const segment of spec.voice.segments) {
    const hash = hashSegment(segment, voice.voice_id, modelId);
    const file = join(voDir, `${segment.id}.mp3`);
    const prior = previousById.get(segment.id);
    const reusable = !force && prior && prior.hash === hash && existsSync(file);

    if (reusable) {
      cached++;
      alignments.push(prior);
      available.push(segment.id);
      log.dim(`  ${segment.id} · cached`);
      continue;
    }

    log.info(`  ${segment.id} · synthesizing…`);
    const { audio, alignment } = await textToSpeechWithTimestamps({
      voiceId: voice.voice_id,
      text: segment.text,
      modelId,
      languageCode: spec.voice.languageCode,
      outputFormat: process.env.ELEVENLABS_TTS_FORMAT ?? 'mp3_44100_128',
      settings: spec.voice.settings,
    });

    writeFileSync(file, audio);
    const words = alignmentToWords(alignment);
    const probed = hasFfprobe() ? probeDuration(file) : null;
    const durationSeconds =
      probed ??
      (alignment.character_end_times_seconds[alignment.character_end_times_seconds.length - 1] ?? words.at(-1)?.end ?? 0.5);

    synthesized++;
    alignments.push({ segmentId: segment.id, text: segment.text, hash, durationSeconds, words });
    available.push(segment.id);
  }

  writeJson(alignmentFile, {
    generatedAt: new Date().toISOString(),
    voiceId: voice.voice_id,
    modelId,
    alignments,
    available,
  } satisfies AlignmentFile);

  const total = alignments.reduce((sum, item) => sum + item.durationSeconds, 0);
  log.ok(
    `${spec.id}: ${alignments.length} segment(s) · ${total.toFixed(1)}s of narration · ${synthesized} synthesized, ${cached} cached`,
  );
  log.dim(`  ${voDir}`);

  // Warn when a line plainly will not fit its scene.
  for (const segment of spec.voice.segments) {
    const scene = spec.scenes.find((item) => item.id === segment.scene);
    if (!scene) continue;
    const duration = (scene.durationInFrames ?? 0) / spec.fps;
    const alignment = alignments.find((item) => item.segmentId === segment.id);
    if (!alignment) continue;
    const availableSeconds = duration - segment.leadInFrames / 30;
    if (alignment.durationSeconds > availableSeconds) {
      log.warn(
        `${segment.id}: ${alignment.durationSeconds.toFixed(2)}s of speech into a ${availableSeconds.toFixed(2)}s window. Shorten the line or add frames to scene "${segment.scene}".`,
      );
    }
  }
}

async function main() {
  if (listOnly) {
    const voices = await listVoices();
    for (const voice of voices) {
      console.log(
        `${voice.voice_id}  ${voice.name.padEnd(24)} ${voice.category ?? ''} ${JSON.stringify(voice.labels ?? {})}`,
      );
    }
    return;
  }

  const episodesRoot = abs('episodes');
  if (!exists(episodesRoot)) fail('No episodes/ directory. Create one with: npm run new -- my-episode');

  const { readdirSync } = await import('node:fs');
  const dirs = readdirSync(episodesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
    .map((entry) => join(episodesRoot, entry.name))
    .filter((dir) => exists(join(dir, 'episode.ts')));

  if (episodeFilter) {
    const match = dirs.filter((dir) => basename(dir) === episodeFilter);
    if (match.length === 0) fail(`No episode named "${episodeFilter}"`);
    for (const dir of match) await synthesizeEpisode(dir);
    return;
  }

  if (dirs.length === 0) fail('No episodes found.');
  for (const dir of dirs) {
    log.step(`VO · ${basename(dir)}`);
    await synthesizeEpisode(dir);
  }
  log.dim('\nNext: npm run sync  (rebuilds timeline placement + caption timings)');
}

main().catch((error) => {
  log.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
