/**
 * src/wallpaper/neural-net/engine.ts: the neural-net wallpaper: a plexus of
 * glowing nodes joined by long thin links, drifting slowly, with signals
 * running along the links.
 *
 * Layer: wallpaper (canvas; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * The scene is built once per screen size (scene()): node homes (an even
 * scatter plus loose clusters, past the screen's edges so links run off
 * it), and each node linked to a few near neighbours (a few hubs to
 * many). Each frame redraws it all.
 *
 * Drawn with WebGL 2 since 0.22.0 (gl.ts, fluid_motion's shaders): each link
 * a quad with its own smooth edge, each node a sprite worked out per pixel.
 * The 2D canvas's thin strokes stepped on Chrome's GPU-drawn canvas (the
 * user: "jaggedness ... it looks fine on mobile"). This file packs each
 * frame (`pack`): the links' ends and the sprites. Where WebGL 2 isn't
 * there, the 2D drawing below (`draw2d`) stands in, cheap because
 * nothing is drawn one pixel at a time:
 *   - each link is one stroke (plus a soft wide pass for glow), at its own
 *     exact opacity, so links fade smoothly as they stretch (batching them
 *     by opacity step made them jump between steps);
 *   - nodes and signals are copies of small pre-drawn glow sprites
 *     (sprites()), one per colour step (fine steps: no visible jumps).
 * It draws on every frame the screen shows (no frame-rate cap: the user
 * asked for it as smooth as possible, 2026-10-23), and lit nodes brighten
 * with a short rise instead of popping on.
 * There are no out-of-focus particles (bokeh) behind the net: the user had
 * them removed (0.19.0), on the phone too.
 * Colour follows the palette along a diagonal (shade()): --cool at the top
 * left, --text-bright in the middle, --accent at the bottom right; the big
 * background glow is CSS under the canvas (app.css .wallpaper[data-wallpaper]).
 */
import type { GlowLevel } from '@/lib/layout';

import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, type WallpaperPalette, zoomedSize } from '../types';
import { type NeuralFrame, type NeuralGpu, drawGl, sendWeights, setUpGl } from './gl';
import {
  CLUSTERS,
  COLOR_STEPS,
  DRIFT,
  DRIFT_PERIOD,
  FLASH_RISE,
  FLASH_SECONDS,
  LINE_ALPHA,
  LINE_WIDTH,
  LINK_POOL,
  LINK_WEIGHT,
  LINKS,
  MAX_DPR,
  MAX_FRAME_STEP,
  MAX_LINK,
  NEURAL_GLOW,
  NODE_RADIUS,
  NODES_PER_MPX,
  PAD,
  PULSE_HOPS,
  PULSE_SPEED,
  PULSES_PER_SECOND,
  SCATTER,
} from './params';

/** A random number source returning 0 ≤ n < 1 (injectable for tests). */
export type Rng = () => number;

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

/** A colour as [r, g, b] (0–255). */
type Rgb = [number, number, number];

