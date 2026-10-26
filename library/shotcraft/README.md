# Shot library (vendored)

Pinned copy of [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) at `43bd349`.

| Folder | What it is |
|---|---|
| `cards/` | Recipe cards — semantics, parameters, known pitfalls, per category |
| `demos/` | The tuned Remotion implementation each card points at |
| `gallery/` | `library.json` — the searchable index of cards and style variants |
| `aesthetic-rules.md` | The quality bar that shaped these timings |

**How to use it.** Read the card first, then read the exact demo it names. The
card gives you the idea; only the demo source gives you the tuned easing values,
the hold budgets and the pitfalls that were paid for in revision rounds.

**Do not import from here at render time.** These files are reference material:
adapt what you need into `src/shots/` (wrapped in the studio's theme tokens and
layout primitives). That keeps the design system coherent and avoids shipping
code tuned for someone else's brand.

**Licence.** Apache-2.0 — see `LICENSE`. The cards are research-friendly
re-implementations; brand assets in the demos are placeholders. Replace any
brand marks with the studio's own when adapting.

Refresh with `npm run shotcraft -- --update`.
