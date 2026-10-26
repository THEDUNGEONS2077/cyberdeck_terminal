/**
 * src/wallpaper/horizon/engine.ts: the HORIZON wallpaper: a wireframe land
 * running to a glowing horizon, the camera gliding forward over it.
 *
 * Layer: wallpaper (WebGL 2; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * Built for smoothness (0.16.0):
 *   - the sky (shaders/sky.frag: the plum sky, the glow and its haze, the
 *     white core) never changes, so it's drawn once, when the size,
 *     palette or glow changes; the canvas keeps it (preserveDrawingBuffer);
 *   - each frame redraws only the bottom half: the land (land.ts: about
 *     12 000 triangles made once, placed by the camera's distance alone, one
 *     number), its edges over dark faces, then the far wall of haze that
 *     fills the band up to the horizon (land.ts). The strips are drawn
 *     nearest first, so the depth test skips the hidden far ones before
 *     they're shaded.
 * Up to about 72 frames a second. The shaders are written to be fluid_motion's too, byte for byte,
 * when HORIZON is ported there. If WebGL 2 isn't there, a still 2D
 * picture (the sky and its glow); if the graphics context is lost, it
 * waits and starts again.
 */
import type { GlowLevel } from '@/lib/layout';

import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, zoomedSize } from '../types';
import { buildLand, horizonTones, type HorizonTones, landMesh, type Rng, STRIP_VERTICES, VERTEX, WALL_VERTICES } from './land';
import { CAMERA, FOG, HORIZON_GLOW, LENS, LINE, MAX_DPR, MAX_FRAME_STEP, MIN_FRAME_MS, ROWS, SPEED, SUN } from './params';
import fullVert from './shaders/full.vert?raw';
import landFrag from './shaders/land.frag?raw';
import landVert from './shaders/land.vert?raw';
import skyFrag from './shaders/sky.frag?raw';

/** The far clip (units): just past the farthest strip. */
const FAR = ROWS + 2;

/** A compiled program, its uniforms looked up once each. */
interface Program {
  program: WebGLProgram;
  u(name: string): WebGLUniformLocation | null;
}

/** Compiles and links two shaders; null (and a console note) if either fails. */
function compile(gl: WebGL2RenderingContext, vs: string, fs: string): Program | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('horizon shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const v = shader(gl.VERTEX_SHADER, vs);
  const f = shader(gl.FRAGMENT_SHADER, fs);
  const program = gl.createProgram();
  if (!v || !f || !program) return null;
  gl.attachShader(program, v);
  gl.attachShader(program, f);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('horizon program:', gl.getProgramInfoLog(program));
    return null;
  }
  const seen = new Map<string, WebGLUniformLocation | null>();
  return {
    program,
    u(name) {
      if (!seen.has(name)) seen.set(name, gl.getUniformLocation(program, name));
      return seen.get(name)!;
    },
  };
}

/** Everything on the graphics card. */
interface Gpu {
  sky: Program;
  land: Program;
  empty: WebGLVertexArrayObject;
  mesh: { buffer: WebGLBuffer; vao: WebGLVertexArrayObject; count: number };
}

/** Sets up the programs and the land's buffer (filled by sendLand); null if anything fails. */
function setUp(gl: WebGL2RenderingContext): Gpu | null {
  const sky = compile(gl, fullVert, skyFrag);
  const land = compile(gl, landVert, landFrag);
  if (!sky || !land) return null;
  const buffer = gl.createBuffer()!;
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  // Per vertex: (x, height), then (strip, row in it, depth offset, corner).
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, VERTEX * 4, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, VERTEX * 4, 2 * 4);
  gl.bindVertexArray(null);
  return { sky, land, empty: gl.createVertexArray()!, mesh: { buffer, vao, count: 0 } };
}

