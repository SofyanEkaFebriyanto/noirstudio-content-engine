---
name: noir-publish
description: Publish a finished Noir film through Zernio — platform selection, one-request cross-posting, media upload, captions and hashtags, scheduling, drafts, and how to read Zernio errors. Use when the user says "publish", "upload", "post this", "jadwalin", "sebar ke sosmed", or asks about Zernio accounts, schedules, or a failed post.
---

# Publishing

The engine renders a file; Zernio distributes it. Publishing is **always**
previewed first.

## The flow

```
npm run render -- <id> --version v2                 → out/<id>/film-v2.mp4
npm run master -- <id> --version v2                 → delivery set
npm run publish -- <id> --version v2 --dry-run      ← ALWAYS
npm run publish -- <id> --version v2 --platforms tiktok,instagram
```

Zernio does three things behind `npm run publish`:

1. `POST /v1/media/presign` → `uploadUrl` + `publicUrl`
2. `PUT <uploadUrl>` (goes to storage, **no** Authorization header)
3. `POST /v1/posts` — **one request for every platform**

That third point is the main difference from a per-platform scheduler: the film
is uploaded once and every target lives in a single post. Do not loop over
platforms.

## Credentials

`.env`:

```
ZERNIO_API_KEY=sk_...
```

One key covers every platform. Create it at
[zernio.com/dashboard/api-keys](https://zernio.com/dashboard/api-keys): it is 67
characters (`sk_` + 64 hex), starts with `sk_`, and is shown **once** — Zernio
stores only a hash.

Create a separate key per agent or app so you can revoke one without breaking the
rest.

## Account ids

There is no way to guess an account id. List them:

```bash
npm run publish -- <episode> --accounts
```

Output is one line per account: platform, username, `_id`, profile name, and a
`← ` marker for any id already mapped.

Copy ids into `publish.config.json` at the repo root (git-ignored):

```json
{
  "default": { "tiktok": "<id>", "instagram": "<id>", "youtube": "<id>" },
  "my-episode": { "tiktok": "<a different brand's id>" }
}
```

An episode-scoped block overrides `default`, which overrides a flat
`{ "tiktok": "<id>" }` entry. That is how one repo publishes for several brands.

## Platform ids

Zernio uses its own ids. The engine accepts everyday aliases and normalizes them:

| You can write | Zernio id |
|---|---|
| `x`, `twitter` | `twitter` |
| `ig`, `instagram` | `instagram` |
| `fb`, `facebook` | `facebook` |
| `yt`, `youtube` | `youtube` |
| `li`, `linkedin` | `linkedin` |

Full social set: `twitter`, `instagram`, `facebook`, `linkedin`, `tiktok`,
`youtube`, `pinterest`, `reddit`, `bluesky`, `threads`, `googlebusiness`,
`snapchat` (closed beta).

## Scheduling, publishing, drafting

Zernio's rule matters here: **a post with no `scheduledFor`, no `publishNow`, no
`queuedFromProfile` and no `isDraft` is silently saved as a draft.** So the
engine never sends a bare request.

| You run | Payload | Result |
|---|---|---|
| `npm run publish -- <id> --platforms …` | `publishNow: true` | publishes immediately |
| `--schedule 2026-11-01T09:00:00Z` | `scheduledFor` | scheduled |
| `--draft` | `isDraft: true` | saved as a draft |
| *(episode sets `publish.scheduleAt`)* | `scheduledFor` | scheduled |

A past `scheduledFor` is not rejected — Zernio publishes it synchronously.

Always include a timezone offset (`Z` or `+07:00`) or pass
`--timezone Asia/Jakarta`. Without one, Zernio reads the time as the account's
local time and the post lands at the wrong hour.

## Caption rules

The engine assembles: `publish.caption` + blank line + hashtags.

```ts
publish: {
  title: 'The Noir Content Engine',
  caption: 'One typed file becomes the whole film: scenes, narration, captions, cues, and a scheduled post on every platform.',
  hashtags: ['noirstudio', 'motiondesign'],
  scheduleAt: '2026-11-01T09:00:00Z',
}
```

- `content` is optional in Zernio when media is attached, but the engine always
  sends the caption — an untitled video post is a worse post.
- **Title is display-only.** It is not the YouTube video title. The engine puts
  it in `platformSpecificData.title` for YouTube and Pinterest, which is where
  those platforms read it from.
- Hashtags: ≤ 5, `#` added automatically.
- Per-platform overrides exist (`customContent`, `customMedia` on a target) but
  the engine does not use them. If one platform needs different words, that is
  usually two posts, not one.

## Media limits

The engine checks duration before uploading:

| Platform | Ceiling |
|---|---|
| TikTok | 600 s |
| Instagram | 900 s |
| Facebook | 7,200 s |
| YouTube | 43,200 s |
| LinkedIn | 1,800 s |
| Threads | 300 s |
| X / Twitter | 140 s |
| Pinterest | 600 s |

Presign caps any file at 5 GB. Platforms are stricter: X caps video at 512 MB,
and aspect ratios differ per platform.

**Uploads expire.** The presigned URL lives 1 hour; the file sits in temporary
storage for 7 days. Zernio copies it to permanent storage when the post that
references it is created. A post scheduled more than 7 days after an upload
would fail — which is why the engine uploads and creates the post in one run.

## Dry run (mandatory first step)

```bash
npm run publish -- demo-engine --version v2 --platforms tiktok,instagram --dry-run
```

Prints the exact `POST /v1/posts` body: content, title, mediaItems, every target
with its account id and platform data, plus the schedule fields. Read it.

A dry run makes **no network calls** — it cannot catch a bad account id, a
missing scope, or a plan limit. Clean dry run means "the payload looks right".

## A real publish needs `--yes`

Anything that is not a dry run, `--status` or `--accounts` uploads the film and
publishes. In a non-interactive session (an agent, CI, a piped shell) the script
refuses unless you add `--yes`:

```
✗ Refusing to publish from a non-interactive session.
Preview first:  --dry-run
Then confirm:   add --yes to this exact command, run by a person.
```

This exists because of a real incident: a `--status` lookup once fell through
into a publish and pushed a test cut to a live channel. Two things now prevent
it. `--status` and `--accounts` are handled as read-only commands **before** the
render check and before any publish state is read. And a publish requires an
explicit `--yes` from a human.

Never add `--yes` on the user's behalf. Show the dry run, get a clear go-ahead,
then run the command.

## `--status` is read-only

```bash
npm run publish -- <episode> --status
npm run publish -- <episode> --status failed
```

Lists posts (id, status, scheduled time, per-platform status). It does not read
the render manifest, so it works even before a film exists. Implementation note:
the flag is checked with `'status' in args.flags`, because a bare `--status` is
normalized to an empty string and `Boolean('')` is `false`.

## Idempotency

The engine sends a fresh `Idempotency-Key` (UUID) per publish. Zernio's three
layers:

1. Same `Idempotency-Key` within 24h → returns the original post (`200`, not `201`)
2. Same `x-request-id` + same content fingerprint → returns the original
3. Same content to the same account within 24h → `409` with `existingPostId`

Because of layer 3, re-publishing a **byte-identical** caption to the same
account within a day is rejected. Change the caption, the media, or the account.

A retry after a timeout should reuse the key. The engine generates one per run,
so a manual re-run is treated as a new post — and will hit the `409` if nothing
changed.

## What can go wrong

| Error | Meaning | Fix |
|---|---|---|
| `401` | bad or missing key | re-copy `ZERNIO_API_KEY`; it is shown only once |
| `400 invalid_field_value` | a request field is wrong | the message names `param` |
| `403` | account lacks the scope | reconnect the account with the `posting` scope |
| `404` | wrong account/post id | `--accounts` |
| `409` + `existingPostId` | same content within 24h | change caption/media/account |
| `409 idempotency_conflict` | original still processing | retry after `Retry-After` |
| `429` | rate limited (60–1,200 req/min) | wait `Retry-After` |
| `503` | Zernio temporarily unavailable | retry with the same key |
| Post saved but not published | no `scheduledFor`/`publishNow` | the engine prevents this; check the payload |
| Published at the wrong hour | no timezone in the ISO string | add `Z` or `--timezone` |
| Upload 400 | wrong MIME or > 5 GB | check the file type; MP4 is `video/mp4` |
| Upload PUT 403 | presign older than 1 hour | re-run to get a fresh URL |

## Checking status

```bash
npm run publish -- <episode> --status              # every post
npm run publish -- <episode> --status failed       # one status
npm run publish -- <episode> --status scheduled
```

Statuses: `draft`, `scheduled`, `published`, `failed`. Published posts carry
`platformPostUrl` per platform. A failed target can be retried with
`POST /v1/posts/{postId}/retry` (the SDK exposes it as `retryPost`).

## MCP alternative

For interactive publishing, Zernio also runs a hosted MCP server at
`https://mcp.zernio.com/mcp` with tools like `accounts_list`, `posts_create` and
`posts_cross_post`. It is useful when a human wants to publish from chat without
the repo; the engine's script path exists so publishing stays reproducible and
recorded in the repo.

## Pre-flight checklist

- [ ] Watched the actual rendered file, not just stills
- [ ] `npm run master` produced the delivery set
- [ ] Duration under the strictest platform's ceiling
- [ ] Caption has one claim, one ask, ≤ 5 hashtags
- [ ] Schedule time has an explicit timezone or `--timezone`
- [ ] Dry run read and approved by the user
- [ ] Publishing is outward-facing: never run it without explicit approval
- [ ] `--yes` is added only for the confirmed command, never pre-emptively
- [ ] You told the user the exact platform and account it will publish to
