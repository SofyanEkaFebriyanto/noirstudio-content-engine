---
name: noir-brand
description: Apply Noir Studio's visual and verbal identity to anything in this repo — colors, type, logo usage, motion personality, and the voice rules for narration and copy. Use whenever writing on-screen text, narration, captions, publish copy, choosing a theme, or deciding whether a visual treatment is on-brand. Also use when the user says "sesuai brand", "on brand", "gaya noirstudio".
---

# Brand

Source of truth: `brand/BRAND.md` (human) and `brand/brand.json` (machine).
Renderable tokens: `src/engine/theme.ts`.

Read the brand files before writing copy or choosing a look. This skill is the
short version you can hold in your head.

## Voice

Precise. Dry. Warm underneath. Allergic to hype.

| Do | Don't |
|---|---|
| State the concrete thing that happened | "Revolutionary", "game-changing", "unlock", "supercharge", "10x" |
| Short declaratives, one idea per sentence | Emoji in narration or on-screen copy |
| Let numbers carry the emotion | Rhetorical questions instead of a claim |
| "We" for the studio, "you" for the viewer | Claims the film does not demonstrate |

**Sounds like us:** "Most films say too much. This one says one thing."
**Doesn't:** "Supercharge your content pipeline and 10x engagement 🚀"

### Copy length targets

| Element | Limit |
|---|---|
| Film title (on screen) | ≤ 6 words |
| Subtitle | ≤ 9 words |
| Label / eyebrow | ≤ 3 words |
| CTA | one verb + one object ("Follow the build") |
| Narration segment | 8–16 words |

## Color

| Token | Use |
|---|---|
| `bg` charcoal `#141414` | ground (default theme) |
| `text` bone `#f4f1ea` | copy |
| `accent` gold `#f2a41f` | **one moment per frame** — sampled from the logo |
| `textMuted` steel | supporting copy |
| `textFaint` | labels that must not compete |

**The one-accent rule.** If the headline number is gold, the rule under it is
not. If the winner panel is gold, its bullets are muted. Two accents in one
frame reads as two competing ideas — and then the viewer has none.

## Type

- **Statements** → Instrument Serif, 400. Italic + gold marks the accent word.
- **Everything functional** → Space Grotesk (500/600/700).
- **Labels only** → JetBrains Mono, uppercase, +0.14em. Never a full sentence.

Never hardcode a font size. Pick a variant from `Text` / `RichReveal`
(`display`, `title`, `heading`, `body`, `caption`, `micro`).

## Theme choice

| Theme | When |
|---|---|
| `noir` | Default. Dark, high contrast, product and technical films. |
| `paper` | Editorial, calm, long-form explainers. Reads like print. |
| `signal` | Technical / terminal / data. Higher grain, lime accent, scanlines. |

Switching theme must not require touching a shot. If it does, the shot is using
a hardcoded color — fix the shot.

## Motion personality

- Everything **decelerates into place**. Fast start, long tail (`EASE.out`).
- Entrances are **one motion** (y + blur + opacity share one progress value).
- Holds: ≥ 1 second on any frame carrying a claim.
- No handheld drift, no spin, no rubber-band overshoot, no particle confetti.
- Camera pushes: under 8% scale, eased at both ends.

## Logo

Mark = a regular **hexagon** with a solid **N** inside (two triangular
counters). It is **1.158:1** (2/√3) — never squash it into a square.
Clearspace 0.5× mark height. Never outline, bevel, glow, or rotate.

Wordmark = **NOIR STUDIO**: NOIR in bone, STUDIO in gold.

Mark and wordmark are drawn in code (`src/components/Logo.tsx`, geometry in
`src/engine/brand.ts`, measured from `brand/logo/noir-studio.png`). Use
`<Mark>`, `<Wordmark>`, `<Lockup>`. Do not paste an image into a shot.

The source PNG copies to `public/brand/` on sync for tools outside the
renderer (favicons, decks).

## Publish copy

Structure: **one concrete claim → one line of context → one ask → hashtags.**

```
One typed file becomes the whole film: scenes, narration, captions, cues,
and a scheduled post on every platform.

Built with the Noir engine.

#noirstudio #motiondesign
```

- No hashtag walls (≤ 5).
- No engagement bait.
- No emoji unless the platform's native voice calls for it — ours does not.

## Off-brand tells (reject these)

- Gold used decoratively (gradients, glows, tinted shadows)
- A second accent in the same frame
- Exclamation marks in narration
- Title-case headlines mixed with ALL-CAPS labels in the same scene
- More than one CTA
- Serif used for functional UI text

## Self-check before delivering

- [ ] Obeys the one-accent rule
- [ ] Type uses variants, not literals
- [ ] Copy passes the read-aloud test (no clause stacking)
- [ ] No banned words
- [ ] Exactly one ask
- [ ] Logo used from code, at clearspace
