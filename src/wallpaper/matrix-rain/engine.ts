/**
 * src/wallpaper/matrix-rain/engine.ts: the matrix-rain wallpaper: columns
 * of glyphs falling down a canvas, in three depth layers.
 *
 * Layer: wallpaper (canvas; no React, no stores).
 *
 * How it stays cheap: the canvas is never redrawn in full. It keeps its
 * pixels between frames, and each frame only
 *   1. fades a slice of the screen a little: one set of interleaved thin
 *      stripes (FADE_PHASES × FADE_STRIPE), so each pixel is faded once per FADE_INTERVAL
 *      but never all at once. That fading *is* the trails: a glyph drawn
 *      earlier is simply dimmer by now;
 *   2. draws the glyphs drops moved onto since the last frame (one copy
 *      from the sprite sheet each, glyphAtlas.ts);
 *   3. re-rolls a few glyphs inside live trails (the flicker).
 * So the work per frame is about "drops that moved", a few hundred
 * drawImage calls, whatever the screen size.
 *
 * Drops: every column of every layer has one drop slot. A drop falls at
 * its own speed to its own depth (lib-style pure helpers below decide
 * these, so tests can check them), then waits at the top and falls again.
 * How long it waits sets how many columns are busy (LayerParams.occupancy).
 *
 * The screen opens full: PREWARM_SECONDS of rain are simulated before the
 * first frame, in slices of PREWARM_BUDGET_MS per frame so the page never
 * stalls; `onReady` then lets the canvas fade in. A resize keeps what's
 * drawn (copied across), sizes the canvas's CSS box with its pixels (never
 * stretched), and only adds or removes columns, so going fullscreen
 * doesn't restart the rain.
 */
import type { Wallpaper, WallpaperInstance, WallpaperOptions, WallpaperPalette } from '../types';
import { type Atlas, type AtlasRow, ROW, buildAtlas, canDraw, FONT_STACK, glyphSet, KATAKANA } from './glyphAtlas';
import {
  END_BIAS,
  FADE_INTERVAL,
  FADE_PHASES,
  FADE_STRIPE,
  LAYERS,
  type LayerParams,
  MAX_DPR,
  MAX_FRAME_STEP,
  MUTATIONS_PER_SECOND,
  PREWARM_BUDGET_MS,
  PREWARM_DRAWN,
  PREWARM_SECONDS,
  PREWARM_STEP,
  RESPAWN_DELAY,
  TRAIL_SECONDS,
} from './params';

/** A random number source returning 0 ≤ n < 1 (injectable for tests). */
export type Rng = () => number;

/** One falling drop (positions in rows of its layer). */
export interface Drop {
  /** The head's position (fractional row). */
  y: number;
  /** The last row a glyph was drawn on (-1 before the first). */
  drawn: number;
  /** The row where it dies. */
  end: number;
  /** Rows per second. */
  speed: number;
  /** Body glyph opacity. */
  alpha: number;
  /** Body colour style. */
  style: AtlasRow;
  /** Head drawn pale and glowing. */
  lit: boolean;
  /** The glyph at the head (sheet column), redrawn as body when the head moves on. */
  glyph: number;
  /** Seconds left to wait at the top before falling. */
  wait: number;
}

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

/**
 * A new drop for a layer `rows` tall. `scatter` places it anywhere along a
 * fall (startup and new columns) instead of waiting at the top.
 */
export function spawnDrop(p: LayerParams, rows: number, glyphs: number, rng: Rng, scatter = false): Drop {
  const speed = between(rng, p.speed);
  // Death depth: most drops reach the middle, fewer reach the bottom (END_BIAS).
  const end = Math.max(4, Math.round(rows * (1 - rng() ** END_BIAS) * 1.08));
  // Waiting time that keeps `occupancy` of columns busy: falling time × (1-p)/p, jittered.
  const fall = end / speed;
  const wait = scatter ? 0 : Math.max(between(rng, RESPAWN_DELAY), fall * ((1 - p.occupancy) / p.occupancy) * (0.5 + rng()));
  const y = scatter ? rng() * end : 0;
  return {
    y,
    drawn: Math.floor(y) - 1,
    end,
    speed,
    alpha: between(rng, p.alpha),
    style: rng() < 0.55 ? ROW.dim : ROW.body,
    lit: rng() < p.headChance,
    glyph: Math.floor(rng() * glyphs),
    wait,
  };
}

