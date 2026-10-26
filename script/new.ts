/**
 * npm run new -- <episode-id> [--title "..."] [--format reel|wide|square|portrait]
 *                [--preset launch-30s|explainer-90s|build-log-45s] [--force]
 *
 * Scaffolds episodes/<id>/episode.ts.
 *
 * Without a preset you get the minimal four-scene starter. With a preset you
 * get a complete, valid scene list from library/presets/<id>.json — props and
 * cue times included — which the script skill then rewrites.
 */
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, flag, flagValue, log, fail } from './lib/cli';
import { abs, ensureDir, readJson, readText, writeJson, writeText } from './lib/fsx';

const args = parseArgs(process.argv.slice(2), ['force']);
const rawId = args.positional[0];
const force = flag(args, 'force');

const PRESET_DIR = abs('library', 'presets');

type Preset = {
  id: string;
  label: string;
  format: string;
  theme: string;
  description: string;
  structure?: string;
  scenes: Record<string, unknown>[];
  captions?: Record<string, unknown>;
  audio?: Record<string, unknown>;
  publish?: Record<string, unknown>;
  voice?: Record<string, unknown>;
};

function availablePresets(): Preset[] {
  if (!existsSync(PRESET_DIR)) return [];
  return readdirSync(PRESET_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJson<Preset>(join(PRESET_DIR, file)))
    .sort((a, b) => a.id.localeCompare(b.id));
}

if (!rawId) {
  const presets = availablePresets();
  log.step('Usage: npm run new -- <episode-id> [options]');
  log.raw('');
  log.raw('  --title "...            display title');
  log.raw('  --format reel|wide|square|portrait');
  log.raw('  --preset <id>           start from a complete scene list');
  log.raw('  --force                 overwrite an existing episode');
  if (presets.length > 0) {
    log.raw('');
    log.raw('Presets:');
    for (const preset of presets) {
      log.raw(`  ${preset.id.padEnd(18)} ${preset.label}`);
      log.dim(`    ${preset.description}`);
    }
  }
  process.exit(0);
}

const id = rawId
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, '-')
  .replace(/^-+|-+$/g, '');

if (id !== rawId) log.warn(`Normalized id "${rawId}" → "${id}"`);
if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) fail(`Invalid episode id "${id}". Use lowercase letters, digits and dashes.`);

const dir = abs('episodes', id);
const episodeFile = join(dir, 'episode.ts');
if (existsSync(episodeFile) && !force) {
  fail(`episodes/${id}/episode.ts already exists. Pass --force to overwrite.`);
}

const presetId = flagValue(args, 'preset');
let preset: Preset | undefined;
if (presetId) {
  preset = availablePresets().find((item) => item.id === presetId);
  if (!preset) {
    fail(
      `Unknown preset "${presetId}". Available: ${availablePresets().map((item) => item.id).join(', ') || '(none)'}`,
    );
  }
}

const title =
  flagValue(args, 'title') ??
  preset?.label.split('—')[0]?.trim() ??
  id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const format = flagValue(args, 'format') ?? preset?.format ?? 'reel';

ensureDir(dir);

if (preset) {
  // Write the preset's structure into a machine-readable sidecar so `check` and
  // future tooling can see what this episode started from.
  writeJson(join(dir, 'preset.json'), { ...preset, scaffoldedAt: new Date().toISOString() });

  const body = `/**
 * ${title} — episode spec.
 *
 * Scaffolded from the "${preset.id}" preset: ${preset.description}
 * Rewrite the copy and timings; the structure is a starting point, not a rule.
 *
 * Reference: .claude/skills/noir-script/SKILL.md
 */
import { defineEpisode } from '../../src/engine/spec';

export default defineEpisode({
  id: '${id}',
  title: ${JSON.stringify(title)},
  logline: 'One sentence describing what the viewer gets.',
  status: 'draft',
  format: '${format}',
  fps: 30,
  theme: ${JSON.stringify(preset.theme)},

  scenes: ${indentJson(preset.scenes, 2)},

  // Add voice.segments[] here, then run: npm run vo -- ${id}
  captions: ${indentJson(preset.captions ?? { mode: 'words', style: 'kinetic', windowWords: 5 }, 2)},

  audio: ${indentJson(preset.audio ?? { music: [], cues: [] }, 2)},

  publish: ${indentJson(preset.publish ?? { title, caption: '', hashtags: [] }, 2)},

  notes: '',
});
`;
  writeText(episodeFile, body);
  log.ok(`Created episodes/${id}/episode.ts from preset "${preset.id}"`);
  log.dim(`  ${preset.scenes.length} scenes · ${format} · theme ${preset.theme}`);
  log.dim(`  Next: npm run check -- ${id}`);
} else {
  const template = readText(abs('templates', 'episode', 'episode.ts'));
  const body = template
    .replaceAll('__ID__', id)
    .replaceAll('__TITLE__', title)
    .replaceAll('__FORMAT__', format);
  writeText(episodeFile, body);
  log.ok(`Created episodes/${id}/episode.ts`);
  log.dim('  Next: write the scenes (see .claude/skills/noir-script), then `npm run check`.');
}

writeText(
  join(dir, 'README.md'),
  `# ${title}

Episode \`${id}\`.

## Files
- \`episode.ts\` — the film spec (scenes, VO, cues, publish metadata)
- \`media.json\` — optional: map a media id to a file outside \`footage/source/\`
- \`preset.json\` — the preset this was scaffolded from, if any

## Workflow
\`\`\`bash
npm run check -- ${id}             # validate the spec
npm run still -- ${id} --still 1,4 # fast visual check
npm run render -- ${id} --version v1
\`\`\`
`,
);

/**
 * Emit a value as a TypeScript literal: unquoted keys, single-quoted strings.
 *
 * Replacing quotes in JSON.stringify output is not safe — an apostrophe inside
 * a string ("person's head") would terminate the literal early. This walks the
 * value instead and escapes only what each string needs.
 */
function indentJson(value: unknown, spaces: number): string {
  return literal(value, 0)
    .split('\n')
    .map((line, index) => (index === 0 ? line : ' '.repeat(spaces) + line))
    .join('\n');
}

function literal(value: unknown, depth: number): string {
  const pad = '  '.repeat(depth);
  const padIn = '  '.repeat(depth + 1);

  if (value === null) return 'null';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const simple = value.every((item) => typeof item !== 'object' || item === null);
    if (simple) return `[${value.map((item) => literal(item, 0)).join(', ')}]`;
    return `[\n${value.map((item) => `${padIn}${literal(item, depth + 1)}`).join(',\n')}\n${pad}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).filter(([, inner]) => inner !== undefined);
  if (entries.length === 0) return '{}';
  const lines = entries.map(([key, inner]) => {
    const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quote(key);
    return `${padIn}${safeKey}: ${literal(inner, depth + 1)}`;
  });
  return `{\n${lines.join(',\n')}\n${pad}}`;
}

function quote(text: string): string {
  // Prefer single quotes; fall back to double when the string contains one.
  if (!text.includes("'")) return `'${text.replace(/\\/g, '\\\\')}'`;
  if (!text.includes('"')) return `"${text.replace(/\\/g, '\\\\')}"`;
  return `'${text.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

// Avoid leaving an empty directory when a run fails mid-way.
process.on('exit', () => {
  if (!existsSync(episodeFile)) rmSync(dir, { recursive: true, force: true });
});
