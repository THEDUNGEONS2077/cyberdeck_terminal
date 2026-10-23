/**
 * src/wallpaper/orbit/params.ts: the tunable numbers of the ORBIT wallpaper,
 * matched to its reference (wallhaven-g8o86d.jpg: a sunrise over the Earth,
 * seen from orbit).
 *
 * Layer: wallpaper (data only).
 *
 * What the reference shows, and how it maps here (measured on a 1600 × 669
 * copy; REF_* are in those pixels):
 *   - the planet's edge is a huge circle, its top just under the sun, its
 *     right side falling off the screen → CENTER, RADIUS (a least-squares
 *     fit through the edge);
 *   - the sun on the horizon, left of centre, with a starburst → SUN;
 *   - a thin bright haze along the edge, deep blue above it, near-black
 *     space at the top right; lit on the sun's side, dark on the far side;
 *   - wispy clouds over a dark blue surface, foreshortened towards the edge
 *     → procedural clouds seen in perspective (the shader).
 * The motion is the animation's own: the clouds drift as the planet turns
 * (nearer ones faster), the sun's rays shimmer, a faint lens flare, and a
 * few stars twinkle in the dark corner.
 */
import type { GlowLevel } from '@/lib/layout';

/** The reference's size (the measured copy). */
export const REF_W = 1600;
export const REF_H = 669;

/** The planet's edge: a circle (reference px) and the sun's centre. */
export const CENTER: readonly [number, number] = [386, 2605];
export const RADIUS = 2377;
export const SUN: readonly [number, number] = [380, 203];

/**
 * How a screen of another shape shows the scene: scaled to cover it, and
 * cropped this share of the excess from the left (the sun stays well in).
 */
export const CROP_X = 0.35;
export const CROP_Y = 0.45;

/** How fast the clouds drift as the planet turns (ground units a second; nearer clouds move faster on screen). */
export const CLOUD_DRIFT = 0.011;

/** The glow levels (SYSTEM ▸ APPEARANCE ▸ GLOW): the strength of the sun and the atmosphere's light. */
export const ORBIT_GLOW: Record<GlowLevel, number> = { low: 0.75, medium: 0.9, high: 1, max: 1.2 };

/** Render resolution cap (device px per CSS px): the scene is soft, so 1.25 looks the same as 2 at well under half the work. */
export const MAX_RENDER_DPR = 1.25;

/**
 * The shortest time between drawn frames (ms), about 72 a second: the
 * scene moves slowly, so a 120–144 Hz screen gains nothing from more, and
 * every frame is a full pass of the shader over the screen.
 */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest real time step (s) the motion takes in one frame. */
export const MAX_FRAME_STEP = 0.1;