/** The strength of one fade step: after TRAIL_SECONDS a glyph is down to 2%. */
export const FADE_ALPHA = 1 - 0.02 ** (FADE_INTERVAL / TRAIL_SECONDS);

/** A glyph's opacity `seconds` after it was drawn at `alpha` (what the fades have left). */
export function fadedAlpha(alpha: number, seconds: number): number {
  return alpha * (1 - FADE_ALPHA) ** Math.floor(seconds / FADE_INTERVAL);
}

/**
 * The order the stripe sets are faded in: stepping by 7 (coprime with 12)
 * scatters consecutive phases across the 12-px period, so the fade never
 * reads as a line sweeping down the screen.
 */
export const FADE_ORDER: readonly number[] = Array.from({ length: FADE_PHASES }, (_, i) => (i * 7) % FADE_PHASES);

/** The fade's fill: black at the fade's strength (only its alpha matters to destination-out). */
const FADE_FILL = `rgba(0, 0, 0, ${FADE_ALPHA})`;

/** `#rrggbb` → `rgba(r, g, b, a)`. */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/** A layer at the current canvas size. */
interface Layer {
  p: LayerParams;
  atlas: Atlas;
  /** Pitch in device pixels. */
  colW: number;
  rowH: number;
  rows: number;
  drops: Drop[];
}

