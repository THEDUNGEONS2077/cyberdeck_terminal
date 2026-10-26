/**
 * src/wallpaper/horizon/land.ts: HORIZON's land, made once: a field of
 * jittered points with heights, cut into triangles; and the colours the
 * scene is drawn in.
 *
 * Layer: wallpaper (pure: no canvas, no DOM; seeded, so tests check it, and
 * a port to fluid_motion can make the same land from the same numbers).
 *
 * The land is ROWS rows of COLS points, a row 1 unit deep. It's drawn as
 * ROWS strips (the triangles between a row and the next), each strip
 * placed by the shader at its distance from the camera, which glides
 * forward: a strip that passes behind the camera comes round again at the
 * far end, deep in the haze, so the land never ends and never pops. The
 * land itself is never changed after it's made, so nothing about it is
 * sent per frame.
 */
import type { WallpaperPalette } from '../types';
import { COLS, HALF_WIDTH, HEIGHT, JITTER, ROWS } from './params';

/** A random number source returning 0 ≤ n < 1 (seeded in tests). */
export type Rng = () => number;

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

/** The land: each point's place across (units), its offset in depth (units, within its row) and its height (units), row by row. */
export interface Land {
  x: Float32Array;
  dz: Float32Array;
  y: Float32Array;
  /** For each quad (row, column): 1 when it's cut corner to corner the other way. */
  flip: Uint8Array;
}

/** Point (row, column)'s index in the land's arrays. */
export const at = (row: number, col: number) => row * COLS + col;

/**
 * A new land. The random numbers are drawn in a fixed order (each point's
 * x, depth and height, row by row, then each quad's cut), so the same seed
 * makes the same land on any platform.
 */
export function buildLand(rng: Rng): Land {
  const n = ROWS * COLS;
  const x = new Float32Array(n);
  const dz = new Float32Array(n);
  const y = new Float32Array(n);
  const step = (2 * HALF_WIDTH) / (COLS - 1);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = at(r, c);
      x[i] = -HALF_WIDTH + c * step + (rng() * 2 - 1) * JITTER.x * step;
      dz[i] = (rng() * 2 - 1) * JITTER.z;
      // Most points low; now and then a sharp peak (the reference's spikes).
      y[i] = rng() < HEIGHT.peakChance ? between(rng, HEIGHT.peak) : between(rng, HEIGHT.low);
    }
  }
  const flip = new Uint8Array(ROWS * (COLS - 1));
  for (let i = 0; i < flip.length; i++) flip[i] = rng() < 0.5 ? 1 : 0;
  return { x, dz, y, flip };
}

/** Floats per vertex of the mesh: x, height (units); strip, row in it (0 or 1), depth offset, corner (0, 1, 2). */
export const VERTEX = 6;

/**
 * The land as triangles, three vertices each, not shared: each vertex
 * carries its corner (0, 1, 2), from which the shader knows how far a pixel
 * is from the triangle's edges, and draws only the edges. A strip's
 * triangles join row r to row r + 1 (the last strip joins the last row to
 * the first: the land repeats seamlessly).
 */
export function landMesh(land: Land): Float32Array {
  const out = new Float32Array(ROWS * (COLS - 1) * 2 * 3 * VERTEX);
  let o = 0;
  /** Writes the vertex for point (row, col), as row `inStrip` (0 near, 1 far) of strip `strip`, at triangle corner `corner`. */
  const put = (strip: number, inStrip: 0 | 1, col: number, corner: number) => {
    const i = at((strip + inStrip) % ROWS, col);
    out[o++] = land.x[i]!;
    out[o++] = land.y[i]!;
    out[o++] = strip;
    out[o++] = inStrip;
    out[o++] = land.dz[i]!;
    out[o++] = corner;
  };
  for (let s = 0; s < ROWS; s++) {
    for (let c = 0; c < COLS - 1; c++) {
      // The quad's corners: a, b near (this row), d, e far (the next).
      if (land.flip[s * (COLS - 1) + c]) {
        put(s, 0, c, 0);
        put(s, 0, c + 1, 1);
        put(s, 1, c, 2);
        put(s, 0, c + 1, 0);
        put(s, 1, c + 1, 1);
        put(s, 1, c, 2);
      } else {
        put(s, 0, c, 0);
        put(s, 0, c + 1, 1);
        put(s, 1, c + 1, 2);
        put(s, 0, c, 0);
        put(s, 1, c + 1, 1);
        put(s, 1, c, 2);
      }
    }
  }
  return out;
}

/** A colour as linear 0–1 RGB (the shaders' uniforms). */
export type Rgb = [number, number, number];

/** '#rrggbb' as 0–1 RGB. */
export function rgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** a → b by k. */
export function mixRgb(a: Rgb, b: Rgb, k: number): Rgb {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

const WHITE: Rgb = [1, 1, 1];

/** The colours HORIZON is drawn in, from a palette. */
export interface HorizonTones {
  /** The sky at the top, and low down (before the glow). */
  skyTop: Rgb;
  skyLow: Rgb;
  /** The glow's colour (added), and its white-hot core. */
  glow: Rgb;
  core: Rgb;
  /** The land's edges, its faces, and the slabs' faces and specks. */
  line: Rgb;
  face: Rgb;
  slab: Rgb;
  spark: Rgb;
}

/**
 * The tones from a palette: the glow and the slabs' specks from its accent,
 * the land's edges from its cool colour (SYNTH, made for this, gives the
 * reference's pink and teal), the sky a dark plum of the accent.
 */
export function horizonTones(p: WallpaperPalette): HorizonTones {
  const bg = rgb(p.bg);
  const accent = rgb(p.accent);
  const cool = rgb(p.cool);
  return {
    skyTop: mixRgb(bg, accent, 0.09),
    skyLow: mixRgb(bg, accent, 0.24),
    glow: accent,
    core: mixRgb(accent, WHITE, 0.85),
    line: mixRgb(cool, bg, 0.3),
    face: mixRgb(bg, cool, 0.05),
    slab: mixRgb(bg, accent, 0.22),
    spark: mixRgb(accent, WHITE, 0.35),
  };
}
