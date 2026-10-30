/**
 * src/wallpaper/sunset/engine.ts: the SUNSET wallpaper: the outrun sun over
 * a glowing grid that glides toward you.
 *
 * Layer: wallpaper (WebGL 2; no React, no stores, no DOM: it runs in the
 * wallpaper's worker, wallpaper/worker.ts, on an OffscreenCanvas).
 *
 * As light as it can be (the user: "super lightweight, maximum performance
 * and sharpness"):
 *   - the sky (shaders/sky.frag: the night sky, stars, the striped sun and
 *     its glow, the scanlines) never changes, so it's drawn once, when the
 *     size, palette or zoom changes; the canvas keeps it
 *     (preserveDrawingBuffer);
 *   - each frame redraws only the ground below the horizon (scissored):
 *     one full-screen triangle and a short per-pixel shader
 *     (shaders/ground.frag), no geometry, no textures, no depth buffer. Its
 *     only input that changes is how far the grid has come.
 * Up to about 72 frames a second. If WebGL 2 isn't there, a still 2D
 * picture (the sky and the sun's disc); if the graphics context is lost,
 * it waits and starts again.
 */
import { type Wallpaper, type WallpaperInstance, type WallpaperOptions, type WallpaperPalette, zoomedSize } from '../types';
import { CAMERA, GRID, HORIZON, MELT, MAX_DPR, MAX_FRAME_STEP, MIN_FRAME_MS, SCANLINES, SPEED, STARS, STRIPES, SUN, WAVE, WRAP } from './params';
import fullVert from './shaders/full.vert?raw';
import groundFrag from './shaders/ground.frag?raw';
import skyFrag from './shaders/sky.frag?raw';

/** A colour as linear 0–1 RGB (the shaders' uniforms). */
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

const WHITE: Rgb = [1, 1, 1];

/** The colours SUNSET is drawn in. */
export interface SunsetTones {
  skyLeft: Rgb;
  skyRight: Rgb;
  skyTop: Rgb;
  sunTop: Rgb;
  sunBase: Rgb;
  glow: Rgb;
  star: Rgb;
  ground: Rgb;
  warm: Rgb;
  cool: Rgb;
}

/**
 * The tones from a palette: the sun from its brightest tint (OUTRUN's gold)
 * down to its accent (hot pink); the sky from the accent and the cool
 * colour (purple left, blue right); the grid warm on the left, cool on the
 * right. OUTRUN, made for it, gives the reference's.
 */
