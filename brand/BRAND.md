# Noir Studio — brand guide

The short version a writer or an agent needs before making anything.

## Who we are

A small motion studio. We make films that explain things: product launches,
technical explainers, and the studio's own episodes. Built from code, voiced by
machine, published everywhere.

**Tagline:** Motion for people who ship.

## Voice

Precise, dry, warm underneath, allergic to hype.

| Do | Don't |
|---|---|
| State the concrete thing that happened | "Revolutionary", "game-changing", "unlock", "supercharge" |
| Short declaratives — one idea per sentence | Emoji in narration or on-screen copy |
| Let numbers carry the emotion | Rhetorical questions instead of a claim |
| "We" for the studio, "you" for the viewer | Promises the film does not show |

**Lines that sound like us**

> Most films say too much. This one says one thing.
>
> One file. Every frame. No timeline scrubbing.
>
> The edit is code. The code is the edit.

**Lines that don't**

> ~~Supercharge your content pipeline and 10x your engagement!~~ 🚀

## Color

| Token | Hex | Use |
|---|---|---|
| Charcoal | `#141414` | Ground on dark themes |
| Bone | `#f4f1ea` | Text on charcoal; ground on light themes |
| Gold | `#f2a41f` | The single accent. One per frame. Sampled from the logo. |
| Gold light | `#e8c97a` | Tint of the accent, for one secondary use |
| Steel | `#a9a49a` | Muted text, metadata |

Rules:
- **One accent moment per frame.** If the number is gold, the rule under it is not.
- Gold on charcoal is the signature. Do not tint it, gradient it, or glow it.
- Never place bone text over a bright area without the scrim.

## Type

| Role | Family | Notes |
|---|---|---|
| Statements | Instrument Serif | 400 only. Italic + gold marks the accent word. |
| Everything functional | Space Grotesk | 500 body, 600 headers, 700 wordmark |
| Labels / metadata | JetBrains Mono | Uppercase, +0.14em tracking. Never a full sentence. |

Sizes come from `Theme.type.scale` (reference width 1080). Do not hardcode a
font size in a shot — pick a variant.

## Motion

- **Everything decelerates into place.** Fast start, long tail (`EASE.out`).
- **Entrances are one motion.** y, blur and opacity share a single progress
  value. Splitting them reads as broken.
- **Hold what must be read.** Minimum 1 second on any frame carrying a claim.
- **No handheld drift.** Camera pushes are under 8% scale and ease at both ends.
- **One idea per scene.** If a scene needs two headlines, it is two scenes.

Signature transitions: fade (default), wipe (left), slide (right), flip (up).

## Logo

The mark is a **regular hexagon** with a solid **N** centered inside. The N is
cut by two triangular counters; the hexagon is 1.158:1 (2/√3), so it is wider
than it is tall — never squash it into a square.

The wordmark is **NOIR STUDIO**: NOIR in bone, STUDIO in gold.

- Clearspace: 0.5× mark height
- Minimum: 20 px
- Never outline, bevel, glow, rotate, or squash
- On imagery, always use the scrim first

Source raster: `brand/logo/noir-studio.png`. Vector: `src/components/Logo.tsx`
(geometry in `src/engine/brand.ts`, measured from the PNG), so no asset can go
missing at render time.

## Mascot

**Noir** is a small pixel-art character: a faceless figure in a near-black
hoodie with the hood up, over-ear headphones, cargo pants and white sneakers.
Its identity is the face: a black void with two **glowing ice-blue eyes** and a
thin smile. Twenty poses, one character.

The reference is `brand/mascot/noir-reference-sheet.jpg`. The artwork in the
engine is traced from it into pixel grids (`src/mascot/sprites.ts`), so what
renders is that sheet, not an interpretation of it.

### Character sheet

- **Head** — hood up, face a black void. Two glowing eyes, ice-blue and white
  (`#dbe8f2` at the core), and one thin light smile. Nothing else on the face.
- **Headphones** — over-ear, always on, both cups visible in front-facing poses.
- **Body** — oversized hoodie with a kangaroo pocket and a drawstring, cargo
  pants with side pockets, white sneakers with black soles.
- **Style** — pixel art. Hard pixel edges, a dark palette of about two dozen
  near-blacks and greys, one white on the sneakers, one cold blue on the eyes.
  No gradients, no glow, no blur. It is always drawn with crisp edges.
- **Ground shadow** — a flat grey ellipse under the feet, as on the sheet.

### Colors and themes

The figure keeps its own palette; the theme only decides how it separates from
the ground.

| Part | Source |
| --- | --- |
| Hoodie, pants, headphones, shoes | traced palette (near-black and greys, white) |
| **Eyes** | traced ice-blue palette. **Never recolor.** |
| Rim | `textMuted`, a 1-pixel halo around the silhouette, on dark themes only |
| Effect marks in near-black | `text` on dark themes, as drawn on light themes |
| Red anger mark, gold sparkles | as drawn |

