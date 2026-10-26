/**
 * Font loading. Files live in `public/fonts/` so renders never touch the network.
 * Families are variable fonts; weights are provided as ranges.
 */
import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

export const FONT = {
  display: 'Instrument Serif',
  sans: 'Space Grotesk',
  mono: 'JetBrains Mono',
} as const;

let started = false;

/**
 * Called once at module scope by the Root. loadFont() uses delayRender, so
 * Remotion waits for the files before capturing the first frame.
 */
export function loadBrandFonts(): void {
  if (started) return;
  started = true;

  loadFont({
    family: FONT.display,
    url: staticFile('fonts/instrument-serif-regular.woff2'),
    weight: '400',
    style: 'normal',
  });

  loadFont({
    family: FONT.display,
    url: staticFile('fonts/instrument-serif-italic.woff2'),
    weight: '400',
    style: 'italic',
  });

  loadFont({
    family: FONT.sans,
    url: staticFile('fonts/space-grotesk-var.woff2'),
    weight: '300 700',
    style: 'normal',
  });

  loadFont({
    family: FONT.mono,
    url: staticFile('fonts/jetbrains-mono-var.woff2'),
    weight: '400 600',
    style: 'normal',
  });
}
