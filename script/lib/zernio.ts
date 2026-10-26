/**
 * Zernio client — Bearer-auth wrapper over the v1 REST API.
 *
 * Publishing is three steps:
 *   1. POST /v1/media/presign   → uploadUrl + publicUrl
 *   2. PUT  <uploadUrl>         (storage, no Authorization header)
 *   3. POST /v1/posts           → one call for every platform
 *
 * Unlike a per-platform scheduler, one post request carries every target
 * account. That is why the engine publishes once rather than once per platform.
 *
 * Docs: https://docs.zernio.com
 */
import { readFileSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { requireEnv } from './env';

const BASE = process.env.ZERNIO_BASE_URL || 'https://zernio.com/api/v1';

function apiKey(): string {
  return requireEnv(
    'ZERNIO_API_KEY',
    'Create one at https://zernio.com/dashboard/api-keys — it starts with sk_ and is shown once.',
  );
}

/** MIME type per extension, matching what the presign endpoint accepts. */
const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.m4v': 'video/x-m4v',
  '.avi': 'video/x-msvideo',
  '.mpg': 'video/mpeg',
  '.mpeg': 'video/mpeg',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

export type ZernioAccount = {
  _id: string;
  /** The id to pass in `platforms[].accountId`. */
  id: string;
  platform: string;
  username: string;
  displayName?: string;
  isActive: boolean;
  profileId?: { _id: string; name: string } | string;
};

export type ZernioErrorBody = {
  error?: string;
  type?: string;
  code?: string;
  param?: string;
  message?: string;
  details?: unknown;
};

export class ZernioError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = 'ZernioError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  const text = await response.text();
  const body = text ? safeJson(text) : undefined;

  if (!response.ok) {
    throw toError(response.status, body, path);
  }
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 400) };
  }
}

function toError(status: number, body: unknown, path: string): ZernioError {
  const parsed = (body ?? {}) as ZernioErrorBody;
  const code = parsed.code ?? parsed.type;
  const detail = parsed.error ?? parsed.message ?? `HTTP ${status}`;

  const hint = (() => {
    switch (status) {
      case 400:
        if (code === 'invalid_field_value' && parsed.param) {
          return ` Check the "${parsed.param}" field.`;
        }
        return ' The request body was rejected — see the message above.';
      case 401:
        return ' Check ZERNIO_API_KEY (it starts with sk_ and is shown only once at creation).';
      case 403:
        return ' The account is missing a scope for this action — reconnect it with the posting scope.';
      case 404:
        return ' Not found. Check the account id (GET /v1/accounts) and the post id.';
      case 409:
        return code === 'idempotency_conflict'
          ? ' The original request is still processing; retry after the Retry-After delay.'
          : ' Identical content went to this account in the last 24 hours. Change the caption, the media or the account.';
      case 429:
        return ' Rate limited. Rate limits run from 60 to 1,200 req/min depending on connected accounts.';
      case 503:
        return ' Zernio is temporarily unavailable; retry with the same Idempotency-Key.';
      default:
        return '';
    }
  })();

  return new ZernioError(status, `Zernio ${path} failed (${status}): ${detail}.${hint}`, code, parsed.details);
}

// ── Accounts ──────────────────────────────────────────────────────────────

export async function listAccounts(options: { profileId?: string; platform?: string } = {}): Promise<
  ZernioAccount[]
> {
  const query = new URLSearchParams();
  if (options.profileId) query.set('profileId', options.profileId);
  if (options.platform) query.set('platform', options.platform);
  const suffix = query.size > 0 ? `?${query.toString()}` : '';

  const json = await request<{ accounts: ZernioAccount[] }>(`/accounts${suffix}`);
  return (json.accounts ?? []).map((account) => ({ ...account, id: account._id }));
}

// ── Media ─────────────────────────────────────────────────────────────────

export type PresignedUpload = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
};

/**
 * Upload a local file and return the public URL to put in `mediaItems`.
 *
 * Files already hosted on a public HTTPS URL skip this entirely; this path
 * exists because a rendered film is a local file.
 */
