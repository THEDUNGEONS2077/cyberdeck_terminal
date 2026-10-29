/**
 * src/wallpaper/summit/engine.ts: the SUMMIT wallpaper (0.28.0): a
 * low-poly mountain range at dusk above a sea of clouds, every layer
 * (sky, three ranges, two banks of cloud) scrolling right to left at its
 * own speed and looping forever (the user: "have the mountains in the
 * background loop infinitely, clouds too at different speed").
 *
 * Layer: wallpaper (canvas; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * Canvas 2D, for clean facet edges with no multisampling (the rule since
 * HORIZON, 0.17.5): each layer (terrain.ts) is drawn once into a strip of
 * its own, one loop wide, when the size, palette or zoom changes. A frame
 * is then only copies: black, each strip at its scroll (twice where its
 * loop's end meets its start), and the horizon's glow over the sky. The
 * sky's strip is drawn at half resolution: its facets are big and soft.
 *
 * ZOOM: laid out at the zoomed size (zoomedSize), so zoomed in the facets
 * are bigger and as sharp.
 */
import type { GlowLevel } from '@/lib/layout';

import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, zoomedSize } from '../types';
import { HORIZON_GLOW, LAYERS, type LayerSpec, MAX_DPR, MAX_FRAME_STEP, MIN_FRAME_MS, PERIOD, SUMMIT_GLOW } from './params';
import { type Rng, baseColour, facetColour, type LayerShape, layLayer, summitTones } from './terrain';

/** How far each strip runs past its loop (CSS px), so its copies overlap (see paintLayer). */
const OVERLAP = 4;

/** A layer, laid out and drawn: its shape, its strip, and how far it has scrolled. */
interface Layer {
  spec: LayerSpec;
  shape: LayerShape;
  /** Its strip (one loop wide, from its highest point to its bottom or the screen's), where it starts (CSS px from the top), and its scale (strip px per CSS px). */
  strip: OffscreenCanvas | null;
  y0: number;
  scale: number;
  /** How far left it has scrolled (CSS px, within the loop). */
  offset: number;
}

