/**
 * src/wallpaper/megacity/params.ts: the tunable numbers of the MEGACITY
 * wallpaper: a city of towers at night, seen from a rooftop, a lone figure
 * on the ledge looking out over it.
 *
 * Layer: wallpaper (data only). Reference: the user's image (2026-10-24), a
 * vertical cyberpunk city in blue haze. Matched there:
 *   - towers in depth, the far ones lost in haze (#4263e9 at the top,
 *     blue-violet in the middle, violet #735ef7 low down), the near ones
 *     dark blue; windows as small dashes, mostly pale blue, some violet,
 *     a few pink and white; bright strips down some towers' edges;
 *   - pink neon signs on the middle towers, a few pale billboards far off;
 *   - a figure in silhouette on a dark ledge with a glass railing, left of
 *     the middle, looking down at the city (her outline is our own drawing
 *     of the pose: figure.ts).
 * Its motion is our own: windows going on and off now and then, signs
 * flickering, beacons blinking on the rooftops, drones crossing, haze
 * drifting. Sizes are CSS px of the zoomed layout (types.ts zoomedSize):
 * zoomed in, the towers and windows grow; the figure keeps her place and
 * size on the screen.
 */
import type { GlowLevel } from '@/lib/layout';

/**
 * One layer of towers, far to near: tower width and the gap between towers
 * (CSS px), the chance a tower is left out (the layers behind show through),
 * where its top can be (shares of the screen's height; below 0 is above the
 * screen), its window cells (CSS px) and how much of the haze's colour it
 * takes (fog).
 */
export interface LayerParams {
  width: readonly [number, number];
  gap: readonly [number, number];
  skip: number;
  top: readonly [number, number];
  cell: readonly [number, number];
  fog: number;
}

/** The layers, far to near: the far ones narrow, tall and pale with haze, the near ones wide, lower and dark. */
export const LAYERS: readonly LayerParams[] = [
  { width: [14, 38], gap: [0, 3], skip: 0, top: [-0.35, 0.3], cell: [3, 4], fog: 0.74 },
  { width: [18, 50], gap: [0, 8], skip: 0.1, top: [-0.3, 0.4], cell: [3, 5], fog: 0.62 },
  { width: [22, 62], gap: [0, 14], skip: 0.18, top: [-0.25, 0.5], cell: [4, 5], fog: 0.52 },
  { width: [28, 78], gap: [6, 34], skip: 0.3, top: [-0.2, 0.62], cell: [4, 6], fog: 0.42 },
  { width: [40, 110], gap: [24, 120], skip: 0.45, top: [-0.2, 0.8], cell: [5, 7], fog: 0.28 },
];

/** A tower that steps back: the chance, how wide its upper part is (share), how far above it rises (share of the screen's height). */
export const SETBACK = { chance: 0.3, width: [0.4, 0.75], rise: [0.04, 0.18] } as const;

/** A spire on a tower's roof: the chance (towers whose top is on the screen), how far it rises (share of the screen's height). */
export const SPIRE = { chance: 0.18, rise: [0.03, 0.1] } as const;

/** Neon signs on the middle layers (2, 3): how many per million CSS px², the share that are vertical, their sizes (CSS px), the share in the cool colour. */
export const SIGNS = { perMpx: 10, vertical: 0.6, tall: { w: [12, 20], h: [40, 110] }, wide: { w: [44, 96], h: [14, 24] }, cool: 0.3 } as const;

/** Pale billboards far off (layer 1): how many per million CSS px², their size (CSS px). */
export const BILLBOARDS = { perMpx: 3, w: [30, 70], h: [8, 14] } as const;

/** Beacons blinking on roofs and spires: the chance a roof on the screen has one, how often they blink (s). */
export const BEACONS = { chance: 0.25, period: [1.6, 2.6], on: 0.22 } as const;

/** Drones crossing the city: one per this many CSS px of width (within min–max), their speed (CSS px a second), height (share of the screen), tail and size (CSS px). */
export const DRONES = { per: 220, min: 3, max: 10, speed: [14, 46], y: [0.1, 0.72], tail: [8, 26], size: [1.1, 2] } as const;

/** Patches of haze drifting across: how many, their size (shares of the screen), height, speed (CSS px a second), strength. */
export const HAZE = { count: 3, rx: [0.3, 0.55], ry: [0.05, 0.1], y: [0.2, 0.8], speed: [3, 8], alpha: [0.04, 0.07] } as const;

/** A sign now and then flickers like a failing tube: the wait between (s), how long (s), how fast (Hz). */
export const FLICKER = { every: [6, 25], length: [0.3, 0.8], rate: 14 } as const;

/** How long, on average, a window stays as it is (s): each is re-lit or put out at its own moments, so a few change every second. */
export const WINDOW_PERIOD = 4000;

/** The city's clock wraps after this long (s): a multiple of WINDOW_PERIOD, so the windows carry on seamlessly. */
export const TIME_WRAP = WINDOW_PERIOD * 16;

/**
 * The figure and her ledge, in shares, on a tall screen (the reference's)
 * and a wide one: her height of the screen's, where her feet are (down the
 * screen) and her middle (across it). On a wide screen she stands smaller
 * and lower, her head clear of NAV and its open folders. The ledge runs out
 * past her by `ledgeOut` of her height; the glass railing behind her is
 * `railHeight` of her height, and stops `railEnd` of it before her middle.
 */
export const FIGURE = {
  tall: { height: 0.6, feet: 0.855, x: 0.43 },
  wide: { height: 0.52, feet: 0.875, x: 0.3 },
  ledgeOut: 0.12,
  railHeight: 0.11,
  railEnd: 0.09,
} as const;

/** Per glow level: the windows' halo (0–1), a sign's halo, a light's halo (CSS px). */
export const MEGACITY_GLOW: Record<GlowLevel, { window: number; sign: number; light: number }> = {
  low: { window: 0, sign: 6, light: 4 },
  medium: { window: 0.35, sign: 9, light: 6 },
  high: { window: 0.6, sign: 12, light: 8 },
  max: { window: 1, sign: 16, light: 11 },
};

/** The fastest it redraws (ms between frames): about 72 a second. */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest step the motion takes in one frame (s). */
export const MAX_FRAME_STEP = 0.1;

/** The most canvas pixels per CSS px (before the zoom: types.ts zoomedSize). */
export const MAX_DPR = 2;

/** The skyline texture's width (texels): a layer's columns wrap onto as many rows as they need. */
export const SKYLINE_WIDTH = 2048;
