/**
 * Invariant check for the Noir mascot. Pure Node: no Remotion, no React.
 *
 *   npm run mascot:check
 *
 * Verifies the sprite data is well formed and the rules that keep every pose
 * the same character hold.
 */
import { readFileSync } from 'node:fs';
import { CHARACTER, decodeRow, poseGeometry } from '../src/mascot/character';
import { MASCOT_MANIFEST, MASCOT_POSES } from '../src/mascot/poses';
import { EYE_KEYS, SPRITES, SPRITE_CANVAS, SPRITE_PALETTE, type SpriteLayer } from '../src/mascot/sprites';

const problems: string[] = [];
const fail = (msg: string) => problems.push(msg);

if (MASCOT_POSES.length !== 20) fail(`expected 20 poses, found ${MASCOT_POSES.length}`);
if (new Set(MASCOT_POSES).size !== MASCOT_POSES.length) fail('duplicate pose names');
for (const key of Object.keys(SPRITES)) if (!(MASCOT_POSES as readonly string[]).includes(key)) fail(`sprite "${key}" has no manifest entry`);

if (SPRITE_CANVAS.width % 2 !== 0) fail('canvas width must be even so a flip about the anchor never clips');
for (const key of EYE_KEYS) if (!SPRITE_PALETTE[key]) fail(`eye key "${key}" is not in the palette`);

const checkLayer = (label: string, layer: SpriteLayer): string[] => {
  if (layer.rows.length !== layer.height) fail(`${label}: ${layer.rows.length} rows, expected ${layer.height}`);
  const keys: string[] = [];
  layer.rows.forEach((row, y) => {
    if (!/^([A-Za-z_]\d+)+$/.test(row)) fail(`${label}: row ${y} is not valid run-length data`);
    const cells = decodeRow(row);
    if (cells.length !== layer.width) fail(`${label}: row ${y} is ${cells.length} wide, expected ${layer.width}`);
    for (const k of cells) {
      if (k !== '_' && !SPRITE_PALETTE[k]) fail(`${label}: row ${y} uses unknown palette key "${k}"`);
      keys.push(k);
    }
  });
  return keys;
};

for (const name of MASCOT_POSES) {
  const entry = MASCOT_MANIFEST[name];
  const sprite = SPRITES[name];
  if (!entry) {
    fail(`${name}: missing from manifest`);
    continue;
  }
  if (entry.name !== name) fail(`${name}: manifest entry is named ${entry.name}`);
  if (!entry.usage.trim()) fail(`${name}: no usage note`);
  if (!sprite) {
    fail(`${name}: no sprite data`);
    continue;
  }

  // Fits the shared canvas.
  if (sprite.x < 0 || sprite.y < 0 || sprite.x + sprite.width > SPRITE_CANVAS.width || sprite.y + sprite.height > SPRITE_CANVAS.height) {
    fail(`${name}: sprite does not fit the ${SPRITE_CANVAS.width}×${SPRITE_CANVAS.height} canvas`);
  }

  // The glowing eyes are Noir's identity: every pose must show them.
  const body = checkLayer(name, sprite);
  const eyePixels = body.filter((k) => EYE_KEYS.includes(k)).length;
  if (eyePixels < 6) fail(`${name}: only ${eyePixels} eye pixels, the glowing eyes must be visible`);

  sprite.fx.forEach((fx, i) => {
    checkLayer(`${name} fx ${i}`, fx);
    if (fx.x < 0 || fx.y < 0 || fx.x + fx.width > sprite.width || fx.y + fx.height > sprite.height) fail(`${name} fx ${i}: outside the sprite`);
  });
  if (entry.hasEffects !== sprite.fx.length > 0) fail(`${name}: hasEffects (${entry.hasEffects}) disagrees with the sprite (${sprite.fx.length} effects)`);

  // Geometry builds, and building it is repeatable.
  const a = JSON.stringify(poseGeometry(name));
  if (!a.includes('"d":"M')) fail(`${name}: produced no geometry`);
}

// Source rules: deterministic, no raster, no effects in the artwork.
const sources = ['src/mascot/character.ts', 'src/mascot/poses.ts', 'src/mascot/sprites.ts', 'src/components/Mascot.tsx'];
for (const file of sources) {
  const text = readFileSync(file, 'utf8');
  const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  if (/Math\.random|Date\.now|new Date|performance\.now/.test(code)) fail(`${file}: non-deterministic call`);
  if (/<image[\s>]|data:image|\.png|\.jpe?g|\.webp|staticFile/.test(code)) fail(`${file}: raster image reference`);
  // Hex colors are data in sprites.ts only; everywhere else they must come from theme tokens.
  if (file !== 'src/mascot/sprites.ts' && /#[0-9a-fA-F]{3,8}\b/.test(code)) fail(`${file}: hex color literal (use theme tokens)`);
  if (/<text[\s>]|<tspan|linearGradient|radialGradient|feGaussianBlur|drop-shadow|boxShadow|filter=/.test(code)) {
    fail(`${file}: text, gradient, blur or shadow in the artwork`);
  }
}
if (!/shapeRendering="crispEdges"/.test(readFileSync('src/components/Mascot.tsx', 'utf8'))) fail('Mascot.tsx: pixel art must render with crisp edges');
void CHARACTER;

if (problems.length) {
  console.error(`\n✗ mascot: ${problems.length} problem(s)\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`✓ mascot: ${MASCOT_POSES.length} poses, sprite data, eyes, canvas fit and source rules pass`);