/** `#rrggbb` → [r, g, b]. */
export function rgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The colour `t` of the way from `a` to `b`. */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** [r, g, b] (+ alpha) → a canvas colour. */
function css([r, g, b]: Rgb, a = 1): string {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

/**
 * Where a point sits on the colour diagonal (0 top left … 1 bottom right),
 * from its place as shares of the screen. Weighted to the height: the
 * reference turns red along the bottom, left included.
 */
export function diagonal(x: number, y: number): number {
  return Math.min(1, Math.max(0, 1.05 * y + 0.35 * x - 0.2));
}

/**
 * The palette's colour at `t` along the diagonal: --cool (lifted towards
 * white, as the reference's teal lines are) to --text-bright a little above
 * the middle, then to the full --accent by the lower part of the screen.
 */
export function shade(palette: WallpaperPalette, t: number): Rgb {
  const bright = rgb(palette.bright);
  const smooth = (u: number) => u * u * (3 - 2 * u);
  // The cool end lifted towards white (the reference's teal lines are light, not dark).
  const cool = mix(rgb(palette.cool), [255, 255, 255], 0.4);
  if (t < TURN) return mix(cool, bright, smooth(t / TURN));
  return mix(bright, rgb(palette.accent), smooth(Math.min(1, (t - TURN) / (FULL - TURN))));
}

/** Along the diagonal: the pale middle tone at TURN, the full accent from FULL on. */
const TURN = 0.3;
const FULL = 0.64;

/** A link between two nodes (indexes), a < b. */
export type Link = readonly [number, number];

/**
 * Links each point to `want[i]` of its neighbours within `maxLen` (each
 * pair once), picked at random from its nearest `want[i] × LINK_POOL`: so
 * most links are fairly short, but some reach far and cross others, as in
 * the reference. A node with many wants becomes a hub.
 */
export function linkNodes(xs: ArrayLike<number>, ys: ArrayLike<number>, want: ArrayLike<number>, maxLen: number, rng: Rng): Link[] {
  const n = xs.length;
  const seen = new Set<number>();
  const links: Link[] = [];
  for (let i = 0; i < n; i++) {
    const near: [number, number][] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const d = Math.hypot(xs[j]! - xs[i]!, ys[j]! - ys[i]!);
      if (d <= maxLen) near.push([d, j]);
    }
    near.sort((a, b) => a[0] - b[0]);
    const pool = near.slice(0, want[i]! * LINK_POOL);
    // A random pick from the pool (shuffled in place, the first `want` taken).
    for (let k = pool.length - 1; k > 0; k--) {
      const r = Math.floor(rng() * (k + 1));
      [pool[k], pool[r]] = [pool[r]!, pool[k]!];
    }
    for (const [, j] of pool.slice(0, want[i])) {
      const [a, b] = i < j ? [i, j] : [j, i];
      if (seen.has(a * n + b)) continue;
      seen.add(a * n + b);
      links.push([a, b]);
    }
  }
  return links;
}

/** The scene for one screen size: nodes (homes and drift), and their links. All in CSS px. */
interface Scene {
  w: number;
  h: number;
  /** Node homes, drift amplitudes, angular speeds and phases, core radii. */
  hx: Float32Array;
  hy: Float32Array;
  ax: Float32Array;
  ay: Float32Array;
  wx: Float32Array;
  wy: Float32Array;
  px: Float32Array;
  py: Float32Array;
  radius: Float32Array;
  /** How lit a node is by a signal that just reached it (rises to 1 over FLASH_RISE, then back to 0 over FLASH_SECONDS). */
  flash: Float32Array;
  /** 1 while a node's light is still rising. */
  rise: Uint8Array;
  /** Where the nodes are this frame. */
  x: Float32Array;
  y: Float32Array;
  links: Link[];
  /** Each link's own brightness (some links shine, most are faint, as in the reference). */
  weight: Float32Array;
  /** Each node's links (indexes into `links`). */
  linksOf: number[][];
}

