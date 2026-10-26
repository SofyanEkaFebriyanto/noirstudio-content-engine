# audio/pack/

The studio's sound vocabulary. One file per role, named `<role>.mp3`.

Episodes reference a role by id:

```ts
audio: {
  cues: [{ at: 2.4, cue: 'impact', volume: 0.55 }],
  music: [{ src: 'bed-tension', volume: 0.26, loop: true }],
}
```

## Two ways to fill it

| Command | Result |
|---|---|
| `npm run audio -- --generate-pack` | ElevenLabs Sound Effects, production quality, needs a key and credits |
| `npm run audio -- --tone-pack` | ffmpeg tones, offline, **placeholders only** |

The tone pack exists so the pipeline (mix, captions, publish) can be tested with
zero credentials. Its manifest says so explicitly. **Never publish a film scored
with the tone pack** — `npm run audio -- --list` shows the license of each entry.

## The roles

| Role | Character | Typical placement |
|---|---|---|
| `whoosh-soft` | airy swish | scene change, camera move |
| `whoosh-fast` | tight, bright | fast cut |
| `swoosh-quick` | small UI swish | element arrival |
| `impact` | deep braam, short tail | a claim lands |
| `riser` | 3 s building tension | before a reveal |
| `sparkle` | glassy shimmer | logo, success |
| `pop` | soft rounded blip | list item |
| `click` | dry mechanical | precision beat |
| `type` | quiet keyboard | typing reveal |
| `transition-snap` | warm analog stop | hard cut |
| `transition-soft` | paper rustle | soft cut |
| `bed-tension` | low pulsing drone, loopable | music bed |

Roles are a contract: any episode can reference any role, so replacing a file
keeps every past film working. **Change the file, not the id.**

## Adding a cue outside the vocabulary

Use a `path:` prefix to point at any file in `public/`:

```ts
{ at: 12.4, cue: 'path:episodes/my-episode/sfx/door.mp3' }
```

That file is then *not* covered by the role contract — it is that episode's
business.

## Specs

- mp3, 44.1 kHz, stereo, 128–192 kbps
- Cues under 3 s; beds loop cleanly (crossfade the tail into the head)
- Normalize each cue to roughly −18 LUFS so relative `volume` values mean
  something across the pack

## Provenance

Every generated cue records its prompt, model and license in
`src/generated/audio-pack.json`. That is what makes commercial use auditable
later. Keep it accurate — if you drop in a file from elsewhere, add an entry with
its real source and license, or do not ship it.
