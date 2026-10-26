/**
 * npm run sync
 *
 * Prepares everything the Remotion bundle needs to be self-contained:
 *   1. links referenced footage into public/episodes/<id>/media/
 *   2. reads VO alignments produced by `npm run vo`
 *   3. writes src/generated/episodes.ts
 *
 * Run automatically before `studio` and `render`.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { log } from './lib/cli';
import { abs, ensureDir, exists, linkOrCopy, readJson, readText, walk, writeText } from './lib/fsx';
import { parseEpisode, type EpisodeParsed } from '../src/engine/spec';
import { getShotMeta } from '../src/shots/catalog';

const MEDIA_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.png', '.jpg', '.jpeg', '.webp', '.avif'];

type VOFile = {
  generatedAt: string;
  alignments: {
    segmentId: string;
    text: string;
    durationSeconds: number;
    startFrameOverride?: number;
    words: { word: string; start: number; end: number }[];
  }[];
  available: string[];
};

type EpisodeEntry = {
  dir: string;
  spec: EpisodeParsed;
};

function findEpisodeDirs(): string[] {
  const episodesRoot = abs('episodes');
  if (!exists(episodesRoot)) return [];
  return readdirSync(episodesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
    .map((entry) => join(episodesRoot, entry.name))
    .filter((dir) => exists(join(dir, 'episode.ts')));
}

async function loadEpisode(dir: string): Promise<EpisodeParsed> {
  const file = join(dir, 'episode.ts');
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  const raw = mod.default ?? mod.episode;
  if (!raw) throw new Error(`${file} must export default or named \`episode\``);
  return parseEpisode(raw);
}

/** Every `src` string in a shot's props is a media reference. */
function collectMediaIds(scenes: EpisodeParsed['scenes']): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
        if (key === 'src' && typeof inner === 'string' && inner && !inner.startsWith('path:')) {
          ids.add(inner);
        } else {
          visit(inner);
        }
      }
    }
  };
  scenes.forEach((scene) => visit(scene.props));
  return [...ids].sort();
}

/** Find a source file for a media id: media.json override, then footage/source/<id>.<ext>. */
function resolveMediaFile(
  episodeDir: string,
  mediaId: string,
  overrides: Record<string, string>,
): string | null {
  const override = overrides[mediaId];
  if (override) {
    const candidate = override.startsWith('/') ? override : abs(override);
    return exists(candidate) ? candidate : null;
  }
  for (const ext of MEDIA_EXTENSIONS) {
    const candidate = abs('footage', 'source', `${mediaId}${ext}`);
    if (exists(candidate)) return candidate;
  }
  // Second chance: any file in footage/source whose basename matches.
  const matches = walk(abs('footage', 'source')).filter(
    (file) => basename(file, extname(file)) === mediaId,
  );
  return matches[0] ?? null;
}

function sanitizeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-');
}

