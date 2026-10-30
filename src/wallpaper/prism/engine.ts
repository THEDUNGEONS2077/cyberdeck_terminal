/**
 * src/wallpaper/prism/engine.ts: the PRISM wallpaper: a field of smoky glass
 * blocks lit magenta and blue from inside and behind (params.ts has the
 * reference and how it's matched).
 *
 * Layer: wallpaper (WebGL 2; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * Built for smoothness, as HORIZON and SUNSET are:
 *   - one background triangle (back.frag), then every block in one
 *     instanced draw: two draw calls;
 *   - no depth buffer: glass is see-through, so the blocks are drawn back
 *     to front (field.ts sortBackToFront: an insertion sort each frame, the
 *     order barely changing as the camera sways), and within a block its
 *     far faces before its near ones (the cube's buffer lists them so: from
 *     the camera's high corner every block shows the same three faces);
 *   - edges are worked out per pixel, and each face's own outline fades out
 *     over one device px (box.frag): smooth at any angle without
 *     multisampling (WORKING.md);
 *   - nothing new is made per frame: the blocks' instance data is written
 *     into one reused array.
 * Up to about 72 frames a second. If WebGL 2 isn't there, a still 2D
 * picture (the navy and its light pools); if the graphics context is lost,
 * it waits and starts again.
 */
import type { GlowLevel } from '@/lib/layout';

import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, type WallpaperPalette, zoomedSize } from '../types';
import { BOX, type Field, type Rng, breath, buildField, cameraAt, sortBackToFront } from './field';
import { CAMERA, EDGE, GLASS, MAX_DPR, MAX_FRAME_STEP, MIN_FRAME_MS, PRISM_GLOW } from './params';
import backFrag from './shaders/back.frag?raw';
import boxFrag from './shaders/box.frag?raw';
import boxVert from './shaders/box.vert?raw';
import fullVert from './shaders/full.vert?raw';

/** A colour as 0–1 RGB (the shaders' uniforms). */
type Rgb = [number, number, number];

