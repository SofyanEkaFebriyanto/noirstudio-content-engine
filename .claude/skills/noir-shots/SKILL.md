---
name: noir-shots
description: Add, adapt, or debug a scene shot in the Noir engine — the component contract, theme tokens, layout primitives, and how to port a shot recipe from the vendored shotcraft library without breaking the house style. Use when no existing shot fits, when a scene looks wrong, when the user wants a motion effect they saw somewhere, or says "tambah shot", "bikin efek ini", "animasinya aneh".
---

# Shots

A shot is a **reusable, typed scene**. Twenty of them ship in the box
(`src/shots/catalog.ts`). Episodes compose shots; they never contain animation.

## When to add a shot

Add one when the *job* is new, not when the *look* is new.

| Situation | Do |
|---|---|
| Existing shot does the job, with different words | Use it — change props |
| Existing shot does the job, but needs one more option | Add an optional prop |
| New structural job (a map, a flow, a comparison of three) | Add a shot |
| You want a specific motion from the shot library | Adapt it into the closest existing shot first |

If you add a shot, it must be usable by *any* episode, in any theme, at any
format. If it only works for one film, it belongs in that film's props, not the
catalog.

## The contract

Four files, all required:

1. **`src/shots/schemas.ts`** — the Zod schema. Pure data, no React, no Remotion.
   Imported by Node scripts, so it must not pull in the bundler.
2. **`src/shots/catalog.ts`** — metadata: id, label, category, description,
   default duration, schema, and `hints` (one or two lines the agent will read).
3. **`src/shots/<category>-shots.tsx`** — the component, exported.
4. **`src/shots/defs.ts`** — wire the component to the catalog entry.

Then `npm run gallery` renders it. If it does not appear there, it does not exist.

```ts
// 1. schemas.ts
export const dialSchema = z.object({
  value: z.number().min(0).max(100),
  label: z.string().default(''),
  ticks: z.number().int().min(2).max(20).default(10),
});

// 2. catalog.ts
{
  id: 'dial',
  label: 'Dial',
  category: 'data',
  description: 'A single value on an arc, with tick marks.',
  defaultDurationInFrames: 66,
  schema: S.dialSchema,
  hints: 'One value per scene. Pair with bar-chart for context.',
}

// 3. data-shots.tsx
type DialProps = z.infer<typeof dialSchema>;
export const Dial: React.FC<{ props: DialProps; ctx: ShotContext }> = ({ props, ctx }) => { … };

// 4. defs.ts
dial: Dial as never,
```

## Non-negotiables inside a shot

- **Pure function of frame.** `useCurrentFrame()` + props only. No state, no
  effects, no `Math.random`, no `Date`.
- **Render inside `<Frame ctx={ctx}>`** — it owns the ground, grain and vignette.
- **Layout via `<SceneBody>`** — it owns safe margins, vertical centering and the
  caption reserve. Do not position against raw `safe.top + safe.height * 0.3`;
  that is what made the first version of the layout shots float in the upper
  third of a 9:16 frame.
- **Type via `<Text>` / `<RichReveal>`**, never a hardcoded font family + size.
  Sizes come from `typeScaleFor(theme, width, height)`.
- **Colors from `ctx.theme.colors`.** A literal hex is a bug unless it is a
  `rgba()` overlay.
- **Motion from `EASE`.** Entrances use `EASE.out`; camera moves `EASE.inOut`.
  If you need a curve that isn't there, add it to `ease.ts` so the whole studio
  shares it.
- **Take width/height from `ctx`**, never assume 1080×1920. Test at `reel` and
  `wide`.
- **Hold the landing.** After the last element arrives, leave ≥ 20 frames of rest.

## Layout in 9:16

The frame is tall and narrow. Rules that keep it from looking like a document:

- Content is optically centered, not top-anchored.
- One column. Side-by-side comparisons stack vertically (`compare-split` does this
  automatically from `ctx.height > ctx.width`).
- Body copy is bumped ~14% on vertical formats (`typeScaleFor` handles it).
- Reach for width: rules, full-bleed panels, footage. Empty side margins at 9:16
  read as an exported slide deck.
- Captions reserve ~2.6 caption-lines of bottom space; `SceneBody` subtracts it.

## Adapting from the shot library

`library/shotcraft/` holds 126 recipe cards and 158 tuned demos (Apache-2.0).

**Process:**

1. Find the card: `library/shotcraft/gallery/library.json` is the index.
   Filter by `energy`, `use`, or category folder.
2. Read the card fully — it carries parameters, ratios and known pitfalls.
3. Read the exact demo the card names in `library/shotcraft/demos/…`. The card
   is the idea; the demo is the tuning. Copy the *timing ratios*, not the styling.
4. Rewrite it against the studio's primitives: `Frame`, `SceneBody`, `Text`,
   `EASE`, `theme.colors`. Drop the demo's `Look`/`Polish`/`Brand` imports
   entirely — those carry another brand's tokens.
5. Keep the card's "known pitfalls" — those were paid for in revision cycles.
   In particular: do not split a multi-channel reveal across separate easings.
6. Register it, add sample props to `SAMPLE_PROPS` in `src/Gallery.tsx`, render.

**Legal/ethical line:** the library is explicitly "technique reference,
re-implemented from scratch". Do not copy another studio's visual identity,
wordmark, or a distinctive frame composition. Take the *motion grammar*; supply
the studio's own look. If a card's demo is visually inseparable from a known
brand, do not adapt it.

## Debugging a shot

| Symptom | Likely cause |
|---|---|
| Content in the top third | positioning against `safe.height * fraction` instead of `SceneBody` |
| Stray bars / detached lines | a connector sized in absolute px instead of flexing with the row |
| Text clipped on the right | `whiteSpace: nowrap` plus a long prop |
| Element invisible | `opacity: p` where `p` never reaches 1 (duration shorter than start) |
| Everything overflows on 16:9 | hardcoded px instead of `typeScaleFor` / `ctx.width` |
| Flickers between renders | non-determinism: `Math.random`, `Date`, or array index as a key in a reordering list |
| Grain looks noisy | `theme.texture.grain` too high; 0.10–0.18 is the range |

## Checklist before you call a shot done

- [ ] Rendered in `reel` **and** `wide`
- [ ] Looked at a still at ~20%, ~60% and 100% of its duration
- [ ] No hardcoded color, font family, or frame size
- [ ] Last element holds ≥ 20 frames
- [ ] Props schema has `.default()` on everything optional, so an episode can pass `{}`
- [ ] `hints` tells the next agent what to watch out for
- [ ] `npm run gallery` includes it and it looks right there
