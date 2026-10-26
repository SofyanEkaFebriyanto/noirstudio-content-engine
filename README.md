# Noir Studio content engine

An episode is a typed file. The engine turns it into a finished, voiced,
captioned, loudness-mastered film — and schedules the post.

Built for motion-graphics content: product launches, technical explainers,
build logs, and the studio's own episodes.

```
episodes/<id>/episode.ts
        │
        ├─ Remotion + 20 studio shots   →  every frame, from code
        ├─ video-shotcraft library      →  126 motion recipes to draw from
        ├─ ElevenLabs                   →  narration, alignment, cues, music
        └─ Zernio                       →  one request, every platform
```

## Why this exists

Editing by hand does not scale. A change to one sentence means re-cutting on
every platform. Here, the film is data: fix the spec, re-render, publish. The
timeline, captions, cue sheet and publish payload all derive from the same file,
so they cannot drift apart.

## Quick start

```bash
npm install
cp .env.example .env        # optional: ElevenLabs + Zernio keys
npm run doctor              # check node, ffmpeg, fonts
npm run audio -- --tone-pack  # placeholder cue pack so audio works offline
npm run check               # validate the demo episode
npm run studio              # open Remotion Studio
```

Render the reference episode:

```bash
npm run still -- demo-engine --still 3,10,24   # cheap visual check
npm run render -- demo-engine --version v1     # full film
npm run master -- demo-engine --version v1     # crops + poster + loudness
npm run publish -- demo-engine --version v1 --dry-run
```

Output lands in `out/<episode>/`.

## Make an episode

```bash
npm run new -- my-episode --title "My Episode" --format reel
$EDITOR episodes/my-episode/episode.ts
npm run check -- my-episode
```

Or start from a complete, ready-to-render structure:

```bash
npm run new -- my-launch --preset launch-30s      # 30s vertical
npm run new -- my-log --preset build-log-45s      # 45s vertical
npm run new -- my-explainer --preset explainer-90s # 90s wide
```

Presets carry a full scene list, timings and cue sheet that pass `check` as
written — rewrite the copy and go. `npm run new -- --help` lists them.

The plain scaffold has a working four-scene film. Replace the props; see
`npm run shots` for the vocabulary.

With narration:

```bash
# add voice.segments[] to episode.ts, set ELEVENLABS_VOICE_ID in .env
npm run vo -- my-episode
npm run sync                  # VO placement + caption timings
npm run render -- my-episode
```

## The shot vocabulary

20 shots, five categories. `npm run shots` lists them;
`npm run shots -- <id>` prints a shot's props and a scene skeleton.

| Category | Shots |
|---|---|
| Type | `title-card`, `list-stack`, `quote-beat`, `word-cycle`, `big-statement` |
| Data | `stat-slam`, `bar-chart`, `counter`, `vs-meter` |
| Layout | `compare-split`, `process-flow`, `grid-map`, `timeline-bar` |
| Footage | `footage-fill`, `footage-frame`, `footage-strip` |
| Brand | `brand-open`, `brand-sting`, `subscribe-cta`, `end-card` |

Every shot works in every format and every theme, with no per-episode styling.
`npm run gallery` renders all of them in one film.

**210 more motion recipes** live in `library/shotcraft/` (verified: 126 cards,
158 tuned demos, Apache-2.0) — reference material to adapt, not to import.

## Formats & themes

| Format | Size | For |
|---|---|---|
| `reel` | 1080×1920 | TikTok, Reels, Shorts |
| `wide` | 1920×1080 | YouTube, web |
| `square` | 1080×1080 | feed |
| `portrait` | 1080×1350 | Instagram feed |

| Theme | Look |
|---|---|
| `noir` | charcoal ground, bone type, one gold accent (the logo palette) |
| `paper` | editorial light, warm paper, print rules |
| `signal` | terminal dark, muted lime accent, scanlines |

## Commands

