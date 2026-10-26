/**
 * npm run publish -- <episode> [--version v1] [--platforms tiktok,instagram]
 *                     [--dry-run] [--schedule 2026-11-01T09:00:00Z]
 *                     [--timezone Asia/Jakarta] [--draft] [--now] [--accounts]
 *
 * Uploads the rendered film to Zernio storage and creates one post targeting
 * every selected account. Zernio publishes all targets from a single request,
 * so this is one upload and one `POST /v1/posts`, not one per platform.
 *
 * `--dry-run` prints the exact payload without touching the network.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs, flag, flagValue, log, fail } from './lib/cli';
import { abs, readJson } from './lib/fsx';
import { hasZernio } from './lib/env';
import {
  createPost,
  listAccounts,
  listPosts,
  platformSpecificData,
  uploadMedia,
  type MediaItem,
  type PlatformTarget,
} from './lib/zernio';
import { parseEpisode } from '../src/engine/spec';
import type { EpisodeEntry } from '../src/generated/episodes';

const args = parseArgs(process.argv.slice(2), ['dry-run', 'draft', 'accounts', 'now', 'yes']);

// `--status` may be used bare (list every post) or with a value (filter).
if (args.flags['status'] === true) args.flags['status'] = '';
const episodeArg = args.positional[0];
const version = flagValue(args, 'version') ?? 'v1';
const dryRun = flag(args, 'dry-run');
const draft = flag(args, 'draft');
const publishNow = flag(args, 'now');
const scheduleAt = flagValue(args, 'schedule');
const timezone = flagValue(args, 'timezone');
const platformArg = flagValue(args, 'platforms');

/** Zernio platform ids differ from the everyday names in a few places. */
const PLATFORM_ALIASES: Record<string, string> = {
  x: 'twitter',
  ig: 'instagram',
  fb: 'facebook',
  yt: 'youtube',
  li: 'linkedin',
};

/** Per-platform video length ceilings, enforced before upload. */
const MAX_SECONDS: Record<string, number> = {
  tiktok: 600,
  instagram: 900,
  facebook: 7200,
  youtube: 43200,
  linkedin: 1800,
  threads: 300,
  twitter: 140,
  pinterest: 600,
};

type RenderManifest = {
  episodeId: string;
  version: string;
  file: string;
  durationSeconds: number;
  width: number;
  height: number;
  fps: number;
  normalized?: boolean;
};

async function loadEpisode(): Promise<EpisodeEntry> {
  const { EPISODES } = await import('../src/generated/episodes');
  if (EPISODES.length === 0) {
    const dir = abs('episodes', episodeArg ?? '');
    const mod = await import(pathToFileURL(join(dir, 'episode.ts')).href);
    const episode = parseEpisode(mod.default ?? mod.episode);
    return { episode, media: {}, alignments: [], voAvailable: [], audioPack: { cues: [], music: [] } };
  }
  if (!episodeArg) fail(`Which episode? ${EPISODES.map((item) => item.episode.id).join(', ')}`);
  const entry = EPISODES.find((item) => item.episode.id === episodeArg);
  if (!entry) fail(`No episode "${episodeArg}". Known: ${EPISODES.map((item) => item.episode.id).join(', ')}`);
  return entry;
}

/**
 * Per-workspace account ids, never committed. Shape:
 *   { "default": { "tiktok": "id" }, "episode-id": { "tiktok": "id" } }
 * A flat `{ "tiktok": "id" }` is accepted too, for one-brand workspaces.
 */
function accountConfig(episodeId: string): Record<string, string> {
  const raw = readJson<Record<string, unknown>>(abs('publish.config.json'), {});
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') flat[key] = value;
  }
  const scoped = (raw[episodeId] ?? {}) as Record<string, string>;
  const shared = (raw.default ?? {}) as Record<string, string>;
  return { ...flat, ...shared, ...scoped };
}

function normalizePlatform(name: string): string {
  const lower = name.trim().toLowerCase();
  return PLATFORM_ALIASES[lower] ?? lower;
}

