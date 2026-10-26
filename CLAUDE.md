# Noir Studio content engine — working rules

A film studio in a repository. An episode is a typed spec; Remotion draws it;
ElevenLabs voices it; Zernio ships it.

**Read this file, then the skill that matches the task.** The skills are not
optional documentation — they are the method.

| Task | Skill |
|---|---|
| Understand the engine / plan an episode | `.claude/skills/noir-engine` |
| Write the script and scene list | `.claude/skills/noir-script` |
| Add or fix a scene shot | `.claude/skills/noir-shots` |
| Copy, look, colors | `.claude/skills/noir-brand` |
| Voice, captions, cues, mix | `.claude/skills/noir-audio` |
| Render and publish | `.claude/skills/noir-publish` |

## The one architectural rule

**An episode is data.** `episodes/<id>/episode.ts` declares scenes, narration and
cues. Nothing downstream invents content:

```
episode.ts  →  resolveTimeline()  →  Film.tsx  →  mp4
```

If a change alters *what the film says*, it belongs in the episode file. If it
alters *how the engine draws it*, it belongs in `src/`. Never hardcode a fact, a
sentence, or a timestamp into a shot.

## Commands

| Command | Purpose |
|---|---|
| `npm run doctor` | environment check |
| `npm run new -- <id>` | scaffold an episode |
| `npm run check -- <id>` | validate everything, no render |
| `npm run typecheck` | TypeScript |
| `npm run sync` | link media, resolve VO, write generated modules |
| `npm run shots` / `npm run shots -- <id>` | shot catalog / one shot's props |
| `npm run still -- <id> --still 3,9,16` | frames at those seconds |
| `npm run render -- <id> --version v2` | full film |
| `npm run vo -- <id>` | ElevenLabs narration + alignment |
| `npm run audio -- --generate-pack` | build the cue pack |
| `npm run footage` | contact sheets for b-roll |
| `npm run gallery` | render every shot once |
| `npm run master -- <id>` | loudness, crops, poster |
| `npm run publish -- <id> --dry-run` | payload, no network |
| `npm run shotcraft -- --update` | re-vendor the shot library |

## Hard rules

1. **Determinism.** No `Math.random`, `Date.now`, or `new Date()` in any shot.
   Use `seededRandom` / `hash01` / `noise1D`. Two renders must match.
2. **Never edit `src/generated/`.** It is overwritten by `sync`.
3. **Never edit `library/shotcraft/`.** It is vendored; refresh, don't patch.
4. **Never import from `library/`.** Adapt its motion into `src/shots/`.
5. **Never commit secrets.** `.env` and `publish.config.json` are git-ignored.
6. **Publishing is outward-facing.** Always `--dry-run` and show the payload
   before a real publish, every time. Prior approval does not carry over.
7. **Stills before renders.** Do not run a full render you have not checked
   frames for. `--still` is cheap; a render is not.
8. **One accent per frame.** Brand rule; see `noir-brand`.
9. **Report what you verified.** If you did not watch the rendered file, say so.

## Architecture

```
src/
├── index.ts              registerRoot
├── Root.tsx              composition registry: one per episode + shot-gallery
├── Film.tsx              the composition: TransitionSeries + audio + captions
├── Gallery.tsx           every shot, once
├── engine/
│   ├── spec.ts           Zod episode contract (the source of truth)
│   ├── timeline.ts       scenes → frames; transition overlap math
│   ├── theme.ts          themes, type scale, safe areas, ShotContext
│   ├── fonts.ts          local woff2 loading
│   ├── registry.ts       shot registry
│   ├── captions.ts       word alignment → caption lines
│   ├── presentations.tsx transition map
│   ├── assets.ts         media id → staticFile
│   ├── brand.ts          brand kit + logo geometry
│   ├── math.ts           deterministic helpers + noise
│   └── ease.ts           shared easing curves
├── components/           Frame, Text, Logo, Captions, Layout
├── shots/                ⚠ four files per shot — see noir-shots
├── audio/                AudioLayer, VoiceLayer
└── generated/            sync output (do not edit)

episodes/<id>/
├── episode.ts            THE spec
├── media.json            optional media id → path overrides
└── SCRIPT.md             optional beat sheet

script/                   the pipeline (Node, no Remotion imports in most)
library/shotcraft/        vendored recipe cards + demos (Apache-2.0)
footage/{inbox,source}    raw + curated b-roll
public/{fonts,audio,brand}  static assets served to the renderer
brand/                    brand.json + BRAND.md
```

### Why shots are split across four files

`schemas.ts` and `catalog.ts` are pure Zod/data with **no React import**, so
`npm run check`/`sync` run in plain Node without bundling Remotion. The component
lives in `<category>-shots.tsx`; `defs.ts` wires them together.

Do not collapse these. It is the reason the validation loop is fast.

### Timing model

Scene durations are inclusive of transition overlap. Two 30f scenes joined by a
12f transition occupy 48f. `resolveTimeline` is the only place this is computed;
everything else reads its output. `check` warns when:
- a transition is longer than the scenes it joins
- a cue falls outside the film
- narration overruns its scene (estimate; `vo` warns with real durations)

### Audio model

- VO is per-segment mp3 + `alignment.json`, placed at `scene start + leadInFrames`.
- Captions derive from alignment, never hand-timed.
- Cues are film-absolute seconds.
- Missing audio is skipped, never fatal. Audio inventory is written by `sync`
  into `src/generated/episodes.ts`.

## Conventions

- **Theme tokens only.** No hex literals in shots (rgba overlays excepted).
- **Type via `<Text>` / `<RichReveal>`**, sized with `typeScaleFor`.
- **Layout via `<SceneBody>`** — it owns safe margins, centering and the caption
  reserve. Positioning against `safe.height * fraction` is the bug that made the
  first layout pass float in the top third of 9:16.
- **`*word*`** marks the single accent word in any copy string.
- **Scene ids** are kebab-case and unique per episode.
- **`hints`** on every catalog entry — the next agent reads them.

## Workflow

1. Read the matching skill.
2. `npm run check` before and after edits.
3. `npm run still` at three points across the film; look at them.
4. Only then `npm run render`.
5. `npm run master` before publishing.
6. `npm run publish -- --dry-run`; show the payload.

## When something is ambiguous

Prefer the choice that keeps the engine general:
- New look but existing job → use existing shot, change props
- New job → new shot (four files), never inline animation in an episode
- New timing feel → add to `ease.ts`, not per-shot literals
- New color → add a theme token, not a hex in a component

Ask the user only when the decision changes *what the film is*, not how it is
built. For those, state the assumption and proceed.
