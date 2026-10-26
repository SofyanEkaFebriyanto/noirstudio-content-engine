# fonts/

Local copies of the three brand families. Renders never touch the network —
`src/engine/fonts.ts` loads these with `@remotion/fonts`, which blocks the first
frame until they are ready.

| File | Family | Weights | License |
|---|---|---|---|
| `instrument-serif-regular.woff2` | Instrument Serif | 400 | OFL 1.1 |
| `instrument-serif-italic.woff2` | Instrument Serif | 400 italic | OFL 1.1 |
| `space-grotesk-var.woff2` | Space Grotesk | 300–700 (variable) | OFL 1.1 |
| `jetbrains-mono-var.woff2` | JetBrains Mono | 400–600 (variable) | OFL 1.1 |

`licenses/` holds the full OFL text for each family.

## Adding or replacing a font

1. Download the **woff2** (subset to latin if the family is large).
2. Put it here with a kebab-case name.
3. Register it in `src/engine/fonts.ts` — pass `weight` as a range for variable
   fonts (`'300 700'`), an exact value for static ones.
4. Add the family to the theme's `fonts` map in `src/engine/theme.ts`.
5. Add the license file to `licenses/`.

**Use woff2, not ttf/otf.** The woff2 files here are 20–30 KB each; the
equivalent TTFs are 5–10× larger and slow every render's startup.

Do not add a font you cannot license. If a client supplies one, keep its license
in `licenses/` and note the restriction in the episode's `notes`.
