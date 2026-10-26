---
name: noir-script
description: Write the script and scene plan for a Noir Studio episode before any code — structure, cold open, narration, on-screen copy, and the scene-by-scene shot map. Use when the user gives a topic or says "write an episode about X", "storyboard this", "buat naskah", or asks to turn an idea into a film. Produces episodes/<id>/SCRIPT.md plus the scene list that becomes episode.ts.
---

# Writing an episode

The script is the expensive decision. Animation is mechanical once the script is
right, and worthless if it isn't.

## Non-negotiables

1. **One idea per film.** If you cannot say the film in one sentence, it is
   two films. That sentence is `logline`.
2. **The first 2 seconds earn the next 40.** No logo-first opens unless the film
   is under 15 s.
3. **Every claim is shown.** If a scene asserts a number, the same scene or the
   next must display it. No unsupported adjectives.
4. **Narration is written to be spoken**, not read: contractions, short
   sentences, no clause stacking.
5. **Copy ≠ narration.** The voice track and the on-screen text do different
   jobs. On-screen is compressed; narration carries the connective tissue. Do not
   duplicate one into the other.

## Before drafting

Answer these. If the user did not say, infer from context and state your
assumption in one line — do not ask a question for each.

| Question | Why it matters |
|---|---|
| Who is watching, and what do they already know? | Sets jargon level |
| What should they *do* or *believe* after? | Sets the last scene |
| Where will this run? | Format (9:16 / 16:9), duration budget |
| Is there narration, or is it music-only? | Changes scene density |
| Is there real footage, or is it all generated? | Limits shot choice |
| Any hard content: number, quote, product name? | Must appear verbatim |

## Structure (pick one, then commit)

**A. The explainer** (60–150 s, 16:9 or 9:16)
```
HOOK      a specific, surprising fact — not a greeting
TENSION   why the obvious answer fails
TURN      the reframe, in one sentence
PROOF     2–3 beats of evidence (number, demo, before/after)
SO WHAT   what this means for the viewer
CLOSE     one ask
```

**B. The launch** (30–60 s, 9:16)
```
HOOK      the finished result, first frame
PROBLEM   one line
SHOW      the thing doing its job (footage or demo)
DIFFERENT the one property nobody else has
CLOSE     CTA
```

**C. The build log** (45–90 s, 9:16)
```
STATE     where we are
FRICTION  what broke
FIX       what we changed
NEXT      what is coming
ASK       follow / comment
```

**Cold open options** — write three, pick one, say why:
- **Consequence**: show the bad outcome the film prevents.
- **Question**: a real question the viewer cannot answer, answered later.
- **Contrast**: two frames, before and after, no words.

Never open with: "Hey guys", the logo alone, a definition, or a roadmap.

## Narration rules

- **~2.5 words per second.** A 4-second scene holds about 9 words of speech.
- Target 8–16 words per segment. Split long thoughts into separate segments so
  captions can breathe and scenes can breathe with them.
- Write the number, then say it: `1240` on screen, "twelve hundred" spoken.
- No scene should need the *previous* scene's sentence to make sense — viewers
  arrive mid-scroll.

## On-screen copy rules

- **Title ≤ 6 words.** Subtitle ≤ 9. Labels ≤ 3.
- Use `*word*` to mark the single accent word. One per line, maximum.
- Voice and title never say the same words in the same scene.
- Numbers as numerals on screen, always with the unit (`38%`, `6 h`, `1240+`).

## Deliverable: `episodes/<id>/SCRIPT.md`

```markdown
# <Title>

**Logline:** <one sentence>
**Audience:** <who, and what they know>
**Format:** reel | wide | square | portrait — <why>
**Runtime target:** <seconds>
**Structure:** A | B | C
**Cold open:** <consequence | question | contrast> — <why this one>

## Beat sheet

| # | Scene id | Shot | Seconds | On screen | Narration | Notes |
|---|---|---|---|---|---|---|
| 1 | open | brand-open | 1.8 | ENGINE · EPISODE 01 | — | hold 0.6s |
| 2 | promise | big-statement | 7.0 | Type the *episode*. / The engine does the rest. | Every film starts as one typed file… | one idea |
| … |

## Narration script

### promise-1 (scene: promise)
> Every film in the studio starts as one typed file: scenes, copy, narration, and cues.

## Cue sheet sketch

| at (s) | cue | for |
|---|---|---|
| 0.2 | whoosh-soft | open |
| 2.5 | impact | promise lands |

## What this film deliberately does not do
- <the second idea you cut, and where it goes instead>
```

Then convert the beat sheet into `episode.ts`. Seconds are a *plan*; frames are
the truth — after writing the file, run `npm run check` and read back the real
duration.

## Beat-sheet → episode.ts

| Beat sheet | episode.ts |
|---|---|
| Shot column | `shot:` |
| Seconds | `durationInFrames: Math.round(seconds * fps)` — or omit to inherit |
| On screen | the shot's props (`title`, `lines`, `items`…) |
| Narration | `voice.segments[]` with `scene:` set |
| Cue sheet | `audio.cues[]` with `at:` in seconds |

## Quality bar before handing over

- [ ] Logline fits in one breath
- [ ] First 2 seconds work with the sound off
- [ ] Every scene has exactly one job
- [ ] Narration at 2.5 wps fits its scene, with 0.3 s of lead-in
- [ ] On-screen copy and narration are not the same sentence
- [ ] The last scene asks for exactly one thing
- [ ] You can name what you cut
