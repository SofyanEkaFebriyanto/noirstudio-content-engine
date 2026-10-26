/**
 * Themes — the visual contract. A shot never hardcodes a color or font; it
 * reads tokens from here. Add a theme by adding an entry, not by forking shots.
 */
import { FONT } from './fonts';
import type { FormatId } from './spec';

export type ThemeColors = {
  /** Page ground. */
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  line: string;
  lineStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  /** Text color that sits ON the accent. */
  accentInk: string;
  accentSoft: string;
  accentAlt: string;
  success: string;
  warning: string;
  danger: string;
};

export type Theme = {
  id: string;
  label: string;
  /** Dark themes set true so shots can auto-pick shadow vs glow. */
  dark: boolean;
  colors: ThemeColors;
  fonts: { display: string; sans: string; mono: string };
  motion: {
    /** Entrance duration in frames @30fps for ordinary elements. */
    fast: number;
    base: number;
    slow: number;
    stagger: number;
    spring: { damping: number; stiffness: number; mass: number };
  };
  texture: {
    /** 0–1; 0 disables the grain layer. */
    grain: number;
    vignette: number;
    /** Adds a faint scanline/ruled texture. */
    scanlines: boolean;
  };
  type: {
    scale: Record<'display' | 'title' | 'heading' | 'body' | 'caption' | 'micro', number>;
    tracking: Record<'display' | 'title' | 'heading' | 'body' | 'caption' | 'micro', number>;
    lineHeight: Record<'display' | 'title' | 'heading' | 'body' | 'caption' | 'micro', number>;
  };
  /** Safe margins as a fraction of the shorter side. */
  safe: { x: number; top: number; bottom: number };
};

const typeBase = {
  scale: { display: 168, title: 96, heading: 64, body: 38, caption: 28, micro: 22 },
  tracking: { display: -0.03, title: -0.02, heading: -0.01, body: -0.005, caption: 0.01, micro: 0.14 },
  lineHeight: { display: 0.92, title: 0.98, heading: 1.05, body: 1.35, caption: 1.3, micro: 1.2 },
};

export const THEMES: Record<string, Theme> = {
  noir: {
    id: 'noir',
    label: 'Noir — charcoal, bone, gold',
    dark: true,
    colors: {
      // Sampled from brand/logo/noir-studio.png: #141414 ground, #f2a41f gold.
      bg: '#141414',
      bgAlt: '#191919',
      surface: '#1d1d1d',
      surfaceAlt: '#242424',
      line: 'rgba(242,241,234,0.18)',
      lineStrong: 'rgba(242,164,31,0.55)',
      text: '#f4f1ea',
      textMuted: '#a9a49a',
      textFaint: '#6b6760',
      accent: '#f2a41f',
      accentInk: '#1a1204',
      accentSoft: 'rgba(242,164,31,0.14)',
      accentAlt: '#e8c97a',
      success: '#9fbf6a',
      warning: '#f2a41f',
      danger: '#e0523c',
    },
    fonts: { display: FONT.display, sans: FONT.sans, mono: FONT.mono },
    motion: {
      fast: 14,
      base: 22,
      slow: 34,
      stagger: 4,
      spring: { damping: 22, stiffness: 120, mass: 0.8 },
    },
    texture: { grain: 0.16, vignette: 0.55, scanlines: false },
    type: typeBase,
    safe: { x: 0.062, top: 0.075, bottom: 0.11 },
  },

  paper: {
    id: 'paper',
    label: 'Paper — bone, ink, bronze',
    dark: false,
    colors: {
      bg: '#f2eee6',
      bgAlt: '#e9e3d7',
      surface: '#fbf8f2',
      surfaceAlt: '#e4ddcf',
      line: 'rgba(19,17,15,0.16)',
      lineStrong: 'rgba(19,17,15,0.4)',
      text: '#13110f',
      textMuted: '#5f5b53',
      textFaint: '#8b857a',
      accent: '#8f5405',
      accentInk: '#fbf8f2',
      accentSoft: 'rgba(143,84,5,0.14)',
      accentAlt: '#6b5a2a',
      success: '#3f7a2a',
      warning: '#a86700',
      danger: '#a3261c',
    },
    fonts: { display: FONT.display, sans: FONT.sans, mono: FONT.mono },
    motion: {
      fast: 14,
      base: 24,
      slow: 36,
      stagger: 4,
      spring: { damping: 24, stiffness: 110, mass: 0.9 },
    },
    texture: { grain: 0.1, vignette: 0.18, scanlines: false },
    type: typeBase,
    safe: { x: 0.062, top: 0.075, bottom: 0.11 },
  },

  signal: {
    id: 'signal',
    label: 'Signal — void, lime, mono',
    dark: true,
    colors: {
      bg: '#050605',
      bgAlt: '#0a0d09',
      surface: '#0f140e',
      surfaceAlt: '#161d15',
      line: 'rgba(214,255,63,0.16)',
      lineStrong: 'rgba(214,255,63,0.4)',
      text: '#eef7e6',
      textMuted: '#9aae8c',
      textFaint: '#5d6b56',
      accent: '#c8d94f',
      accentInk: '#0f1206',
      accentSoft: 'rgba(200,217,79,0.14)',
      accentAlt: '#f2a41f',
      success: '#9fe870',
      warning: '#ffd166',
      danger: '#ff5a4d',
    },
    fonts: { display: FONT.sans, sans: FONT.sans, mono: FONT.mono },
    motion: {
      fast: 10,
      base: 18,
      slow: 28,
      stagger: 3,
      spring: { damping: 18, stiffness: 160, mass: 0.7 },
    },
    texture: { grain: 0.22, vignette: 0.6, scanlines: true },
    type: typeBase,
    safe: { x: 0.062, top: 0.075, bottom: 0.11 },
  },
};