async function main() {
  const dirs = findEpisodeDirs();
  if (dirs.length === 0) {
    log.warn('No episodes found. Create one with: npm run new -- my-episode');
  }

  const entries: EpisodeEntry[] = [];
  for (const dir of dirs) {
    try {
      const spec = await loadEpisode(dir);
      entries.push({ dir, spec });
    } catch (error) {
      log.error(`Failed to load ${basename(dir)}/episode.ts`);
      throw error;
    }
  }

  // Audio inventory, so a missing cue is skipped rather than crashing the render.
  const packDir = abs('public', 'audio', 'pack');
  const packIds = exists(packDir)
    ? readdirSync(packDir)
        .filter((file) => file.endsWith('.mp3'))
        .map((file) => file.replace(/\.mp3$/, ''))
        .sort()
    : [];
  // `music` is the subset that may back a music bed. Listing every file under
  // both keys (the earlier behaviour) made a cue look like a valid bed.
  const manifestEntries = readJson<{ entries: { id: string; kind?: string }[] }>(
    abs('src', 'generated', 'audio-pack.json'),
    { entries: [] },
  ).entries;
  const declaredBeds = new Set(manifestEntries.filter((entry) => entry.kind === 'bed').map((entry) => entry.id));
  const audioPack = {
    cues: packIds,
    music: packIds.filter((id) => declaredBeds.has(id) || id.startsWith('bed-')),
  };

  const generated: string[] = [];
  generated.push('// GENERATED FILE — do not edit. Run `npm run sync`.');
  generated.push("import type { EpisodeParsed } from '../engine/spec';");
  generated.push("import { parseEpisode } from '../engine/spec';");
  generated.push("import type { VoAlignment } from '../engine/captions';");
  generated.push('export type EpisodeEntry = {');
  generated.push('  episode: EpisodeParsed;');
  generated.push('  media: Record<string, string>;');
  generated.push('  alignments: VoAlignment[];');
  generated.push('  voAvailable: string[];');
  generated.push('  audioPack: { cues: string[]; music: string[] };');
  generated.push('};');
  generated.push('');

  const importLines: string[] = [];
  const entryLines: string[] = [];

  let linked = 0;
  let missing = 0;

  for (const [index, entry] of entries.entries()) {
    const { dir, spec } = entry;
    const episodeId = spec.id;
    const mediaDir = abs('public', 'episodes', episodeId, 'media');
    ensureDir(mediaDir);

    const overrides = readJson<Record<string, string>>(join(dir, 'media.json'), {});
    const ids = collectMediaIds(spec.scenes);
    const manifest: Record<string, string> = {};

    for (const mediaId of ids) {
      const source = resolveMediaFile(dir, mediaId, overrides);
      if (!source) {
        missing++;
        log.warn(
          `[${episodeId}] media "${mediaId}" not found — put it in footage/source/${mediaId}.<ext> or map it in episodes/${basename(dir)}/media.json`,
        );
        continue;
      }
      const ext = extname(source).toLowerCase();
      const destName = `${sanitizeId(mediaId)}${ext}`;
      const dest = join(mediaDir, destName);
      const action = linkOrCopy(source, dest);
      if (action !== 'skipped') linked++;
      manifest[mediaId] = `episodes/${episodeId}/media/${destName}`;
    }

    // Voice data may exist before or after the first sync.
    const voFile = join(abs('public', 'episodes', episodeId, 'vo'), 'alignment.json');
    const vo: VOFile = readJson<VOFile>(
      voFile,
      { generatedAt: '', alignments: [], available: [] },
    );

    const importName = `episode${index}`;
    importLines.push(`import ${importName} from '../../episodes/${basename(dir)}/episode';`);

    const alignments = vo.alignments.map((alignment) => ({
      segmentId: alignment.segmentId,
      text: alignment.text,
      durationSeconds: alignment.durationSeconds,
      startFrame: resolveVoStart(spec, alignment),
      words: alignment.words,
    }));

    entryLines.push(
      `  { episode: parseEpisode(${importName}), media: ${JSON.stringify(manifest)}, alignments: ${JSON.stringify(
        alignments,
      )} as VoAlignment[], voAvailable: ${JSON.stringify(vo.available)}, audioPack: ${JSON.stringify(audioPack)} },`,
    );
  }

  generated.push(...importLines);
  generated.push('');
  generated.push('export const EPISODES = [');
  generated.push(...entryLines);
  generated.push('];');
  generated.push('');

  // Brand assets: anything the renderer or downstream tools may need.
  const logoDir = abs('brand', 'logo');
  if (exists(logoDir)) {
    for (const file of readdirSync(logoDir)) {
      if (/\.(png|svg|jpg|webp)$/i.test(file)) {
        linkOrCopy(join(logoDir, file), abs('public', 'brand', file));
      }
    }
  }

  writeText(abs('src', 'generated', 'episodes.ts'), generated.join('\n'));
  ensureDir(abs('src', 'generated'));

  log.ok(`Synced ${entries.length} episode(s) · ${linked} media file(s) linked · ${missing} missing`);

  // Remove generated media for episodes that no longer exist. These folders are
  // hardlinks into public/, so keeping them costs disk and confuses `doctor`.
  const publicEpisodes = abs('public', 'episodes');
  if (exists(publicEpisodes)) {
    const known = new Set(entries.map((entry) => entry.spec.id));
    for (const entry of readdirSync(publicEpisodes, { withFileTypes: true })) {
      if (!entry.isDirectory() || known.has(entry.name)) continue;
      // VO and alignment are user-generated, not derived — keep those, drop media.
      const mediaDir = join(publicEpisodes, entry.name, 'media');
      if (exists(mediaDir)) {
        rmSync(mediaDir, { recursive: true, force: true });
        log.dim(`pruned public/episodes/${entry.name}/media`);
      }
    }
  }
}

/**
 * Place a VO segment on the film timeline.
 *
 * - `scene` given: start at the scene's content start (after its transition).
 * - otherwise: start after the previous segment ends.
 * Segments are laid out in the order they are declared.
 */
function resolveVoStart(
  spec: EpisodeParsed,
  alignment: VOFile['alignments'][number],
): number {
  const segment = spec.voice?.segments.find((item) => item.id === alignment.segmentId);
  if (!segment) return 0;

  // Recompute the scene frame map without importing the bundler-only timeline.
  const fps = spec.fps;
  let cursor = 0;
  const starts: Record<string, number> = {};
  spec.scenes.forEach((scene, index) => {
    const shot = getShotMeta(scene.shot);
    const duration = scene.durationInFrames ?? shot?.defaultDurationInFrames ?? 30;
    const overlap =
      index > 0 && scene.transition && scene.transition.type !== 'none'
        ? Math.min(scene.transition.durationInFrames, duration - 1)
        : 0;
    const start = index === 0 ? 0 : cursor - overlap;
    starts[scene.id] = start + overlap;
    cursor = start + duration;
  });

  const base = segment.scene ? (starts[segment.scene] ?? 0) : 0;
  return base + Math.round(segment.leadInFrames * (fps / 30));
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