async function main() {
  const entry = await loadEpisode();
  const { episode } = entry;

  // ── Read-only modes ───────────────────────────────────────────────────
  // These inspect Zernio and must never depend on a render existing, nor on
  // any publish-time state. They run first so a lookup can never fall through
  // into a publish.
  if ('status' in args.flags || flag(args, 'accounts')) {
    if (!hasZernio()) {
      fail('ZERNIO_API_KEY is not set. Add it to .env (create one at zernio.com/dashboard/api-keys).');
    }

    if (flag(args, 'accounts')) {
      const configured = accountConfig(episode.id);
      const accounts = await listAccounts();
      log.step('Connected Zernio accounts');
      if (accounts.length === 0) {
        log.warn('No accounts connected. Connect one at zernio.com first.');
        return;
      }
      for (const account of accounts) {
        const mapped = Object.entries(configured).find(([, id]) => id === account.id);
        const profile =
          typeof account.profileId === 'object' ? account.profileId?.name : (account.profileId ?? '');
        console.log(
          `${account.platform.padEnd(12)} ${(account.username ?? '').padEnd(24)} ${account.id}  ${profile}${mapped ? `  ← ${mapped[0]}` : ''}${account.isActive ? '' : '  (inactive)'}`,
        );
      }
      log.raw('');
      log.dim('  Copy ids into publish.config.json at the repo root:');
      log.dim('  { "default": { "tiktok": "<id>", "instagram": "<id>" } }');
      return;
    }

    const wanted = String(args.flags['status'] ?? '').trim();
    const filter = ['draft', 'scheduled', 'published', 'failed'].includes(wanted)
      ? (wanted as 'draft' | 'scheduled' | 'published' | 'failed')
      : undefined;
    const { posts } = await listPosts(filter);
    log.step(`Posts${filter ? ` · ${filter}` : ''}`);
    if (posts.length === 0) {
      log.dim('  none');
      return;
    }
    for (const post of posts) {
      const targets = (post.platforms ?? []).map((p) => `${p.platform}:${p.status ?? '?'}`).join(' ');
      console.log(`  ${post._id}  ${post.status.padEnd(10)} ${post.scheduledFor ?? ''}  ${targets}`);
    }
    return;
  }

  // ── Publish path ──────────────────────────────────────────────────────
  const outDir = abs('out', episode.id);
  const manifestPath = join(outDir, `render-${version}.json`);
  if (!existsSync(manifestPath)) {
    fail(`No render at out/${episode.id}/render-${version}.json.\nRun: npm run render -- ${episode.id} --version ${version}`);
  }
  const manifest = readJson<RenderManifest>(manifestPath);
  if (!existsSync(manifest.file)) fail(`Rendered file is missing: ${manifest.file}`);

  const publish = episode.publish;
  if (!publish) fail(`Episode "${episode.id}" has no \`publish\` block. Add one to episodes/${episode.id}/episode.ts`);

  const configured = accountConfig(episode.id);

  // ── Targets ───────────────────────────────────────────────────────────
  const requested = platformArg
    ? platformArg.split(',').map(normalizePlatform).filter(Boolean)
    : Object.keys(configured).map(normalizePlatform);

  if (requested.length === 0) {
    fail(
      'No platforms selected. Pass --platforms tiktok,instagram or add account ids to publish.accounts.\n' +
        `Run \`npm run publish -- ${episode.id} --accounts\` to list connected accounts.`,
    );
  }

  const targets: PlatformTarget[] = requested.map((platform) => {
    const accountId = configured[platform];
    if (!accountId) {
      if (dryRun) {
        log.warn(`No account id for "${platform}" — showing a placeholder in the payload.`);
        return { platform, accountId: `<${platform}-account-id>` };
      }
      fail(
        `No account id for "${platform}". Add it to publish.config.json:\n` +
          `  { "default": { "${platform}": "<accountId>" } }\n` +
          `Find ids with: npm run publish -- ${episode.id} --accounts`,
      );
    }
    return { platform, accountId };
  });

  // ── Length guards ─────────────────────────────────────────────────────
  for (const target of targets) {
    const max = MAX_SECONDS[target.platform];
    if (max && manifest.durationSeconds > max) {
      fail(
        `Film is ${manifest.durationSeconds.toFixed(0)}s; ${target.platform} allows ${max}s. ` +
          'Shorten the cut, cut a separate version, or drop the platform.',
      );
    }
  }
  if (targets.some((t) => t.platform === 'instagram') && manifest.width / manifest.height > 1.1) {
    log.warn('Instagram feed video is landscape; a 9:16 cut (format: reel) performs better in Reels.');
  }
  if (targets.some((t) => t.platform === 'youtube') && manifest.width < manifest.height) {
    log.info('YouTube will treat a 9:16 upload as a Short.');
  }

  // ── Caption ───────────────────────────────────────────────────────────
  const hashtags = (publish.hashtags ?? []).map((tag: string) => (tag.startsWith('#') ? tag : `#${tag}`));
  const caption = [publish.caption, hashtags.join(' ')].filter(Boolean).join('\n\n').trim();
  if (!caption) fail('Publish caption is empty — Zernio needs content for a post without per-platform overrides.');

  // ── Timing ────────────────────────────────────────────────────────────
  const isDraft = draft || Boolean(publish.draft);

  // Zernio's rule: a post with no scheduledFor, publishNow, queuedFromProfile
  // and no isDraft is silently saved as a draft. Defaulting to "now" means a
  // bare `npm run publish -- <id>` does the obvious thing instead of nothing.
  let when = publishNow ? undefined : (scheduleAt ?? publish.scheduleAt);
  let effectiveNow = publishNow;
  if (!isDraft && !when && !publishNow) {
    effectiveNow = true;
    log.info('No --schedule given, so publishing now. Pass --schedule <ISO 8601> to queue it.');
  }
  if (when && Number.isNaN(Date.parse(when))) fail(`Invalid schedule time "${when}". Use ISO 8601.`);
  if (when && !/(Z|[+-]\d{2}:?\d{2})$/.test(when) && !timezone) {
    log.warn(
      `"${when}" has no timezone offset and no --timezone was given. Zernio will read it in the account's local time.`,
    );
  }

  const title = publish.title ?? episode.title;

  const media: MediaItem[] = [{ url: '<uploaded-url>', type: 'video' }];

  const targetsWithTitles: PlatformTarget[] = targets.map((target) => {
    const specific = platformSpecificData(target.platform, title);
    return specific ? { ...target, platformSpecificData: specific } : target;
  });

  log.step(`${isDraft ? 'Drafting' : effectiveNow ? 'Publishing' : 'Scheduling'} ${episode.id} ${version}`);
  log.dim(`  ${basename(manifest.file)} · ${manifest.durationSeconds.toFixed(1)}s · ${manifest.width}×${manifest.height}`);
  log.dim(`  Caption: ${caption.split('\n')[0]!.slice(0, 110)}${caption.length > 110 ? '…' : ''}`);
  log.dim(`  Targets: ${targets.map((t) => t.platform).join(', ')}`);
  log.dim(
    `  When: ${isDraft ? 'draft (not published)' : effectiveNow ? 'now' : (when ?? 'scheduled')}${timezone ? ` (${timezone})` : ''}`,
  );

  if (dryRun) {
    log.step('Dry run — no requests sent');
    const payload = {
      content: caption,
      title,
      mediaItems: media,
      platforms: targetsWithTitles,
      ...(when ? { scheduledFor: when } : {}),
      ...(timezone ? { timezone } : {}),
      ...(effectiveNow ? { publishNow: true } : {}),
      ...(isDraft ? { isDraft: true } : {}),
    };
    console.log(JSON.stringify(payload, null, 2));
    log.raw('');
    log.dim(`  Upload: ${manifest.file} (${(statSync(manifest.file).size / 1e6).toFixed(1)} MB)`);
    log.dim('  A dry run makes no network calls, so it cannot catch a bad account id or a plan limit.');
    return;
  }

  if (!hasZernio()) fail('ZERNIO_API_KEY is not set. Add it to .env.');

  // Publishing is outward-facing and cannot be undone by this tool. A
  // non-interactive run (an agent, CI, a piped shell) must opt in explicitly
  // rather than publish because a flag was misspelled or omitted.
  if (!process.stdin.isTTY && !flag(args, 'yes')) {
    fail(
      'Refusing to publish from a non-interactive session.\n' +
        'Preview first:  --dry-run\n' +
        'Then confirm:   add --yes to this exact command, run by a person.',
    );
  }

  // ── Upload ────────────────────────────────────────────────────────────
  log.info('Uploading to Zernio storage…');
  const publicUrl = await uploadMedia(manifest.file);
  log.ok(`Uploaded: ${publicUrl}`);
  media[0]!.url = publicUrl;

  // ── Create ────────────────────────────────────────────────────────────
  const { post, replayed } = await createPost({
    content: caption,
    title,
    mediaItems: media,
    platforms: targetsWithTitles,
    scheduledFor: when,
    timezone,
    publishNow: effectiveNow,
    isDraft,
    // A stable key makes a retry after a timeout return the original post
    // instead of posting the film twice.
    idempotencyKey: randomUUID(),
  });

  log.raw('');
  if (replayed) log.warn('Idempotent replay — Zernio returned an existing post, nothing new was created.');

  log.ok(`Post ${post._id} · ${post.status}${post.scheduledFor ? ` · ${post.scheduledFor}` : ''}`);
  for (const platform of post.platforms ?? []) {
    const status = platform.status ?? 'pending';
    const url = platform.platformPostUrl ? `  ${platform.platformPostUrl}` : '';
    const error = platform.error ? `  ${platform.error}` : '';
    console.log(`  ${platform.platform.padEnd(12)} ${status}${url}${error}`);
  }

  log.raw('');
  log.dim(`  Check later: npm run publish -- ${episode.id} --status`);
}

main().catch(async (error) => {
  const { ZernioError } = await import('./lib/zernio');
  if (error instanceof ZernioError) {
    log.error(error.message);
    if (error.details) log.dim(`  ${JSON.stringify(error.details).slice(0, 600)}`);
    process.exit(1);
  }
  log.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
