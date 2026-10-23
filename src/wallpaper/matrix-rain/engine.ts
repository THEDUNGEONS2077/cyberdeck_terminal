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
 * A glyph that changes in place (a head turning into body, the flicker)
 * is cut out by its own shape first (the sheet's ERASE row), never by
 * clearing its cell, which would punch a dark box into the glow around it.
 * So the work per frame is about "drops that moved", a few hundred
 * drawImage calls, whatever the screen size.
 *
 * Drops: every column of every layer has one drop slot. A drop falls at
 * its own speed to its own depth (lib-style pure helpers below decide
 * these, so tests can check them), then waits at the top and falls again.
 * How long it waits sets how many columns are busy (LayerParams.occupancy).
 *
 * The screen opens full: PREWARM_SECONDS of rain are simulated before the
 * first frame, without touching the canvas: the simulation only records,
 * per cell, the last glyph drawn there and when. Then every cell still
 * visible is painted once, at the brightness the fades would have left it.
 * Same picture as drawing and fading for 18 s, at a fraction of the cost
 * (no full-screen fades at all). Both phases run in slices of
 * PREWARM_BUDGET_MS per frame so the page never stalls; `onReady` then lets
 * the canvas fade in. A resize keeps what's drawn (copied across) and only
 * adds or removes columns.
 *
 * Where it runs: normally in the wallpaper's own worker, on an
 * OffscreenCanvas (wallpaper/worker.ts), so none of this touches the
 * page's main thread; on the page itself only if a worker can't start
 * (wallpaper/host.ts). The code is the same either way: it only uses what
 * both have (OffscreenCanvas, the font set, requestAnimationFrame). The
 * canvas's CSS size is the host's business, not the engine's.
 */
import type { GlowLevel } from '@/lib/layout';

import type { Wallpaper, WallpaperInstance, WallpaperOptions, WallpaperPalette } from '../types';
import { type Atlas, type AtlasRow, ROW, buildAtlas, canDraw, FONT_STACK, glyphSet, KATAKANA } from './glyphAtlas';
import {
  END_BIAS,
  FADE_INTERVAL,
  FADE_PHASES,
  FADE_STRIPE,
  GLOW,
  LAYERS,
  type LayerParams,
  MAX_DPR,
  MAX_FRAME_STEP,
  MIN_FRAME_MS,
  MUTATIONS_PER_SECOND,
  PREWARM_BUDGET_MS,
  PREWARM_FILL_BUDGET_MS,
  PREWARM_WORKER_BUDGET_MS,
  PREWARM_HALO_MIN_ALPHA,
  PREWARM_MIN_ALPHA,
  PREWARM_REVEAL_ALPHA,
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

/** No glyph in a cell (Layer.glyphAt). */
const NONE = 0xffff;

/**
 * A cell grid (row × cols + col) resized to cols × rows: the cells that
 * are in both keep their place (the canvas's pixels are kept the same way,
 * from the top left), new ones are empty.
 */
export function resizeCells(cells: Uint16Array | null, oldCols: number, oldRows: number, cols: number, rows: number): Uint16Array {
  if (cells && oldCols === cols && oldRows === rows) return cells;
  const next = new Uint16Array(cols * rows).fill(NONE);
  if (!cells) return next;
  const w = Math.min(cols, oldCols);
  for (let row = 0; row < Math.min(rows, oldRows); row++) next.set(cells.subarray(row * oldCols, row * oldCols + w), row * cols);
  return next;
}

/** A layer at the current canvas size. */
interface Layer {
  /** Its place in LAYERS (back to front). */
  index: number;
  p: LayerParams;
  atlas: Atlas;
  /** Pitch in device pixels. */
  colW: number;
  rowH: number;
  rows: number;
  drops: Drop[];
  /** The glyph last drawn in each cell (row × cols + col), or NONE: what to erase when the cell changes. */
  glyphAt: Uint16Array;
}

/**
 * The pre-warm's record of one layer: per cell (row × cols + col), the last
 * glyph drawn there, in which style, at what opacity, and when; and when a
 * head last moved on from it, leaving its glow (simulated seconds;
 * -Infinity = never).
 */
interface Recording {
  cols: number;
  rows: number;
  time: Float32Array;
  glyph: Uint16Array;
  style: Uint8Array;
  alpha: Float32Array;
  halo: Float32Array;
}

/** An empty recording for a layer. */
function newRecording(cols: number, rows: number): Recording {
  const n = cols * rows;
  const never = () => new Float32Array(n).fill(-Infinity);
  return { cols, rows, time: never(), glyph: new Uint16Array(n), style: new Uint8Array(n), alpha: new Float32Array(n), halo: never() };
}

/** After a pre-warm (at simulated time `now`): each cell's glyph if the paint put it on the canvas, else NONE. Reuses the record's array. */
function paintedGlyphs(r: Recording, now: number): Uint16Array {
  for (let i = 0; i < r.glyph.length; i++) {
    const age = now - r.time[i]!;
    if (!(age < TRAIL_SECONDS) || fadedAlpha(r.alpha[i]!, age) < PREWARM_MIN_ALPHA) r.glyph[i] = NONE;
  }
  return r.glyph;
}

/** The font set to load fonts through: the page's, or in a worker its own (worker.ts adds the app's font to it). */
function fontSet(): FontFaceSet {
  return typeof document === 'undefined' ? (self as unknown as { fonts: FontFaceSet }).fonts : document.fonts;
}

/** Creates the matrix-rain engine on a canvas (the `create` of the Wallpaper). */
function createMatrixRain(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  // Typed as the offscreen kind: the 2D API both kinds share, which is all the engine uses.
  const ctx = (canvas as OffscreenCanvas).getContext('2d');
  // The pre-warm's slices: in a worker it has a thread to itself (big slices); on the page
  // it shares the main thread, and leaves the dashboard most of each frame once the rain shows.
  const ownThread = typeof document === 'undefined';
  const warmBudget = ownThread ? PREWARM_WORKER_BUDGET_MS : PREWARM_BUDGET_MS;
  const fillBudget = ownThread ? PREWARM_WORKER_BUDGET_MS : PREWARM_FILL_BUDGET_MS;
  let palette: WallpaperPalette = options.palette;
  let still = options.still;
  let glow: GlowLevel = options.glow;
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
  // While pre-warming, steps record into these instead of drawing (one per layer), on this clock.
  let recordings: Recording[] | null = null;
  let simTime = 0;
  // The pre-warm in progress: seconds left to simulate, or null when done; then the cell painting is up to.
  let warmLeft: number | null = null;
  let paintPass = 0;
  let paintLayer = 0;
  let paintCell = 0;
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

  /** Copies glyph `g` in `style` to a layer's cell (col, row), at `alpha`: on the canvas (noting it), or into the pre-warm's record. */
  const put = (l: Layer, col: number, row: number, g: number, style: AtlasRow, alpha: number) => {
    if (recordings) {
      const r = recordings[l.index];
      if (!r || row < 0 || row >= r.rows || col >= r.cols) return;
      const i = row * r.cols + col;
      r.time[i] = simTime;
      r.glyph[i] = g;
      r.style[i] = style;
      r.alpha[i] = alpha;
      return;
    }
    blit(l, col, row, g, style, alpha);
    if (row >= 0 && row < l.rows) l.glyphAt[row * l.drops.length + col] = g;
  };

  /** Draws glyph `g` in `style` at a layer's cell (col, row), at `alpha`, from the sprite sheet. */
  const blit = (l: Layer, col: number, row: number, g: number, style: AtlasRow, alpha: number) => {
    if (!ctx) return;
    const s = l.atlas.rows[style]!;
    ctx.globalAlpha = alpha;
    ctx.drawImage(l.atlas.canvas, g * s.w, s.y, s.w, s.h, Math.round(col * l.colW) - s.pad, Math.round(row * l.rowH) - s.pad, s.w, s.h);
    ctx.globalAlpha = 1;
  };

  /**
   * Takes the glyph in a cell off the canvas (before redrawing the cell
   * dimmer or with another glyph): its own shape, a touch bolder, is cut
   * out (destination-out), so the glow around it stays where it is.
   */
  const erase = (l: Layer, col: number, row: number) => {
    if (!ctx || row < 0 || row >= l.rows) return;
    const i = row * l.drops.length + col;
    const g = l.glyphAt[i]!;
    if (g === NONE) return;
    l.glyphAt[i] = NONE;
    ctx.globalCompositeOperation = 'destination-out';
    blit(l, col, row, g, ROW.erase, 1);
    ctx.globalCompositeOperation = 'source-over';
  };

  /**
   * A lit drop's head moves on from (col, row): the pale glyph turns into
   * an ordinary body glyph, and its glow stays behind, fading with the
   * rest. While recording, that's noted for the paint (paintRecorded).
   */
  const dimHead = (l: Layer, col: number, row: number, d: Drop) => {
    const r = recordings?.[l.index];
    if (r) {
      if (row >= 0 && row < r.rows && col < r.cols) r.halo[row * r.cols + col] = simTime;
    } else {
      erase(l, col, row);
    }
    put(l, col, row, d.glyph, d.style, d.alpha);
  };

  /** Advances the whole rain by `dt` seconds, drawing as it goes. */
  const step = (dt: number) => {
    // 1. The fade: FADE_PHASES stripe sets per FADE_INTERVAL, whole sets only.
    //    (While recording, time just moves on: the paint works out each cell's fade.)
    if (recordings) {
      simTime += dt;
    } else {
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
          if (d.lit && d.drawn >= 0) dimHead(l, col, d.drawn, d);
          d.drawn++;
          d.glyph = Math.floor(rng() * glyphCount);
          if (d.lit) put(l, col, d.drawn, d.glyph, ROW.head, 1);
          else put(l, col, d.drawn, d.glyph, d.style, d.alpha);
        }
        // The flicker: now and then a glyph in the live trail changes (not while recording: it only changes which glyph).
        const trail = Math.min(d.drawn, Math.round(d.speed * TRAIL_SECONDS));
        if (!recordings && trail > 1 && rng() < MUTATIONS_PER_SECOND * dt * (trail / 12)) {
          const back = 1 + Math.floor(rng() * (trail - 1));
          const row = d.drawn - back;
          erase(l, col, row);
          put(l, col, row, Math.floor(rng() * glyphCount), d.style, fadedAlpha(d.alpha, back / d.speed));
        }
        // Reached its depth: the head dims, and a new drop waits at the top.
        if (d.drawn >= d.end) {
          if (d.lit) dimHead(l, col, d.drawn, d);
          l.drops[col] = spawnDrop(l.p, l.rows, glyphCount, rng);
        }
      }
    }
  };

  /** The first full frame is on the canvas: say so, once (the host fades the canvas in). */
  const announce = () => {
    if (announced) return;
    announced = true;
    options.onReady?.();
  };

  /**
   * Paints recorded cells from where the last slice stopped, until `until`
   * (performance.now ms). Each cell still visible is drawn once, at what the
   * fades would have left: fadedAlpha(alpha, its age), and so is the glow
   * a head left there, if any (the sheet's HALO, faded the same way). Two
   * passes: the bright glyphs (PREWARM_REVEAL_ALPHA and up), then, with the
   * canvas already fading in, the faint glyphs and the heads' glows (a glow
   * has its glyph's shape cut out, so painting it after its glyph is the
   * same picture). True when all done.
   */
  const paintRecorded = (until: number): boolean => {
    if (!recordings) return true;
    for (; paintPass < 2; paintPass++, paintLayer = 0, paintCell = 0) {
      for (; paintLayer < layers.length; paintLayer++, paintCell = 0) {
        const l = layers[paintLayer]!;
        const r = recordings[paintLayer];
        if (!r) continue;
        const n = r.cols * r.rows;
        for (; paintCell < n; paintCell++) {
          // Checking the clock every 256 cells keeps the check itself cheap.
          if ((paintCell & 255) === 0 && performance.now() > until) return false;
          const age = simTime - r.time[paintCell]!;
          if (!(age < TRAIL_SECONDS)) continue;
          const a = fadedAlpha(r.alpha[paintCell]!, age);
          const bright = a >= PREWARM_REVEAL_ALPHA;
          if (paintPass === 0) {
            if (bright) blit(l, paintCell % r.cols, Math.floor(paintCell / r.cols), r.glyph[paintCell]!, r.style[paintCell] as AtlasRow, a);
            continue;
          }
          const haloAge = simTime - r.halo[paintCell]!;
          const glow = haloAge < TRAIL_SECONDS ? fadedAlpha(1, haloAge) : 0;
          const faint = !bright && a >= PREWARM_MIN_ALPHA;
          const lit = glow >= PREWARM_HALO_MIN_ALPHA;
          if (!lit && !faint) continue;
          const col = paintCell % r.cols;
          const row = Math.floor(paintCell / r.cols);
          const g = r.glyph[paintCell]!;
          if (lit) blit(l, col, row, g, ROW.halo, glow);
          if (faint) blit(l, col, row, g, r.style[paintCell] as AtlasRow, a);
        }
      }
      // The bright part is on the canvas: end the slice, so this frame is shown and the
      // canvas can fade in while the faint rest is painted.
      if (paintPass === 0) {
        announce();
        // The sprite rows the rest needs (the heads' glows, the erase shapes).
        for (const l of layers) l.atlas.finish?.();
        paintPass = 1;
        paintLayer = 0;
        paintCell = 0;
        return false;
      }
    }
    return true;
  };

  /**
   * One slice of the pre-warm, up to PREWARM_BUDGET_MS, then the next frame:
   * first the simulation (recording), then painting what it recorded. When
   * both are done the first full frame is on the canvas: say so once, and
   * start animating if asked to.
   */
  const warmSlice = () => {
    warmFrame = 0;
    if (warmLeft === null || destroyed) return;
    // A full slice until the canvas shows; then, on the page, a small one (the dashboard is starting meanwhile).
    const until = performance.now() + (announced ? fillBudget : warmBudget);
    while (warmLeft > 0 && performance.now() < until) {
      step(PREWARM_STEP);
      warmLeft -= PREWARM_STEP;
    }
    if (warmLeft > 0 || !paintRecorded(until)) {
      warmFrame = requestAnimationFrame(warmSlice);
      return;
    }
    // Each cell's glyph, for erasing it later: what the paint left on the canvas.
    layers.forEach((l, i) => {
      const r = recordings![i];
      if (r) l.glyphAt = resizeCells(paintedGlyphs(r, simTime), r.cols, r.rows, l.drops.length, l.rows);
    });
    recordings = null;
    warmLeft = null;
    // Recorded for e2e/motion.mjs: how long the screen took to fill (spread over frames).
    performance.measure('rain-prewarm', { start: warmStarted });
    announce();
    if (running && !still && !frame) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  /** Starts (or restarts) filling an empty canvas with `seconds` of rain. */
  const prewarm = (seconds: number) => {
    warmLeft = seconds;
    warmStarted = performance.now();
    simTime = 0;
    paintPass = 0;
    paintLayer = 0;
    paintCell = 0;
    recordings = layers.map((l) => newRecording(l.drops.length, l.rows));
    if (!warmFrame) warmSlice();
  };

  /** Draws a layer's sprite sheet, adding the time to the `rain-atlas` measure (e2e/motion.mjs reports it). */
  const sheet = (p: LayerParams, dpr: number): Atlas => {
    const start = performance.now();
    const atlas = buildAtlas(p, palette, dpr, glyphs, GLOW[glow]);
    performance.measure('rain-atlas', { start });
    return atlas;
  };

  /**
   * Fits the layers to the canvas: new sprite sheets if the pixel ratio
   * changed, and the column lists grown or cut to the new width. Existing
   * drops keep falling; new columns start mid-fall.
   */
  const layout = (w: number, h: number, dpr: number) => {
    const rebuild = dpr !== builtDpr;
    layers = LAYERS.map((p, i) => {
      const old = rebuild ? undefined : layers[i];
      const colW = p.colW * dpr;
      const rowH = p.rowH * dpr;
      const cols = Math.ceil(w / p.colW);
      const rows = Math.ceil(h / p.rowH);
      const drops = (old?.drops ?? []).slice(0, cols);
      while (drops.length < cols) drops.push(spawnDrop(p, rows, glyphCount, rng, rng() < p.occupancy));
      const glyphAt = resizeCells(old?.glyphAt ?? null, old?.drops.length ?? 0, old?.rows ?? 0, cols, rows);
      return { index: i, p, atlas: old?.atlas ?? sheet(p, dpr), colW, rowH, rows, drops, glyphAt };
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
      const copy = keep ? new OffscreenCanvas(canvas.width, canvas.height) : null;
      copy?.getContext('2d')?.drawImage(canvas, 0, 0);
      canvas.width = pw;
      canvas.height = ph;
      // Changing the size also resets the context's state.
      ctx.imageSmoothingEnabled = false;
      if (copy) ctx.drawImage(copy, 0, 0);
    }
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
    // A fast screen's extra frames: skip them (MIN_FRAME_MS); the time carries over to the next drawn one.
    if (last && now - last < MIN_FRAME_MS) {
      frame = requestAnimationFrame(tick);
      return;
    }
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
    setPalette(next) {
      palette = next;
      // New sprite sheets in the new colours; as with the glow, the change rains in.
      for (const l of layers) {
        l.atlas = sheet(l.p, builtDpr);
        l.atlas.finish?.();
      }
    },
    setGlow(next) {
      if (next === glow) return;
      glow = next;
      // New sprite sheets; the rain carries on. Glyphs drawn from now on glow
      // the new way, and the ones already down fade out as usual, so the
      // change rains in over a few seconds instead of the screen restarting.
      for (const l of layers) {
        l.atlas = sheet(l.p, builtDpr);
        l.atlas.finish?.();
      }
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
      await Promise.all(LAYERS.map((p) => fontSet().load(`${p.font}px ${FONT_STACK}`, KATAKANA)));
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
  create: (canvas, options) => createMatrixRain(canvas, options),
};
