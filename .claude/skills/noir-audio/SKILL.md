---
name: noir-audio
description: Sound for Noir episodes — ElevenLabs narration with word alignment, captions derived from it, the cue pack, music beds, and loudness mastering. Use when adding or fixing narration, VO timing, captions, music, sound effects, or when the mix sounds wrong. Indonesian triggers: "bikin suara", "narasi", "caption", "musiknya", "sound effect".
---

# Sound

Sound is a **timeline asset, not a scene asset.** No shot contains audio. All of
it is declared in the episode's `voice`, `captions` and `audio` blocks.

## The chain

```
episode.voice.segments[]     ← the words
        │ npm run vo
        ├── public/episodes/<id>/vo/<segment>.mp3
        └── public/episodes/<id>/vo/alignment.json   ← word timings
                │ npm run sync
                ├── places each segment on the timeline (scene start + lead-in)
                └── builds caption lines from the word timings
                        │ npm run render
                        └── VoiceLayer + Captions in the film
```

Three rules that follow from that chain:

1. **Change narration → re-run `vo` *and* `sync`.** Editing the text without
   re-synthesizing leaves stale alignment and captions that drift.
2. **Captions are never hand-timed.** They come from the alignment. If they are
   wrong, the VO is wrong.
3. **Cue times are film-absolute.** Adding frames to an early scene moves every
   later cue. Re-run `check`; it fails on out-of-range cues and warns on gaps.

## Narration

```ts
voice: {
  voiceId: 'XXX',                     // or ELEVENLABS_VOICE_ID in .env
  modelId: 'eleven_multilingual_v2',  // timestamps required
  languageCode: 'id',                 // optional; not supported by multilingual_v2
  settings: { stability: 0.5, similarityBoost: 0.75, style: 0, speed: 1 },
  segments: [
    { id: 'promise-1', scene: 'promise', text: '…', leadInFrames: 10 },
  ],
}
```

- **`eleven_multilingual_v2` is the default because it returns alignment.**
  Models without alignment produce no captions. Flash is cheaper but check that
  it returns timestamps before switching.
- **Speed:** keep at 1.0. 1.05–1.1 is tolerable for a tight cut; above that it
  sounds rushed and the alignment gets less accurate.
- **Stability:** 0.45–0.55 for narration. Lower is more expressive but less
  consistent across segments; the same voice will drift between takes.
- **Segment length:** 8–16 words. Long segments make captions into paragraphs
  and force the scene to hold too long. Split the thought.
- **Write segments in scene order.** The list reads like the film. Placement is
  by scene so the order does not change the result, but a list that jumps
  around makes the file harder to review and hides placement mistakes.
- **One speaker per film.** Dialogue needs a different pipeline.
- **A short scene cannot hold a long line.** Narration starts at the scene's
  content start plus `leadInFrames`, so a 2.5 s scene with a 2 s line leaves
  no air. Lengthen the scene rather than speeding up the voice.

### Pacing math

| Scene length | Words available (at 2.5 wps, 0.3 s lead-in) |
|---|---|
| 2 s (60 f) | 4 |
| 3 s (90 f) | 6 |
| 4 s (120 f) | 9 |
| 5 s (150 f) | 11 |
| 7 s (210 f) | 16 |

`check` estimates with `words / 2.55 + 0.18` and warns when a segment will not
fit. It is an estimate — `vo` measures the real audio and warns again with the
true duration. Trust the second warning.

### Voice selection

```bash
npm run vo -- --list                # every voice with id and labels
npm run vo -- <episode> --voice "Name"
```

Pick by **use case label** (`narration`, `documentary`), not by name vibes. For
Noir's register: calm, low-mid, unhurried, no upward inflection at sentence ends.

## Captions

```ts
captions: { mode: 'words', style: 'kinetic', windowWords: 5 }
```

