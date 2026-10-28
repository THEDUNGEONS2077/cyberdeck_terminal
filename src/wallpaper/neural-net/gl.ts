/**
 * src/wallpaper/neural-net/gl.ts: the neural net drawn with WebGL 2 (0.22.0),
 * as fluid_motion draws it on the phone.
 *
 * Layer: wallpaper (WebGL 2; no DOM: runs in the wallpaper's worker).
 *
 * Why: the 2D canvas stroked each link as a 0.9 px line, and Chrome's
 * GPU-drawn canvas (the worker's) anti-aliases strokes thinner than a pixel
 * poorly, so links stepped along shallow angles (the user: jagged lines on
 * the web, fine on the phone). Here each link is a quad whose fragment
 * shader works out its own one-pixel soft edge, at any angle and width, and
 * each node a sprite worked out per pixel: the phone's shaders. The
 * fragment shaders (link.frag, spark.frag) and the colour (shade.glsl) are
 * fluid_motion's neural_* byte for byte; the vertex shaders take the links'
 * ends and the sprites per instance, since a desktop screen can hold more
 * nodes than the phone's uniform arrays. The engine (engine.ts) packs each
 * frame's ends and sprites; this sends and draws them. No multisampling
 * (WORKING.md): the edges are smooth in the shader.
 */
import type { WallpaperPalette } from '../types';
import linkFrag from './shaders/link.frag?raw';
import linkVert from './shaders/link.vert?raw';
import shadeGlsl from './shaders/shade.glsl?raw';
import sparkFrag from './shaders/spark.frag?raw';
import sparkVert from './shaders/spark.vert?raw';

/** A compiled program, its uniforms looked up once each. */
interface Program {
  program: WebGLProgram;
  u(name: string): WebGLUniformLocation | null;
}

/** Everything on the graphics card. */
export interface NeuralGpu {
  link: Program;
  spark: Program;
  linkVao: WebGLVertexArrayObject;
  /** Each link's ends (4 floats), sent each frame. */
  endsBuffer: WebGLBuffer;
  /** Each link's weight (1 float), sent once per scene. */
  weightBuffer: WebGLBuffer;
  sparkVao: WebGLVertexArrayObject;
  /** Each sprite (x, y, radius, opacity), sent each frame. */
  sparkBuffer: WebGLBuffer;
}

/** What one frame draws, packed by the engine (CSS px). */
export interface NeuralFrame {
  /** The layout's size (CSS px) and device px per CSS px. */
  w: number;
  h: number;
  dpr: number;
  /** The links' ends, 4 floats each, `links` of them. */
  ends: Float32Array;
  links: number;
  /** The sprites (nodes, then signals), 4 floats each, `sparks` of them. */
  sprites: Float32Array;
  sparks: number;
  /** The longest link (CSS px), the stroke's width (CSS px), the glow pass's strength (0: none). */
  maxLink: number;
  lineWidth: number;
  lineGlow: number;
  /** The glow pass's width, in strokes. */
  glowWidth: number;
  /** The node sprite's core edge (a share of its radius) and its halo's strength. */
  edge: number;
  halo: number;
}

/** Pastes the shared colour code where a shader says `#include neural_shade` (as fluid_motion does). */
const withShade = (source: string) => source.replace('#include neural_shade', shadeGlsl);

