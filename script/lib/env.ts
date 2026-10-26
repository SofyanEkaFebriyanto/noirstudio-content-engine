/**
 * Minimal .env loader and env access. No dependency, no surprises: values from
 * the real environment always win over the file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let loaded = false;

export function loadEnv(root = process.cwd()): void {
  if (loaded) return;
  loaded = true;
  const file = resolve(root, '.env');
  if (!existsSync(file)) return;
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

export function requireEnv(key: string, hint: string): string {
  loadEnv();
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing ${key}. ${hint}\nAdd it to .env (see .env.example).`);
  }
  return value;
}

export function optionalEnv(key: string): string | undefined {
  loadEnv();
  return process.env[key] || undefined;
}

export function hasElevenLabs(): boolean {
  loadEnv();
  return Boolean(process.env.ELEVENLABS_API_KEY);
}

export function hasZernio(): boolean {
  loadEnv();
  return Boolean(process.env.ZERNIO_API_KEY);
}