| Command | Does |
|---|---|
| `npm run doctor` | environment check |
| `npm run new -- <id> [--preset <id>]` | scaffold an episode |
| `npm run check -- <id>` | validate: schema, timing, audio, media, VO fit |
| `npm run typecheck` | TypeScript |
| `npm run sync` | link footage, place VO, write generated modules |
| `npm run shots` | shot catalog |
| `npm run still -- <id> --still 3,9` | frames at those seconds |
| `npm run render -- <id> --version v2` | full film + loudness |
| `npm run vo -- <id>` | ElevenLabs narration + word alignment |
| `npm run audio -- --generate-pack` | build the cue pack (ElevenLabs) |
| `npm run audio -- --tone-pack` | offline placeholder pack (ffmpeg) |
| `npm run footage` | contact sheets for b-roll |
| `npm run gallery` | every shot, once |
| `npm run master -- <id>` | loudness, vertical/square crops, poster |
| `npm run publish -- <id> --dry-run` | print the Zernio payload, no network |
| `npm run publish -- <id> --platforms tiktok,instagram --yes` | publish now (needs `--yes` when non-interactive) |
| `npm run publish -- <id> --schedule <ISO> --platforms ...` | schedule |
| `npm run publish -- <id> --status [failed]` | list posts and status (read-only) |
| `npm run shotcraft -- --update` | re-vendor the shot library |
| `npm run studio` | Remotion Studio |

## Configuration

`.env` (never committed):

```
ELEVENLABS_API_KEY=        # narration, cues, music
ELEVENLABS_VOICE_ID=       # default voice
ZERNIO_API_KEY=            # publishing — one sk_... key covers every platform
```

`publish.config.json` (never committed) maps platform → Zernio account id:

```json
{ "default": { "tiktok": "...", "instagram": "...", "youtube": "..." } }
```

Find ids with `npm run publish -- <episode> --accounts`.

Publishing is outward-facing, so a non-dry run in a non-interactive session
refuses without `--yes`. Preview first, then confirm.

Zernio also runs a hosted MCP server at `https://mcp.zernio.com/mcp`
(`claude mcp add --transport http zernio https://mcp.zernio.com/mcp`). Use it to
inspect accounts or post interactively from chat; use `npm run publish` when the
publish should be reproducible and recorded in the repo.

## Layout

```
episodes/        one folder per film; episode.ts is the spec
src/engine/      spec, timeline, theme, fonts, captions, easing
src/shots/       the vocabulary (schema + catalog + component + defs)
src/components/  Frame, Text, Logo, Captions, Layout
src/audio/       music beds, cues, VO placement
script/          the pipeline (sync, check, render, vo, publish, …)
library/shotcraft/   vendored motion recipes (Apache-2.0, pinned)
footage/         inbox (raw) → source (curated) → contact (sheets)
brand/           brand.json + BRAND.md
public/          fonts, audio pack, media (served to the renderer)
out/             renders, stills, delivery
```

## Conventions worth knowing

- **Determinism.** No `Math.random` / `Date.now` in shots. Same spec, same bytes.
- **Transitions overlap.** Two 30f scenes + a 12f transition = 48f, not 60f.
- **`*word*`** marks the one accent word in any string.
- **Copy ≠ narration.** On-screen is compressed; the voice carries the argument.
- **One accent per frame**, from the brand guide.
- **Missing audio never crashes a render**; it is skipped and reported.

## Docs

| Read | When |
|---|---|
| `CLAUDE.md` | working rules (agents) |
| `brand/BRAND.md` | voice, color, type, logo |
| `.claude/skills/noir-engine/SKILL.md` | the pipeline, end to end |
| `.claude/skills/noir-script/SKILL.md` | writing a film |
| `.claude/skills/noir-shots/SKILL.md` | adding or adapting shots |
| `.claude/skills/noir-audio/SKILL.md` | voice, captions, mix |
| `.claude/skills/noir-publish/SKILL.md` | Zernio publishing |
| `library/shotcraft/README.md` | the recipe library |

## Credits & licences

- [Remotion](https://remotion.dev) — video framework (company licence required
  for commercial use at scale; check their terms).
- [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) —
  motion recipe library, vendored under Apache-2.0
  (`library/shotcraft/LICENSE`).
- [ElevenLabs](https://elevenlabs.io) — speech, sound effects, music. Output
  rights follow your plan's terms; Music is cleared for commercial social use.
- [Zernio](https://zernio.com) — publishing. One `POST /v1/posts` reaches 16 platforms.
- Fonts: Instrument Serif, Space Grotesk, JetBrains Mono (SIL OFL) — vendored in
  `public/fonts/`.
- The placeholder cue pack is generated locally with ffmpeg and is **not** for
  publication; replace it with `npm run audio -- --generate-pack`.
