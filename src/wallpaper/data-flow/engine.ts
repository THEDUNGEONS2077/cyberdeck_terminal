/**
 * src/wallpaper/data-flow/engine.ts: the DATA FLOW wallpaper: a circuit
 * board at night, data running through it (board.ts lays the board out).
 *
 * Layer: wallpaper (canvas; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * The board doesn't move, so it's drawn once (per size, palette and glow)
 * into a layer of its own: the dot grid, the traces (with a soft glow),
 * vias, pads and the chips. Each frame copies that layer, then adds the
 * light on top ('lighter'): packets running along the traces (a soft halo,
 * a tail fading towards the back in a few slices, a glowing head), the
 * afterglow of traces that just carried one, vias flashing as packets
 * reach them, chips glowing as data arrives. A frame is one copy and a
 * few hundred small strokes, whatever the screen size. It draws on every
 * frame the screen shows (the packets move fast; the web build is for a
 * PC that can afford it: full fidelity, the user's choice, 2026-10-23).
 * Colours come from the wallpaper's palette: warm traces and packets in
 * --text-dim / --accent, cool ones in --cool.
 */
import type { GlowLevel } from '@/lib/layout';

import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, type WallpaperPalette, zoomedSize } from '../types';
import { type Board, buildBoard, pointAt, type Rng, type Trace, traceLength } from './board';
import {
  AFTERGLOW_SECONDS,
  CHIP_GLOW_SECONDS,
  FLASH_SECONDS,
  FLOW_GLOW,
  INBOUND,
  MAX_DPR,
  MAX_FRAME_STEP,
  PITCH,
  PREWARM_SECONDS,
  PULSE_SPEED,
  PULSE_TAIL,
  PULSES_PER_MPX,
  VOLLEY_EVERY,
  VOLLEY_STAGGER,
} from './params';

/** A colour as [r, g, b] (0–255). */
type Rgb = [number, number, number];

