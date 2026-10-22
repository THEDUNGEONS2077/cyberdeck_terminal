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