/** '#rrggbb' as 0–1 RGB. */
function rgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** a → b by k. */
function mix(a: Rgb, b: Rgb, k: number): Rgb {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** PRISM's colours from a palette. */
export interface PrismTones {
  /** The deep navy behind and in the glass (the reference's about rgb(11, 10, 44)). */
  navy: Rgb;
  /** The two light colours: magenta (--accent) and blue (--cool). */
  magenta: Rgb;
  blue: Rgb;
  /** The blocks' edges: the cool colour, lifted. */
  edge: Rgb;
}

/** The tones for a palette: everything from its --bg, --accent and --cool. */
export function prismTones(p: WallpaperPalette): PrismTones {
  const bg = rgb(p.bg);
  const accent = rgb(p.accent);
  const cool = rgb(p.cool);
  const white: Rgb = [1, 1, 1];
  // A little of the cool colour and less of the accent in the background: NEON gives about the reference's navy.
  const navy = mix(mix(bg, cool, 0.12), accent, 0.035);
  // Edges a dim, cool glint (the reference's thin teal lines), not lit wires.
  const edge = mix(cool, white, 0.3).map((v) => v * 0.45) as Rgb;
  // The blue pools at half the magenta's strength: in the reference the magenta leads.
  return { navy, magenta: accent, blue: cool.map((v) => v * 0.55) as Rgb, edge };
}

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
      console.error('prism shader:', gl.getShaderInfoLog(s));
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
    console.error('prism program:', gl.getProgramInfoLog(program));
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

/**
 * A unit cube's 36 vertices: corner (0–1) and outward normal, 6 floats
 * each. The faces facing away from the camera's corner (−x, −y, −z) come
 * first, so within each block its far faces are drawn before its near ones.
 * Each triangle is wound counter-clockwise seen from outside.
 */
export function cubeVertices(): Float32Array {
  const faces: [number, number, number][] = [
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const out: number[] = [];
  for (const n of faces) {
    // The face's axis and side; its four corners, then ordered round the normal.
    const axis = n.findIndex((c) => c !== 0);
    const side = n[axis]! > 0 ? 1 : 0;
    const [u, v] = [0, 1, 2].filter((i) => i !== axis) as [number, number];
    const corner = (a: number, b: number) => {
      const c = [0, 0, 0];
      c[axis] = side;
      c[u] = a;
      c[v] = b;
      return c;
    };
    let quad = [corner(0, 0), corner(1, 0), corner(1, 1), corner(0, 1)];
    // Flip the order if it winds the wrong way round this normal.
    const e1 = quad[1]!.map((x, i) => x - quad[0]![i]!);
    const e2 = quad[2]!.map((x, i) => x - quad[0]![i]!);
    const cross = [e1[1]! * e2[2]! - e1[2]! * e2[1]!, e1[2]! * e2[0]! - e1[0]! * e2[2]!, e1[0]! * e2[1]! - e1[1]! * e2[0]!];
    if (cross[0]! * n[0] + cross[1]! * n[1] + cross[2]! * n[2] < 0) quad = [quad[0]!, quad[3]!, quad[2]!, quad[1]!];
    for (const i of [0, 1, 2, 0, 2, 3]) out.push(...quad[i]!, ...n);
  }
  return new Float32Array(out);
}

/** Everything on the graphics card. */
interface Gpu {
  back: Program;
  box: Program;
  empty: WebGLVertexArrayObject;
  boxVao: WebGLVertexArrayObject;
  instances: WebGLBuffer;
}

/** Sets up the programs and buffers; null if anything fails. */
function setUp(gl: WebGL2RenderingContext): Gpu | null {
  const back = compile(gl, fullVert, backFrag);
  const box = compile(gl, boxVert, boxFrag);
  if (!back || !box) return null;
  // The cube (per vertex), then the blocks (per instance: min corner, size).
  const cube = gl.createBuffer()!;
  const instances = gl.createBuffer()!;
  const boxVao = gl.createVertexArray()!;
  gl.bindVertexArray(boxVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, cube);
  gl.bufferData(gl.ARRAY_BUFFER, cubeVertices(), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
  gl.bindBuffer(gl.ARRAY_BUFFER, instances);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, BOX * 4, 0);
  gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 3, gl.FLOAT, false, BOX * 4, 12);
  gl.vertexAttribDivisor(3, 1);
  gl.bindVertexArray(null);
  return { back, box, empty: gl.createVertexArray()!, boxVao, instances };
}

/** The still picture, when WebGL 2 isn't there: the navy and a pool of each light. */
function drawStill(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, ratio: number, t: PrismTones): void {
  const css = (c: Rgb, a = 1) => `rgba(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(', ')}, ${a})`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.fillStyle = css(t.navy);
  ctx.fillRect(0, 0, w, h);
  for (const [x, y, c] of [[0.15, 0.4, t.magenta], [0.6, 0.35, t.blue]] as const) {
    const g = ctx.createRadialGradient(w * x, h * y, 0, w * x, h * y, h * 0.45);
    g.addColorStop(0, css(c, 0.22));
    g.addColorStop(1, css(c, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

/** The most lights the box shader takes (box.frag MAX_LIGHTS). */
const MAX_LIGHTS = 16;
/** How strongly a light pool tints the glass (its colour × strength × this). */
const LIGHT_GAIN = 0.2;

/** Creates the PRISM engine on a canvas (the `create` of the Wallpaper). */
function createPrism(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions, rng: Rng = Math.random): WallpaperInstance {
  const target = canvas as OffscreenCanvas;
  // preserveDrawingBuffer: the tests' probe reads the picture back between frames. No depth buffer (drawn back to front), no antialias (WORKING.md).
  const gl = target.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  let gpu = gl ? setUp(gl) : null;
  let glow: GlowLevel = options.glow;
  let tones = prismTones(options.palette);
  let still = options.still;
  const field: Field = buildField(rng);
  // The blocks' order back to front (kept between frames), its scratch depths, and the sorted instance data.
  const order = Uint16Array.from({ length: field.count }, (_, i) => i);
  const depth = new Float32Array(field.count);
  const sorted = new Float32Array(field.count * BOX);
  // The lights' uniforms, written each frame (they breathe).
  const lightPos = new Float32Array(MAX_LIGHTS * 4);
  const lightCol = new Float32Array(MAX_LIGHTS * 3);
  let size: { w: number; h: number; dpr: number; zoom: number } | null = null;
  let running = false;
  let frame = 0;
  let last = 0;
  // The scene's own clock (s): advanced by each frame's step, so a pause doesn't jump it.
  let clock = 0;
  let announced = false;
  let lost = false;

  /** Draws the scene at the clock's time. */
  const draw = () => {
    if (!size) return;
    if (gl && gpu && !lost) {
      const { w, h, dpr, zoom } = size;
      const g = PRISM_GLOW[glow];
      const cam = cameraAt(clock, w / h, zoom);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);

      // 1. What's behind the glass.
      gl.disable(gl.BLEND);
      gl.useProgram(gpu.back.program);
      gl.uniform3fv(gpu.back.u('uBg'), tones.navy);
      gl.uniform3fv(gpu.back.u('uAccent'), tones.magenta);
      gl.uniform3fv(gpu.back.u('uCool'), tones.blue);
      gl.uniform2f(gpu.back.u('uAspect'), w / h, 1);
      gl.uniform1f(gpu.back.u('uLight'), g.light);
      gl.bindVertexArray(gpu.empty);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // 2. The blocks, back to front, premultiplied glass.
      sortBackToFront(field, cam, order, depth);
      for (let i = 0; i < field.count; i++) {
        const from = order[i]! * BOX;
        for (let k = 0; k < BOX; k++) sorted[i * BOX + k] = field.boxes[from + k]!;
      }
      const n = Math.min(MAX_LIGHTS, field.lights.length);
      for (let i = 0; i < n; i++) {
        const l = field.lights[i]!;
        const c = l.kind === 0 ? tones.magenta : tones.blue;
        const k = l.strength * breath(l, clock) * g.light * LIGHT_GAIN;
        lightPos[i * 4] = l.x;
        lightPos[i * 4 + 1] = l.y;
        lightPos[i * 4 + 2] = l.z;
        lightPos[i * 4 + 3] = l.reach;
        lightCol[i * 3] = c[0] * k;
        lightCol[i * 3 + 1] = c[1] * k;
        lightCol[i * 3 + 2] = c[2] * k;
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(gpu.box.program);
      gl.uniformMatrix4fv(gpu.box.u('uViewProj'), false, cam.viewProj);
      gl.uniform4fv(gpu.box.u('uLightPos'), lightPos);
      gl.uniform3fv(gpu.box.u('uLightCol'), lightCol);
      gl.uniform1i(gpu.box.u('uLights'), n);
      gl.uniform3fv(gpu.box.u('uEye'), cam.eye);
      gl.uniform3fv(gpu.box.u('uBody'), tones.navy);
      gl.uniform3fv(gpu.box.u('uEdge'), tones.edge);
      gl.uniform1f(gpu.box.u('uAlpha'), GLASS.front);
      gl.uniform1f(gpu.box.u('uFresnel'), GLASS.fresnel);
      gl.uniform1f(gpu.box.u('uDensity'), dpr);
      gl.uniform1f(gpu.box.u('uEdgeW'), EDGE.width);
      gl.uniform1f(gpu.box.u('uEdgeGlow'), EDGE.glow);
      gl.uniform1f(gpu.box.u('uGlowAmt'), g.edge);
      gl.uniform1f(gpu.box.u('uFar'), CAMERA.distance * 2);
      gl.bindBuffer(gl.ARRAY_BUFFER, gpu.instances);
      gl.bufferData(gl.ARRAY_BUFFER, sorted, gl.STREAM_DRAW);
      gl.bindVertexArray(gpu.boxVao);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 36, field.count);
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
    clock += last ? Math.min((now - last) / 1000, MAX_FRAME_STEP) : 0;
    last = now;
    draw();
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(cw, ch, ratio, zoom) {
      // Zoomed: a narrower view (field.ts cameraAt), drawn at the same sharpness.
      const next = zoomedSize(cw, ch, ratio, 1, MAX_DPR);
      canvas.width = Math.round(next.w * next.dpr);
      canvas.height = Math.round(next.h * next.dpr);
      size = { ...next, zoom: zoom > 0 && Number.isFinite(zoom) ? zoom : 1 };
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
      if (still) draw();
    },
    setPalette(next: WallpaperPalette) {
      tones = prismTones(next);
      if (still) draw();
    },
    destroy() {
      instance.stop();
      size = null;
    },
  };

  // The graphics card can drop the context (a driver reset): pause, then set everything up again. WebGL's events are
  // webglcontextlost/-restored (until 1.0 these listened for the 2D canvas's contextlost, which never comes, so a lost
  // context was never asked back and the wallpaper stayed dark until a reload).
  target.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
  });
  target.addEventListener('webglcontextrestored', () => {
    lost = false;
    gpu = gl ? setUp(gl) : null;
    draw();
  });
  return instance;
}

/** The PRISM wallpaper. */
export const prism: Wallpaper = {
  id: 'prism',
  create: (canvas, options) => createPrism(canvas, options),
};