/** `#rrggbb` → [r, g, b]. */
function rgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The colour `t` of the way from `a` to `b`. */
const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** [r, g, b] (+ alpha) → a canvas colour. */
const css = ([r, g, b]: Rgb, a = 1) => `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;

/** The board's colours from a palette: traces, vias, chips, and the light of packets (warm and cool). */
export function flowTones(p: WallpaperPalette) {
  const bg = rgb(p.bg);
  const line = rgb(p.line);
  const dim = rgb(p.dim);
  const cool = rgb(p.cool);
  const white: Rgb = [255, 255, 255];
  return {
    dot: mix(bg, line, 0.9),
    warmTrace: mix(line, dim, 0.5),
    coolTrace: mix(bg, cool, 0.6),
    warmVia: mix(line, dim, 0.75),
    coolVia: mix(bg, cool, 0.85),
    chipBody: mix(bg, line, 0.4),
    chipEdge: mix(line, dim, 0.6),
    die: mix(line, dim, 0.25),
    warmLight: rgb(p.accent),
    warmHead: rgb(p.bright),
    coolLight: mix(cool, white, 0.35),
    coolHead: mix(cool, white, 0.8),
  };
}

/** A packet of light: its trace, how far it's come (grid units, its head), speed (units/s), tail (units), which way, and a wait before it sets off (volleys). */
interface Pulse {
  trace: number;
  d: number;
  speed: number;
  tail: number;
  reverse: boolean;
  wait: number;
  arrived: boolean;
}

/** A flash where a packet reached a via or pad (grid point), and how much is left of it (1 → 0). */
interface Flash {
  x: number;
  y: number;
  life: number;
  cool: boolean;
}

/** A round glow sprite: `core` at the middle fading to `edge`, of radius r (device px). */
function sprite(core: Rgb, edge: Rgb, r: number, ring = false): OffscreenCanvas {
  const size = Math.max(2, Math.ceil(r));
  const c = new OffscreenCanvas(size * 2, size * 2);
  const g = c.getContext('2d');
  if (!g) return c;
  const grad = g.createRadialGradient(size, size, 0, size, size, size);
  if (ring) {
    // A flash: a bright ring round a via, soft both sides.
    grad.addColorStop(0, css(edge, 0));
    grad.addColorStop(0.35, css(edge, 0.35));
    grad.addColorStop(0.5, css(core, 0.9));
    grad.addColorStop(0.7, css(edge, 0.3));
    grad.addColorStop(1, css(edge, 0));
  } else {
    grad.addColorStop(0, css(core, 1));
    grad.addColorStop(0.2, css(mix(core, edge, 0.5), 0.85));
    grad.addColorStop(0.45, css(edge, 0.35));
    grad.addColorStop(1, css(edge, 0));
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, size * 2, size * 2);
  return c;
}

/** Creates the DATA FLOW engine on a canvas (the `create` of the Wallpaper). */
function createDataFlow(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  // Typed as the offscreen kind: the 2D API both kinds share, which is all the engine uses.
  const ctx = (canvas as OffscreenCanvas).getContext('2d');
  let palette = options.palette;
  let glow: GlowLevel = options.glow;
  let still = options.still;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let running = false;
  let announced = false;
  let frame = 0;
  let last = 0;
  let board: Board | null = null;
  let art: { layer: OffscreenCanvas; warmHead: OffscreenCanvas; coolHead: OffscreenCanvas; warmRing: OffscreenCanvas; coolRing: OffscreenCanvas } | null = null;
  let tones = flowTones(palette);
  // The packets, flashes, each trace's afterglow and each chip's glow.
  let pulses: Pulse[] = [];
  let flashes: Flash[] = [];
  let heat = new Float32Array(0);
  let chipGlow = new Float32Array(0);
  // Picking traces by length (longer carry more): their lengths, summed.
  let cumulative = new Float32Array(0);
  let pulseDebt = 0;
  let volleyIn = 0;
  const at = [0, 0];

  /** Draws the still board into its own layer (device px). */
  const drawBoard = (b: Board): OffscreenCanvas => {
    const layer = new OffscreenCanvas(Math.max(1, Math.round(w * dpr)), Math.max(1, Math.round(h * dpr)));
    const g = layer.getContext('2d');
    if (!g) return layer;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const level = FLOW_GLOW[glow];
    // 1. The dot grid, brightest round the main chip and fading out (a board seen by its own light).
    const main = b.chips.find((c) => c.main);
    const mx = main ? (main.x + main.w / 2) * PITCH : w / 2;
    const my = main ? (main.y + main.h / 2) * PITCH : h / 2;
    const far = Math.hypot(Math.max(mx, w - mx), Math.max(my, h - my));
    g.fillStyle = css(tones.dot);
    for (let y = 0; y <= h; y += PITCH) {
      for (let x = 0; x <= w; x += PITCH) {
        g.globalAlpha = 0.85 - 0.6 * (Math.hypot(x - mx, y - my) / far);
        g.fillRect(x - 0.5, y - 0.5, 1, 1);
      }
    }
    g.globalAlpha = 1;
    // 2. The traces, with a soft glow (the glow level's), then their vias and pads.
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const t of b.traces) {
      const colour = t.cool ? tones.coolTrace : tones.warmTrace;
      g.strokeStyle = css(colour);
      g.lineWidth = t.width;
      g.shadowColor = css(colour, 0.7);
      g.shadowBlur = level.board * dpr;
      g.beginPath();
      g.moveTo(t.pts[0]! * PITCH, t.pts[1]! * PITCH);
      for (let i = 2; i < t.pts.length; i += 2) g.lineTo(t.pts[i]! * PITCH, t.pts[i + 1]! * PITCH);
      g.stroke();
    }
    g.shadowBlur = 0;
    for (const t of b.traces) {
      const colour = t.cool ? tones.coolVia : tones.warmVia;
      const n = t.pts.length;
      for (const [end, x, y] of [
        [t.start, t.pts[0]!, t.pts[1]!],
        [t.end, t.pts[n - 2]!, t.pts[n - 1]!],
      ] as const) {
        if (end === 'via') {
          // A ring round a hole.
          g.fillStyle = css(rgb(palette.bg));
          g.strokeStyle = css(colour);
          g.lineWidth = 1.2;
          g.beginPath();
          g.arc(x * PITCH, y * PITCH, PITCH * 0.3, 0, Math.PI * 2);
          g.fill();
          g.stroke();
        } else if (end === 'pad') {
          const s = PITCH * 0.55;
          g.fillStyle = css(colour, 0.45);
          g.strokeStyle = css(colour);
          g.lineWidth = 1;
          g.fillRect(x * PITCH - s / 2, y * PITCH - s / 2, s, s);
          g.strokeRect(x * PITCH - s / 2, y * PITCH - s / 2, s, s);
        }
      }
    }
    // 3. The chips: a dark body, its edge, pin stubs, a pin-1 mark; the main chip shows its die.
    for (const c of b.chips) {
      const x0 = (c.x - 0.5) * PITCH;
      const y0 = (c.y - 0.5) * PITCH;
      const cw = c.w * PITCH;
      const ch = c.h * PITCH;
      g.strokeStyle = css(tones.chipEdge);
      g.lineWidth = 1.2;
      for (const p of c.pins) {
        g.beginPath();
        g.moveTo(p.x * PITCH, p.y * PITCH);
        const [dx, dy] = p.dir === 0 ? [-1, 0] : p.dir === 2 ? [0, -1] : p.dir === 4 ? [1, 0] : [0, 1];
        g.lineTo((p.x + dx * 0.5) * PITCH, (p.y + dy * 0.5) * PITCH);
        g.stroke();
      }
      g.fillStyle = css(tones.chipBody);
      g.fillRect(x0, y0, cw, ch);
      g.strokeRect(x0, y0, cw, ch);
      g.fillStyle = css(tones.chipEdge, 0.8);
      g.beginPath();
      g.arc(x0 + PITCH * 0.7, y0 + PITCH * 0.7, Math.max(1.5, PITCH * 0.14), 0, Math.PI * 2);
      g.fill();
      if (c.main) {
        // The die: an inner square with a fine grid on it.
        const inset = PITCH * 2;
        g.strokeStyle = css(tones.die, 0.9);
        g.lineWidth = 1;
        g.strokeRect(x0 + inset, y0 + inset, cw - 2 * inset, ch - 2 * inset);
        g.strokeStyle = css(tones.die, 0.35);
        g.beginPath();
        for (let x = x0 + inset + PITCH; x < x0 + cw - inset; x += PITCH) {
          g.moveTo(x, y0 + inset);
          g.lineTo(x, y0 + ch - inset);
        }
        for (let y = y0 + inset + PITCH; y < y0 + ch - inset; y += PITCH) {
          g.moveTo(x0 + inset, y);
          g.lineTo(x0 + cw - inset, y);
        }
        g.stroke();
      }
    }
    return layer;
  };

  /** The board's layer and the light's sprites, for the palette and glow now. */
  const makeArt = () => {
    if (!board) return;
    const level = FLOW_GLOW[glow];
    const head = level.head * dpr;
    art = {
      layer: drawBoard(board),
      warmHead: sprite(tones.warmHead, tones.warmLight, head),
      coolHead: sprite(tones.coolHead, tones.coolLight, head),
      warmRing: sprite(tones.warmHead, tones.warmLight, PITCH * 0.9 * dpr, true),
      coolRing: sprite(tones.coolHead, tones.coolLight, PITCH * 0.9 * dpr, true),
    };
  };

  /** A new board for the screen: its layout, then a little data already running. */
  const build = () => {
    board = buildBoard(w, h, rng);
    heat = new Float32Array(board.traces.length);
    chipGlow = new Float32Array(board.chips.length);
    cumulative = new Float32Array(board.traces.length);
    let sum = 0;
    board.traces.forEach((t, i) => {
      sum += traceLength(t);
      cumulative[i] = sum;
    });
    pulses = [];
    flashes = [];
    volleyIn = 1;
    makeArt();
    for (let s = 0; s < PREWARM_SECONDS; s += 1 / 30) advance(1 / 30);
  };

  /** A packet on trace `ti`, setting off after `wait` (s). */
  const launch = (ti: number, reverse: boolean, speed: number, tail: number, wait: number) => {
    pulses.push({ trace: ti, d: 0, speed, tail, reverse, wait, arrived: false });
  };

  /** A random trace, the longer the likelier. */
  const someTrace = (): number => {
    const total = cumulative[cumulative.length - 1] ?? 0;
    const r = rng() * total;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid]! < r) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  /** A packet's way: a chip's packets run in to it (INBOUND of them) or out; a loose trace's either way. */
  const way = (t: Trace) => (t.chip >= 0 ? rng() < INBOUND : rng() < 0.5);

  /** Moves everything on by `dt` seconds. */
  const advance = (dt: number) => {
    const b = board;
    if (!b || b.traces.length === 0) return;
    // New packets, about PULSES_PER_MPX a second per million px of screen.
    pulseDebt += ((PULSES_PER_MPX * w * h) / 1e6) * dt;
    while (pulseDebt >= 1) {
      pulseDebt -= 1;
      const ti = someTrace();
      launch(ti, way(b.traces[ti]!), (rng() * (PULSE_SPEED[1] - PULSE_SPEED[0]) + PULSE_SPEED[0]) / PITCH, (rng() * (PULSE_TAIL[1] - PULSE_TAIL[0]) + PULSE_TAIL[0]) / PITCH, 0);
    }
    // Now and then a volley along a whole bus: the same way, the same speed, a little apart.
    volleyIn -= dt;
    if (volleyIn <= 0 && b.buses.length > 0) {
      volleyIn = VOLLEY_EVERY[0] + rng() * (VOLLEY_EVERY[1] - VOLLEY_EVERY[0]);
      const bus = b.buses[Math.floor(rng() * b.buses.length)]!;
      const first = b.traces[bus[0]!]!;
      const reverse = way(first);
      const speed = (rng() * (PULSE_SPEED[1] - PULSE_SPEED[0]) + PULSE_SPEED[0]) / PITCH;
      const tail = (rng() * (PULSE_TAIL[1] - PULSE_TAIL[0]) + PULSE_TAIL[0]) / PITCH;
      for (const ti of bus) launch(ti, reverse, speed, tail, rng() * VOLLEY_STAGGER);
    }
    // Packets run on; a head reaching the far end flashes its via or lights its chip; a tail all in, it's gone.
    for (const p of pulses) {
      if (p.wait > 0) {
        p.wait -= dt;
        continue;
      }
      p.d += p.speed * dt;
      const t = b.traces[p.trace]!;
      const len = traceLength(t);
      // While it runs, its trace warms (the afterglow it leaves).
      heat[p.trace] = Math.min(1, Math.max(heat[p.trace]!, 0.6));
      if (!p.arrived && p.d >= len) {
        p.arrived = true;
        const end = p.reverse ? t.start : t.end;
        const n = t.pts.length;
        const [x, y] = p.reverse ? [t.pts[0]!, t.pts[1]!] : [t.pts[n - 2]!, t.pts[n - 1]!];
        if (end === 'via' || end === 'pad') flashes.push({ x, y, life: 1, cool: t.cool });
        if (end === 'chip' && t.chip >= 0) chipGlow[t.chip] = Math.min(1, chipGlow[t.chip]! + 0.35);
      }
    }
    pulses = pulses.filter((p) => p.wait > 0 || p.d < traceLength(b.traces[p.trace]!) + p.tail);
    for (let i = 0; i < heat.length; i++) heat[i] = Math.max(0, heat[i]! - dt / AFTERGLOW_SECONDS);
    for (let i = 0; i < chipGlow.length; i++) chipGlow[i] = Math.max(0, chipGlow[i]! - dt / CHIP_GLOW_SECONDS);
    for (const f of flashes) f.life -= dt / FLASH_SECONDS;
    flashes = flashes.filter((f) => f.life > 0);
  };

  /** Adds trace `t`'s path from `a` to `b` (grid units from its start) to the current path. */
  const pathPart = (t: Trace, a: number, b: number) => {
    if (!ctx) return;
    pointAt(t, a, at);
    ctx.moveTo(at[0]! * PITCH, at[1]! * PITCH);
    for (let i = 1; i < t.len.length - 1; i++) {
      if (t.len[i]! > a && t.len[i]! < b) ctx.lineTo(t.pts[2 * i]! * PITCH, t.pts[2 * i + 1]! * PITCH);
    }
    pointAt(t, b, at);
    ctx.lineTo(at[0]! * PITCH, at[1]! * PITCH);
  };

  /** Draws the frame: the board, then the light. */
  const draw = () => {
    if (!ctx || !board || !art) return;
    const level = FLOW_GLOW[glow];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(art.layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Chips taking data in: a glow over the body, and its edge lit.
    board.chips.forEach((c, i) => {
      const a = chipGlow[i]!;
      if (a < 0.01) return;
      ctx.fillStyle = css(tones.warmLight, 0.1 * a);
      ctx.fillRect((c.x - 0.5) * PITCH, (c.y - 0.5) * PITCH, c.w * PITCH, c.h * PITCH);
      ctx.strokeStyle = css(tones.warmLight, 0.55 * a);
      ctx.lineWidth = 1.5;
      ctx.strokeRect((c.x - 0.5) * PITCH, (c.y - 0.5) * PITCH, c.w * PITCH, c.h * PITCH);
    });

    // 2. Afterglow: traces that just carried data, fading.
    board.traces.forEach((t, i) => {
      const a = heat[i]!;
      if (a < 0.02) return;
      ctx.strokeStyle = css(t.cool ? tones.coolLight : tones.warmLight, 0.3 * a);
      ctx.lineWidth = t.width + 0.6;
      ctx.beginPath();
      pathPart(t, 0, traceLength(t));
      ctx.stroke();
    });

    // 3. Packets: a soft halo along the tail, the tail brightening towards the head in slices, the head's glow.
    const slices = 6;
    for (const p of pulses) {
      if (p.wait > 0) continue;
      const t = board.traces[p.trace]!;
      const len = traceLength(t);
      const head = Math.min(p.d, len);
      const back = Math.max(0, p.d - p.tail);
      if (head <= back) continue;
      const light = t.cool ? tones.coolLight : tones.warmLight;
      // Along the trace from its start: a packet running in reverse is mirrored.
      const span = (a: number, b: number) => (p.reverse ? pathPart(t, len - b, len - a) : pathPart(t, a, b));
      ctx.strokeStyle = css(light, level.haloAlpha);
      ctx.lineWidth = t.width * level.halo;
      ctx.beginPath();
      span(back, head);
      ctx.stroke();
      ctx.lineWidth = t.width + 0.8;
      for (let k = 0; k < slices; k++) {
        const a = back + ((head - back) * k) / slices;
        const b = back + ((head - back) * (k + 1)) / slices;
        const f = (k + 1) / slices;
        ctx.strokeStyle = css(light, f * f);
        ctx.beginPath();
        span(a, b);
        ctx.stroke();
      }
      if (p.d <= len) {
        pointAt(t, p.reverse ? len - head : head, at);
        const s = t.cool ? art.coolHead : art.warmHead;
        const r = s.width / 2 / dpr;
        ctx.drawImage(s, at[0]! * PITCH - r, at[1]! * PITCH - r, r * 2, r * 2);
      }
    }

    // 4. Vias reached: a ring of light, fading.
    for (const f of flashes) {
      const s = f.cool ? art.coolRing : art.warmRing;
      const r = s.width / 2 / dpr;
      ctx.globalAlpha = f.life;
      ctx.drawImage(s, f.x * PITCH - r, f.y * PITCH - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    if (!announced) {
      announced = true;
      options.onReady?.();
    }
  };

  /** One animation frame (every frame the screen shows). */
  const tick = (now: number) => {
    frame = 0;
    if (!running || still) return;
    const dt = last ? Math.min((now - last) / 1000, MAX_FRAME_STEP) : 0;
    last = now;
    advance(dt);
    draw();
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(cssW, cssH, ratio, zoom) {
      // Zoomed: the board laid out for a screen 1/zoom as big, drawn zoom times as large (the canvas keeps its pixels).
      const { w: cw, h: ch, dpr: next } = zoomedSize(cssW, cssH, ratio, zoom, MAX_DPR);
      canvas.width = Math.round(cw * next);
      canvas.height = Math.round(ch * next);
      const rebuild = cw !== w || ch !== h || !board;
      const redraw = next !== dpr;
      w = cw;
      h = ch;
      dpr = next;
      if (rebuild) build();
      else if (redraw) makeArt();
      draw();
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
      draw();
    },
    setGlow(next) {
      glow = next;
      makeArt();
      if (still) draw();
    },
    setPalette(next) {
      palette = next;
      tones = flowTones(palette);
      makeArt();
      if (still) draw();
    },
    destroy() {
      instance.stop();
      board = null;
      art = null;
      w = 0;
    },
  };
  return instance;
}

/** The DATA FLOW wallpaper. */
export const dataFlow: Wallpaper = {
  id: 'data-flow',
  create: (canvas, options) => createDataFlow(canvas, options),
};