| Mode | Behavior |
|---|---|
| `words` | Groups of `windowWords`, broken at sentence ends |
| `lines` | One line per segment |
| `off` | No captions (never for social — most viewing is muted) |

`style: 'kinetic'` dims words that are already spoken. It uses a linear
interpolation across the caption, which is an approximation — for exact word
highlighting, set `windowWords: 1` or extend `Captions.tsx` to read per-word
timings (they are already in the alignment).

For copy with no narration (e.g. a text-only film), use `captions.extra` with
explicit frame numbers.

## Cue pack

Files in `public/audio/pack/<id>.mp3`. Generate a starter pack:

```bash
npm run audio -- --generate-pack     # ElevenLabs Sound Effects, one file per role
npm run audio -- --list
```

The twelve roles (`src/engine/audio.ts`):

| Role | Use |
|---|---|
| `whoosh-soft`, `whoosh-fast`, `swoosh-quick` | scene changes, element arrivals |
| `impact` | a claim lands |
| `riser` | before a reveal |
| `sparkle` | logo, success beat |
| `pop`, `click` | list items, precision beats |
| `type` | typing reveals |
| `transition-snap`, `transition-soft` | hard cut / soft cut |
| `bed-tension` | music bed |

**Cue density:** roughly one cue per 1.5–2.5 seconds, and never two cues within
0.25 s unless it is a deliberate flam. Silence is a cue too — leave the last
second clean so the film can breathe.

**Pin to the action, not the beat.** If a panel lands on frame 42, the cue goes
at 1.4 s, not at the nice round 1.5 s.

## Music

```ts
audio: {
  music: [{ src: 'bed-tension', volume: 0.26, loop: true, fadeInFrames: 30, fadeOutFrames: 50 }],
}
```

- Beds sit at **0.22–0.32**. Above 0.4 the narration stops being intelligible.
- Always fade in and out. A bed that starts at full volume sounds like a mistake.
- Loop is fine for a bed. Never loop a melodic track with a clear ending.
- Generate with ElevenLabs: `POST /v1/music`, `force_instrumental: true`. The
  `script/audio.ts` starter pack hardcodes `bed-tension` as a 30 s loop.

## Mastering

`npm run render` runs `loudnorm` when `audio.master` is set (default −14 LUFS,
−1.5 dBTP). `npm run master` re-runs it on the delivered file and generates the
vertical/square crops.

- −14 LUFS is the social target. Do not chase −9 "loudness"; platforms
  normalize down and you lose the dynamics.
- `master: false` skips normalization — only for a stem you will mix elsewhere.

## Mix balancing (in order)

1. **Narration first.** Set voice to 0 dB and mix everything under it.
2. **Cues second.** They should be audible but never mask a consonant. −6 to
   −10 dB under the voice.
3. **Music last.** It is the floor, not a track. If you can hum it after the
   film ends, it was too loud.
4. **Listen on a phone speaker.** That is where most of the audience is. If the
   narration is not clear there, nothing else matters.

## Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Captions empty | no VO and no `extra` | add VO or explicit extra lines |
| Captions drift from voice | edited `voice.segments` without re-running `vo`/`sync` | re-run both |
| Caption shows the next line too early | line's hold ran past the next line's start | fixed by caption trimming; re-run `sync` |
| Two segments play at once | a short scene pushed one into the next | lengthen the scene; `check` now errors on overlap |
| VO cut off mid-word | segment longer than its scene | shorten text or lengthen scene |
| VO starts on the transition | `leadInFrames` too small | raise to ≥ 10, or place on the next scene |
| Cue plays on the wrong beat | absolute cue time vs changed scene lengths | re-derive from `check` output |
| Silent film | empty audio pack | `npm run audio -- --generate-pack` |
| Mix clips | overlapping loud cues | lower cue volume, not the master |
| 401 from ElevenLabs | missing/invalid key | `.env` → `ELEVENLABS_API_KEY` |
| 422 from ElevenLabs | empty text or invalid voice id | check segment text and voice id |
