/**
 * Filesystem helpers used by the pipeline. Every write is atomic where it
 * matters (generated modules) so a crashed run never leaves a half-file that
 * the bundler will happily import.
 */
import {
  copyFileSync,
  existsSync,
  linkSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';

export const ROOT = process.cwd();

export function abs(...parts: string[]): string {
  return resolve(ROOT, ...parts);
}

export function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

export function writeText(file: string, text: string): void {
  ensureDir(dirname(file));
  const tmp = `${file}.tmp-${process.pid}`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, file);
}

export function writeJson(file: string, value: unknown): void {
  writeText(file, `${JSON.stringify(value, null, 2)}\n`);
}

export function readJson<T>(file: string, fallback?: T): T {
  if (!existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`File not found: ${relative(ROOT, file) || file}`);
  }
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

export function readText(file: string): string {
  return readFileSync(file, 'utf8');
}

export function exists(file: string): boolean {
  return existsSync(file);
}

/**
 * Hardlink `src` to `dest`, falling back to a copy across filesystems.
 * Returns the action taken.
 */
export function linkOrCopy(src: string, dest: string): 'linked' | 'copied' | 'skipped' {
  ensureDir(dirname(dest));
  if (exists(dest)) {
    const a = statSync(src);
    const b = statSync(dest);
    if (a.size === b.size && b.mtimeMs >= a.mtimeMs) return 'skipped';
    rmSync(dest, { force: true });
  }
  try {
    linkSync(src, dest);
    return 'linked';
  } catch {
    copyFileSync(src, dest);
    return 'copied';
  }
}

export function walk(dir: string, filter?: (path: string) => boolean): string[] {
  if (!exists(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walk(full, filter));
    } else if (!filter || filter(full)) {
      out.push(full);
    }
  }
  return out;
}

export function slugToName(file: string): string {
  return basename(file, extname(file));
}

export function rel(from: string, to: string): string {
  return relative(from, to).split('\\').join('/');
}