export async function uploadMedia(filePath: string): Promise<string> {
  const stats = statSync(filePath);
  const filename = basename(filePath);
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  const contentType = MIME[ext];

  if (!contentType) {
    throw new Error(
      `Unsupported upload type "${ext}" (${filename}). Zernio accepts: ${[...new Set(Object.values(MIME))].join(', ')}`,
    );
  }

  const presigned = await request<PresignedUpload>('/media/presign', {
    method: 'POST',
    body: JSON.stringify({ filename, contentType, size: stats.size }),
  });

  // The PUT goes to storage, not the API — no Authorization header, and a
  // non-JSON empty 200 is the success case.
  const put = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: readFileSync(filePath),
  });

  if (!put.ok) {
    throw new Error(
      `Upload to Zernio storage failed (${put.status}). The presigned URL expires after ${presigned.expiresIn ?? 3600}s; retry to get a fresh one.`,
    );
  }

  return presigned.publicUrl;
}

// ── Posts ─────────────────────────────────────────────────────────────────

export type MediaItem = {
  url: string;
  type?: 'image' | 'video' | 'gif' | 'document';
  title?: string;
};

export type PlatformTarget = {
  platform: string;
  accountId: string;
  /** Overrides the shared `content` on this platform only. */
  customContent?: string;
  /** Overrides the shared `mediaItems` on this platform only. */
  customMedia?: MediaItem[];
  /** YouTube title, Pinterest title, X Article, and other per-platform fields. */
  platformSpecificData?: Record<string, unknown>;
};

export type CreatePostInput = {
  /** Shared caption across every target, unless a target sets customContent. */
  content?: string;
  title?: string;
  mediaItems?: MediaItem[];
  platforms: PlatformTarget[];
  /** ISO 8601 with an offset, e.g. 2026-11-01T09:00:00Z. */
  scheduledFor?: string;
  timezone?: string;
  publishNow?: boolean;
  isDraft?: boolean;
  queuedFromProfile?: string;
  /** Makes a retry safe: the same key returns the original post. */
  idempotencyKey?: string;
};

export type CreatedPost = {
  _id: string;
  status: string;
  scheduledFor?: string;
  platforms?: {
    platform: string;
    status?: string;
    platformPostId?: string;
    platformPostUrl?: string;
    error?: string;
  }[];
};

export async function createPost(
  input: CreatePostInput,
): Promise<{ post: CreatedPost; replayed: boolean }> {
  const body: Record<string, unknown> = {
    platforms: input.platforms.map((target) => ({
      platform: target.platform,
      accountId: target.accountId,
      ...(target.customContent ? { customContent: target.customContent } : {}),
      ...(target.customMedia ? { customMedia: target.customMedia } : {}),
      ...(target.platformSpecificData ? { platformSpecificData: target.platformSpecificData } : {}),
    })),
  };

  if (input.content) body.content = input.content;
  if (input.title) body.title = input.title;
  if (input.mediaItems?.length) body.mediaItems = input.mediaItems;
  if (input.scheduledFor) body.scheduledFor = input.scheduledFor;
  if (input.timezone) body.timezone = input.timezone;
  if (input.publishNow) body.publishNow = true;
  if (input.isDraft) body.isDraft = true;
  if (input.queuedFromProfile) body.queuedFromProfile = input.queuedFromProfile;

  const headers: Record<string, string> = {};
  if (input.idempotencyKey) headers['Idempotency-Key'] = input.idempotencyKey;

  // Kept inline rather than via request(): the status code distinguishes a
  // fresh post (201) from an idempotent replay (200), and that is worth
  // reporting to the user.
  const response = await fetch(`${BASE}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  const parsed = text ? safeJson(text) : {};
  if (!response.ok) throw toError(response.status, parsed, '/posts');

  return { post: (parsed as { post: CreatedPost }).post, replayed: response.status === 200 };
}

export async function listPosts(status?: 'draft' | 'scheduled' | 'published' | 'failed') {
  const query = status ? `?status=${status}` : '';
  return request<{ posts: CreatedPost[]; pagination?: unknown }>(`/posts${query}`);
}

export async function getPost(postId: string) {
  return request<{ post: CreatedPost }>(`/posts/${postId}`);
}

export async function retryPost(postId: string) {
  return request<{ post: CreatedPost }>(`/posts/${postId}/retry`, { method: 'POST' });
}

/**
 * Map a target platform to the payload keys it needs.
 *
 * YouTube and Pinterest title a post differently from the rest: the shared
 * `title` is display-only, so a real title goes in platformSpecificData.
 */
export function platformSpecificData(platform: string, title: string): Record<string, unknown> | undefined {
  if (platform === 'youtube' && title) return { title };
  if (platform === 'pinterest' && title) return { title };
  return undefined;
}
