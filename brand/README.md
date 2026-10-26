# brand/

Source of truth for how Noir Studio looks, sounds, and moves.

| File | Purpose | Read by |
|---|---|---|
| `brand.json` | Machine-readable tokens: colors, voice rules, motion principles | `src/engine/brand.ts`, the brand skill |
| `BRAND.md` | The human/agent-facing guide | Humans, `.claude/skills/noir-brand` |
| `logo/` | Optional raster/vector exports for places that need a file | External tools |

`src/engine/theme.ts` holds the renderable tokens (`noir`, `paper`, `signal`).
If you change a color in `brand.json`, change the matching theme too — the
`npm run check` output warns when a theme references an unknown key but cannot
compare hex values for you.

## Adding a theme

1. Add an entry to `THEMES` in `src/engine/theme.ts` with every color token filled.
2. Add its name to `THEMES` docs in `CLAUDE.md`.
3. Widen the `theme` enum? No — themes are looked up by string, so a new theme
   needs no schema change.
4. Render the gallery in that theme: `npm run gallery -- --format reel`.

## Logo files

The mark and wordmark are drawn in code and always available. Drop SVG/PNG
exports into `logo/` only when a downstream tool (slides, invoices, a partner's
site) needs a file — never for a render.
