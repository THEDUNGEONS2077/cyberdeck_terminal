/**
 * src/wallpaper/velocity/params.ts: the tunable numbers of the VELOCITY
 * wallpaper, matched to its reference (wallhaven-ox7v2l.jpg: light caught
 * in motion, a long exposure).
 *
 * Layer: wallpaper (data only).
 *
 * What the reference shows, and how it maps here:
 *   - a big, bright, pale-blue panel of light leaning to the left (about a
 *     fifth of the width, rgb(190, 226, 252) at its brightest) → one PALE
 *     panel, the palette's --cool lifted towards white;
 *   - a translucent dark-red band in the middle, and darker red beyond →
 *     a few RED panels, the palette's --accent, faint;
 *   - fine horizontal lines through everything (motion blur) → a striation
 *     over each panel, and a few long faint lines across the screen;
 *   - thin bright red streaks across the top → streaks that race across;
 *   - a blue flare in the bottom-right corner → a soft corner bloom.
 * Motion is the animation's own: the panels drift across at different
 * speeds (near ones faster) and come round again, the streaks race, the
 * long lines flicker, the flare breathes.
 */
import { SHARP_DPR } from '@/lib/sharpness';
import type { GlowLevel } from '@/lib/layout';

/** A panel's look: how wide (share of the screen), how far its top leans right of its bottom (share of the width), how bright, how fast it drifts (share of the width a second). */
export interface PanelKind {
  width: readonly [number, number];
  lean: readonly [number, number];
  alpha: readonly [number, number];
  speed: readonly [number, number];
}

/** The pale panel (one on screen at a time, like the reference's). */
export const PALE: PanelKind = { width: [0.2, 0.26], lean: [0.11, 0.16], alpha: [0.85, 1], speed: [0.0035, 0.006] };

/** The red panels. */
export const RED: PanelKind = { width: [0.07, 0.2], lean: [0.0, 0.05], alpha: [0.1, 0.22], speed: [0.006, 0.014] };

/** How many red panels there are. */
export const RED_PANELS = 3;

/** A panel's edges fade over this share of its width (the reference's edges are soft, blurred by the motion). */
export const SOFT_EDGE = 0.18;

/** The striation over a panel: how strong the fine lines are (0–1). */
export const STRIATION = 0.35;

/** Streaks racing across: new ones a second, speed (share of the width a second), tail length (share of the width), thickness (CSS px). */
export const STREAKS_PER_SECOND = 4.5;
export const STREAK_SPEED: readonly [number, number] = [0.35, 1.1];
export const STREAK_LENGTH: readonly [number, number] = [0.12, 0.45];
export const STREAK_WIDTH: readonly [number, number] = [0.8, 2.2];
/** The share of streaks in the pale colour (the rest are the accent). */
export const PALE_STREAKS = 0.2;

/** Long faint lines across the whole screen (the reference's motion blur lines): how many, and their opacity range. */
export const LONG_LINES = 10;
export const LONG_LINE_ALPHA: readonly [number, number] = [0.05, 0.22];

/** The glow levels (SYSTEM ▸ APPEARANCE ▸ GLOW): the panels' and streaks' brightness, and the flare's. */
export const VELOCITY_GLOW: Record<GlowLevel, number> = { low: 0.75, medium: 0.9, high: 1, max: 1.18 };

/** The shortest time between drawn frames (ms), about 72 a second (the panels move slowly; more would only cost). */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest real time step (s) the motion takes in one frame. */
export const MAX_FRAME_STEP = 0.1;

/**
 * The most canvas pixels per CSS px this engine draws (before the zoom:
 * types.ts zoomedSize): the screen's own, up to SHARP_DPR. The wallpaper
 * host passes in the ratio in force, its safe cap (catalog.ts) if the
 * sharpness guard stepped back (lib/sharpness.ts).
 */
export const MAX_DPR = SHARP_DPR;
