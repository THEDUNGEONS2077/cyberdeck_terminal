/**
 * src/wallpaper/quantum-kernel/params.ts: QUANTUM KERNEL's numbers (0.27.0):
 * layers of code at different depths on deep navy, from the user's
 * reference (wallhaven-zmzddj: blue source code, small and sharp far
 * back, big, glowing and out of focus up front), written in the MATRIX
 * RAIN's glyphs (the user: "have it look like the types of symbols in the
 * matrix rain, different layers of code at different depths, keep the
 * structure from the reference").
 *
 * Layer: wallpaper (data only).
 */
import type { GlowLevel } from '@/lib/layout';
import { SHARP_DPR } from '@/lib/sharpness';

/** One depth of code. Sizes in CSS px. */
export interface DepthSpec {
  /** Its font size, and the line height (× the font). */
  font: number;
  lineHeight: number;
  /** How fast it scrolls up (px a second): nearer is faster, for depth. */
  speed: number;
  /** Out of focus: a blur over its glyphs (px; 0 sharp). */
  blur: number;
  /** Its glow's reach (px) and strength (0–1), at GLOW HIGH. */
  glowReach: number;
  glow: number;
  /** How opaque its glyphs are. */
  alpha: number;
  /** Its colour: the palette's dim text, its text, the in-focus mix of accent and bright, or the accent. */
  tone: 'far' | 'text' | 'focus' | 'accent';
  /** Lanes of code across the screen (each runs its own blocks), lines a block, rows between blocks. */
  lanes: number;
  block: readonly [number, number];
  gap: readonly [number, number];
  /** A line's length (glyphs, its indent left out). */
  length: readonly [number, number];
  /** The share of the screen's pixel ratio it's drawn at: a blurred layer loses nothing drawn smaller. */
  resolution: number;
  /** How much heavier its strokes are (px of outline in its own colour; 0 the font's own): the reference's near code is bold. */
  weight: number;
}

/**
 * The depths, back to front. The reference: far back a dense wall of
 * small, dim, slightly soft code; then smaller sharp code, brighter as it
 * nears; the big code in front in focus, bright and glowing (where lines
 * are run); and nearest the eye a few huge, faint lines out of focus.
 */
export const DEPTHS: readonly DepthSpec[] = [
  { font: 9, lineHeight: 1.45, speed: 3, blur: 0.5, glowReach: 0, glow: 0, alpha: 0.55, tone: 'far', lanes: 5, block: [5, 14], gap: [0, 1], length: [14, 40], resolution: 1, weight: 0 },
  { font: 11, lineHeight: 1.5, speed: 5, blur: 0, glowReach: 4, glow: 0.4, alpha: 0.6, tone: 'text', lanes: 4, block: [5, 12], gap: [1, 3], length: [12, 36], resolution: 1, weight: 0 },
  { font: 15, lineHeight: 1.55, speed: 8, blur: 0, glowReach: 7, glow: 0.55, alpha: 0.85, tone: 'text', lanes: 3, block: [4, 10], gap: [2, 5], length: [12, 34], resolution: 1, weight: 0.25 },
  { font: 24, lineHeight: 1.5, speed: 13, blur: 0.8, glowReach: 16, glow: 0.85, alpha: 0.85, tone: 'focus', lanes: 3, block: [4, 10], gap: [1, 4], length: [12, 30], resolution: 1, weight: 0.7 },
  { font: 38, lineHeight: 1.45, speed: 21, blur: 5, glowReach: 24, glow: 0.7, alpha: 0.35, tone: 'accent', lanes: 2, block: [2, 4], gap: [3, 8], length: [6, 16], resolution: 0.35, weight: 1 },
];

/** How much more (or less) every glow is at each GLOW level (HIGH is as designed). */
export const KERNEL_GLOW: Record<GlowLevel, number> = { low: 0.45, medium: 0.75, high: 1, max: 1.4 };

/** A monospace glyph's width, as a share of its font size (JetBrains Mono: 0.6). */
export const GLYPH_WIDTH = 0.6;

/** The background: the palette's --bg lifted this much toward --cool (deep navy in AZURE), darker at the corners by this much. */
export const NAVY = 0.3;
export const VIGNETTE = 0.6;

/** A line in focus lights up as if being run: how often one starts (s), how long it lasts (s), how much brighter at its peak. */
export const RUN_EVERY = 1.4;
export const RUN_SECONDS = 1.6;
export const RUN_STRENGTH = 0.8;

/** The most canvas pixels per CSS px (the sharpness guard steps back from it). */
export const MAX_DPR = SHARP_DPR;
/** Frames: up to about 72 a second, and the longest step taken in one (s). */
export const MIN_FRAME_MS = 1000 / 72;
export const MAX_FRAME_STEP = 0.1;
