/**
 * npm run shots -- [<shot-id>] [--json]
 *
 * Prints the shot catalog. With an id, prints that shot's props schema and a
 * copy-paste scene skeleton. This is the fastest way for an agent to learn what
 * a shot accepts without reading the whole TSX file.
 */
import { parseArgs, flagValue, flag, log } from './lib/cli';
import { SHOT_CATALOG, getShotMeta } from '../src/shots/catalog';
import { z } from 'zod';

const args = parseArgs(process.argv.slice(2), ['json']);
const id = args.positional[0];
const json = flag(args, 'json');

/** Turn a Zod schema into a compact, readable shape. */
function describeSchema(schema: z.ZodType<unknown>): string {
  const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape;
  if (!shape) return '  (no object shape)';
  const lines: string[] = [];
  for (const [key, value] of Object.entries(shape)) {
    lines.push(`  ${key.padEnd(18)} ${describeType(value)}`);
  }
  return lines.join('\n');
}

function describeType(schema: z.ZodType<unknown>, depth = 0): string {
  const def = (schema as unknown as { _zod?: { def?: { type?: string; innerType?: z.ZodType } } })._zod?.def;
  const type = def?.type ?? 'unknown';
  const optional = def && (def as { default?: unknown }).default !== undefined;

  const inner = (): z.ZodType<unknown> | undefined =>
    (schema as unknown as { unwrap?: () => z.ZodType<unknown> }).unwrap?.();

  switch (type) {
    case 'default':
    case 'prefault':
      return `${describeType((schema as unknown as { removeDefault: () => z.ZodType }).removeDefault())} (default)`;
    case 'optional':
      return `${describeType(inner()!)} (optional)`;
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'enum': {
      const entries = (def as unknown as { entries?: Record<string, string> }).entries ?? {};
      return Object.values(entries).map((value) => `'${value}'`).join(' | ');
    }
    case 'literal':
      return String((def as unknown as { values?: unknown[] }).values?.[0] ?? 'literal');
    case 'array': {
      const element = (def as unknown as { element?: z.ZodType }).element;
      return `${element ? describeType(element, depth + 1) : 'unknown'}[]`;
    }
    case 'tuple': {
      const items = (def as unknown as { items?: z.ZodType[] }).items ?? [];
      return `[${items.map((item) => describeType(item, depth + 1)).join(', ')}]`;
    }
    case 'object': {
      if (depth > 1) return '{…}';
      const shape = (schema as unknown as { shape?: Record<string, z.ZodType> }).shape ?? {};
      return `{ ${Object.keys(shape).join(', ')} }`;
    }
    case 'record':
      return 'Record<string, string>';
    default:
      if (optional) return `${type} (optional)`;
      return type;
  }
}

if (json) {
  console.log(
    JSON.stringify(
      SHOT_CATALOG.map((shot) => ({
        id: shot.id,
        label: shot.label,
        category: shot.category,
        defaultDurationInFrames: shot.defaultDurationInFrames,
        description: shot.description,
        hints: shot.hints,
      })),
      null,
      2,
    ),
  );
  process.exit(0);
}

if (id) {
  const shot = getShotMeta(id);
  if (!shot) {
    log.error(`Unknown shot "${id}".`);
    log.dim(`  ${SHOT_CATALOG.map((item) => item.id).join(', ')}`);
    process.exit(1);
  }
  log.step(`${shot.id} — ${shot.label}`);
  log.dim(`  ${shot.category} · default ${shot.defaultDurationInFrames}f`);
  log.raw(`  ${shot.description}`);
  log.raw('');
  log.raw('Props:');
  console.log(describeSchema(shot.schema as z.ZodType<unknown>));
  log.raw('');
  log.raw('Hint:');
  log.raw(`  ${shot.hints}`);
  log.raw('');
  log.raw('Scene skeleton:');
  log.raw(`  {
    id: 'my-scene',
    shot: '${shot.id}',
    durationInFrames: ${shot.defaultDurationInFrames},
    props: { /* fill the required props above */ },
    transition: { type: 'fade', durationInFrames: 12 },
  },`);
  process.exit(0);
}

const categories = [...new Set(SHOT_CATALOG.map((shot) => shot.category))];
log.step(`Shot catalog · ${SHOT_CATALOG.length} shots`);
for (const category of categories) {
  log.raw('');
  log.raw(`  ${category.toUpperCase()}`);
  for (const shot of SHOT_CATALOG.filter((item) => item.category === category)) {
    log.raw(
      `    ${shot.id.padEnd(16)} ${String(shot.defaultDurationInFrames).padStart(3)}f  ${shot.description.slice(0, 76)}`,
    );
  }
}
log.raw('');
log.dim('  Details for one shot: npm run shots -- <id>');