export const DEFAULT_THEME = 'noir';

export function getTheme(id: string, overrides?: Record<string, unknown>): Theme {
  const base = THEMES[id];
  if (!base) {
    throw new Error(`Unknown theme "${id}". Available: ${Object.keys(THEMES).join(', ')}`);
  }
  if (!overrides) return base;
  return deepMerge(base, overrides as Partial<Theme>) as Theme;
}

function deepMerge<T>(base: T, patch: unknown): T {
  if (patch === null || patch === undefined) return base;
  if (Array.isArray(base) || typeof base !== 'object' || typeof patch !== 'object') {
    return patch as T;
  }
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    out[key] = key in out ? deepMerge(out[key], value) : value;
  }
  return out as T;
}

/**
 * Scale the reference type scale to the actual composition.
 *
 * The reference design is 1080 wide. Vertical films (9:16) read at arm's
 * length on a phone, so body copy gets a deliberate bump — matched to width
 * alone it looks like a document, not a film.
 */
export function typeScaleFor(theme: Theme, width: number, height?: number) {
  const k = width / 1080;
  const vertical = height ? height / width > 1.5 : false;
  const bodyK = vertical ? k * 1.14 : k;
  const captionK = vertical ? k * 1.1 : k;
  return {
    display: theme.type.scale.display * k,
    title: theme.type.scale.title * k,
    heading: theme.type.scale.heading * k,
    body: theme.type.scale.body * bodyK,
    caption: theme.type.scale.caption * captionK,
    micro: theme.type.scale.micro * captionK,
  };
}

/**
 * Where captions sit, and how big they are.
 *
 * Vertical feeds reserve roughly the bottom 13.5% of the frame for platform
 * chrome (caption text, action rail, progress bar). Captions placed at the
 * design margin are covered by the app on TikTok and Reels, so the vertical
 * band is lifted and the type is enlarged — captions are read at a glance,
 * often muted, always at arm's length.
 */
export function captionBand(theme: Theme, width: number, height: number) {
  const vertical = height / width > 1.5;
  const scale = typeScaleFor(theme, width, height);
  return {
    bottomOffset: vertical ? height * 0.135 : Math.min(width, height) * 0.06,
    fontSize: scale.caption * (vertical ? 1.5 : 1.12),
  };
}

/**
 * Bottom offset for a scene's own footer (footnote rules, progress dots,
 * handles). It clears the caption band so the two never collide — a shot that
 * invents its own `safe.bottom + n%` lands in the caption's lap.
 *
 * Pass `captions: false` for a film exported without captions.
 */
export function footerAnchor(
  theme: Theme,
  width: number,
  height: number,
  captions = true,
): number {
  const safe = safeArea(theme, width, height);
  if (!captions) return safe.bottom;
  const band = captionBand(theme, width, height);
  // Caption block + its padding + a little air.
  const captionTop = band.bottomOffset + band.fontSize * 1.9;
  return Math.max(safe.bottom, captionTop + band.fontSize * 0.6);
}

export function safeArea(theme: Theme, width: number, height: number) {
  const short = Math.min(width, height);
  return {
    x: theme.safe.x * short,
    top: theme.safe.top * short,
    bottom: theme.safe.bottom * short,
    /** Usable inner box. */
    width: width - theme.safe.x * short * 2,
    height: height - theme.safe.top * short - theme.safe.bottom * short,
  };
}

export type ShotContext = {
  theme: Theme;
  format: FormatId;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  sceneId: string;
  episodeId: string;
  /** Resolve a `media:<id>` reference to a staticFile URL. */
  media: (id: string) => string;
  /** Resolve an audio pack id to a staticFile URL. */
  audio: (id: string) => string;
};

export type ShotComponent<TProps> = React.FC<{ props: TProps; ctx: ShotContext }>;
