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

## What we never make

- Fake urgency ("only 3 left"), countdowns, or manufactured scarcity
- Claims about results the film does not demonstrate
- Testimonials or numbers we cannot source
- Anything that reads as a different studio's house style
