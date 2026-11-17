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

Noir the mascot is the studio's actual avatar, not the logo mark: a small
chibi robot in dark streetwear, drawn as PIXEL ART to match Sofyan's
reference pose sheet (rebuild 17 Nov 2026: "gw pengen 100% mirip kaya
gini"). Big head, small body. Calm, cool, unbothered energy.

### Character sheet

- **Rendering:** pixel art, not smooth vector. Every shape is built from
  axis-aligned rectangles snapped to a 4-unit grid (60 x 80 pixels in the
  240 x 320 viewBox, see `src/mascot/pixels.ts`) and rendered with
  `shapeRendering="crispEdges"` — no curves, no anti-aliasing, no blur.
  Curves are stepped rows, diagonals are staircases. One mascot pixel is
  ~18 screen px at the 1080px reel render, so the character reads as
  pixel art at a glance, like the reference sheet.
- **Proportions:** chibi and chunky, from the reference sheet. The head is
  huge — about 40% of total height — the torso is short and compact, the
  arms and legs are short and thick, the sneakers are relatively big. The
  ratio is locked in `src/mascot/character.ts` and reused in every pose.
- **Head:** a stepped pixel disc: a charcoal hood behind and around a
  clean black robot face, with a lighter grey rim around the face opening.
  No mouth, no nose, no ears visible. A short dark neck segment shows
  below. The head is CLEAN: no reflection, no highlight, no sheen mark
  anywhere on it. The only thing that glows on the whole character is the
  eyes — drawn as a flat translucent halo, never a blur filter, so the
  pixel edges stay crisp.
- **No backpack:** the mascot wears NO backpack. It was removed on Sofyan's
  instruction on 17 Nov 2026 (it got in the way). No bag, no shoulder
  straps, no buckles — the back of the hoodie is clean in every pose.
- **Eyes (the signature):** exactly two SMALL glowing half-moon eyes, flat
  side down, in glowing white-blue — 5px wide, 3px tall, like the
  reference (the old vector version had oversized domes). Slightly
  half-lidded, calm and cool, never wide open, never angry, never
  cute-sparkle. The glow is part of the eyes and is the ONLY glow allowed
  anywhere on the mascot. A subtle smile line sits under the eyes, like
  the reference sheet.
- **Hoodie:** oversized, charcoal-gray, flat tonal patches suggesting
  fleece. The hood is UP, covering the top and sides of the head. Two
  drawstrings hang to the chest, kangaroo pocket on the belly.
- **Headphones:** black over-ear headphones worn OVER the hood, in every
  pose without exception. Stepped half-ring band over the hood, one chunky
  rectangular ear cup per side with an inner pad.
- **Hands:** black gloves — compact stepped mitts flush with the sleeve,
  never bulging joint balls. Finger details (wave, point, thumb,
  finger-up) are short pixel stubs clearly attached to the mitt, never
  long sticks.
- **Pants:** black baggy cargo pants. One flap side pocket on each thigh,
  on the outer edge of the leg, never centred on the leg axis (a dark dot
  on the axis reads as a knee joint).
- **Shoes:** black-and-white high-top sneakers, 11px wide — chunky, with a
  white upper, black heel and toe cap, lace marks, white midsole and dark
  outsole. At the default stance the two soles keep a 1px gap so they
  never merge into one white bar.
- **Palette (mascot only):** near-monochrome black and charcoal. The only
  bright elements are the glowing white-blue eyes and the white sneaker
  panels/soles. NO gold on the mascot, ever — gold stays reserved for
  on-screen text and numbers.
- **No text, no logos, no badges on the mascot.** The hexagon+N mark is a
  separate logo asset and does NOT appear on the mascot's chest or clothes.
  The chest carries the kangaroo pocket, nothing else.
- **Head tilt and body lean are 1-pixel horizontal shifts, never
  rotations** — a rotated rectangle would break the pixel grid.

All 20 poses reuse the exact same geometry and change ONLY limb positions,
head shift (max 1 pixel) and one held prop. Limb rule (pixel-art rebuild
17 Nov 2026, from Sofyan's reference pose sheet): limbs are SHORT, THICK
and TUCKED CLOSE to the torso, drawn as pixel staircases. Every arm is two
segments — a short upper-arm stub to an elbow tucked near the shoulder,
then a forearm folding to the hand — so a bent arm reads as a clear
deliberate fold and a hanging arm reads as a dead-straight tube. Never a
long thin bar with a slight mid kink: at full size that reads as a broken
bone. Hands are compact stepped mitts flush with the sleeve, finger
details are short pixel stubs. Raised hands (wave, thumbs-up, celebrate,
launch) sit OUTSIDE the head silhouette, clear of the ear cups — a fist
on top of a cup reads as one merged blob. Legs are dead-straight thick
columns, hip to foot, with no knee joint drawn at all, except sit-relaxed,
whose knees fold out to the sides and feet tuck in like the reference Sit
pose. Cargo pockets sit on the outer edge of the upper thigh, never
centred on the leg (a dot on the leg axis reads as a knee joint).
Implementation lives in `src/mascot/pixels.ts` (pixel raster core),
`src/mascot/character.ts` (single source of truth),
`src/mascot/poses.ts` (pose manifest) and `src/components/Mascot.tsx`; the
`mascot` shot wires it into the catalog.

### The 20 poses

| Pose | Used for |
|---|---|
| wave-hello | Greetings / brand-open |
| point-right | Directing attention to the right |
| present | Presenting a board or result to the side |
| think | Considering, weighing an idea |
| type | Working at a keyboard |
| read | Reading a document |
| thumbs-up | Approval, a thing that works |
| celebrate | A win, a launch, a milestone |
| shrug | Uncertain, "we do not know yet" |
| idea | An idea lands (bulb glows white-blue, never gold) |
| phone | Checking a phone, a notification arrives |
| wave-goodbye | End-card farewell |
| subscribe-point | Pointing down at a CTA |
| laugh | Joyful beat (eyes stay half-moon, never change shape) |
| explain | Mid-explanation, one hand open |
| inspect | Looking closer at a detail |
| launch | Take-off energy, shipping something |
| sit-relaxed | Chill beat, a pause between chapters (feet tucked under the hips, 56px apart so both shoes stay separate — never overlapping into one blob, never splayed into a wide V) |
| walk | Mid-stride, moving to the next idea |
| facepalm | Bloopers / fail moments (the only pose where the eyes are covered) |

### Never do

- Never remove the headphones, in any pose.
- Never add a backpack (removed 17 Nov 2026 — the back stays clean).
- Never add a reflection or highlight to the head — it stays clean
  glossy black, eyes only.
- Never change the eye shape (half-moon, flat side down, white-blue glow).
- Never add gold or a logo to the mascot, and never add a mouth.
- Never change the sneaker colorway (black-and-white high-tops).
- Never squash, rotate or re-proportion the head between poses.

## What we never make

- Fake urgency ("only 3 left"), countdowns, or manufactured scarcity
- Claims about results the film does not demonstrate
- Testimonials or numbers we cannot source
- Anything that reads as a different studio's house style