/** Compiles and links two shaders; null (and a console note) if either fails. */
function compile(gl: WebGL2RenderingContext, vs: string, fs: string): Program | null {
  const shader = (type: number, source: string) => {
    const s = gl.createShader(type);
    if (!s) return null;
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('neural-net shader:', gl.getShaderInfoLog(s));
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
    console.error('neural-net program:', gl.getProgramInfoLog(program));
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

/** Sets up the programs and buffers; null if anything fails. */
export function setUpGl(gl: WebGL2RenderingContext): NeuralGpu | null {
  const link = compile(gl, withShade(linkVert), linkFrag);
  const spark = compile(gl, withShade(sparkVert), sparkFrag);
  if (!link || !spark) return null;
  const endsBuffer = gl.createBuffer()!;
  const weightBuffer = gl.createBuffer()!;
  const sparkBuffer = gl.createBuffer()!;
  // Links: per instance, the ends (location 0) and the weight (location 1); the quad's corners come from gl_VertexID.
  const linkVao = gl.createVertexArray()!;
  gl.bindVertexArray(linkVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, endsBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.vertexAttribDivisor(0, 1);
  gl.bindBuffer(gl.ARRAY_BUFFER, weightBuffer);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 4, 0);
  gl.vertexAttribDivisor(1, 1);
  // Sprites: per instance (location 0).
  const sparkVao = gl.createVertexArray()!;
  gl.bindVertexArray(sparkVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, sparkBuffer);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0);
  gl.vertexAttribDivisor(0, 1);
  gl.bindVertexArray(null);
  return { link, spark, linkVao, endsBuffer, weightBuffer, sparkVao, sparkBuffer };
}

/** Sends a scene's link weights (once per scene: they never change). */
export function sendWeights(gl: WebGL2RenderingContext, gpu: NeuralGpu, weight: Float32Array): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.weightBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, weight, gl.STATIC_DRAW);
}

/** `#rrggbb` → [r, g, b] (0–1), optionally `lift` of the way to white. */
function unit(hex: string, lift = 0): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => (v + (255 - v) * lift) / 255);
  return [c[0]!, c[1]!, c[2]!];
}

/** The colour uniforms both programs share (shade.glsl), and the canvas's size. */
function common(gl: WebGL2RenderingContext, p: Program, f: NeuralFrame, palette: WallpaperPalette): void {
  gl.uniform2f(p.u('uTargetPx'), gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.uniform1f(p.u('uDensity'), f.dpr);
  gl.uniform2f(p.u('uScreen'), f.w, f.h);
  // The cool end lifted 40% towards white, as the 2D drawing's shade() does.
  gl.uniform3fv(p.u('uCool'), unit(palette.cool, 0.4));
  gl.uniform3fv(p.u('uBright'), unit(palette.bright));
  gl.uniform3fv(p.u('uAccent'), unit(palette.accent));
}

/** Draws a frame: the links' soft glow pass, the links, then the nodes and signals, over a clear (transparent) canvas. */
export function drawGl(gl: WebGL2RenderingContext, gpu: NeuralGpu, f: NeuralFrame, palette: WallpaperPalette): void {
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  // Premultiplied, as the shaders write it (the canvas is composited over the CSS glow behind).
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  // Links: a wide faint pass (the glow), then the thin lines.
  gl.useProgram(gpu.link.program);
  common(gl, gpu.link, f, palette);
  gl.uniform1f(gpu.link.u('uMaxLink'), f.maxLink);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.endsBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, f.ends.subarray(0, f.links * 4), gl.STREAM_DRAW);
  gl.bindVertexArray(gpu.linkVao);
  if (f.lineGlow > 0) {
    gl.uniform1f(gpu.link.u('uWidth'), f.lineWidth * f.glowWidth);
    gl.uniform1f(gpu.link.u('uStrength'), f.lineGlow);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, f.links);
  }
  gl.uniform1f(gpu.link.u('uWidth'), f.lineWidth);
  gl.uniform1f(gpu.link.u('uStrength'), 1);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, f.links);

  // Nodes and signals: a sprite each.
  gl.useProgram(gpu.spark.program);
  common(gl, gpu.spark, f, palette);
  gl.uniform1f(gpu.spark.u('uEdge'), f.edge);
  gl.uniform1f(gpu.spark.u('uHalo'), f.halo);
  gl.bindBuffer(gl.ARRAY_BUFFER, gpu.sparkBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, f.sprites.subarray(0, f.sparks * 4), gl.STREAM_DRAW);
  gl.bindVertexArray(gpu.sparkVao);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, f.sparks);
  gl.bindVertexArray(null);
}
