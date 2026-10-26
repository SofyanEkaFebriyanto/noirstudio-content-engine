/**
 * Asset resolution.
 *
 * Episode media is hardlinked into `public/episodes/<id>/media/` by
 * `npm run sync`, so Remotion's staticFile() can serve it. This module maps
 * logical ids from the spec to those URLs, with loud errors on misses.
 */
import { staticFile } from 'remotion';

/** Resolved at build time by script/sync.ts and injected as a prop. */
export type MediaManifest = Record<string, string>;

export function mediaUrl(manifest: MediaManifest, id: string): string {
  const value = manifest[id];
  if (!value) {
    const known = Object.keys(manifest).sort();
    throw new Error(
      `Unknown media id "${id}". Available for this episode: ${known.length ? known.join(', ') : '(none — run npm run sync)'}`,
    );
  }
  return staticFile(value);
}

export function audioUrl(id: string): string {
  if (id.startsWith('path:')) return staticFile(id.slice('path:'.length));
  // Pack ids resolve to the vendored pack in public/audio/pack/.
  return staticFile(`audio/pack/${id}.mp3`);
}

/** File extension → whether it is a video we can hand to Remotion's <Video>. */
export function isVideoFile(path: string): boolean {
  return /\.(mp4|mov|webm|mkv|m4v)$/i.test(path);
}

export function isImageFile(path: string): boolean {
  return /\.(png|jpe?g|webp|avif)$/i.test(path);
}
