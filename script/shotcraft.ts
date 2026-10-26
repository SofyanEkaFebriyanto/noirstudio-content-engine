/**
 * npm run shotcraft -- [--update]
 *
 * Vendors the shot library from video-shotcraft (Apache-2.0) into
 * library/shotcraft/:
 *
 *   cards/    recipe cards, one markdown file per shot (semantics + params)
 *   demos/    the tuned .tsx implementation for each card
 *   gallery/  the searchable index of cards and style variants
 *
 * Why vendor rather than depend: the cards are reference material the agent
 * reads at authoring time, and they must be available offline and pinned to a
 * commit. The LICENSE is copied alongside; nothing here is redistributed.
 *
 * Without --update this script only reports what is already vendored.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs, flag, log, fail } from './lib/cli';
import { abs, ensureDir, linkOrCopy, readJson, writeJson, writeText } from './lib/fsx';

const REPO = 'Vincentwei1021/video-shotcraft';
const API = `https://api.github.com/repos/${REPO}`;

const args = parseArgs(process.argv.slice(2), ['update']);
const update = flag(args, 'update');
const vendorDir = abs('library', 'shotcraft');
const pinPath = join(vendorDir, 'PIN.json');

type Pin = {
  repo: string;
  commit: string;
  vendoredAt: string;
  license: string;
  note: string;
};

function summarize(): Pin | null {
  if (!existsSync(pinPath)) return null;
  return readJson<Pin | null>(pinPath, null);
}

async function github<T>(path: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'noirstudio-content-engine',
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(
      `GitHub ${path} → ${response.status}. ${response.status === 403 ? 'Rate limited; set GITHUB_TOKEN to raise the limit.' : ''}`,
    );
  }
  return (await response.json()) as T;
}

async function vendor() {
  log.step('Fetching video-shotcraft metadata');
  const branch = await github<{ commit: { sha: string } }>('/branches/main');
  const sha = branch.commit.sha;
  log.dim(`  commit ${sha}`);

  const tree = await github<{ tree: { path: string; type: string; size?: number }[] }>(
    `/git/trees/${sha}?recursive=1`,
  );

  const wanted = tree.tree.filter(
    (entry) =>
      entry.type === 'blob' &&
      (entry.path.startsWith('references/shots/') ||
        (entry.path.startsWith('demos/') && !entry.path.startsWith('demos/_legacy/')) ||
        entry.path.startsWith('gallery/api/') ||
        entry.path === 'LICENSE' ||
        entry.path === 'SKILL.md' ||
        entry.path === 'references/aesthetic-rules.md' ||
        entry.path === 'references/sound-design.md'),
  );

  const bytes = wanted.reduce((sum, entry) => sum + (entry.size ?? 0), 0);
  log.info(`Downloading ${wanted.length} files (~${(bytes / 1e6).toFixed(1)} MB)…`);

  // One tarball is dramatically cheaper than 300+ raw fetches.
  const tmpTar = join(abs('.cache'), 'shotcraft.tar.gz');
  ensureDir(abs('.cache'));
  const url = `https://codeload.github.com/${REPO}/tar.gz/${sha}`;
  log.dim(`  ${url}`);
  execFileSync('curl', ['-sL', '--fail', url, '-o', tmpTar], { stdio: 'inherit' });

  const extractDir = join(abs('.cache'), 'shotcraft-extract');
  rmSync(extractDir, { recursive: true, force: true });
  ensureDir(extractDir);
  execFileSync('tar', ['xzf', tmpTar, '-C', extractDir, '--strip-components=1']);

  if (!existsSync(join(extractDir, 'LICENSE'))) fail('Tarball did not contain LICENSE; refusing to vendor.');

  // Wipe the previous copy, keeping PIN.json so an interrupted run is obvious.
  rmSync(join(vendorDir, 'cards'), { recursive: true, force: true });
  rmSync(join(vendorDir, 'demos'), { recursive: true, force: true });
  rmSync(join(vendorDir, 'gallery'), { recursive: true, force: true });

  let copied = 0;
  for (const entry of wanted) {
    const source = join(extractDir, entry.path);
    if (!existsSync(source)) continue;
    const dest = entry.path.startsWith('references/shots/')
      ? join(vendorDir, 'cards', entry.path.replace('references/shots/', ''))
      : entry.path.startsWith('demos/')
        ? join(vendorDir, 'demos', entry.path.replace('demos/', ''))
        : entry.path.startsWith('gallery/api/')
          ? join(vendorDir, 'gallery', entry.path.replace('gallery/api/', ''))
          : join(vendorDir, entry.path.replace('references/', '').replace(/^LICENSE$/, 'LICENSE'));
    linkOrCopy(source, dest);
    copied++;
  }

  // The reference docs are small and are the quality bar; keep them with the cards.
  for (const doc of ['references/aesthetic-rules.md', 'references/sound-design.md']) {
    const source = join(extractDir, doc);
    if (existsSync(source)) linkOrCopy(source, join(vendorDir, 'cards', '_reference', doc.replace('references/', '')));
  }

  const pin: Pin = {
    repo: REPO,
    commit: sha,
    vendoredAt: new Date().toISOString(),
    license: 'Apache-2.0 (see library/shotcraft/LICENSE)',
    note: 'Reference material for authoring. Implementations are adapted into src/shots by the agent; this copy is not bundled into films.',
  };
  writeJson(pinPath, pin);

  writeText(
    join(vendorDir, 'README.md'),
    `# Shot library (vendored)

Pinned copy of [${REPO}](https://github.com/${REPO}) at \`${sha.slice(0, 7)}\`.

| Folder | What it is |
|---|---|
| \`cards/\` | Recipe cards — semantics, parameters, known pitfalls, per category |
| \`demos/\` | The tuned Remotion implementation each card points at |
| \`gallery/\` | \`library.json\` — the searchable index of cards and style variants |
| \`aesthetic-rules.md\` | The quality bar that shaped these timings |

**How to use it.** Read the card first, then read the exact demo it names. The
card gives you the idea; only the demo source gives you the tuned easing values,
the hold budgets and the pitfalls that were paid for in revision rounds.

**Do not import from here at render time.** These files are reference material:
adapt what you need into \`src/shots/\` (wrapped in the studio's theme tokens and
layout primitives). That keeps the design system coherent and avoids shipping
code tuned for someone else's brand.

**Licence.** Apache-2.0 — see \`LICENSE\`. The cards are research-friendly
re-implementations; brand assets in the demos are placeholders. Replace any
brand marks with the studio's own when adapting.

Refresh with \`npm run shotcraft -- --update\`.
`,
  );

  rmSync(tmpTar, { force: true });
  rmSync(extractDir, { recursive: true, force: true });

  log.ok(`Vendored ${copied} files at ${sha.slice(0, 7)}`);
  const cardCount = readdirSync(join(vendorDir, 'cards'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .reduce((sum, dir) => {
      const inner = join(vendorDir, 'cards', dir.name);
      return sum + (existsSync(inner) ? readdirSync(inner).filter((file) => file.endsWith('.md')).length : 0);
    }, 0);
  const demoDir = join(vendorDir, 'demos');
  const demoCount = existsSync(demoDir) ? countFiles(demoDir, '.tsx') : 0;
  log.dim(`  ${cardCount} recipe cards · ${demoCount} demo components`);
}

function countFiles(dir: string, ext: string): number {
  let count = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count += countFiles(join(dir, entry.name), ext);
    else if (entry.name.endsWith(ext)) count++;
  }
  return count;
}

function report() {
  const pin = summarize();
  if (!pin) {
    log.warn('Shot library not vendored yet.');
    log.dim('  Run: npm run shotcraft -- --update');
    return;
  }
  const cards = join(vendorDir, 'cards');
  const categories = existsSync(cards)
    ? readdirSync(cards, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
        .map((entry) => ({
          name: entry.name,
          count: readdirSync(join(cards, entry.name)).filter((file) => file.endsWith('.md')).length,
        }))
    : [];
  log.step(`Shot library · ${pin.commit.slice(0, 7)} · vendored ${pin.vendoredAt.slice(0, 10)}`);
  for (const category of categories) {
    log.raw(`  ${category.name.padEnd(14)} ${String(category.count).padStart(3)} cards`);
  }
  log.dim(`  ${vendorDir}`);
  log.dim('  Refresh with: npm run shotcraft -- --update');
}

async function main() {
  if (update) {
    await vendor();
    return;
  }
  report();
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