- A near-black hoodie vanishes into a charcoal ground, so on dark themes
  (noir, signal) Noir gets a 1-pixel steel rim. On a light theme (paper) there
  is no rim and the figure sits on the ground as drawn.
- The eyes are the one constant. They are the first thing a viewer reads, so
  they are never tinted to match an accent, a theme, or a season.
- Effect marks (`?`, `!!`, `zzz`, sparkles, motion lines) belong to the pose
  and can be dropped with `effects: false`. The red mark and the gold sparkles
  are the only warm colors Noir ever carries; use them as drawn or not at all.

### The 20 poses

| Pose | Reference label | Marks | Fits this episode moment |
| --- | --- | --- | --- |
| `idle` | Idle | · | The default stance: any beat where Noir is simply present, beside a stat or under a title. |
| `idle-2` | Idle 2 | · | Relaxed variant of idle, one hand on the hip. Alternate with idle in a long scene so it never freezes. |
| `cross-arms` | Cross Arms | · | Skeptical or unimpressed: testing a claim, a "does it really work" beat before the proof. |
| `wave` | Wave | yes | Greeting and sign-off: the first beat of an episode, or the goodbye on the end card. |
| `thumbs-up` | Thumbs Up | yes | Confirms a result that held up: a check that passed, a render that matched, a fix that worked. |
| `point` | Point | yes | Directs attention to a stat, list or panel placed to the left of Noir. Use flip to point right. |
| `peace` | Peace | yes | Light sign-off or a casual aside; softer than wave. Good for the outro after the ask. |
| `thinking` | Thinking | yes | The question beat before an answer, a trade-off, or a decision the viewer is weighing. |
| `confused` | Confused | yes | Honest uncertainty: something that did not behave, an unexpected output, an open question. |
| `shocked` | Shocked | yes | A surprising number or a failure nobody saw coming. Keep it short and pair it with the explanation. |
| `walk` | Walk | yes | Transitions and progress: moving from one chapter to the next, or into a new section. |
| `run` | Run | yes | Speed and urgency that is real: a fast pipeline, a quick build, racing a deadline we actually had. |
| `jump` | Jump | yes | A milestone earned and shown: shipped, published, goal met. |
| `sit` | Sit | · | Quiet, low-stakes beats: a pause between chapters, a calm aside, listening to the voiceover. |
| `crouch` | Crouch | · | Looking closely or getting ready: inspecting a detail, or the beat just before a launch. |
| `lie-down` | Lie Down | yes | Rest and downtime: the build is running, nothing to do but wait. Never on a claim. |
| `lying-back` | Lying Back | · | Deep calm or giving up gracefully: the long wait, the end of a long night, a closing aside. |
| `kneel` | Kneel | yes | Defeat or humility: a mistake we own, a thing that broke. Pair with the fix. |
| `angry` | Angry | yes | Bloopers and fail moments played for the joke: the bug that cost an hour. Always paired with the fix. |
| `victory` | Victory | yes | The earned win at the end of a hard build. One fist up; no confetti, no hype. |

Use Noir sparingly: one or two appearances per film, never as the proof of a
claim. Motion follows the rest of this guide: one entrance, decelerating into
place (`EASE.out`), and a push of under 8%.

### Using it

- In an episode: shot `mascot` with `pose`, optional `caption`, `flip`, and
  `effects` (`npm run shots -- mascot`).
- In code: `<Mascot ctx={ctx} pose="wave" size={...} flip effects />` from
  `src/components/Mascot.tsx`. Omit `size` to derive it from the theme scale.
- Review all 20 on one still: `npm run mascot:sheet` (writes
  `out/mascot-sheet.png`). Check the sprite data with `npm run mascot:check`.
- `flip` mirrors the character. Letter-like effects (`?`, `!`, `z`) move to the
  other side but are never mirrored.
- Re-trace after changing the reference: `python3 script/mascot-trace.py`
  (needs pillow, numpy, scipy, scikit-learn; dev tool only).

### Mascot — never

- Never recolor the eyes, or give Noir any other face feature
- Never take the headphones off, show the face under the hood, or give it hair
- Never scale it with smoothing; the pixels stay hard-edged
- Never add a gradient, glow, blur or soft shadow
- Never swap in a different mascot, or redraw a pose by hand to "fix" it:
  change the reference, re-trace, and review the sheet
- Never use it on a claim, a testimonial, or a number we cannot source
- Never flip a glyph: `?`, `!` and `z` are read left to right

## What we never make

- Fake urgency ("only 3 left"), countdowns, or manufactured scarcity
- Claims about results the film does not demonstrate
- Testimonials or numbers we cannot source
- Anything that reads as a different studio's house style