/** Creates the matrix-rain engine on a canvas (the `create` of the Wallpaper). */
function createMatrixRain(canvas: HTMLCanvasElement, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  const ctx = canvas.getContext('2d');
  const palette: WallpaperPalette = options.palette;
  let still = options.still;
  let layers: Layer[] = [];
  let glyphCount = 0;
  let ready = false;
  let destroyed = false;
  let running = false;
  let frame = 0;
  let last = 0;
  // Stripe sets owed a fade (fractional), and the next one in FADE_ORDER.
  let fadeDebt = 0;
  let fadePhase = 0;
  // While true, steps move the drops but draw and fade nothing (the early pre-warm).
  let drawing = true;
  // The pre-warm in progress: seconds left to simulate, or null when done.
  let warmLeft: number | null = null;
  let warmStarted = 0;
  let warmFrame = 0;
  let announced = false;
  // The size asked for, in CSS px, and the device pixel ratio in use.
  let size: { w: number; h: number; dpr: number } | null = null;
  let builtDpr = 0;
  let glyphs = glyphSet(false);

  /**
   * Fades one stripe set: every FADE_PHASES-th stripe (FADE_STRIPE pixel rows) from `offset`.
   * Plain solid rectangles, not a pattern: solid fills are the cheap path
   * whether the canvas is drawn by the GPU or (on some machines, and
   * headless) by the CPU, where a pattern fill costs many times more.
   * destination-out leaves the canvas transparent where faded.
   */
  const fadeStripes = (offset: number) => {
    if (!ctx) return;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = FADE_FILL;
    const w = canvas.width;
    const period = FADE_PHASES * FADE_STRIPE;
    for (let y = offset * FADE_STRIPE; y < canvas.height; y += period) ctx.fillRect(0, y, w, FADE_STRIPE);
    ctx.globalCompositeOperation = 'source-over';
  };

  /** Copies glyph `g` in `style` to a layer's cell (col, row), at `alpha`. */
  const put = (l: Layer, col: number, row: number, g: number, style: AtlasRow, alpha: number) => {
    if (!ctx || !drawing) return;
    const { atlas } = l;
    ctx.globalAlpha = alpha;
    ctx.drawImage(
      atlas.canvas,
      g * atlas.slotW,
      style * atlas.slotH,
      atlas.slotW,
      atlas.slotH,
      Math.round(col * l.colW - atlas.pad),
      Math.round(row * l.rowH - atlas.pad),
      atlas.slotW,
      atlas.slotH,
    );
    ctx.globalAlpha = 1;
  };

  /** Clears one cell (before redrawing it dimmer or with another glyph). */
  const clearCell = (l: Layer, col: number, row: number) => {
    if (drawing) ctx?.clearRect(Math.round(col * l.colW), Math.round(row * l.rowH), Math.ceil(l.colW), Math.ceil(l.rowH));
  };

  /** Advances the whole rain by `dt` seconds, drawing as it goes. */
  const step = (dt: number) => {
    // 1. The fade: FADE_PHASES stripe sets per FADE_INTERVAL, whole sets only.
    if (drawing) {
      fadeDebt += (dt / FADE_INTERVAL) * FADE_PHASES;
      while (fadeDebt >= 1) {
        fadeDebt -= 1;
        fadeStripes(FADE_ORDER[fadePhase]!);
        fadePhase = (fadePhase + 1) % FADE_PHASES;
      }
    }
    // 2 and 3, layer by layer, back to front.
    for (const l of layers) {
      for (let col = 0; col < l.drops.length; col++) {
        const d = l.drops[col]!;
        if (d.wait > 0) {
          d.wait -= dt;
          continue;
        }
        d.y += d.speed * dt;
        // Draw every row the head reached since the last frame.
        while (d.drawn < Math.floor(d.y) && d.drawn < d.end) {
          // The old head becomes an ordinary body glyph.
          if (d.lit && d.drawn >= 0) {
            clearCell(l, col, d.drawn);
            put(l, col, d.drawn, d.glyph, d.style, d.alpha);
          }
          d.drawn++;
          d.glyph = Math.floor(rng() * glyphCount);
          if (d.lit) put(l, col, d.drawn, d.glyph, ROW.head, 1);
          else put(l, col, d.drawn, d.glyph, d.style, d.alpha);
        }
        // The flicker: now and then a glyph in the live trail changes.
        const trail = Math.min(d.drawn, Math.round(d.speed * TRAIL_SECONDS));
        if (trail > 1 && rng() < MUTATIONS_PER_SECOND * dt * (trail / 12)) {
          const back = 1 + Math.floor(rng() * (trail - 1));
          const row = d.drawn - back;
          clearCell(l, col, row);
          put(l, col, row, Math.floor(rng() * glyphCount), d.style, fadedAlpha(d.alpha, back / d.speed));
        }
        // Reached its depth: the head dims, and a new drop waits at the top.
        if (d.drawn >= d.end) {
          if (d.lit) {
            clearCell(l, col, d.drawn);
            put(l, col, d.drawn, d.glyph, d.style, d.alpha);
          }
          l.drops[col] = spawnDrop(l.p, l.rows, glyphCount, rng);
        }
      }
    }
  };

  /**
   * One slice of the pre-warm: simulates until PREWARM_BUDGET_MS is used,
   * then yields to the next frame. Only the last PREWARM_DRAWN seconds draw.
   * When it's done the first full frame is on the canvas: say so once, and
   * start animating if asked to.
   */
  const warmSlice = () => {
    warmFrame = 0;
    if (warmLeft === null || destroyed) return;
    const until = performance.now() + PREWARM_BUDGET_MS;
    while (warmLeft > 0 && performance.now() < until) {
      drawing = warmLeft <= PREWARM_DRAWN;
      step(PREWARM_STEP);
      warmLeft -= PREWARM_STEP;
    }
    drawing = true;
    if (warmLeft > 0) {
      warmFrame = requestAnimationFrame(warmSlice);
      return;
    }
    warmLeft = null;
    // Recorded for e2e/motion.mjs: how long the screen took to fill (spread over frames).
    performance.measure('rain-prewarm', { start: warmStarted });
    if (!announced) {
      announced = true;
      options.onReady?.();
    }
    if (running && !still && !frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  /** Starts (or restarts) filling an empty canvas with `seconds` of rain. */
  const prewarm = (seconds: number) => {
    warmLeft = seconds;
    warmStarted = performance.now();
    if (!warmFrame) warmSlice();
  };

  /**
   * Fits the layers to the canvas: new sprite sheets if the pixel ratio
   * changed, and the column lists grown or cut to the new width. Existing
   * drops keep falling; new columns start mid-fall.
   */
  const layout = (w: number, h: number, dpr: number) => {
    const rebuild = dpr !== builtDpr;
    const glow = withAlpha(palette.accent, 0.6);
    layers = LAYERS.map((p, i) => {
      const old = rebuild ? undefined : layers[i];
      const colW = p.colW * dpr;
      const rowH = p.rowH * dpr;
      const cols = Math.ceil(w / p.colW);
      const rows = Math.ceil(h / p.rowH);
      const drops = (old?.drops ?? []).slice(0, cols);
      while (drops.length < cols) drops.push(spawnDrop(p, rows, glyphCount, rng, rng() < p.occupancy));
      return { p, atlas: old?.atlas ?? buildAtlas(p, palette, dpr, glyphs, glow), colW, rowH, rows, drops };
    });
    builtDpr = dpr;
    return rebuild;
  };

  /** Applies a size: resizes the backing store (keeping its pixels) and the layers. */
  const applySize = () => {
    if (!ready || !size || !ctx) return;
    const { w, h, dpr } = size;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    const fresh = layers.length === 0;
    if (canvas.width !== pw || canvas.height !== ph) {
      // Changing the size wipes a canvas: copy what's drawn across (unless the pixel ratio changed).
      const keep = !fresh && dpr === builtDpr && canvas.width > 0 && canvas.height > 0;
      const copy = keep ? document.createElement('canvas') : null;
      if (copy) {
        copy.width = canvas.width;
        copy.height = canvas.height;
        copy.getContext('2d')?.drawImage(canvas, 0, 0);
      }
      canvas.width = pw;
      canvas.height = ph;
      // Changing the size also resets the context's state.
      ctx.imageSmoothingEnabled = false;
      if (copy) ctx.drawImage(copy, 0, 0);
    }
    // The CSS box matches the pixels exactly: never stretched while a resize is pending.
    canvas.style.width = `${pw / dpr}px`;
    canvas.style.height = `${ph / dpr}px`;
    const rebuilt = layout(w, h, dpr);
    // A first start or a new pixel ratio starts from an empty canvas: fill it.
    if (fresh || rebuilt) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      prewarm(PREWARM_SECONDS);
    }
  };

  /** One animation frame. */
  const tick = (now: number) => {
    frame = 0;
    // Stopped, or still filling (warmSlice starts the animation when it's done).
    if (!running || warmLeft !== null) return;
    const dt = last ? Math.min((now - last) / 1000, MAX_FRAME_STEP) : 0;
    last = now;
    step(dt);
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(w, h, dpr) {
      size = { w, h, dpr: Math.min(MAX_DPR, Math.max(1, dpr)) };
      applySize();
    },
    start() {
      running = true;
      if (!ready || still || frame || warmLeft !== null) return;
      last = 0;
      frame = requestAnimationFrame(tick);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
    },
    setStill(next) {
      still = next;
      if (still) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (running) {
        instance.start();
      }
    },
    destroy() {
      destroyed = true;
      instance.stop();
      cancelAnimationFrame(warmFrame);
      layers = [];
    },
  };

  // Setup: the font must be loaded before the sprite sheets are drawn, and
  // katakana are only used when some installed font can draw them.
  void (async () => {
    try {
      await Promise.all(LAYERS.map((p) => document.fonts.load(`${p.font}px ${FONT_STACK}`, KATAKANA)));
    } catch {
      // Draw with whatever font is there.
    }
    if (destroyed) return;
    glyphs = glyphSet(canDraw(KATAKANA[0]!));
    glyphCount = glyphs.length;
    ready = true;
    applySize();
    if (running) {
      running = false;
      instance.start();
    }
  })();

  return instance;
}

/** The matrix-rain wallpaper (the registry's default). */
export const matrixRain: Wallpaper = {
  id: 'matrix-rain',
  label: 'MATRIX RAIN',
  create: (canvas, options) => createMatrixRain(canvas, options),
};
