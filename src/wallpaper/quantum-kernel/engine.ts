/**
 * src/wallpaper/quantum-kernel/engine.ts: the QUANTUM KERNEL wallpaper
 * (0.27.0): layers of code at different depths, scrolling up past each
 * other on black, in the MATRIX RAIN's glyphs; now and then a line in
 * focus lights up as if being run. The background is true black in every
 * palette (the user, 0.27.1).
 *
 * Layer: wallpaper (canvas; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * Drawing text is the slow part, so each depth's code (code.ts, a loop of
 * rows) is drawn once into a sheet of its own, its glow and its blur baked
 * in (ctx.filter, once). A frame is then only copies: black,
 * each sheet twice (its loop's end meets its start), and the lit line, a
 * copy of its own patch added over it. Blurred depths are drawn into
 * smaller sheets (DepthSpec.resolution): out of focus, they lose nothing.
 * A sheet's loop is drawn with a margin of each edge's lines wrapped round,
 * so its glow and blur run across the seam with no line where it joins.
 *
 * ZOOM: laid out at the zoomed size (zoomedSize), so zoomed in the code is
 * bigger and as sharp.
 */
import type { GlowLevel } from '@/lib/layout';

import { BASE_GLYPHS, FONT_STACK, KATAKANA, canDraw } from '../matrix-rain/glyphAtlas';
import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, type WallpaperPalette, zoomedSize } from '../types';
import { type CodeLine, type Rng, writeCode } from './code';
import { DEPTHS, type DepthSpec, GLYPH_WIDTH, KERNEL_GLOW, MAX_DPR, MAX_FRAME_STEP, MIN_FRAME_MS, RUN_EVERY, RUN_SECONDS, RUN_STRENGTH } from './params';

