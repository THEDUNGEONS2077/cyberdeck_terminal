/**
 * src/wallpaper/velocity/engine.ts: the VELOCITY wallpaper: light caught in
 * motion. Soft slanted panels of light drift across at different speeds,
 * thin streaks race past, long faint lines flicker, a flare breathes in
 * the corner.
 *
 * Layer: wallpaper (canvas; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * Everything is light, so it's all drawn additively ('lighter') on a clear
 * canvas each frame, over the dark CSS background (app.css). It stays
 * cheap: a handful of big gradient fills (each panel is a rectangle drawn
 * through a skew, so its slant costs nothing), one pattern fill per panel
 * for its fine motion-blur lines, and a thin rectangle per streak.
 * Colours come from the wallpaper's palette: the pale light is --cool lifted
 * towards white, the red is --accent (BLOOD gives the reference's).
 *
 * ZOOM: the scene is laid out in shares of the screen, so zooming it
 * doesn't re-lay it out (as the others do) but scales what's in it: the
 * panels' widths and drift, the streaks, the fine lines, and the flare and
 * its arc about the flare's corner. A panel keeps its slant.
 */
import type { GlowLevel } from '@/lib/layout';

import type { Wallpaper, WallpaperInstance, WallpaperOptions, WallpaperPalette } from '../types';
import {
  LONG_LINE_ALPHA,
  LONG_LINES,
  MAX_DPR,
  MAX_FRAME_STEP,
  MIN_FRAME_MS,
  PALE,
  PALE_STREAKS,
  type PanelKind,
  RED,
  RED_PANELS,
  SOFT_EDGE,
  STREAK_LENGTH,
  STREAK_SPEED,
  STREAK_WIDTH,
  STREAKS_PER_SECOND,
  STRIATION,
  VELOCITY_GLOW,
} from './params';

/** A random number source returning 0 ≤ n < 1. */
type Rng = () => number;

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

/** `#rrggbb` → [r, g, b]. */
function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The scene's colours from the palette, as `r, g, b` strings for rgba(). */
export function tones(palette: WallpaperPalette): { pale: string; red: string; flare: string } {
  const cool = rgb(palette.cool);
  const accent = rgb(palette.accent);
  const toWhite = (c: number[], t: number) => c.map((v) => Math.round(v + (255 - v) * t)).join(', ');
  // The pale light leans blue (the reference's is rgb(190, 226, 252)): the cool hue lifted, its blue kept up.
  const pale = cool.map((v, i) => Math.round(v + (255 - v) * (i === 2 ? 0.92 : 0.62)));
  return { pale: pale.join(', '), red: accent.join(', '), flare: toWhite(cool, 0.35) };
}

/** A panel of light (CSS px): its bottom-left x, width, lean (top's offset to the right), brightness, speed, and a phase for its slow breathing. */
interface Panel {
  kind: 'pale' | 'red';
  x: number;
  width: number;
  lean: number;
  alpha: number;
  speed: number;
  phase: number;
}

/** A streak racing across (CSS px): its head, height, speed, tail length, thickness, colour and brightness. */
interface Streak {
  x: number;
  y: number;
  speed: number;
  length: number;
  width: number;
  pale: boolean;
  alpha: number;
}

/** A long faint line across the screen: its height, brightness and flicker. */
interface Line {
  y: number;
  alpha: number;
  rate: number;
  phase: number;
}

