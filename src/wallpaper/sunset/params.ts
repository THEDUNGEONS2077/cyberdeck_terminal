/**
 * src/wallpaper/sunset/params.ts: the tunable numbers of the SUNSET
 * wallpaper: the outrun sun over a glowing grid.
 *
 * Layer: wallpaper (data only). Reference: the user's image (2026-10-26),
 * the classic outrun sunset. Matched there:
 *   - a big sun on the horizon, a little above the middle: golden at the
 *     top, melting through orange to hot pink at its base, cut by
 *     horizontal gaps that start a third of the way down and widen toward
 *     the bottom; a magenta glow round it; the horizon cuts its base;
 *   - a night sky, purple on the left, blue on the right, darker at the
 *     top, scattered with fine stars;
 *   - a square grid on the ground in perspective, gently waving, its lines
 *     pink and orange on the left, teal on the right, fading into a pink
 *     haze at the horizon;
 *   - fine CRT scanlines over everything.
 * Its motion is our own, and the only motion: the grid glides toward you.
 *
 * Built to be as light as can be (the user: "super lightweight, maximum
 * performance and sharpness"): the sky never changes, so it's drawn once;
 * each frame redraws only the ground, one short per-pixel shader, no
 * geometry. Lines are worked out per pixel, so they're sharp at any size.
 * The composition (the sun, its glow, the haze, the horizon) is in shares
 * of the screen; the detail (the grid's squares, its lines, the stars, the
 * scanlines) in CSS px of the zoomed layout, so it follows the layout as
 * the other wallpapers' detail does: zoomed out, more and finer squares.
 */
import { SHARP_DPR } from '@/lib/sharpness';

/** The horizon (share of the screen's height from the top). */
export const HORIZON = 0.61;

/** The sun: its centre, radius and its glow's reach (shares of the screen's height; the centre's x of its width). */
export const SUN = { x: 0.5, y: 0.48, r: 0.17, glow: 0.05 } as const;

/**
 * The sun's gaps: they start `from` down the sun (−1 its top, 1 its base),
 * one every `period` (same units), each `gap` of it wide, narrowest first.
 */
export const STRIPES = { from: -0.32, period: 0.15, gap: [0.1, 0.5] } as const;

/** The camera over the grid: its height (units) and focal length (CSS px per unit at distance 1: a square's size on screen). */
export const CAMERA = { height: 1, focal: 1080 } as const;

/** The grid: a square every `cell` units; its lines' width and glow (CSS px). */
export const GRID = { cell: 1, line: 1, glow: 3 } as const;

/** How the ground waves (the reference's gentle hills): how much the lines bend (cells), and how often (cycles over WRAP units). */
export const WAVE = { amount: 0.32, across: 9, along: 13 } as const;

/** How fast the grid glides toward you (units a second). */
export const SPEED = 0.6;

/** The grid's distance wraps after this many units: whole grid squares and whole waves, so it carries on seamlessly. */
export const WRAP = 240;

/** The pink haze over the far grid: how far below the horizon it reaches (share of the screen's height). */
export const HAZE = 0.07;

/** The stars: one cell in so many CSS px, the share of cells with a star. */
export const STARS = { cell: 3, chance: 0.006 } as const;

/** The scanlines: one dark row every so many CSS px, and how dark. */
export const SCANLINES = { every: 3, depth: 0.16 } as const;

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
