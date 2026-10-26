/**
 * src/wallpaper/horizon/params.ts: the tunable numbers of the HORIZON
 * wallpaper: a wireframe land running to a glowing horizon.
 *
 * Layer: wallpaper (data only). Reference: the user's image (2026-10-26),
 * a synthwave scene. Matched there:
 *   - the ground: a low-poly land of jagged triangles, drawn only as teal
 *     edges over dark faces, in perspective, filling the bottom half of the
 *     screen (the horizon at the middle); the far land lost in a pink haze;
 *   - a hot pink glow sitting on the horizon, its small white core just
 *     above the screen's middle, its haze a tall dome lighting a dark plum
 *     sky;
 *   - the nearest edges soft (the photo's depth of field).
 * The reference's four tilted slabs were left out at the user's wish
 * (0.16.0). Its motion is our own: the camera glides forward over the
 * land, so the hills roll toward you without end.
 *
 * Built for smoothness first (0.16.0, the user: "it's running very poorly …
 * detail can be lowered"): the sky never changes, so it's drawn once; the
 * land is only as big as can be seen through the haze; nothing else moves.
 *
 * The land is in world units (the camera 1 unit above the ground, a row of
 * the land 1 unit deep); the screen is only how it's seen.
 */
import type { GlowLevel } from '@/lib/layout';
import { SHARP_DPR } from '@/lib/sharpness';

/** How many rows of land there are: as deep as the haze lets you see (the land repeats after this many units, deep in the haze). */
export const ROWS = 64;
/** Points across a row (a unit apart, so the triangles are even, as the reference's), and how far either side of the camera the land reaches (units): past the screen's edges at the haze's far end, on a 21:9 screen too. */
export const COLS = 97;
export const HALF_WIDTH = 48;

/** Where each point may sit off its grid spot (shares of a column and a row): enough to read as random triangles, not a grid. */
export const JITTER = { x: 0.38, z: 0.2 } as const;

/** The land's height (units, the camera is at 1): most points low, now and then a sharp peak, as the reference's. */
export const HEIGHT = { low: [0, 0.24], peakChance: 0.14, peak: [0.3, 0.62] } as const;

/** The camera: its height (units), the near clip (units: a row passes out of sight behind it before it wraps). */
export const CAMERA = { height: 1, near: 0.25 } as const;

/** The lens: focal length (share of the screen's height), and the horizon (share of the height from the top): the land fills the bottom half. */
export const LENS = { focal: 0.95, horizon: 0.5 } as const;

/** How fast the camera glides over the land (units a second): a row every two seconds or so. */
export const SPEED = 0.45;

/** The haze over the land (units of depth): it starts thinning the land at `start`, hides it by `end` (inside ROWS). */
export const FOG = { start: 3, end: 44 } as const;

/** Where the haze's far wall stands (units): just inside the land's far end; it covers the strip between the land and the horizon. */
export const WALL = ROWS - 2;

/** The edges: width and glow (CSS px), and how much softer and wider the nearest are (within `near` units), as the photo's depth of field. */
export const LINE = { width: 0.8, glowWidth: 3, near: 4.5, soften: 3.6 } as const;

/** The glow on the horizon: its core (radius, share of height) just above the middle (`lift`), its glow and its tall haze dome (shares). */
export const SUN = { x: 0.5, lift: 0.016, core: 0.011, glow: 0.22, dome: { rx: 0.26, ry: 0.62 } } as const;

/** Per glow level: the edges' glow (0–1), and the horizon's glow (a multiplier). */
export const HORIZON_GLOW: Record<GlowLevel, { edge: number; sun: number }> = {
  low: { edge: 0.1, sun: 0.85 },
  medium: { edge: 0.18, sun: 0.95 },
  high: { edge: 0.26, sun: 1 },
  max: { edge: 0.38, sun: 1.1 },
};

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