/** Creates the VELOCITY engine on a canvas (the `create` of the Wallpaper). */
function createVelocity(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  // Typed as the offscreen kind: the 2D API both kinds share, which is all the engine uses.
  const ctx = (canvas as OffscreenCanvas).getContext('2d');
  let palette = options.palette;
  let glow: GlowLevel = options.glow;
  let still = options.still;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let zoom = 1;
  let running = false;
  let announced = false;
  let frame = 0;
  let last = 0;
  let streakDebt = 0;
  let colours = tones(palette);
  let panels: Panel[] = [];
  let streaks: Streak[] = [];
  let lines: Line[] = [];
  let striation: CanvasPattern | null = null;

  /**
   * A new panel of a kind; `anywhere` places it on screen (the start), else
   * just off the left edge. Its width and drift are zoomed; its lean isn't
   * (it leans over the whole height: zoomed, the slant is the same).
   */
  const panel = (kind: 'pale' | 'red', spec: PanelKind, anywhere: boolean): Panel => {
    const width = between(rng, spec.width) * w * zoom;
    const lean = between(rng, spec.lean) * w;
    return { kind, width, lean, x: anywhere ? rng() * w : -width - lean, alpha: between(rng, spec.alpha), speed: between(rng, spec.speed) * w * zoom, phase: rng() * 6.28 };
  };

  /** The fine horizontal lines of motion blur, as a pattern (one tile, repeated). */
  const makeStriation = () => {
    const tile = new OffscreenCanvas(4, 96);
    const t = tile.getContext('2d');
    if (!t || !ctx) return null;
    for (let y = 0; y < 96; y++) {
      // Mostly faint, now and then a brighter line, as in the reference.
      const v = rng() < 0.12 ? 0.6 + rng() * 0.4 : rng() * 0.25;
      t.fillStyle = `rgba(255, 255, 255, ${v.toFixed(3)})`;
      t.fillRect(0, y, 4, 1);
    }
    return ctx.createPattern(tile, 'repeat');
  };

  /** Builds the scene for the screen: a pale panel near where the reference has it, red panels, the long lines. */
  const build = () => {
    const pale = panel('pale', PALE, true);
    pale.x = w * (-0.03 + rng() * 0.06);
    // The red panels start clear of the pale one, spread over the rest of the screen (the first in the middle, as the reference's band).
    const reds = Array.from({ length: RED_PANELS }, (_, i) => {
      const p = panel('red', RED, true);
      p.x = w * (0.42 + (i * 0.55) / RED_PANELS + rng() * 0.06);
      return p;
    });
    panels = [pale, ...reds];
    streaks = [];
    lines = Array.from({ length: LONG_LINES }, () => ({ y: h * rng() ** 1.5, alpha: between(rng, LONG_LINE_ALPHA), rate: 0.3 + rng() * 1.2, phase: rng() * 6.28 }));
    striation = makeStriation();
    // The motion-blur lines, zoomed with the rest.
    striation?.setTransform({ a: zoom, b: 0, c: 0, d: zoom, e: 0, f: 0 });
  };

  /** Moves everything on by `dt` seconds. */
  const advance = (dt: number) => {
    for (const p of panels) {
      p.x += p.speed * dt;
      // Gone off the right: round again from the left, a new shape.
      if (p.x - p.lean > w + p.width) Object.assign(p, panel(p.kind, p.kind === 'pale' ? PALE : RED, false));
    }
    streakDebt += STREAKS_PER_SECOND * dt;
    while (streakDebt >= 1) {
      streakDebt -= 1;
      // More streaks near the top, as the reference.
      const y = h * Math.min(1, rng() ** 2.6);
      streaks.push({ x: 0, y, speed: between(rng, STREAK_SPEED) * w * zoom, length: between(rng, STREAK_LENGTH) * w * zoom, width: between(rng, STREAK_WIDTH) * zoom, pale: rng() < PALE_STREAKS, alpha: 0.35 + rng() * 0.6 });
    }
    for (const s of streaks) s.x += s.speed * dt;
    streaks = streaks.filter((s) => s.x - s.length < w);
  };

  /** Draws the scene at clock time `t` (s). */
  const draw = (t: number) => {
    if (!ctx || !w) return;
    const g = VELOCITY_GLOW[glow];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'lighter';

    // 1. Panels: each a rectangle drawn through a skew (its lean), soft at both edges.
    for (const p of panels) {
      const pale = p.kind === 'pale';
      const colour = pale ? colours.pale : colours.red;
      const a = Math.min(1, p.alpha * g * (0.9 + 0.1 * Math.sin(t * 0.4 + p.phase)));
      const soft = pale ? SOFT_EDGE * 0.45 : SOFT_EDGE;
      // Local (u, v) → screen (u + lean · (1 − v/h), v).
      ctx.setTransform(dpr, 0, (-dpr * p.lean) / h, dpr, dpr * p.lean, 0);
      // The bright light spills into the dark round it (a wide, faint glow).
      if (pale) {
        const spill = ctx.createLinearGradient(p.x - p.width * 0.6, 0, p.x + p.width * 1.6, 0);
        spill.addColorStop(0, `rgba(${colour}, 0)`);
        spill.addColorStop(0.35, `rgba(${colour}, ${0.12 * a})`);
        spill.addColorStop(0.65, `rgba(${colour}, ${0.12 * a})`);
        spill.addColorStop(1, `rgba(${colour}, 0)`);
        ctx.fillStyle = spill;
        ctx.fillRect(p.x - p.width * 0.6, 0, p.width * 2.2, h);
      }
      const grad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
      grad.addColorStop(0, `rgba(${colour}, 0)`);
      grad.addColorStop(soft, `rgba(${colour}, ${a})`);
      grad.addColorStop(1 - soft, `rgba(${colour}, ${a * 0.92})`);
      grad.addColorStop(1, `rgba(${colour}, 0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(p.x, 0, p.width, h);
      // Red light is strongest at the top and fades down (as the reference's band).
      if (!pale) {
        const top = ctx.createLinearGradient(0, 0, 0, h);
        top.addColorStop(0, `rgba(${colour}, ${a * 0.55})`);
        top.addColorStop(0.45, `rgba(${colour}, 0)`);
        ctx.fillStyle = top;
        ctx.fillRect(p.x + p.width * soft, 0, p.width * (1 - 2 * soft), h);
      }
      // Its fine motion-blur lines.
      if (striation) {
        ctx.globalAlpha = STRIATION * a * (pale ? 0.22 : 1);
        ctx.fillStyle = striation;
        ctx.fillRect(p.x + p.width * SOFT_EDGE * 0.5, 0, p.width * (1 - SOFT_EDGE), h);
        ctx.globalAlpha = 1;
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 2. The long faint lines, flickering slowly.
    for (const l of lines) {
      const a = l.alpha * g * (0.55 + 0.45 * Math.sin(t * l.rate + l.phase));
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, `rgba(${colours.red}, 0)`);
      grad.addColorStop(0.45, `rgba(${colours.red}, ${a})`);
      grad.addColorStop(1, `rgba(${colours.red}, ${a * 0.4})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, l.y, w, zoom);
    }

    // 3. Streaks: a bright head trailing a fading tail, with a soft glow round it.
    for (const s of streaks) {
      const colour = s.pale ? colours.pale : colours.red;
      const grad = ctx.createLinearGradient(s.x - s.length, 0, s.x, 0);
      grad.addColorStop(0, `rgba(${colour}, 0)`);
      grad.addColorStop(1, `rgba(${colour}, ${Math.min(1, s.alpha * g)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(s.x - s.length, s.y - s.width / 2, s.length, s.width);
      ctx.globalAlpha = 0.18 * g;
      ctx.fillRect(s.x - s.length, s.y - s.width * 2, s.length, s.width * 4);
      ctx.globalAlpha = 1;
    }

    // 4. The corner flare: a soft bloom and an arc of light, breathing (zoomed about the flare).
    const breathe = 0.85 + 0.15 * Math.sin(t * 0.25);
    const fx = w * 0.995;
    const fy = h * 0.88;
    const r = w * 0.17 * zoom;
    const bloom = ctx.createRadialGradient(fx, fy, 0, fx, fy, r);
    bloom.addColorStop(0, `rgba(${colours.pale}, ${0.95 * g * breathe})`);
    bloom.addColorStop(0.18, `rgba(${colours.flare}, ${0.6 * g * breathe})`);
    bloom.addColorStop(0.5, `rgba(${colours.flare}, ${0.16 * g * breathe})`);
    bloom.addColorStop(1, `rgba(${colours.flare}, 0)`);
    ctx.fillStyle = bloom;
    ctx.fillRect(fx - r, fy - r, 2 * r, 2 * r);
    ctx.strokeStyle = `rgba(${colours.flare}, ${0.45 * g * breathe})`;
    ctx.lineWidth = 4 * zoom;
    ctx.beginPath();
    ctx.arc(fx + (w * 0.72 - fx) * zoom, fy + (h * 0.5 - fy) * zoom, w * 0.36 * zoom, Math.PI * 0.08, Math.PI * 0.4);
    ctx.stroke();

    ctx.globalCompositeOperation = 'source-over';
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
    draw(now / 1000);
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(cw, ch, ratio, nextZoom) {
      const next = Math.min(MAX_DPR, Math.max(1, ratio));
      canvas.width = Math.round(cw * next);
      canvas.height = Math.round(ch * next);
      // Laid out at the screen's own size; the zoom scales what's drawn (see the header).
      const z = nextZoom > 0 && Number.isFinite(nextZoom) ? nextZoom : 1;
      const rebuild = cw !== w || ch !== h || z !== zoom;
      w = cw;
      h = ch;
      dpr = next;
      zoom = z;
      // Changing the canvas's size dropped its pattern's context state: make it again with the scene.
      if (rebuild || !striation) build();
      draw(performance.now() / 1000);
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
      if (still) instance.stop();
      else if (running) instance.start();
      draw(performance.now() / 1000);
    },
    setGlow(next) {
      glow = next;
      if (still) draw(performance.now() / 1000);
    },
    setPalette(next) {
      palette = next;
      colours = tones(palette);
      if (still) draw(performance.now() / 1000);
    },
    destroy() {
      instance.stop();
      w = 0;
    },
  };
  return instance;
}

/** The VELOCITY wallpaper. */
export const velocity: Wallpaper = {
  id: 'velocity',
  create: (canvas, options) => createVelocity(canvas, options),
};
