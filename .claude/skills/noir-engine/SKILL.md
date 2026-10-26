---
name: noir-engine
description: How the Noir content engine works end to end — episode spec, shots, timing, audio, VO, render, publish. Use when writing or changing an episode, adding a shot, debugging timing or a render, or when the user asks "how do I make a video with this thing". Also the entry point when they say "make an episode", "buat video", or name a topic for a film.
---

# Noir engine — the operating model

Read this before touching an episode. It is the map; the other skills go deep.

## The one idea

**An episode is a typed file.** Everything else — layout, timing, captions,
audio cues, publishing metadata — is derived from `episodes/<id>/episode.ts`.

If you find yourself editing anything to change *what a film says*, you are in
the wrong place. Go back to the episode file.

```
episodes/<id>/episode.ts     ← you write this
        │
        ├── npm run check      validates it
        ├── npm run sync       links media, resolves VO placement
        ├── npm run still      visual check
        ├── npm run render     mp4
        ├── npm run master     delivery variants
        └── npm run publish    Zernio post
```

## Pipeline (in order, never skip)

| # | Command | What it does | Gate |
|---|---|---|---|
| 1 | `npm run new -- <id>` | Scaffolds `episodes/<id>/episode.ts` | — |
| 2 | `npm run check -- <id>` | Schema, timing, audio refs, media, VO fit | must be 0 errors |
| 3 | `npm run sync` | Links footage, writes `src/generated/episodes.ts` | must succeed |
| 4 | `npm run vo -- <id>` | ElevenLabs narration + alignment | optional |
| 5 | `npm run sync` again | VO placement is only final after vo | — |
| 6 | `npm run still -- <id> --still 3,9,16` | Frames at key moments | inspect every one |
| 7 | `npm run render -- <id> --version v1` | Full mp4 | human watches |
| 8 | `npm run master -- <id>` | Loudness + vertical/square + poster | — |
| 9 | `npm run publish -- <id> --dry-run` | Prints payload | confirm |
| 10 | `npm run publish -- <id> --platforms ...` | Schedules | user approves |

**Run 2–6 in a loop.** A full render is the most expensive feedback signal in
the system; stills are cheap. Do not render a film you have not seen frames for.

## Scene anatomy

```ts
{
  id: 'body',                       // unique, kebab-case
  shot: 'list-stack',               // must exist in the catalog
  durationInFrames: 96,             // omit to use the shot default
  props: { /* validated by the shot's schema */ },
  transition: { type: 'slide', durationInFrames: 12, direction: 'from-right' },
  label: 'the three rules',         // docs only
}
```

**Transitions overlap.** Two 30-frame scenes with a 12-frame transition take
48 frames, not 60. `check` computes the real duration; trust it over mental math.

## Shot vocabulary

20 shots, five categories. Full list with props: `npm run shots` (see
`src/shots/catalog.ts`). Pick by *job*, not by look:

| Job | Shots |
|---|---|
| Land one idea | `big-statement`, `title-card`, `quote-beat`, `word-cycle` |
| Show a number | `stat-slam`, `counter`, `bar-chart`, `vs-meter` |
| Compare | `compare-split`, `vs-meter` |
| Explain a process | `process-flow`, `timeline-bar`, `grid-map`, `list-stack` |
| Use real footage | `footage-fill`, `footage-frame`, `footage-strip` |
| Brand | `brand-open`, `brand-sting`, `subscribe-cta`, `end-card` |

**If no shot fits, add one** — see `noir-shots`. Never inline ad-hoc animation
into an episode; the vocabulary is the product.

## Timing rules

- 30 fps default. `durationInFrames` is frames, not seconds.
- Anything the viewer must *read* holds ≥ 1 s (30 f).
- One idea per scene. Two headlines = two scenes.
- A 9:16 film runs 20–60 s for social; a 16:9 explainer 60–180 s.
- Narration budget: **~2.5 words per second**. A 100-frame scene at 30fps is
  3.3 s, so ≤ 8 words, minus lead-in. `check` warns when a segment will overflow.

## Audio

- Music: one bed, volume 0.22–0.32, always faded in and out.
- Cues: `{ at: <seconds>, cue: '<pack-id>' }`. Times are **film-absolute seconds**,
  so adding a scene at the front shifts every later cue. Re-check after length changes.
- The pack lives in `public/audio/pack/`. `npm run audio -- --generate-pack`
  creates a starter pack with ElevenLabs. `npm run audio -- --list` shows it.
- Missing audio files are skipped, never fatal. But a film with a silent bed is a bug.

## Determinism (non-negotiable)

No `Math.random()`, no `Date.now()`, no `new Date()` in anything a shot renders.
Use `seededRandom` / `hash01` / `noise1D` from `src/engine/math.ts`. Two renders
of the same spec must be byte-comparable. `npm run check` cannot catch this — it
is on you.

## Failure modes and their fix

| Symptom | Cause | Fix |
|---|---|---|
| `Unknown shot` | typo or unregistered shot | `src/shots/catalog.ts` |
| `Unknown media id` | spec references media not in manifest | put file in `footage/source/<id>.<ext>`, run sync |
| Cue outside film | film got shorter than the cue sheet | recompute with `check` |
| VO overruns a scene | too many words | shorten the line; do not speed the voice past 1.1 |
| Captions empty | no VO and no `captions.extra` | add VO, or write extra lines with frame times |
| Render is slow | concurrency too high / huge images | `--concurrency 2`; pre-scale stills |
| Fonts missing | `public/fonts/` emptied | restore the four woff2 files |

## Files you may edit, and what you must not touch

**Edit freely:** `episodes/**`, `footage/source/**`, `brand/**`, `public/audio/pack/**`.

**Edit with intent:** `src/shots/**` (see `noir-shots`), `src/engine/**` (affects
every episode), `script/**` (the pipeline).

**Never edit:** `src/generated/**` (overwritten by sync), `library/shotcraft/**`
(vendored; refresh with `npm run shotcraft -- --update`), `out/**`.

## Before you say "done"

- [ ] `npm run check -- <id>` → 0 errors
- [ ] `npm run typecheck` → clean
- [ ] Looked at a still from the first, middle, and last third
- [ ] Cue sheet still lines up with the scenes (`check` catches the gross ones)
- [ ] If VO changed, `npm run vo` then `npm run sync` ran again
- [ ] Told the user what changed and what you did **not** verify