/** `#rrggbb` → [r, g, b]. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `a` mixed toward `b` by `k` (0–1), as `rgb(…)`. */
function mix(a: string, b: string, k: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((c, i) => Math.round(c + (y[i]! - c) * k)).join(', ')})`;
}

/** Each depth's colour from the palette (AZURE gives the reference's blues). The background is true black in every palette (the user, 0.27.1). */
export function kernelTones(p: WallpaperPalette): { far: string; text: string; focus: string; accent: string } {
  return {
    // The reference's blues are deep and saturated: each tone is pulled toward --cool, the far one dimmed toward the black.
    far: mix(mix(p.bg, p.dim, 0.8), p.cool, 0.3),
    text: mix(p.text, p.cool, 0.35),
    focus: mix(p.accent, p.cool, 0.25),
    accent: mix(p.accent, p.cool, 0.4),
  };
}

/** The font set to load fonts through: the page's, or in a worker its own (worker.ts adds the app's font to it). */
function fontSet(): FontFaceSet {
  return typeof document === 'undefined' ? (self as unknown as { fonts: FontFaceSet }).fonts : document.fonts;
}

/** A depth, laid out and drawn: its code, its sheet, and where its loop has scrolled to. */
interface Depth {
  spec: DepthSpec;
  lines: CodeLine[];
  /** A glyph's width and a line's height (CSS px), and the loop's height (CSS px: rows × line). */
  colW: number;
  lineH: number;
  loopH: number;
  /** Its sheet (the loop, glow and blur baked in) and its scale (sheet px per CSS px). */
  sheet: OffscreenCanvas | null;
  scale: number;
  /** How far up it has scrolled (CSS px, within the loop). */
  offset: number;
}

/** Creates the QUANTUM KERNEL engine on a canvas (the `create` of the Wallpaper). */
function createQuantumKernel(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  // Typed as the offscreen kind: the 2D API both kinds share, which is all the engine uses.
  const ctx = (canvas as OffscreenCanvas).getContext('2d');
  let palette = options.palette;
  let glow: GlowLevel = options.glow;
  let still = options.still;
  let size = { w: 0, h: 0, dpr: 1 };
  let depths: Depth[] = [];
  let letters: string[] = [...BASE_GLYPHS];
  let kana = new Set<string>();
  let ready = false;
  let destroyed = false;
  let running = false;
  let announced = false;
  let frame = 0;
  let last = 0;
  // The line in focus being run: its depth's line index, and how far through (s); and the wait for the next.
  let run: { line: number; t: number } | null = null;
  let runWait = RUN_EVERY * 0.5;

  /**
   * Draws depth `d`'s loop into its sheet: its lines sharp on a scratch
   * canvas (with a margin of wrapped lines above and below), then the glow
   * (the same, blurred wide, faint) and the glyphs (blurred if out of focus)
   * onto the sheet.
   */
  const paintDepth = (d: Depth) => {
    const s = d.spec;
    const tones = kernelTones(palette);
    const colour = tones[s.tone];
    const g = KERNEL_GLOW[glow];
    const scale = size.dpr * s.resolution;
    const reach = s.glowReach * g;
    const margin = Math.ceil(reach * 2 + s.blur * 3 + d.lineH);
    const wPx = Math.max(1, Math.round(size.w * scale));
    const scratch = new OffscreenCanvas(wPx, Math.max(1, Math.round((d.loopH + 2 * margin) * scale)));
    const x = scratch.getContext('2d')!;
    x.scale(scale, scale);
    x.font = `${s.font}px ${FONT_STACK}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = colour;
    // A heavier stroke for the bold near code: an outline in its own colour.
    x.strokeStyle = colour;
    x.lineWidth = s.weight;
    for (const line of d.lines) {
      // The line, and its copies a loop above and below where they fall in the margins.
      for (const shift of [-d.loopH, 0, d.loopH]) {
        const y = margin + (line.row + 0.5) * d.lineH + shift;
        if (y < -d.lineH || y > d.loopH + 2 * margin + d.lineH) continue;
        for (let i = 0; i < line.text.length; i++) {
          const ch = line.text[i]!;
          if (ch === ' ') continue;
          const cx = (line.col + i + 0.5) * d.colW;
          if (cx > size.w + d.colW) break;
          if (kana.has(ch)) {
            // Katakana mirrored, as the rain's.
            x.save();
            x.translate(cx, y);
            x.scale(-1, 1);
            x.fillText(ch, 0, 0);
            if (s.weight > 0) x.strokeText(ch, 0, 0);
            x.restore();
          } else {
            x.fillText(ch, cx, y);
            if (s.weight > 0) x.strokeText(ch, cx, y);
          }
        }
      }
    }
    const sheet = new OffscreenCanvas(wPx, Math.max(1, Math.round(d.loopH * scale)));
    const out = sheet.getContext('2d')!;
    const top = -margin * scale;
    // The glow, under the glyphs: a wide faint haze, then a tight bright bloom round each stroke (the reference's).
    if (reach > 0 && s.glow > 0) {
      out.filter = `blur(${reach * scale * 0.5}px)`;
      out.globalAlpha = Math.min(1, s.glow * g * 0.7);
      out.drawImage(scratch, 0, top);
      out.globalCompositeOperation = 'lighter';
      out.filter = `blur(${reach * scale * 0.15}px)`;
      out.globalAlpha = Math.min(1, s.glow * g * 0.8);
      out.drawImage(scratch, 0, top);
    }
    // The glyphs, out of focus or sharp.
    out.filter = s.blur > 0 ? `blur(${s.blur * scale}px)` : 'none';
    out.globalAlpha = s.alpha;
    out.drawImage(scratch, 0, top);
    out.filter = 'none';
    out.globalAlpha = 1;
    out.globalCompositeOperation = 'source-over';
    d.sheet = sheet;
    d.scale = scale;
  };

  /** Lays every depth out for the size, writes its code and draws its sheet. */
  const build = () => {
    depths = DEPTHS.map((spec) => {
      const colW = spec.font * GLYPH_WIDTH;
      const lineH = spec.font * spec.lineHeight;
      const cols = Math.ceil(size.w / colW);
      // The loop: at least the screen's height, so two copies always cover it.
      const rows = Math.max(8, Math.ceil(size.h / lineH) + 2);
      const d: Depth = { spec, lines: writeCode(rng, cols, rows, spec, letters), colW, lineH, loopH: rows * lineH, sheet: null, scale: 1, offset: rng() * rows * lineH };
      return d;
    });
    repaint();
  };

  /** Draws every sheet again (a new palette or glow); the code and the scrolling stay. */
  const repaint = () => {
    for (const d of depths) paintDepth(d);
  };

  /** The depth in focus: the sharp, glowing one, where lines are run. */
  const focus = () => depths.find((d) => d.spec.tone === 'focus') ?? null;

  /** Moves everything on by `dt` seconds: the loops scroll, and a line in focus is run now and then. */
  const advance = (dt: number) => {
    for (const d of depths) d.offset = (d.offset + d.spec.speed * dt) % d.loopH;
    const f = focus();
    if (!f || f.lines.length === 0) return;
    if (run) {
      run.t += dt;
      if (run.t >= RUN_SECONDS) run = null;
    } else if ((runWait -= dt) <= 0) {
      runWait = RUN_EVERY * (0.6 + rng() * 0.8);
      // A line on screen now.
      const onScreen = f.lines.map((l, i) => ({ l, i })).filter(({ l }) => {
        const y = (((l.row * f.lineH - f.offset) % f.loopH) + f.loopH) % f.loopH;
        return y > size.h * 0.05 && y < size.h * 0.9;
      });
      if (onScreen.length) run = { line: onScreen[Math.floor(rng() * onScreen.length)]!.i, t: 0 };
    }
  };

  /** Copies depth `d`'s sheet to the screen, scrolled, twice so the loop covers it. */
  const drawDepth = (d: Depth) => {
    if (!d.sheet || !ctx) return;
    const k = size.dpr / d.scale;
    const y = -d.offset * size.dpr;
    const h = d.loopH * size.dpr;
    ctx.drawImage(d.sheet, 0, y, d.sheet.width * k, h);
    ctx.drawImage(d.sheet, 0, y + h, d.sheet.width * k, h);
  };

  /** The line being run: its own patch of the sheet added over it, fading in and out. */
  const drawRun = () => {
    const f = focus();
    if (!run || !f?.sheet || !ctx) return;
    const line = f.lines[run.line];
    if (!line) return;
    const pad = f.spec.glowReach * 2;
    // The patch on the sheet (sheet px), and where it is on screen now (CSS px).
    const sx = Math.max(0, (line.col * f.colW - pad) * f.scale);
    const sw = Math.min(f.sheet.width - sx, (line.text.length * f.colW + 2 * pad) * f.scale);
    const top = line.row * f.lineH - pad;
    const sy = Math.max(0, top * f.scale);
    const sh = Math.min(f.sheet.height - sy, (f.lineH + 2 * pad) * f.scale);
    if (sw <= 0 || sh <= 0) return;
    const y = (((top - f.offset) % f.loopH) + f.loopH) % f.loopH;
    const k = size.dpr / f.scale;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = RUN_STRENGTH * Math.sin((Math.PI * run.t) / RUN_SECONDS);
    ctx.drawImage(f.sheet, sx, sy, sw, sh, sx * k, y * size.dpr, sw * k, sh * k);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  };

  /** One frame: true black, the depths back to front, the line being run. */
  const draw = () => {
    if (!ctx) return;
    // --bg: true black in every palette (a unit test keeps it so).
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const d of depths) {
      drawDepth(d);
      if (d.spec.tone === 'focus') drawRun();
    }
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

  /** Sizes the canvas and lays everything out again (once the font is in). */
  const applySize = () => {
    if (!ready || destroyed || size.w <= 0 || size.h <= 0) return;
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
      if (!ready || still || frame) return;
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
      if (!ready) return;
      repaint();
      draw();
    },
    setPalette(next) {
      palette = next;
      if (!ready) return;
      repaint();
      draw();
    },
    destroy() {
      destroyed = true;
      instance.stop();
      depths = [];
    },
  };

  // Setup: the font must be loaded before the sheets are drawn, and katakana
  // are only used when some installed font can draw them (as the rain's).
  void (async () => {
    try {
      await Promise.all(DEPTHS.map((d) => fontSet().load(`${d.font}px ${FONT_STACK}`, KATAKANA)));
    } catch {
      // Draw with whatever font is there.
    }
    if (destroyed) return;
    const withKana = canDraw(KATAKANA[0]!);
    kana = withKana ? new Set(KATAKANA) : new Set();
    // As in the rain, katakana twice as often as the rest; code's letters, not its symbols (those are the joins).
    const base = [...BASE_GLYPHS].filter((c) => /[0-9A-Z]/.test(c));
    letters = withKana ? [...KATAKANA, ...KATAKANA, ...base] : base;
    ready = true;
    applySize();
    if (running) {
      running = false;
      instance.start();
    }
  })();

  return instance;
}

/** The QUANTUM KERNEL wallpaper. */
export const quantumKernel: Wallpaper = {
  id: 'quantum-kernel',
  create: (canvas, options) => createQuantumKernel(canvas, options),
};
