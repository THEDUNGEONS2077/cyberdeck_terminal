/**
 * src/wallpaper/matrix-rain/params.ts: the tunable numbers of the matrix
 * rain, matched to the reference wallpaper (wallhaven-01ye3v2.jpg).
 *
 * Layer: wallpaper (data only).
 *
 * What the reference shows, and how it maps here:
 *   - about 280 columns across 1920 px (≈ 7 px each), in several depths:
 *     small dim columns behind larger, brighter, sparser ones → three
 *     LAYERS, far to near;
 *   - long trails, brightest at the top, ending at different heights so
 *     the lower part of the screen is darker → each drop dies at a random
 *     depth (`endBias` pushes those depths up the screen);
 *   - pale, nearly white glyphs at a few stream heads, dim desaturated
 *     green bodies → heads drawn in --text-bright with a glow, bodies in
 *     --text-dim/--text at reduced alpha;
 *   - a faint green haze in the upper half → CSS behind the canvas
 *     (app.css .wallpaper-haze), plus the very faint residue fading leaves.
 */
import type { GlowLevel } from '@/lib/layout';

/** One depth layer of rain. */
export interface LayerParams {
  /** Glyph size (CSS px). */
  font: number;
  /** Column pitch (CSS px). */
  colW: number;
  /** Row pitch (CSS px): one glyph per row. */
  rowH: number;
  /** Drop speed range, in rows per second. */
  speed: [number, number];
  /** Share of columns with a drop falling at any moment (0–1). */
  occupancy: number;
  /** Body glyph opacity range (0–1); each drop gets one value. */
  alpha: [number, number];
  /** Chance a drop's head is drawn pale and glowing instead of body green. */
  headChance: number;
}

/** The three layers, back to front. Drawn in this order each frame. */
export const LAYERS: readonly LayerParams[] = [
  // Far: the dense dim mesh that fills the reference.
  { font: 8, colW: 7, rowH: 8, speed: [8, 14], occupancy: 0.95, alpha: [0.45, 0.8], headChance: 0.15 },
  // Mid: the main visible streams.
  { font: 10, colW: 10, rowH: 10, speed: [10, 18], occupancy: 0.6, alpha: [0.6, 0.95], headChance: 0.35 },
  // Near: a few larger, brighter, faster streams.
  { font: 13, colW: 14, rowH: 13, speed: [12, 22], occupancy: 0.2, alpha: [0.8, 1], headChance: 0.6 },
];

/** How long a glyph takes to fade to about 2% (seconds). Sets trail length with each drop's speed. */
export const TRAIL_SECONDS = 12;

/**
 * How often each pixel is faded (seconds). Fading in fewer, bigger steps
 * avoids 8-bit rounding leaving permanent ghosts: a step of strength f
 * can't remove alpha below 0.5/f, so f must not get too small.
 */
export const FADE_INTERVAL = 0.2;

/**
 * The fade is spread over FADE_PHASES interleaved thin stripes, one
 * stripe set at a time, so every frame fades a slice of the screen and no
 * frame fades all of it. Each pixel is still faded once per FADE_INTERVAL
 * (same total work, same trails), but there is no whole-screen dimming
 * step five times a second, and no frame that costs more than the rest.
 */
export const FADE_PHASES = 12;

/** A fade stripe's height in device pixels (2: half the fill calls of 1, no visible difference). */
export const FADE_STRIPE = 2;

/**
 * Where drops die, as a share of the screen height: depth = h * (1 - r^endBias)
 * with r uniform in 0..1. Above 1 favours long drops; the occasional
 * drop runs off the bottom. Reference: brightness is nearly even down to
 * three quarters of the height, then thins out.
 */
export const END_BIAS = 5;

/** One glow level. Blurs are canvas shadowBlur values, in CSS px. */
export interface GlowSpec {
  /** The glow colour's strength: the alpha of --accent. */
  alpha: number;
  /** The heads' blur, and how many times a head is drawn (each layer adds to the glow, so it reads as a light source). */
  head: number;
  headLayers: number;
  /** The bodies' blur. */
  body: number;
}

/**
 * The glow levels (SYSTEM ▸ WALLPAPER ▸ GLOW). 'high' is the default since
 * 0.5.0 (user request 2026-10-22: more glow). Measured on screenshots
 * (mean green, top half, against 0.3.1): 'low' is the look before 0.5.0
 * (+4%), 'medium' +29%, 'high' +43%, 'max' +60%. A head's glow stays
 * behind as it moves on, so lit trails glow as streaks, more so with
 * each level. The glow is drawn once into the sprite sheets
 * (glyphAtlas.ts), so it costs nothing per frame beyond copying slightly
 * bigger sprites.
 */
