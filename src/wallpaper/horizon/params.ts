/**
 * src/wallpaper/horizon/params.ts: the tunable numbers of the HORIZON
 * wallpaper: a wireframe land running to a glowing horizon.
 *
 * Layer: wallpaper (data only). Reference: the user's image (2026-10-26),
 * a synthwave scene. Matched there:
 *   - the ground: a low-poly land of jagged triangles, drawn only as teal
 *     edges over dark faces, in perspective; the horizon a little below the
 *     middle (53% down); the far land lost in a pink haze;
 *   - a hot pink glow sitting on the horizon with a small white core, its
 *     haze a dome lighting a dark plum sky;
 *   - four tilted slabs (monoliths) in the haze either side of the glow,
 *     leaning in at the top; the near pair speckled with pink light, most
 *     at their tops;
 *   - the nearest edges soft (the photo's depth of field).
 * Its motion is our own: the camera glides forward over the land, so the
 * hills roll toward you without end; the glow breathes; the specks twinkle.
 *
 * The land is in world units (the camera 1 unit above the ground, a row of
 * the land 1 unit deep); the screen is only how it's seen. Lengths on the
 * screen are shares of its height, or CSS px of the zoomed layout.
 */
import type { GlowLevel } from '@/lib/layout';
import { SHARP_DPR } from '@/lib/sharpness';

/** How many rows of land there are: the land repeats after this many units (at SPEED, every few minutes). */
export const ROWS = 128;
/** Points across a row (a unit apart, so the triangles are even, as the reference's), and how far either side of the camera the land reaches (units): wide enough to fill the far edges of a 21:9 screen. */
export const COLS = 129;
export const HALF_WIDTH = 64;

/** Where each point may sit off its grid spot (shares of a column and a row): enough to read as random triangles, not a grid. */
export const JITTER = { x: 0.38, z: 0.2 } as const;

/** The land's height (units, the camera is at 1): most points low, now and then a sharp peak, as the reference's. */
export const HEIGHT = { low: [0, 0.24], peakChance: 0.14, peak: [0.3, 0.62] } as const;

/** The camera: its height (units), the near clip (units: a row passes out of sight behind it before it wraps). */
export const CAMERA = { height: 1, near: 0.25 } as const;

/** The lens: focal length (share of the screen's height: wider than 1 is a narrower view), and the horizon (share of the height from the top). */
export const LENS = { focal: 0.95, horizon: 0.53 } as const;

/** How fast the camera glides over the land (units a second): a row every two seconds or so. */
export const SPEED = 0.45;

/** The haze over the land (units of depth): it starts thinning the land at `start`, hides it by `end`. */
export const FOG = { start: 3, end: 48 } as const;

/** The edges: width and glow (CSS px), and how much softer and wider the nearest are (within `near` units), as the photo's depth of field. */
export const LINE = { width: 0.8, glowWidth: 3, near: 4.5, soften: 3.6 } as const;

/** The glow on the horizon: its core (radius, share of height), its glow and haze dome (shares), how it breathes (s, share). */
export const SUN = { x: 0.5, lift: 0.006, core: 0.011, glow: 0.22, dome: { rx: 0.26, ry: 0.62 }, pulse: { period: 9, depth: 0.07 } } as const;

/**
 * The four slabs, as the reference has them (shares of the screen: centre,
 * then width and length as shares of its height; tilt in radians, + leans
 * the top to the right; fog: how much of the haze covers it; spark: its
 * specks' strength).
 */
export const SLABS: readonly { x: number; y: number; w: number; h: number; tilt: number; fog: number; spark: number }[] = [
  { x: 0.266, y: 0.4, w: 0.062, h: 0.19, tilt: 0.55, fog: 0.62, spark: 0.45 },
  { x: 0.378, y: 0.457, w: 0.028, h: 0.135, tilt: 0.5, fog: 0.35, spark: 1 },
  { x: 0.622, y: 0.457, w: 0.028, h: 0.135, tilt: -0.5, fog: 0.35, spark: 1 },
  { x: 0.734, y: 0.4, w: 0.062, h: 0.19, tilt: -0.55, fog: 0.62, spark: 0.45 },
];

/** The slabs' specks: their size (CSS px), and how often each changes (twinkles a second). */
export const SPARKS = { cell: 2.2, rate: 1.4 } as const;

/** Per glow level: the edges' glow (0–1), and the horizon's glow (a multiplier). */
export const HORIZON_GLOW: Record<GlowLevel, { edge: number; sun: number }> = {
  low: { edge: 0.1, sun: 0.85 },
  medium: { edge: 0.18, sun: 0.95 },
  high: { edge: 0.26, sun: 1 },
  max: { edge: 0.38, sun: 1.1 },
};

/** The clock (s) wraps after this long: a whole number of breaths, so the glow carries on smoothly. */
export const TIME_WRAP = SUN.pulse.period * 800;

/** The fastest it redraws (ms between frames): about 72 a second. */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest step the motion takes in one frame (s). */
export const MAX_FRAME_STEP = 0.1;

/**
 * The most canvas pixels per CSS px this engine draws (before the zoom:
 * types.ts zoomedSize): the screen's own, up to SHARP_DPR. The wallpaper
 * host passes in the ratio in force (lib/sharpness.ts).
 */
export const MAX_DPR = SHARP_DPR;