/** Builds the scene for a w × h screen (CSS px). */
function scene(w: number, h: number, rng: Rng): Scene {
  const pw = w * (1 + 2 * PAD);
  const ph = h * (1 + 2 * PAD);
  const n = Math.max(12, Math.round((NODES_PER_MPX * pw * ph) / 1e6));
  const f32 = () => new Float32Array(n);
  const s = { w, h, hx: f32(), hy: f32(), ax: f32(), ay: f32(), wx: f32(), wy: f32(), px: f32(), py: f32(), radius: f32(), flash: f32(), rise: new Uint8Array(n), x: f32(), y: f32() };
  const want = new Uint8Array(n);
  const weights = CLUSTERS.reduce((sum, c) => sum + c[3], 0);
  for (let i = 0; i < n; i++) {
    // An even scatter over the padded area, or near a cluster.
    if (rng() < SCATTER) {
      s.hx[i] = -PAD * w + rng() * pw;
      s.hy[i] = -PAD * h + rng() * ph;
    } else {
      let pick = rng() * weights;
      const c = CLUSTERS.find((k) => (pick -= k[3]) < 0) ?? CLUSTERS[0]!;
      // A rough normal (sum of two uniforms) round the cluster's centre.
      s.hx[i] = c[0] * w + (rng() + rng() - 1) * c[2] * w;
      s.hy[i] = c[1] * h + (rng() + rng() - 1) * c[2] * w;
    }
    s.ax[i] = between(rng, DRIFT);
    s.ay[i] = between(rng, DRIFT);
    // Slightly different speeds across and down: each node traces a slow, open loop.
    s.wx[i] = (2 * Math.PI) / between(rng, DRIFT_PERIOD);
    s.wy[i] = s.wx[i]! * (0.7 + rng() * 0.6);
    s.px[i] = rng() * 2 * Math.PI;
    s.py[i] = rng() * 2 * Math.PI;
    want[i] = LINKS[Math.floor(rng() * LINKS.length)]!;
    // Hubs are the bigger nodes.
    s.radius[i] = NODE_RADIUS[0] + (NODE_RADIUS[1] - NODE_RADIUS[0]) * Math.min(1, (want[i]! - 2) / 5 + rng() * 0.35);
  }
  const links = linkNodes(s.hx, s.hy, want, MAX_LINK * Math.hypot(w, h), rng);
  const linksOf: number[][] = Array.from({ length: n }, () => []);
  links.forEach(([a, b], k) => {
    linksOf[a]!.push(k);
    linksOf[b]!.push(k);
  });
  const weight = new Float32Array(links.length).map(() => between(rng, LINK_WEIGHT));
  return { ...s, links, weight, linksOf };
}

/**
 * A node sprite's full radius per CSS px of core radius: its size over its
 * core, both whole device px at `dpr` (as sprites() draws them).
 */
export function spriteScale(haloSize: number, dpr: number): number {
  const core = Math.ceil(4 * dpr);
  return Math.ceil(core * haloSize) / core;
}

/** The sprites, one per colour step: a node (white-hot core in a halo). */
interface Sprites {
  node: OffscreenCanvas[];
  /** A node sprite's core radius and full radius (device px). */
  core: number;
  size: number;
  /** The link colours, one per colour step. */
  line: string[];
}

/** Draws the sprites for a palette, glow level and pixel ratio. */
function sprites(palette: WallpaperPalette, glow: GlowLevel, dpr: number): Sprites {
  const g = NEURAL_GLOW[glow];
  const core = Math.ceil(4 * dpr);
  const size = Math.ceil(core * g.haloSize);
  const node: OffscreenCanvas[] = [];
  const line: string[] = [];
  const white: Rgb = [255, 255, 255];
  for (let c = 0; c < COLOR_STEPS; c++) {
    const colour = shade(palette, c / (COLOR_STEPS - 1));
    line.push(css(colour));
    // Node: core (nearly white, tinted) to the colour at its edge, then the halo fading out.
    const sprite = new OffscreenCanvas(size * 2, size * 2);
    const ctx = sprite.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(size, size, 0, size, size, size);
      const edge = core / size;
      grad.addColorStop(0, css(mix(colour, white, 0.75)));
      grad.addColorStop(edge * 0.55, css(mix(colour, white, 0.45)));
      grad.addColorStop(edge, css(colour, 0.95));
      grad.addColorStop(Math.min(0.99, edge * 1.6), css(colour, g.halo * 0.55));
      grad.addColorStop(Math.min(0.995, edge * 3), css(colour, g.halo * 0.18));
      grad.addColorStop(1, css(colour, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size * 2, size * 2);
    }
    node.push(sprite);
  }
  return { node, core, size, line };
}

/** A signal running along a link. */
interface Pulse {
  link: number;
  /** From which end: the node it set off from. */
  from: number;
  /** How far along (0–1), and how fast (share of the link a second). */
  along: number;
  speed: number;
  /** Links left to run after this one. */
  hops: number;
  /** On its first link (it fades in there, instead of appearing at once). */
  first: boolean;
}

