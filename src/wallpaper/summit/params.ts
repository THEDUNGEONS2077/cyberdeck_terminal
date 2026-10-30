/**
 * src/wallpaper/summit/params.ts: SUMMIT's numbers (0.28.0): a low-poly
 * mountain range at dusk above a sea of clouds, from the user's reference
 * (exec-d2744d55: crimson light on the faces turned to a low sun, navy
 * shadows, pale snow on the far peaks, a sky of faceted cloud bands, slate
 * above and peach at the horizon). The user: "have the foreground in the
 * reference be replaced by clouds", and "have the mountains in the
 * background loop infinitely, clouds too at different speed": every layer
 * scrolls right to left, each at its own speed, and loops.
 *
 * Layer: wallpaper (data only). Heights and sizes are shares of the
 * screen's height (the layout is the screen's shape); speeds are CSS px a
 * second of the zoomed layout.
 */
import type { GlowLevel } from '@/lib/layout';
import { SHARP_DPR } from '@/lib/sharpness';

/** What a layer is: the faceted sky, a mountain range, or a bank of clouds. */
export type LayerKind = 'sky' | 'rock' | 'cloud';

/** One layer, back to front. Heights are shares of the screen's height from the top. */
export interface LayerSpec {
  kind: LayerKind;
  /** Its skyline's highest and lowest points (the peaks' or the clouds' tops). */
  top: readonly [number, number];
  /** Where its body ends (below the screen for the front clouds). */
  bottom: number;
  /** The distance between peaks or cloud lumps, as [least, most]. */
  spacing: readonly [number, number];
  /** Rock: how steep its flanks are (height per width); cloud: how tall a lump is for its width. */
  slope: number;
  /** A facet's size: a row's height (its columns are `stretch` times as wide). */
  facet: number;
  stretch: number;
  /** How far its vertices wander off the grid (a share of a facet), for the low-poly look. */
  rough: number;
  /** How much of the sky's colour it takes on with distance (0 none). */
  haze: number;
  /** Snow on the top share of its peaks' height (0 none). */
  snow: number;
  /** How fast it scrolls right to left (CSS px a second): nearer is faster. */
  speed: number;
  /** Its strip's pixels per screen pixel (soft, big-faceted layers lose nothing at less). */
  resolution: number;
  /** A blur over the whole layer (CSS px; 0 none): the clouds are soft (the user, 0.28.2). */
  soften: number;
}

/**
 * The layers, back to front. The user's tweaks (0.28.2): taller, grander
 * peaks with more variety and jagged ridges; the clouds lower, puffier,
 * softer and whiter.
 */
export const LAYERS: readonly LayerSpec[] = [
  // The sky: long faceted cloud bands, slate above, warming to peach at the horizon.
  { kind: 'sky', top: [0, 0], bottom: 0.8, spacing: [0, 0], slope: 0, facet: 0.075, stretch: 3.2, rough: 0.45, haze: 0, snow: 0, speed: 3, resolution: 0.5, soften: 0 },
  // The far range: tall, grand, jagged, snow on its peaks, hazed toward the sky.
  { kind: 'rock', top: [0.05, 0.27], bottom: 0.8, spacing: [0.16, 0.42], slope: 1.3, facet: 0.024, stretch: 1.2, rough: 0.35, haze: 0.36, snow: 0.34, speed: 6, resolution: 1, soften: 0 },
  // The middle range: navy, crimson only where its ridges face the sun.
  { kind: 'rock', top: [0.34, 0.5], bottom: 0.76, spacing: [0.28, 0.62], slope: 0.85, facet: 0.036, stretch: 1.3, rough: 0.35, haze: 0.16, snow: 0, speed: 11, resolution: 1, soften: 0 },
  // The near slopes: the reference's long crimson sweeps, in big facets.
  { kind: 'rock', top: [0.48, 0.62], bottom: 0.9, spacing: [0.55, 1.1], slope: 0.5, facet: 0.055, stretch: 1.5, rough: 0.3, haze: 0, snow: 0, speed: 18, resolution: 1, soften: 0 },
  // The sea of clouds, where the reference's foreground was: three banks of round billows heaped with smaller puffs, grey, soft, lit along their tops; nearer ones bigger and faster.
  { kind: 'cloud', top: [0.66, 0.73], bottom: 0.92, spacing: [0.1, 0.18], slope: 0.85, facet: 0.024, stretch: 1.3, rough: 0.35, haze: 0.18, snow: 0, speed: 24, resolution: 1, soften: 0.8 },
  { kind: 'cloud', top: [0.75, 0.82], bottom: 0.99, spacing: [0.14, 0.26], slope: 0.82, facet: 0.032, stretch: 1.3, rough: 0.35, haze: 0.06, snow: 0, speed: 32, resolution: 1, soften: 1 },
  { kind: 'cloud', top: [0.84, 0.91], bottom: 1.06, spacing: [0.2, 0.36], slope: 0.8, facet: 0.042, stretch: 1.3, rough: 0.35, haze: 0, snow: 0, speed: 44, resolution: 1, soften: 1.2 },
];

/** Each layer's loop is this many screen widths long (one wider than the screen hides the repeat). */
export const PERIOD = 1.6;

/** Where the light on the ranges comes from: low on the right, a little in front of them (x right, y up, z away from you), so the faces turned right catch it, as the reference's. */
export const SUN = { x: 0.85, y: 0.5, z: -0.3 } as const;

/** The glow on the horizon behind the range: its centre (shares of the screen) and its reach (shares of the screen's height). */
export const HORIZON_GLOW = { x: 0.42, y: 0.25, reach: 0.38, strength: 0.42 } as const;

/** The horizon glow's strength at each GLOW level (× HORIZON_GLOW.strength). */
export const SUMMIT_GLOW: Readonly<Record<GlowLevel, number>> = { low: 0.5, medium: 0.75, high: 1, max: 1.35 };

/** The canvas's pixel ratio cap (as the other wallpapers). */
export const MAX_DPR = SHARP_DPR;

/** The shortest time between frames (ms): about 72 a second at most. */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest step a frame may take (s): after a stall it carries on, not jumps. */
export const MAX_FRAME_STEP = 0.1;
