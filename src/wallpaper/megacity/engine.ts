/**
 * src/wallpaper/megacity/engine.ts: the MEGACITY wallpaper: a city of
 * towers in blue haze at night, seen from a rooftop ledge.
 *
 * Layer: wallpaper (WebGL 2; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * The city has tens of thousands of windows: too many to draw one by one,
 * so the graphics card works the whole city out per pixel (shaders/
 * city.frag) from a small texture of skylines (city.ts), its windows going
 * on and off by the clock. On top, a few dozen things per frame: the neon
 * signs, the haze drifting, the beacons and drones (sim.ts), then the
 * railing and the ledge (city.ts foreground). Nothing about the
 * city is sent per frame; the lights are a few kilobytes. Up to about 72
 * frames a second.
 *
 * The shaders are fluid_motion's too (its assets/shaders/mc_*): the phone
 * draws the same city the same way. If WebGL 2 isn't there, a still 2D
 * picture (the haze and the ledge); if the graphics context is
 * lost, it waits and starts again.
 */
import type { GlowLevel } from '@/lib/layout';

import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, zoomedSize } from '../types';
import { buildCity, type City, cityTones, type CityTones, foreground, SHAPE, skyline, skylineRows, type Rng } from './city';
import { LAYERS, MAX_DPR, MAX_FRAME_STEP, MEGACITY_GLOW, MIN_FRAME_MS, SKYLINE_WIDTH } from './params';
import cityFrag from './shaders/city.frag?raw';
import fullVert from './shaders/full.vert?raw';
import glowFrag from './shaders/glow.frag?raw';
import glowVert from './shaders/glow.vert?raw';
import shapeFrag from './shaders/shape.frag?raw';
import shapeVert from './shaders/shape.vert?raw';
import signFrag from './shaders/sign.frag?raw';
import signVert from './shaders/sign.vert?raw';
import { CitySim, frameRoom, GLOW, packGlows, packSigns, SIGN } from './sim';

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
      console.error('megacity shader:', gl.getShaderInfoLog(s));
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
    console.error('megacity program:', gl.getProgramInfoLog(program));
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
  city: Program;
  sign: Program;
  glow: Program;
  shape: Program;
  empty: WebGLVertexArrayObject;
  skyline: WebGLTexture;
  signs: { buffer: WebGLBuffer; vao: WebGLVertexArrayObject };
  glows: { buffer: WebGLBuffer; vao: WebGLVertexArrayObject };
  shapes: { buffer: WebGLBuffer; vao: WebGLVertexArrayObject; count: number };
}

/** An instanced stream: a buffer and the vertex array reading it, `sizes` floats per attribute, one value per instance. */
function stream(gl: WebGL2RenderingContext, sizes: number[], perInstance: boolean): { buffer: WebGLBuffer; vao: WebGLVertexArrayObject } {
  const buffer = gl.createBuffer()!;
  const vao = gl.createVertexArray()!;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const stride = sizes.reduce((a, b) => a + b, 0) * 4;
  let offset = 0;
  sizes.forEach((size, loc) => {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset * 4);
    if (perInstance) gl.vertexAttribDivisor(loc, 1);
    offset += size;
  });
  gl.bindVertexArray(null);
  return { buffer, vao };
}

/** Sets up the programs, the skyline texture and the streams; null if anything fails. */
function setUp(gl: WebGL2RenderingContext): Gpu | null {
  const city = compile(gl, fullVert, cityFrag);
  const sign = compile(gl, signVert, signFrag);
  const glow = compile(gl, glowVert, glowFrag);
  const shape = compile(gl, shapeVert, shapeFrag);
  if (!city || !sign || !glow || !shape) return null;
  const skylineTex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, skylineTex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return {
    city,
    sign,
    glow,
    shape,
    empty: gl.createVertexArray()!,
    skyline: skylineTex,
    signs: stream(gl, [4, 4, 4], true),
    glows: stream(gl, [4, 4, 4], true),
    shapes: { ...stream(gl, [2, 4], false), count: 0 },
  };
}

