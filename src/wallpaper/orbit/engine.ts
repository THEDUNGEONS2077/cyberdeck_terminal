/**
 * src/wallpaper/orbit/engine.ts: the ORBIT wallpaper: a sunrise over the
 * Earth from orbit, its clouds drifting as the planet turns.
 *
 * Layer: wallpaper (WebGL 2; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * Unlike the other wallpapers this one is a fragment shader (shader.ts):
 * soft clouds over a curved, foreshortened surface need every pixel worked
 * out, which the graphics card does each frame for next to nothing. The
 * engine only sets the scene's geometry (the reference's, fitted to the
 * screen: params.ts) and colours (the wallpaper's palette), and draws one
 * screen-covering triangle per frame (up to about 72 a second).
 *
 * If WebGL 2 isn't there, it draws a still 2D picture instead (sky, edge,
 * planet); if the graphics context is lost, it waits and starts again.
 */
import type { GlowLevel } from '@/lib/layout';

import type { Wallpaper, WallpaperInstance, WallpaperOptions, WallpaperPalette } from '../types';
import { CENTER, CLOUD_DRIFT, CROP_X, CROP_Y, MAX_FRAME_STEP, MAX_RENDER_DPR, MIN_FRAME_MS, ORBIT_GLOW, RADIUS, REF_H, REF_W, SUN } from './params';
import { FRAGMENT, VERTEX } from './shader';

/** The scene's geometry on a w × h screen (CSS px): scale (CSS px per reference px), the planet and the sun. */
export interface Geometry {
  scale: number;
  center: [number, number];
  radius: number;
  sun: [number, number];
}

/**
 * Fits the reference's scene to a w × h screen: scaled to cover it, cropped
 * by CROP_X / CROP_Y, but never so far that the sun sits less than a fifth
 * of the way in (a tall, narrow screen would crop it off).
 */
export function fit(w: number, h: number): Geometry {
  const scale = Math.max(h / REF_H, w / REF_W);
  const ox = Math.max((w - REF_W * scale) * CROP_X, 0.2 * w - SUN[0] * scale);
  const oy = (h - REF_H * scale) * CROP_Y;
  const at = ([x, y]: readonly [number, number]): [number, number] => [ox + x * scale, oy + y * scale];
  return { scale, center: at(CENTER), radius: RADIUS * scale, sun: at(SUN) };
}

/** `#rrggbb` → [r, g, b] in 0–1 (for the shader). */
export function vec3(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** The uniforms the engine sets. */
const UNIFORMS = ['u_res', 'u_ratio', 'u_time', 'u_scale', 'u_center', 'u_radius', 'u_sun', 'u_glow', 'u_drift', 'u_bg', 'u_cool', 'u_accent', 'u_bright'] as const;
type Uniform = (typeof UNIFORMS)[number];

/** A compiled program and where its uniforms are. */
interface Gpu {
  gl: WebGL2RenderingContext;
  uniforms: Record<Uniform, WebGLUniformLocation | null>;
}

/** Compiles the shaders and sets up the screen-covering triangle; null if anything fails. */
function setUp(gl: WebGL2RenderingContext): Gpu | null {
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('orbit shader:', gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vs = compile(gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('orbit program:', gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);
  // One triangle bigger than the screen: every pixel is covered once.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, 'a_pos');
  gl.enableVertexAttribArray(pos);
  gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(UNIFORMS.map((u) => [u, gl.getUniformLocation(program, u)])) as Record<Uniform, WebGLUniformLocation | null>;
  return { gl, uniforms };
}

/** The still 2D picture, when WebGL 2 isn't there: sky, the bright edge, the planet. */
function drawStill(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, ratio: number, palette: WallpaperPalette): void {
  const g = fit(w, h);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, palette.bg);
  sky.addColorStop(1, palette.cool);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.beginPath();
  ctx.arc(g.center[0], g.center[1], g.radius, 0, Math.PI * 2);
  ctx.fillStyle = palette.bg;
  ctx.shadowColor = palette.accent;
  ctx.shadowBlur = 40;
  ctx.fill();
}

/** Creates the ORBIT engine on a canvas (the `create` of the Wallpaper). */
function createOrbit(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions): WallpaperInstance {
  const target = canvas as OffscreenCanvas;
  // preserveDrawingBuffer: the tests' probe reads the picture back between frames.
  const gl = target.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  let gpu = gl ? setUp(gl) : null;
  let palette = options.palette;
  let glow: GlowLevel = options.glow;
  let still = options.still;
  let size: { w: number; h: number; ratio: number } | null = null;
  let running = false;
  let lost = false;
  let announced = false;
  let frame = 0;
  let last = 0;
  // Cloud drift so far: kept across stops, so the clouds never jump.
  let drift = 0;

  /** Draws the scene at clock time `t` (s). */
  const draw = (t: number) => {
    if (!size) return;
    const { w, h, ratio } = size;
    if (gpu && !lost) {
      const { gl: g, uniforms: u } = gpu;
      const geo = fit(w, h);
      g.viewport(0, 0, canvas.width, canvas.height);
      g.uniform2f(u.u_res, canvas.width, canvas.height);
      g.uniform1f(u.u_ratio, ratio);
      g.uniform1f(u.u_time, t);
      g.uniform1f(u.u_scale, geo.scale);
      g.uniform2f(u.u_center, ...geo.center);
      g.uniform1f(u.u_radius, geo.radius);
      g.uniform2f(u.u_sun, ...geo.sun);
      g.uniform1f(u.u_glow, ORBIT_GLOW[glow]);
      g.uniform1f(u.u_drift, drift);
      g.uniform3f(u.u_bg, ...vec3(palette.bg));
      g.uniform3f(u.u_cool, ...vec3(palette.cool));
      g.uniform3f(u.u_accent, ...vec3(palette.accent));
      g.uniform3f(u.u_bright, ...vec3(palette.bright));
      g.drawArrays(g.TRIANGLES, 0, 3);
    } else if (!gl) {
      const ctx = target.getContext('2d');
      if (ctx) drawStill(ctx, w, h, ratio, palette);
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
    drift += CLOUD_DRIFT * dt;
    draw(now / 1000);
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(w, h, dpr) {
      const ratio = Math.min(MAX_RENDER_DPR, Math.max(1, dpr));
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      size = { w, h, ratio };
      draw(performance.now() / 1000);
    },
    start() {
      running = true;
      // Only an animated, working scene needs frames (the 2D stand-in is still).
      if (still || frame || !gpu) return;
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
      if (still) draw(performance.now() / 1000);
    },
    destroy() {
      instance.stop();
      size = null;
    },
  };

  // The graphics card can drop the context (a driver reset): pause, then set up again.
  target.addEventListener('contextlost', (e) => {
    e.preventDefault();
    lost = true;
  });
  target.addEventListener('contextrestored', () => {
    lost = false;
    gpu = gl ? setUp(gl) : null;
    draw(performance.now() / 1000);
  });
  return instance;
}

/** The ORBIT wallpaper. */
export const orbit: Wallpaper = {
  id: 'orbit',
  create: (canvas, options) => createOrbit(canvas, options),
};