/** Creates the neural-net engine on a canvas (the `create` of the Wallpaper). */
function createNeuralNet(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  // Typed as the offscreen kind: the APIs both kinds share, which is all the engine uses.
  const target = canvas as OffscreenCanvas;
  // WebGL 2 first (gl.ts: smooth links at any angle). preserveDrawingBuffer: the tests' probe reads
  // the picture back between frames. No antialias: the shaders make the edges smooth (WORKING.md).
  const gl = target.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  let gpu: NeuralGpu | null = gl ? setUpGl(gl) : null;
  let lost = false;
  // The 2D canvas only where there's no WebGL 2 (a canvas has one kind of context).
  const ctx = gl ? null : target.getContext('2d');
  // Each frame's links' ends and sprites, grown as needed (no new arrays per frame).
  let ends = new Float32Array(0);
  let sparks = new Float32Array(0);
  let palette = options.palette;
  let glow: GlowLevel = options.glow;
  let still = options.still;
  let s: Scene | null = null;
  let art: Sprites | null = null;
  let dpr = 1;
  let running = false;
  let destroyed = false;
  let announced = false;
  let frame = 0;
  let last = 0;
  let pulseDebt = 0;
  const pulses: Pulse[] = [];

  /** Moves everything on by `dt` seconds, at clock time `t` (s). */
  const advance = (t: number, dt: number) => {
    if (!s) return;
    for (let i = 0; i < s.hx.length; i++) {
      s.x[i] = s.hx[i]! + s.ax[i]! * Math.sin(s.wx[i]! * t + s.px[i]!);
      s.y[i] = s.hy[i]! + s.ay[i]! * Math.sin(s.wy[i]! * t + s.py[i]!);
      // A lit node's light rises quickly, then fades slowly.
      if (s.rise[i]) {
        s.flash[i] = Math.min(1, s.flash[i]! + dt / FLASH_RISE);
        if (s.flash[i] === 1) s.rise[i] = 0;
      } else {
        s.flash[i] = Math.max(0, s.flash[i]! - dt / FLASH_SECONDS);
      }
    }
    // New signals, from a random node with links.
    pulseDebt += PULSES_PER_SECOND * dt;
    while (pulseDebt >= 1 && s.links.length) {
      pulseDebt -= 1;
      const k = Math.floor(rng() * s.links.length);
      const link = s.links[k]!;
      const from = rng() < 0.5 ? link[0] : link[1];
      s.rise[from] = 1;
      pulses.push({ link: k, from, along: 0, speed: 0, hops: Math.round(between(rng, PULSE_HOPS)) - 1, first: true });
    }
    // Signals run on; reaching the far node lights it, and may carry on down another of its links.
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]!;
      const [a, b] = s.links[p.link]!;
      if (!p.speed) p.speed = between(rng, PULSE_SPEED) / Math.max(1, Math.hypot(s.x[b]! - s.x[a]!, s.y[b]! - s.y[a]!));
      p.along += p.speed * dt;
      if (p.along < 1) continue;
      const to = p.from === a ? b : a;
      s.rise[to] = 1;
      const next = s.linksOf[to]!.filter((k) => k !== p.link);
      if (p.hops > 0 && next.length) {
        p.link = next[Math.floor(rng() * next.length)]!;
        p.from = to;
        p.along = 0;
        p.speed = 0;
        p.hops--;
        p.first = false;
      } else {
        pulses.splice(i, 1);
      }
    }
  };

  /** This frame for the GPU: each link's ends, then the sprites (nodes on screen, bigger and brighter while lit; then the signals). */
  const pack = (sc: Scene): NeuralFrame => {
    const { w, h } = sc;
    const g = NEURAL_GLOW[glow];
    const n = sc.links.length;
    if (ends.length < n * 4) ends = new Float32Array(n * 4);
    for (let l = 0; l < n; l++) {
      const [a, b] = sc.links[l]!;
      ends[4 * l] = sc.x[a]!;
      ends[4 * l + 1] = sc.y[a]!;
      ends[4 * l + 2] = sc.x[b]!;
      ends[4 * l + 3] = sc.y[b]!;
    }
    const scale = spriteScale(g.haloSize, dpr);
    /** Writes sprite `k`: no small arrays per sprite, so a frame leaves no garbage. */
    const put = (k: number, x: number, y: number, r: number, alpha: number) => {
      sparks[4 * k] = x;
      sparks[4 * k + 1] = y;
      sparks[4 * k + 2] = r;
      sparks[4 * k + 3] = alpha;
    };
    if (sparks.length < (sc.x.length + pulses.length) * 4) sparks = new Float32Array((sc.x.length + pulses.length + 16) * 4);
    let k = 0;
    for (let i = 0; i < sc.x.length; i++) {
      const x = sc.x[i]!;
      const y = sc.y[i]!;
      const r = sc.radius[i]! * (1 + 0.8 * sc.flash[i]!) * scale;
      if (x < -r || y < -r || x > w + r || y > h + r) continue;
      put(k++, x, y, r, Math.min(1, 0.8 + 0.2 * sc.flash[i]!));
    }
    for (const p of pulses) {
      const [a, b] = sc.links[p.link]!;
      const to = p.from === a ? b : a;
      const x = sc.x[p.from]! + (sc.x[to]! - sc.x[p.from]!) * p.along;
      const y = sc.y[p.from]! + (sc.y[to]! - sc.y[p.from]!) * p.along;
      // A new signal fades in over the start of its first link.
      put(k++, x, y, 2.2 * scale, p.first ? Math.min(1, p.along * 8) : 1);
    }
    return { w, h, dpr, ends, links: n, sprites: sparks, sparks: k, maxLink: MAX_LINK * Math.hypot(w, h), lineWidth: LINE_WIDTH, lineGlow: g.lineGlow, glowWidth: 4, edge: 1 / scale, halo: g.halo };
  };

  /** Draws the scene as it is now: with WebGL 2 where there is one (gl.ts), else on the 2D canvas. */
  const draw = () => {
    if (!s) return;
    if (gl) {
      if (gpu && !lost) drawGl(gl, gpu, pack(s), palette);
    } else {
      draw2d();
    }
    // The first frame is on the canvas: the host fades it in.
    if (!announced) {
      announced = true;
      options.onReady?.();
    }
  };

  /** The 2D drawing, where there's no WebGL 2. */
  const draw2d = () => {
    if (!ctx || !s || !art) return;
    const { w, h } = s;
    const g = NEURAL_GLOW[glow];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw in CSS px; the sprites are at device resolution, so they stay sharp.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const step = (x: number, y: number) => Math.round(diagonal(x / w, y / h) * (COLOR_STEPS - 1));

    // 1. Links: one stroke each, at its exact opacity (by length, longer is
    //    fainter, times its own weight), so it fades smoothly as it stretches.
    const maxLen = MAX_LINK * Math.hypot(w, h);
    const links = s.links;
    const stroke = (width: number, strength: number) => {
      ctx.lineWidth = width;
      let colour = -1;
      for (let l = 0; l < links.length; l++) {
        const [a, b] = links[l]!;
        const x1 = s!.x[a]!;
        const y1 = s!.y[a]!;
        const x2 = s!.x[b]!;
        const y2 = s!.y[b]!;
        // Off the screen altogether: skip.
        if ((x1 < 0 && x2 < 0) || (x1 > w && x2 > w) || (y1 < 0 && y2 < 0) || (y1 > h && y2 > h)) continue;
        const len = Math.min(1, Math.hypot(x2 - x1, y2 - y1) / maxLen);
        ctx.globalAlpha = strength * Math.min(1, (LINE_ALPHA[0] + (LINE_ALPHA[1] - LINE_ALPHA[0]) * len) * s!.weight[l]!);
        const c = step((x1 + x2) / 2, (y1 + y2) / 2);
        // The colour string only when it changes (neighbouring links mostly share one).
        if (c !== colour) ctx.strokeStyle = art!.line[(colour = c)]!;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };
    // A soft, wide pass first (the glow), then the thin lines.
    if (g.lineGlow > 0) stroke(LINE_WIDTH * 4, g.lineGlow);
    stroke(LINE_WIDTH, 1);

    // 2. Nodes: a halo sprite each, bigger and brighter while lit by a signal.
    const scale = art.size / art.core;
    for (let i = 0; i < s.x.length; i++) {
      const x = s.x[i]!;
      const y = s.y[i]!;
      const r = s.radius[i]! * (1 + 0.8 * s.flash[i]!) * scale;
      if (x < -r || y < -r || x > w + r || y > h + r) continue;
      ctx.globalAlpha = Math.min(1, 0.8 + 0.2 * s.flash[i]!);
      ctx.drawImage(art.node[step(x, y)]!, x - r, y - r, 2 * r, 2 * r);
    }

    // 3. Signals: a bright spark on its link.
    for (const p of pulses) {
      const [a, b] = s.links[p.link]!;
      const to = p.from === a ? b : a;
      const x = s.x[p.from]! + (s.x[to]! - s.x[p.from]!) * p.along;
      const y = s.y[p.from]! + (s.y[to]! - s.y[p.from]!) * p.along;
      const r = 2.2 * scale;
      // A new signal fades in over the start of its first link.
      ctx.globalAlpha = p.first ? Math.min(1, p.along * 8) : 1;
      ctx.drawImage(art.node[step(x, y)]!, x - r, y - r, 2 * r, 2 * r);
    }
    ctx.globalAlpha = 1;
  };

  /** One animation frame. */
  const tick = (now: number) => {
    frame = 0;
    if (!running || still) return;
    const dt = last ? Math.min((now - last) / 1000, MAX_FRAME_STEP) : 0;
    last = now;
    advance(now / 1000, dt);
    draw();
    frame = requestAnimationFrame(tick);
  };

  /** Draws one frame now (a still frame, or the first). */
  const drawNow = () => {
    advance(performance.now() / 1000, 0);
    draw();
  };

  const instance: WallpaperInstance = {
    resize(cw, ch, ratio, zoom) {
      if (destroyed || (!ctx && !gl)) return;
      // Zoomed: laid out for a screen 1/zoom as big, drawn zoom times as large (the canvas keeps its pixels).
      const { w, h, dpr: nextDpr } = zoomedSize(cw, ch, ratio, zoom, MAX_DPR);
      canvas.width = Math.round(w * nextDpr);
      canvas.height = Math.round(h * nextDpr);
      // The 2D drawing's sprites (the GPU works its sprites out per pixel).
      if (ctx && (!art || nextDpr !== dpr)) art = sprites(palette, glow, nextDpr);
      dpr = nextDpr;
      if (!s || s.w !== w || s.h !== h) {
        const start = performance.now();
        s = scene(w, h, rng);
        pulses.length = 0;
        // The links' weights never change on a screen: sent once.
        if (gl && gpu) sendWeights(gl, gpu, s.weight);
        performance.measure('neural-scene', { start });
      }
      drawNow();
    },
    start() {
      running = true;
      if (still || frame || destroyed) return;
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
        drawNow();
      } else if (running) {
        instance.start();
      }
    },
    setGlow(next) {
      if (next === glow) return;
      glow = next;
      if (ctx) art = sprites(palette, glow, dpr);
      if (still) drawNow();
    },
    setPalette(next) {
      palette = next;
      if (ctx) art = sprites(palette, glow, dpr);
      if (still) drawNow();
    },
    destroy() {
      destroyed = true;
      instance.stop();
      s = null;
      art = null;
    },
  };

  // The graphics card can drop the context (a driver reset): pause, then set everything up again.
  target.addEventListener('contextlost', (e) => {
    e.preventDefault();
    lost = true;
  });
  target.addEventListener('contextrestored', () => {
    lost = false;
    gpu = gl ? setUpGl(gl) : null;
    if (gl && gpu && s) sendWeights(gl, gpu, s.weight);
    draw();
  });
  return instance;
}

/** The neural-net wallpaper. */
export const neuralNet: Wallpaper = {
  id: 'neural-net',
  create: (canvas, options) => createNeuralNet(canvas, options),
};