/** The still picture, when WebGL 2 isn't there: the haze, and the ledge as a dark band. */
function drawStill(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, ratio: number, t: CityTones): void {
  const css = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(', ')})`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, css(t.skyTop));
  sky.addColorStop(0.5, css(t.skyMid));
  sky.addColorStop(1, css(t.skyLow));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = css(t.ledge);
  ctx.fillRect(0, h * 0.855, w * 0.5, h * 0.145);
}

/** Creates the MEGACITY engine on a canvas (the `create` of the Wallpaper). */
function createMegacity(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  const target = canvas as OffscreenCanvas;
  // preserveDrawingBuffer: the tests' probe reads the picture back between frames.
  const gl = target.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  let gpu = gl ? setUp(gl) : null;
  let glow: GlowLevel = options.glow;
  let tones = cityTones(options.palette);
  let still = options.still;
  // The layout's size (CSS px, zoomed) and px per CSS px.
  let size: { w: number; h: number; dpr: number } | null = null;
  let city: City | null = null;
  let sim: CitySim | null = null;
  let room: { signs: Float32Array; glows: Float32Array } | null = null;
  let running = false;
  let lost = false;
  let announced = false;
  let frame = 0;
  let last = 0;

  /** The city's skyline to the texture (once per city). */
  const sendCity = () => {
    if (!gl || !gpu || !city) return;
    gl.bindTexture(gl.TEXTURE_2D, gpu.skyline);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, SKYLINE_WIDTH, skylineRows(city) * city.layers.length, 0, gl.RGBA, gl.FLOAT, skyline(city));
  };

  /** The foreground's triangles (once per city and palette). */
  const sendForeground = () => {
    if (!gl || !gpu || !city || !size) return;
    const data = foreground(city, tones);
    gl.bindBuffer(gl.ARRAY_BUFFER, gpu.shapes.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gpu.shapes.count = data.length / SHAPE;
  };

  /** The uniforms that hold until the size, palette or glow changes. */
  const setUniforms = () => {
    if (!gl || !gpu || !city || !size) return;
    const c = gpu.city;
    gl.useProgram(c.program);
    gl.uniform1i(c.u('uSkyline'), 0);
    gl.uniform1i(c.u('uLayers'), LAYERS.length);
    gl.uniform1i(c.u('uRows'), skylineRows(city));
    gl.uniform1i(c.u('uCols'), city.cols);
    gl.uniform2f(c.u('uTarget'), canvas.width, canvas.height);
    gl.uniform1f(c.u('uDensity'), size.dpr);
    gl.uniform1f(c.u('uHeight'), city.h);
    gl.uniform2fv(c.u('uCell'), new Float32Array(LAYERS.flatMap((l) => [l.cell[0], l.cell[1]])));
    gl.uniform1fv(c.u('uFog'), new Float32Array(LAYERS.map((l) => l.fog)));
    gl.uniform3f(c.u('uSkyTop'), ...tones.skyTop);
    gl.uniform3f(c.u('uSkyMid'), ...tones.skyMid);
    gl.uniform3f(c.u('uSkyLow'), ...tones.skyLow);
    gl.uniform3f(c.u('uLowGlow'), ...tones.lowGlow);
    gl.uniform3f(c.u('uFaceFar'), ...tones.faceFar);
    gl.uniform3f(c.u('uFaceNear'), ...tones.faceNear);
    gl.uniform3f(c.u('uEdge'), ...tones.edge);
    gl.uniform3f(c.u('uWinPale'), ...tones.winPale);
    gl.uniform3f(c.u('uWinViolet'), ...tones.winViolet);
    gl.uniform3f(c.u('uWinPink'), ...tones.winPink);
    gl.uniform3f(c.u('uWinWhite'), ...tones.winWhite);
    gl.uniform1f(c.u('uWindowGlow'), MEGACITY_GLOW[glow].window);
    for (const p of [gpu.sign, gpu.glow, gpu.shape]) {
      gl.useProgram(p.program);
      gl.uniform2f(p.u('uTarget'), canvas.width, canvas.height);
      gl.uniform1f(p.u('uDensity'), size.dpr);
    }
  };

  /** A new city for the screen (and its motion). */
  const build = () => {
    if (!size) return;
    city = buildCity(size.w, size.h, rng);
    sim = new CitySim(city, rng);
    room = frameRoom(city);
    sendCity();
    sendForeground();
    setUniforms();
  };

  /** Draws the city as it is now. */
  const draw = () => {
    if (!size) return;
    if (gl && gpu && !lost && city && sim && room) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      // 1. The city, every pixel.
      gl.disable(gl.BLEND);
      gl.useProgram(gpu.city.program);
      gl.uniform1f(gpu.city.u('uTime'), sim.time);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, gpu.skyline);
      gl.bindVertexArray(gpu.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // 2. Signs, then haze and lights, then the foreground: premultiplied (what has no alpha is added).
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const ns = packSigns(sim, tones, glow, room.signs);
      if (ns) {
        gl.useProgram(gpu.sign.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.signs.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, room.signs.subarray(0, ns * SIGN), gl.STREAM_DRAW);
        gl.bindVertexArray(gpu.signs.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ns);
      }
      const ng = packGlows(sim, tones, glow, room.glows);
      if (ng) {
        gl.useProgram(gpu.glow.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gpu.glows.buffer);
        gl.bufferData(gl.ARRAY_BUFFER, room.glows.subarray(0, ng * GLOW), gl.STREAM_DRAW);
        gl.bindVertexArray(gpu.glows.vao);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ng);
      }
      gl.useProgram(gpu.shape.program);
      gl.bindVertexArray(gpu.shapes.vao);
      gl.drawArrays(gl.TRIANGLES, 0, gpu.shapes.count);
      gl.bindVertexArray(null);
      gl.disable(gl.BLEND);
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
    sim?.advance(dt);
    draw();
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(cw, ch, ratio, zoom) {
      // Zoomed: laid out for a screen 1/zoom as big, drawn zoom times as large (the canvas keeps its pixels).
      const next = zoomedSize(cw, ch, ratio, zoom, MAX_DPR);
      canvas.width = Math.round(next.w * next.dpr);
      canvas.height = Math.round(next.h * next.dpr);
      const rebuild = !size || next.w !== size.w || next.h !== size.h;
      size = next;
      if (rebuild || !city) build();
      else {
        sendForeground();
        setUniforms();
      }
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
      tones = cityTones(next);
      sendForeground();
      setUniforms();
      if (still) draw();
    },
    destroy() {
      instance.stop();
      size = null;
      city = null;
      sim = null;
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
    sendCity();
    sendForeground();
    setUniforms();
    draw();
  });
  return instance;
}

/** The MEGACITY wallpaper. */
export const megacity: Wallpaper = {
  id: 'megacity',
  create: (canvas, options) => createMegacity(canvas, options),
};