export const GLOW: Record<GlowLevel, GlowSpec> = {
  low: { alpha: 0.4, head: 5, headLayers: 1, body: 2 },
  medium: { alpha: 0.65, head: 7, headLayers: 2, body: 3 },
  high: { alpha: 0.8, head: 9, headLayers: 2, body: 5 },
  max: { alpha: 0.9, head: 12, headLayers: 3, body: 6.5 },
};

/**
 * How far a glow reaches past its glyph's cell, per CSS px of blur, plus
 * 1 px: measured in Chromium, a shadowBlur of b fades below 1/255 within
 * about 0.9 b + 1 px of the cell. Each sprite gets that much margin, so
 * no glow is cut off at a sprite's edge (which would show as faint boxes).
 */
export const GLOW_REACH = 0.9;

/**
 * How far body glyphs are pulled toward grey (0 = the token colour, 1 =
 * grey). The reference's bodies are a muted green (about rgb(70,101,70)),
 * duller than the UI's --text; the pale heads keep their full colour.
 */
export const BODY_DESATURATE = 0.5;

/** Share of a drop's trail cells re-rolled to a new glyph per second (the flicker). */
export const MUTATIONS_PER_SECOND = 1.2;

/** A drop waits this long (seconds, range) at the top before falling again. */
export const RESPAWN_DELAY: [number, number] = [0.2, 4];

/** Seconds simulated before the first frame, so the screen opens full. */
export const PREWARM_SECONDS = 18;

/**
 * The pre-warm paints a recorded glyph only if the fades would have left it
 * at least this bright (dimmer ones are invisible against the haze).
 */
export const PREWARM_MIN_ALPHA = 0.05;

/**
 * The pre-warm paints glyphs at least this bright first, and lets the
 * canvas fade in as soon as they're done; the fainter rest (most of the
 * cells, all near-invisible) is painted during the fade-in
 * (optimization pass, 2026-10-22: the rain appears sooner).
 */
export const PREWARM_REVEAL_ALPHA = 0.25;

/** The simulation step while pre-warming (seconds): coarser than a frame, it only moves numbers. */
export const PREWARM_STEP = 1 / 20;

/**
 * Main-thread time the pre-warm may take per frame (ms). It runs in slices
 * across frames, so the page stays responsive while it fills; the canvas
 * fades in when it's done.
 */
export const PREWARM_BUDGET_MS = 16;

/**
 * The same, once the canvas is showing and only the faint glyphs and the
 * heads' glows are left to paint: a smaller slice, so the rest of the page
 * (the dashboard, starting up meanwhile) gets most of each frame
 * (optimization pass 2, 2026-10-22: at 16 ms the dashboard waited for the
 * whole fill).
 */
export const PREWARM_FILL_BUDGET_MS = 6;

/**
 * In the wallpaper's own worker nothing else is waiting: the pre-warm runs
 * in big slices instead (it still stops once the bright part is painted,
 * so that frame is shown and the canvas can fade in).
 */
export const PREWARM_WORKER_BUDGET_MS = 250;

/**
 * The pre-warm paints a head's leftover glow only if it's still at least
 * this strong: fainter ones barely show (the glow is itself faint), and
 * each is a big sprite to copy.
 */
export const PREWARM_HALO_MIN_ALPHA = 0.15;

/**
 * The shortest time between drawn frames (ms). On a 60 Hz screen every
 * frame is drawn; on faster ones (120–240 Hz) the rain draws at about 60–72
 * frames a second and skips the rest. Glyphs move at most ~22 rows a
 * second, so the extra frames showed nothing new, and each one cost a
 * canvas upload and a full-screen composite (optimization pass,
 * 2026-10-22: uncapped, script time ran 4× higher for no visible gain).
 * 1000/72 leaves room for a 60 Hz frame that arrives a little early.
 */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest real time step taken in one frame (s): after a stall the rain resumes instead of jumping. */
export const MAX_FRAME_STEP = 0.1;

/** Device pixel ratio cap: sharper than 2 costs fill rate for no visible gain on 7 px glyphs. */
export const MAX_DPR = 2;