export function sunsetTones(p: WallpaperPalette): SunsetTones {
  const bg = rgb(p.bg);
  const accent = rgb(p.accent);
  const cool = rgb(p.cool);
  const bright = rgb(p.bright);
  return {
    skyLeft: mix(mix(accent, cool, 0.45), bg, 0.7),
    skyRight: mix(cool, bg, 0.58),
    skyTop: mix(bg, cool, 0.06),
    sunTop: bright,
    sunBase: accent,
    glow: accent,
    star: mix(bright, WHITE, 0.7),
    ground: mix(bg, mix(accent, cool, 0.6), 0.1),
    warm: mix(accent, bright, 0.3),
    cool: mix(cool, WHITE, 0.25),
  };
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
      console.error('sunset shader:', gl.getShaderInfoLog(s));
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
    console.error('sunset program:', gl.getProgramInfoLog(program));
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

/** Everything on the graphics card: the two programs and an empty vertex array (the triangle comes from gl_VertexID). */
interface Gpu {
  sky: Program;
  ground: Program;
  empty: WebGLVertexArrayObject;
}

/** Sets up the programs; null if either fails. */
function setUp(gl: WebGL2RenderingContext): Gpu | null {
  const sky = compile(gl, fullVert, skyFrag);
  const ground = compile(gl, fullVert, groundFrag);
  if (!sky || !ground) return null;
  return { sky, ground, empty: gl.createVertexArray()! };
}

/** The still picture, when WebGL 2 isn't there: the sky and the sun's disc. */
function drawStill(ctx: OffscreenCanvasRenderingContext2D, w: number, h: number, ratio: number, t: SunsetTones): void {
  const css = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(Math.min(1, v) * 255)).join(', ')})`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  const sky = ctx.createLinearGradient(0, 0, w, 0);
  sky.addColorStop(0, css(t.skyLeft));
  sky.addColorStop(1, css(t.skyRight));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const sun = ctx.createLinearGradient(0, h * (SUN.y - 0.2), 0, h * HORIZON);
  sun.addColorStop(0, css(t.sunTop));
  sun.addColorStop(1, css(t.sunBase));
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(w * SUN.x, h * SUN.y, h * SUN.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = css(t.ground);
  ctx.fillRect(0, h * HORIZON, w, h * (1 - HORIZON));
}

/** Creates the SUNSET engine on a canvas (the `create` of the Wallpaper). */
function createSunset(canvas: HTMLCanvasElement | OffscreenCanvas, options: WallpaperOptions): WallpaperInstance {
  const target = canvas as OffscreenCanvas;
  // preserveDrawingBuffer: the sky is drawn once and kept (and the tests' probe reads the picture back). No depth buffer: nothing overlaps.
  const gl = target.getContext('webgl2', { alpha: false, antialias: false, depth: false, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  let gpu = gl ? setUp(gl) : null;
  let tones = sunsetTones(options.palette);
  let still = options.still;
  // The layout's size (CSS px, zoomed), px per CSS px of it, and the zoom.
  let size: { w: number; h: number; dpr: number; zoom: number } | null = null;
  // How far the grid has come (units, wrapped at WRAP: whole squares and whole waves).
  let travel = 0;
  // The sky must be drawn again (a new size, palette or zoom; a new context).
  let skyDirty = true;
  let running = false;
  let lost = false;
  let announced = false;
  let frame = 0;
  let last = 0;

  /** The uniforms that hold until the size, palette or zoom changes (and marks the sky to be drawn again). */
  const setUniforms = () => {
    if (!gl || !gpu || !size) return;
    const W = canvas.width;
    const H = canvas.height;
    // px per CSS px of the zoomed layout: the fine detail (lines, stars, scanlines) and the grid's squares are in CSS px, so they follow the layout as the other wallpapers' detail does.
    const unit = size.dpr;
    // The composition (the sun, its glow, the melt into the sky) is in shares of the screen, grown by the zoom.
    const big = H * size.zoom;
    const horizon = H * HORIZON;
    const sun: [number, number] = [W * SUN.x, H * SUN.y];
    for (const p of [gpu.sky, gpu.ground]) {
      gl.useProgram(p.program);
      gl.uniform2f(p.u('uTarget'), W, H);
      gl.uniform1f(p.u('uUnit'), unit);
      gl.uniform1f(p.u('uHorizon'), horizon);
      gl.uniform1f(p.u('uScanEvery'), SCANLINES.every);
      gl.uniform1f(p.u('uScanDepth'), SCANLINES.depth);
    }
    // The sky's colours, the sun and its glow: the ground needs them too, to melt into the sky at the horizon.
    for (const p of [gpu.sky, gpu.ground]) {
      gl.useProgram(p.program);
      gl.uniform2f(p.u('uSun'), ...sun);
      gl.uniform1f(p.u('uSunR'), SUN.r * big);
      gl.uniform1f(p.u('uGlowR'), SUN.glow * big);
      gl.uniform3f(p.u('uSkyLeft'), ...tones.skyLeft);
      gl.uniform3f(p.u('uSkyRight'), ...tones.skyRight);
      gl.uniform3f(p.u('uGlow'), ...tones.glow);
    }
    const s = gpu.sky;
    gl.useProgram(s.program);
    gl.uniform3f(s.u('uSkyTop'), ...tones.skyTop);
    gl.uniform3f(s.u('uSunTop'), ...tones.sunTop);
    gl.uniform3f(s.u('uSunBase'), ...tones.sunBase);
    gl.uniform3f(s.u('uStar'), ...tones.star);
    gl.uniform3f(s.u('uStripe'), STRIPES.from, STRIPES.period, STRIPES.gap[0]);
    gl.uniform1f(s.u('uGapGrow'), STRIPES.gap[1] - STRIPES.gap[0]);
    gl.uniform1f(s.u('uStarCell'), STARS.cell);
    gl.uniform1f(s.u('uStarChance'), STARS.chance);
    const g = gpu.ground;
    gl.useProgram(g.program);
    gl.uniform1f(g.u('uFocal'), CAMERA.focal * unit);
    gl.uniform1f(g.u('uCamH'), CAMERA.height);
    gl.uniform1f(g.u('uLine'), GRID.line);
    gl.uniform1f(g.u('uGlowW'), GRID.glow);
    // The waves in whole cycles over WRAP, so the grid's distance can wrap without a jump.
    const k = (Math.PI * 2) / WRAP;
    gl.uniform3f(g.u('uWave'), WAVE.amount, k * WAVE.across, k * WAVE.along);
    gl.uniform1f(g.u('uDrift'), k * 5);
    gl.uniform1f(g.u('uMeltH'), MELT * big);
    gl.uniform3f(g.u('uGround'), ...tones.ground);
    gl.uniform3f(g.u('uWarm'), ...tones.warm);
    gl.uniform3f(g.u('uCool'), ...tones.cool);
    skyDirty = true;
  };

  /** Draws the scene as it is now: the sky if it changed, then the ground. */
  const draw = () => {
    if (!size) return;
    if (gl && gpu && !lost) {
      const W = canvas.width;
      const H = canvas.height;
      gl.viewport(0, 0, W, H);
      gl.bindVertexArray(gpu.empty);
      if (skyDirty) {
        skyDirty = false;
        gl.disable(gl.SCISSOR_TEST);
        gl.useProgram(gpu.sky.program);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      // The ground: the rows below the horizon only (GL counts rows from the bottom).
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(0, 0, W, Math.ceil(H * (1 - HORIZON)));
      gl.useProgram(gpu.ground.program);
      gl.uniform1f(gpu.ground.u('uTravel'), travel);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disable(gl.SCISSOR_TEST);
      gl.bindVertexArray(null);
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
    travel = (travel + dt * SPEED) % WRAP;
    draw();
    frame = requestAnimationFrame(tick);
  };

  const instance: WallpaperInstance = {
    resize(cw, ch, ratio, zoom) {
      // Zoomed: laid out for a screen 1/zoom as big, drawn zoom times as large (the canvas keeps its pixels).
      const next = zoomedSize(cw, ch, ratio, zoom, MAX_DPR);
      canvas.width = Math.round(next.w * next.dpr);
      canvas.height = Math.round(next.h * next.dpr);
      size = { ...next, zoom: zoom > 0 && Number.isFinite(zoom) ? zoom : 1 };
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
    // No glow setting: the sun's glow is the reference's own.
    setGlow() {},
    setPalette(next) {
      tones = sunsetTones(next);
      setUniforms();
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
    setUniforms();
    draw();
  });
  return instance;
}

/** The SUNSET wallpaper. */
export const sunset: Wallpaper = {
  id: 'sunset',
  create: (canvas, options) => createSunset(canvas, options),
};
