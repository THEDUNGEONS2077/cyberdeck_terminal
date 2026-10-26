/**
 * src/lib/palettes.ts: the colour palettes (SYSTEM ▸ APPEARANCE ▸ PALETTE).
 *
 * Layer: lib (pure data and maths). A palette is the handful of base
 * colours theme.css's tokens are built from; everything else (glows,
 * tints, rules, scanlines) is mixed from these in theme.css, so changing
 * the palette recolours the whole UI. Wallpapers read the same tokens, so
 * any wallpaper works with any palette (user's choice, 2026-10-23).
 *
 * The rule from the design system holds for every palette: every text
 * colour (dim, text, accent, bright) passes WCAG AA (4.5:1) on every
 * background it's drawn on (bg, surface, raised), and bright text on the
 * wash. A unit test checks it.
 */

/** A palette's base colours (`#rrggbb`), by token. */
export interface PaletteColors {
  /** --bg: the page behind everything. */
  bg: string;
  /** --surface and --surface-raised: panels, and panels on panels. */
  surface: string;
  surfaceRaised: string;
  /** --line: frames and rules; --line-lit: a lit frame (the accent at ~35% over black, as a solid colour). */
  line: string;
  lineLit: string;
  /** --xp-wash: a selected thing's background. */
  wash: string;
  /** --text-dim, --text, --accent, --text-bright: text, in rising importance. */
  textDim: string;
  text: string;
  accent: string;
  /** --accent-deep: the accent's dark end (gauges). */
  accentDeep: string;
  textBright: string;
  /** --cool: a second, contrasting hue for two-tone wallpapers (the neural net's upper half). */
  cool: string;
}

/** The palettes' ids. Stored in layouts: never change one once released. */
export type PaletteId = 'phosphor' | 'amber' | 'ice' | 'neon' | 'blood' | 'azure' | 'synth';

/** A palette: its id, its name in SYSTEM, its colours. */
export interface Palette {
  id: PaletteId;
  label: string;
  colors: PaletteColors;
}

/** Every palette, in the order SYSTEM lists them. PHOSPHOR is the original green. */
export const PALETTES: readonly Palette[] = [
  {
    id: 'phosphor',
    label: 'PHOSPHOR',
    colors: {
      bg: '#000000',
      surface: '#060d08',
      surfaceRaised: '#0b160d',
      line: '#12301a',
      lineLit: '#145907',
      wash: '#092903',
      textDim: '#2b903f',
      text: '#2fb344',
      accent: '#39ff14',
      accentDeep: '#1f8f2c',
      textBright: '#b6ffb0',
      cool: '#1d7f8f',
    },
  },
  {
    id: 'amber',
    label: 'AMBER',
    colors: {
      bg: '#000000',
      surface: '#0d0904',
      surfaceRaised: '#171006',
      line: '#3a2a0e',
      lineLit: '#5a3c06',
      wash: '#291a00',
      textDim: '#a8761c',
      text: '#d29a2a',
      accent: '#ffb000',
      accentDeep: '#a06c00',
      textBright: '#ffe2a8',
      cool: '#2a8a9a',
    },
  },
  {
    id: 'ice',
    label: 'ICE',
    colors: {
      bg: '#000000',
      surface: '#040b0d',
      surfaceRaised: '#071417',
      line: '#0f2f36',
      lineLit: '#075564',
      wash: '#00262c',
      textDim: '#1f8ea3',
      text: '#2db5cc',
      accent: '#1ee8ff',
      accentDeep: '#0a7f8f',
      textBright: '#b9f5ff',
      cool: '#7656ff',
    },
  },
  {
    id: 'neon',
    label: 'NEON',
    colors: {
      bg: '#000000',
      surface: '#0c040b',
      surfaceRaised: '#160714',
      line: '#3a1033',
      lineLit: '#5c0a4c',
      wash: '#2a0024',
      textDim: '#cc4fb0',
      text: '#ea6ad0',
      accent: '#ff3fdc',
      accentDeep: '#9a1a82',
      textBright: '#ffc6f2',
      cool: '#3a6bff',
    },
  },
  {
    id: 'blood',
    label: 'BLOOD',
    colors: {
      bg: '#000000',
      surface: '#0d0405',
      surfaceRaised: '#170709',
      line: '#3a1216',
      lineLit: '#5c0a10',
      wash: '#2c0003',
      textDim: '#d4545e',
      text: '#e86a72',
      accent: '#ff3040',
      accentDeep: '#a0181f',
      textBright: '#ffc8cc',
      cool: '#1f6894',
    },
  },
  {
    // Deep blues (made for a wallpaper since removed; kept as a palette).
    id: 'azure',
    label: 'AZURE',
    colors: {
      bg: '#000000',
      surface: '#04080f',
      surfaceRaised: '#08101c',
      line: '#12264a',
      lineLit: '#0b3a7a',
      wash: '#001a40',
      textDim: '#3d84d0',
      text: '#55a2ee',
      accent: '#3ca0ff',
      accentDeep: '#1a5fb0',
      textBright: '#cfe4ff',
      cool: '#0b3c99',
    },
  },
  {
    // Hot pink over teal: HORIZON's reference (2026-10-26), a synthwave sun over a wireframe land.
    id: 'synth',
    label: 'SYNTH',
    colors: {
      bg: '#000000',
      surface: '#0c0408',
      surfaceRaised: '#160710',
      line: '#3a1027',
      lineLit: '#5c0a33',
      wash: '#2a0016',
      textDim: '#d0568c',
      text: '#ee6fa6',
      accent: '#ff3d8b',
      accentDeep: '#a01d55',
      textBright: '#ffd0e2',
      cool: '#2fb8b4',
    },
  },
];

/** The palette ids, in order. */
export const PALETTE_IDS: readonly PaletteId[] = PALETTES.map((p) => p.id);

/** The palette a new layout starts with (the original green). */
export const DEFAULT_PALETTE: PaletteId = 'phosphor';

/** The palette with `id`, or the default one if it's unknown (a layout from a newer build, say). */
export function findPalette(id: string): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

/** Each colour and the CSS custom property it sets (theme.css builds the rest from these). */
export const PALETTE_TOKENS: Readonly<Record<keyof PaletteColors, string>> = {
  bg: '--bg',
  surface: '--surface',
  surfaceRaised: '--surface-raised',
  line: '--line',
  lineLit: '--line-lit',
  wash: '--xp-wash',
  textDim: '--text-dim',
  text: '--text',
  accent: '--accent',
  accentDeep: '--accent-deep',
  textBright: '--text-bright',
  cool: '--cool',
};

/** A `#rrggbb` colour's relative luminance (WCAG 2). */
export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** The WCAG contrast ratio between two `#rrggbb` colours (1 to 21). */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
