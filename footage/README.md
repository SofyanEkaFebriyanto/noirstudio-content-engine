# footage/

Real motion goes here. Everything else in a film is drawn in code; this folder
is the only place external pixels enter.

```
footage/
├── inbox/     raw dumps — screen recordings, phone clips, exports. Git-ignored.
├── source/    curated clips that episodes reference. Committed.
└── contact/   generated contact sheets. Git-ignored.
```

## Workflow

```bash
# 1. drop clips
cp ~/Downloads/take-04.mp4 footage/inbox/

# 2. make contact sheets — see what you actually have
npm run footage

# 3. promote the keeper with a stable id
mv footage/inbox/take-04.mp4 footage/source/dashboard-scroll.mp4

# 4. reference it from an episode
#    { id: 'demo', shot: 'footage-fill', props: { src: 'dashboard-scroll', … } }

# 5. let sync hardlink it into public/ so Remotion can serve it
npm run sync
```

## Naming

The media id is the **filename without extension**. It must be stable — episodes
reference it, and renaming it breaks them.

| Good | Bad | Why |
|---|---|---|
| `dashboard-scroll` | `Screen Recording 2026-10-24 at 14.32.11.mov` | spaces, dates, unpredictable |
| `hero-card-closeup` | `final-FINAL-v3` | version churn leaks into the spec |
| `bts-keyboard` | `IMG_4821` | opaque |

Use `episodes/<id>/media.json` to map an id to a file living elsewhere:

```json
{
  "dashboard-scroll": "/Users/sofyan/Footage/2026-10/dash-main.mp4"
}
```

## Specs that matter

| Property | Target | Why |
|---|---|---|
| Resolution | ≥ 1080 on the short side | 4K is fine but slows the render |
| Frame rate | any; 24–60 | Remotion resamples |
| Codec | H.264 / H.265 / ProRes | VP9 works but is slower |
| Length | trim before import | a 4-minute clip for a 4-second shot wastes I/O |
| Audio | usually removed | footage shots are muted; sound comes from the cue pack |

## Contact sheets

`npm run footage` writes `footage/contact/<id>.jpg` — a grid of frames every
3 seconds. That sheet is how you choose a `trimStart` without opening a player,
and it is what an agent reads when it storyboards a footage shot.

```bash
npm run footage -- --every 1.5 --cols 5     # denser sheet
npm run footage -- --sheet dashboard-scroll # one clip
```

## Privacy and rights

- **Never commit client material**, screen recordings with real names, or
  anything under NDA. `footage/inbox/` is git-ignored for that reason; keep
  sensitive source out of `source/` too.
- Blur or replace personal data before it enters a film. A render is a
  publication.
- Stock footage: record the license and source in the episode's `notes` or a
  `CREDITS.md` next to the clip. If you cannot name the license, do not ship it.
- AI-generated footage: note the model and prompt, same as audio.

## Missing clips are not fatal

A footage shot with no matching file renders a labelled placeholder — a dashed
box reading `footage missing` with the id. That is deliberate: it lets the film
be reviewed end to end before the b-roll exists, and it makes a missing asset
impossible to miss.
