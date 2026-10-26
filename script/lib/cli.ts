/**
 * Tiny CLI helpers. No argument-parsing library; scripts stay readable and
 * a typo never turns into a silently different render.
 */

export type Args = {
  positional: string[];
  flags: Record<string, string | boolean>;
};

/**
 * Parse `--flag value`, `--flag=value` and bare `--flag`.
 *
 * `booleans` names flags that never take a value. Without it, `--still
 * demo-engine` would eat the episode name, which is exactly the bug the
 * documented `npm run still -- <episode> 3,9` form would have hit.
 */
export function parseArgs(argv = process.argv.slice(2), booleans: string[] = []): Args {
  const booleanSet = new Set(booleans);
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;
    if (token === '--') {
      positional.push(...argv.slice(i + 1));
      break;
    }
    if (token.startsWith('--')) {
      const body = token.slice(2);
      const eq = body.indexOf('=');
      if (eq !== -1) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
        continue;
      }
      if (booleanSet.has(body)) {
        flags[body] = true;
        continue;
      }
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        flags[body] = next;
        i++;
      } else {
        flags[body] = true;
      }
    } else {
      positional.push(token);
    }
  }
  return { positional, flags };
}

export function flag(args: Args, name: string): boolean {
  return Boolean(args.flags[name]);
}

export function flagValue(args: Args, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === 'string' ? value : undefined;
}

const C = {
  reset: '\u001b[0m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  bold: '\u001b[1m',
};

const supportsColor = process.stdout.isTTY;
const paint = (color: string, text: string) => (supportsColor ? `${color}${text}${C.reset}` : text);

export const log = {
  info: (message: string) => console.log(`${paint(C.blue, '›')} ${message}`),
  step: (message: string) => console.log(`\n${paint(C.bold + C.cyan, '▸')} ${paint(C.bold, message)}`),
  ok: (message: string) => console.log(`${paint(C.green, '✓')} ${message}`),
  warn: (message: string) => console.warn(`${paint(C.yellow, '!')} ${message}`),
  error: (message: string) => console.error(`${paint(C.red, '✗')} ${message}`),
  dim: (message: string) => console.log(paint(C.dim, message)),
  raw: (message: string) => console.log(message),
};

export function fail(message: string, code = 1): never {
  log.error(message);
  process.exit(code);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return m > 0 ? `${m}m ${rest.toFixed(1)}s` : `${rest.toFixed(1)}s`;
}