/** The still picture, when WebGL 2 isn't there: the sky and its glow. */
function drawStill(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, ratio: number, t: HorizonTones): void {
  const css = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(', ')})`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, css(t.skyTop));
  sky.addColorStop(1, css(t.skyLow));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * SUN.x, h * LENS.horizon, 0, w * SUN.x, h * LENS.horizon, h * SUN.dome.ry);
  glow.addColorStop(0, css(t.glow));
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

/** Creates the HORIZON engine on a canvas (the `create` of the Wallpaper). */
function createHorizon(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  const target = canvas as OffscreenCanvas;
  // preserveDrawingBuffer: the tests' probe reads the picture back between frames. A depth buffer: near hills hide far ones.
  const gl = target.getContext('webgl2', { alpha: false, antialias: false, depth: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  let gpu = gl ? setUp(gl) : null;
  let glow: GlowLevel = options.glow;
  let tones = horizonTones(options.palette);
  let still = options.still;
  // The layout's size (CSS px, zoomed), px per CSS px, and the zoom.
  let size: { w: number; h: number; dpr: number; zoom: number } | null = null;
  let mesh: Float32Array | null = null;
  // The motion: how far the camera has come (units, wrapped at ROWS).
  let camZ = 0;
  // The sky must be drawn again (a new size, palette or glow; a new context).
  let skyDirty = true;
  let running = false;
  let lost = false;
  let announced = false;
  let frame = 0;
  let last = 0;

  /** The land to the GPU (once: the land never changes). */
  const sendLand = () => {
    if (!gl || !gpu) return;
    mesh ??= landMesh(buildLand(rng));
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.mesh.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    gpu.mesh.count = mesh.length / VERTEX;
  };

  /** The uniforms that hold until the size, palette or glow changes. */
  const setUniforms = () => {
    if (!gl || !gpu || !size) return;
    const W = canvas.width;
    const H = canvas.height;
    // px per CSS px of the zoomed layout (lines grow when zoomed in), and the focal length (a zoomed-in view is a narrower one).
    const density = size.dpr;
    const focal = LENS.focal * H * size.zoom;
    const sun: [number, number] = [W * SUN.x, H * (LENS.horizon - SUN.lift)];
    const g = HORIZON_GLOW[glow];
    // Shared by both programs: the target, the haze, the glow.
    for (const p of [gpu.sky, gpu.land]) {
      gl.useProgram(p.program);
      gl.uniform2f(p.u('uTarget'), W, H);
      gl.uniform2f(p.u('uSun'), ...sun);
      gl.uniform1f(p.u('uGlowR'), H * SUN.glow * g.sun);
      gl.uniform2f(p.u('uDome'), W * SUN.dome.rx, H * SUN.dome.ry);
      gl.uniform3f(p.u('uSkyTop'), ...tones.skyTop);
      gl.uniform3f(p.u('uSkyLow'), ...tones.skyLow);
      gl.uniform3f(p.u('uGlow'), ...tones.glow);
    }
    // The core: its disc in the sky, its bloom in the haze both draw.
    for (const p of [gpu.sky, gpu.land]) {
      gl.useProgram(p.program);
      gl.uniform1f(p.u('uCoreR'), H * SUN.core);
      gl.uniform3f(p.u('uCore'), ...tones.core);
    }
    const l = gpu.land;
    gl.useProgram(l.program);
    gl.uniform1f(l.u('uDensity'), density);
    gl.uniform1f(l.u('uFocal'), focal);
    gl.uniform1f(l.u('uHorizon'), H * LENS.horizon);
    gl.uniform1f(l.u('uCamH'), CAMERA.height);
    gl.uniform1f(l.u('uRows'), ROWS);
    gl.uniform1f(l.u('uNear'), CAMERA.near);
    gl.uniform1f(l.u('uFar'), FAR);
    gl.uniform3f(l.u('uLine'), ...tones.line);
    gl.uniform3f(l.u('uFace'), ...tones.face);
    gl.uniform1f(l.u('uLineW'), LINE.width);
    gl.uniform1f(l.u('uGlowW'), LINE.glowWidth);
    gl.uniform1f(l.u('uGlowA'), g.edge);
    gl.uniform1f(l.u('uSoftNear'), LINE.near);
    gl.uniform1f(l.u('uSoften'), LINE.soften);
    gl.uniform1f(l.u('uFogStart'), FOG.start);
    gl.uniform1f(l.u('uFogEnd'), FOG.end);
    skyDirty = true;
  };

  /** Draws the scene as it is now: the sky if it changed, then the land over the bottom half. */
  const draw = () => {
    if (!size) return;
    if (gl && gpu && !lost) {
      const W = canvas.width;
      const H = canvas.height;
      gl.viewport(0, 0, W, H);
      gl.disable(gl.BLEND);
      gl.bindVertexArray(gpu.empty);
      // 1. The sky, only when it changed (the canvas keeps it between frames).
      if (skyDirty) {
        skyDirty = false;
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(gpu.sky.program);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // 2. The land, in the bottom half only (GL counts rows from the bottom), its depth cleared there.
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, W, Math.ceil(H * (1 - LENS.horizon)) + 1);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LESS);
      gl.useProgram(gpu.land.program);
      gl.uniform1f(gpu.land.u('uCamZ'), camZ);
      gl.bindVertexArray(gpu.mesh.vao);
      // Nearest strip first (the one the camera is over), on to the far end, then round from the first: front to back.
      const near = Math.ceil(camZ - 1 + 1e-6) % ROWS;
      gl.drawArrays(gl.TRIANGLES, near * STRIP_VERTICES, (ROWS - near) * STRIP_VERTICES);
      if (near > 0) gl.drawArrays(gl.TRIANGLES, 0, near * STRIP_VERTICES);
      // The far wall of haze last: it fills only what no land covers, up to the horizon.
      gl.drawArrays(gl.TRIANGLES, ROWS * STRIP_VERTICES, WALL_VERTICES);
      gl.bindVertexArray(null);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.SCISSOR_TEST);
    } else if (!gl) {
      const ctx = target.getContext('2d');
      if (ctx) drawStill(ctx, size.w, size.h, size.dpr, tones);
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
    // Wrapped: the land repeats every ROWS units.
    camZ = (camZ + dt * SPEED) % ROWS;
    draw();
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(cw, ch, ratio, zoom) {
      // Zoomed: drawn zoom times as large (a narrower view, wider lines); the canvas keeps its pixels.
      const next = zoomedSize(cw, ch, ratio, zoom, MAX_DPR);
      canvas.width = Math.round(next.w * next.dpr);
      canvas.height = Math.round(next.h * next.dpr);
      size = { ...next, zoom: zoom > 0 && Number.isFinite(zoom) ? zoom : 1 };
      if (gpu && !gpu.mesh.count) sendLand();
      // A resized canvas is cleared: the sky is drawn again (setUniforms marks it).
      setUniforms();
      draw();
    },
    start() {
      running = true;
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
      draw();
    },
    setGlow(next) {
      glow = next;
      setUniforms();
      if (still) draw();
    },
    setPalette(next) {
      tones = horizonTones(next);
      setUniforms();
      if (still) draw();
    },
    destroy() {
      instance.stop();
      size = null;
      mesh = null;
    },
  };

  // The graphics card can drop the context (a driver reset): pause, then set everything up again.
  target.addEventListener('contextlost', (e) => {
    e.preventDefault();
    lost = true;
  });
  target.addEventListener('contextrestored', () => {
    lost = false;
    gpu = gl ? setUp(gl) : null;
    sendLand();
    setUniforms();
    draw();
  });
  return instance;
}

/** The HORIZON wallpaper. */
export const horizon: Wallpaper = {
  id: 'horizon',
  create: (canvas, options) => createHorizon(canvas, options),
};