/** Creates the SUMMIT engine on a canvas (the `create` of the Wallpaper). */
function createSummit(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  // Typed as the offscreen kind: the 2D API both kinds share, which is all the engine uses.
  const ctx = (canvas as OffscreenCanvas).getContext('2d');
  let palette = options.palette;
  let glow: GlowLevel = options.glow;
  let still = options.still;
  let size = { w: 0, h: 0, dpr: 1 };
  let period = 0;
  let layers: Layer[] = [];
  let glowSheet: OffscreenCanvas | null = null;
  let destroyed = false;
  let running = false;
  let announced = false;
  let frame = 0;
  let last = 0;

  /**
   * Draws layer `l` into its strip: its silhouette filled in its base colour
   * first (so no hairline of what's behind shows between facets), then
   * each facet, filled and outlined in its own colour (the outline closes
   * the antialiased seams between neighbours). A facet near the loop's ends
   * is drawn a loop along too, so the strip's two ends join. The strip runs
   * OVERLAP px past the loop (the loop's start again), so its two copies on
   * screen overlap on the same picture: copies that only met at a
   * fractional pixel would each half-cover it, leaving a faint dark line.
   */
  const paintLayer = (l: Layer) => {
    const s = l.spec;
    const tones = summitTones(palette);
    const scale = size.dpr * s.resolution;
    const y0 = Math.max(0, Math.floor(l.shape.top));
    const y1 = Math.min(size.h, Math.ceil(l.shape.bottom));
    const strip = new OffscreenCanvas(Math.max(1, Math.round((period + OVERLAP) * scale)), Math.max(1, Math.round((y1 - y0) * scale)));
    const x = strip.getContext('2d')!;
    x.scale(scale, scale);
    x.translate(0, -y0);
    x.lineJoin = 'round';
    x.lineWidth = 1 / scale;
    for (const shift of [-period, 0, period]) {
      // The silhouette: along the skyline, then down past the strip's bottom and back.
      x.fillStyle = baseColour(tones, s);
      x.beginPath();
      const o = l.shape.outline;
      x.moveTo(o[0]!.x + shift, o[0]!.y);
      for (const p of o) x.lineTo(p.x + shift, p.y);
      x.lineTo(o[o.length - 1]!.x + shift, y1 + 2);
      x.lineTo(o[0]!.x + shift, y1 + 2);
      x.closePath();
      x.fill();
    }
    for (const f of l.shape.facets) {
      const colour = facetColour(tones, s, f);
      x.fillStyle = colour;
      x.strokeStyle = colour;
      for (const shift of [-period, 0, period]) {
        const left = Math.min(f.x[0], f.x[1], f.x[2]) + shift;
        const right = Math.max(f.x[0], f.x[1], f.x[2]) + shift;
        if (right < -2 || left > period + OVERLAP + 2) continue;
        x.beginPath();
        x.moveTo(f.x[0] + shift, f.y[0]);
        x.lineTo(f.x[1] + shift, f.y[1]);
        x.lineTo(f.x[2] + shift, f.y[2]);
        x.closePath();
        x.fill();
        x.stroke();
      }
    }
    l.strip = strip;
    l.y0 = y0;
    l.scale = scale;
  };

  /** The horizon's glow behind the range, a soft oval, drawn small (it's all gradient: it scales up smoothly). */
  const paintGlow = () => {
    const k = 0.25;
    const w = Math.max(1, Math.round(size.w * k));
    const h = Math.max(1, Math.round(size.h * k));
    const sheet = new OffscreenCanvas(w, h);
    const g = sheet.getContext('2d')!;
    const [r, gr, b] = summitTones(palette).glow.map(Math.round) as [number, number, number];
    const a = HORIZON_GLOW.strength * SUMMIT_GLOW[glow];
    // An oval: a round gradient, stretched across.
    g.translate(HORIZON_GLOW.x * w, HORIZON_GLOW.y * h);
    g.scale(2.2, 1);
    const reach = HORIZON_GLOW.reach * h;
    const grad = g.createRadialGradient(0, 0, 0, 0, 0, reach);
    // Eased stops, so it fades out with no edge.
    for (const t of [0, 0.25, 0.5, 0.75, 1]) grad.addColorStop(t, `rgba(${r}, ${gr}, ${b}, ${(a * (1 - t) ** 2).toFixed(3)})`);
    g.fillStyle = grad;
    g.fillRect(-reach, -reach, reach * 2, reach * 2);
    glowSheet = sheet;
  };

  /** Lays every layer out for the size and draws its strip. */
  const build = () => {
    period = Math.round(size.w * PERIOD);
    layers = LAYERS.map((spec) => ({ spec, shape: layLayer(rng, spec, size.h, period), strip: null, y0: 0, scale: 1, offset: rng() * period }));
    repaint();
  };

  /** Draws every strip again (a new palette or glow); the shapes and the scrolling stay. */
  const repaint = () => {
    for (const l of layers) paintLayer(l);
    paintGlow();
  };

  /** Moves every layer on by `dt` seconds. */
  const advance = (dt: number) => {
    for (const l of layers) l.offset = (l.offset + l.spec.speed * dt) % period;
  };

  /** Copies layer `l`'s strip to the screen at its scroll, twice where the loop's end meets its start (overlapping by OVERLAP). */
  const drawLayer = (l: Layer) => {
    if (!l.strip || !ctx) return;
    const step = period * size.dpr;
    const w = (l.strip.width / l.scale) * size.dpr;
    const h = (l.strip.height / l.scale) * size.dpr;
    const y = l.y0 * size.dpr;
    const x = -l.offset * size.dpr;
    ctx.drawImage(l.strip, x, y, w, h);
    if (x + step < canvas.width) ctx.drawImage(l.strip, x + step, y, w, h);
  };

  /** One frame: black, the sky, its glow, then the ranges and clouds back to front. */
  const draw = () => {
    if (!ctx) return;
    // --bg: true black in every palette (a unit test keeps it so).
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    layers.forEach((l, i) => {
      drawLayer(l);
      if (i === 0 && glowSheet) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSheet, 0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
    });
    if (!announced) {
      announced = true;
      options.onReady?.();
    }
  };

  /** One animation frame (up to about 72 a second: MIN_FRAME_MS). */
  const tick = (now: number) => {
    frame = 0;
    if (!running || still) return;
    if (last && now - last < MIN_FRAME_MS) {
      frame = requestAnimationFrame(tick);
      return;
    }
    const dt = last ? Math.min((now - last) / 1000, MAX_FRAME_STEP) : 0;
    last = now;
    advance(dt);
    draw();
    frame = requestAnimationFrame(tick);
  };

  /** Sizes the canvas and lays everything out again. */
  const applySize = () => {
    if (destroyed || size.w <= 0 || size.h <= 0) return;
    canvas.width = Math.max(1, Math.round(size.w * size.dpr));
    canvas.height = Math.max(1, Math.round(size.h * size.dpr));
    build();
    draw();
  };

  const instance: WallpaperInstance = {
    resize(w, h, dpr, zoom) {
      size = zoomedSize(w, h, dpr, zoom, MAX_DPR);
      applySize();
    },
    start() {
      running = true;
      if (still || frame) return;
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
        draw();
      } else if (running) {
        instance.start();
      }
    },
    setGlow(next) {
      if (next === glow) return;
      glow = next;
      paintGlow();
      draw();
    },
    setPalette(next) {
      palette = next;
      if (layers.length === 0) return;
      repaint();
      draw();
    },
    destroy() {
      destroyed = true;
      instance.stop();
      layers = [];
      glowSheet = null;
    },
  };

  return instance;
}

/** The SUMMIT wallpaper. */
export const summit: Wallpaper = {
  id: 'summit',
  create: (canvas, options) => createSummit(canvas, options),
};
