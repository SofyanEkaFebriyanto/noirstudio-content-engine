# library/

Reference material and starting points — not code that renders.

```
library/
├── shotcraft/   vendored motion recipe cards + tuned demos (Apache-2.0)
└── presets/     complete, valid scene lists for common film types
```

## shotcraft/

A pinned copy of [video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft):
126 recipe cards across 10 categories, 158 tuned Remotion demos, and the
gallery index.

| Path | What |
|---|---|
| `shotcraft/cards/<category>/<shot>.md` | the recipe: intent, motion core, parameter table, known pitfalls, exact demo path |
| `shotcraft/demos/<category>/<shot>/<Name>.tsx` | the tuned implementation |
| `shotcraft/gallery/library.json` | searchable index (name, summary, energy, style keys) |
| `shotcraft/aesthetic-rules.md` | the quality bar behind the timings |
| `shotcraft/sound-design.md` | the sound vocabulary |
| `shotcraft/PIN.json` | commit, date, license |

**Read the card, then the demo.** The card gives the idea; only the demo gives
the tuned easing values and hold budgets. The known-pitfalls section is the most
valuable part — those were paid for in revision cycles.

**Never import from `shotcraft/` at render time.** It is reference material with
another brand's tokens baked in. Adapt the motion into `src/shots/`. See
`.claude/skills/noir-shots`.

Refresh: `npm run shotcraft -- --update` (re-pins to the current `main`).
Report: `npm run shotcraft`.

## presets/

Complete scene lists — props, timings, cue sheets and publish metadata — that
pass `npm run check` as written. A preset scaffolds the *structure*; every word
still has to be rewritten for the actual film.

```bash
npm run new -- my-launch --preset launch-30s --title "My Launch"
npm run check -- my-launch
```

| Preset | Runtime | Format | Shape |
|---|---|---|---|
| `launch-30s` | 30 s | reel | result → problem → demo → differentiator → CTA |
| `build-log-45s` | 45 s | reel (signal theme) | state → friction → fix → next → CTA |
| `explainer-90s` | 90 s | wide | hook → tension → reframe → 3 proofs → so-what → CTA |

Preset timings are computed so the *real* film length (after transition overlap)
hits the stated runtime, and cue times are pinned to the actual scene content
starts. If you change a scene's duration, re-run `check` — it will tell you
which cues fell off the end.

A scaffolded episode records its origin in `episodes/<id>/preset.json`.

## Adding a preset

1. Write the JSON with `scenes`, `captions`, `audio` and `publish`.
2. Scaffold it into a throwaway episode: `npm run new -- tmp --preset <id>`
3. `npm run check -- tmp` until clean. Delete the throwaway.
4. Verify the runtime matches the label — transition overlap makes the sum of
   scene durations misleading.

Do not ship a preset that fails `check`. The presets are teaching material: the
first thing a new episode does is copy their shape, so a wrong timing propagates.
