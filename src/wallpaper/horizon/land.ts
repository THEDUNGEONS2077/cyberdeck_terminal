/**
 * src/wallpaper/horizon/land.ts: HORIZON's land, made once per layout size:
 * a field of jittered points with heights, cut into triangles; and the
 * colours the scene is drawn in.
 *
 * Layer: wallpaper (pure: no canvas, no DOM; seeded, so tests check it, and
 * a port to fluid_motion can make the same land from the same numbers).
 *
 * The land is DEPTH units deep and 2 × HALF_WIDTH wide, cut into cells
 * `cell` units on a side. The cell follows the layout's size, as the other
 * wallpapers' glyphs and nodes do (0.15.2, the user: "more polygons when
 * zoomed out, like the other wallpapers"): a layout REFERENCE_HEIGHT CSS px
 * tall gets cells 1 unit across; a bigger layout (zoomed out) smaller ones,
 * so more of them; a smaller one (zoomed in) bigger ones.
 *
 * It's drawn as `rows` strips (the triangles between a row and the next),
 * each placed by the shader at its distance from the camera, which glides
 * forward: a strip that passes behind the camera comes round again at the
 * far end, deep in the haze, so the land never ends and never pops. After
 * the strips, a wall of haze stands at the far end (two triangles, WALL
 * units away): it covers the thin band between the farthest land and the
 * horizon, so every pixel below the horizon is drawn each frame and the
 * sky above it can be drawn just once (engine.ts).
 */
import type { WallpaperPalette } from '../types';
import { CAMERA, CELL, DEPTH, HALF_WIDTH, HEIGHT, JITTER, REFERENCE_HEIGHT, WALL } from './params';

/** A random number source returning 0 ≤ n < 1 (seeded in tests). */
export type Rng = () => number;

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

/** The land's cell (units) for a layout `height` CSS px tall: smaller cells for a bigger layout, within CELL's limits. */
export function cellFor(height: number): number {
  const c = REFERENCE_HEIGHT / Math.max(1, height);
  return Math.min(CELL.max, Math.max(CELL.min, c));
}

/** The land: its rows and points across, its cell (units), and each point's place across, depth offset and height (units), row by row. */
export interface Land {
  rows: number;
  cols: number;
  cell: number;
  x: Float32Array;
  dz: Float32Array;
  y: Float32Array;
  /** For each quad (row, column): 1 when it's cut corner to corner the other way. */
  flip: Uint8Array;
}

/** Point (row, column)'s index in a land's arrays. */
export const at = (land: Pick<Land, 'cols'>, row: number, col: number) => row * land.cols + col;

/**
 * A new land with cells `cell` units across. The random numbers are drawn
 * in a fixed order (each point's x, depth and height, row by row, then each
 * quad's cut), so the same seed makes the same land on any platform. Depth
 * jitter and heights are in cells, so smaller cells make finer hills of the
 * same character.
 */
export function buildLand(rng: Rng, cell = 1): Land {
  const rows = Math.round(DEPTH / cell);
  const cols = 2 * Math.ceil(HALF_WIDTH / cell) + 1;
  const n = rows * cols;
  const x = new Float32Array(n);
  const dz = new Float32Array(n);
  const y = new Float32Array(n);
  const half = ((cols - 1) / 2) * cell;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      x[i] = -half + c * cell + (rng() * 2 - 1) * JITTER.x * cell;
      dz[i] = (rng() * 2 - 1) * JITTER.z;
      // Most points low; now and then a sharp peak (the reference's spikes), in cells.
      y[i] = (rng() < HEIGHT.peakChance ? between(rng, HEIGHT.peak) : between(rng, HEIGHT.low)) * cell;
    }
  }
  const flip = new Uint8Array(rows * (cols - 1));
  for (let i = 0; i < flip.length; i++) flip[i] = rng() < 0.5 ? 1 : 0;
  return { rows, cols, cell, x, dz, y, flip };
}

/** Floats per vertex of the mesh: x, height (units); strip, row in it (0 or 1), depth offset (rows; the wall's: units), corner (0, 1, 2; 3: no edges). */
export const VERTEX = 6;

/** Vertices in one strip of a land `cols` points across, and in the far wall. */
export const stripVertices = (cols: number) => (cols - 1) * 6;
export const WALL_VERTICES = 6;

/**
 * The land as triangles, three vertices each, not shared: each vertex
 * carries its corner (0, 1, 2), from which the shader knows how far a pixel
 * is from the triangle's edges, and draws only the edges. A strip's
 * triangles join row r to row r + 1 (the last strip joins the last row to
 * the first: the land repeats seamlessly). Then the far wall.
 */
export function landMesh(land: Land): Float32Array {
  const { rows, cols } = land;
  const out = new Float32Array((rows * stripVertices(cols) + WALL_VERTICES) * VERTEX);
  let o = 0;
  /** Writes the vertex for point (row, col), as row `inStrip` (0 near, 1 far) of strip `strip`, at triangle corner `corner`. */
  const put = (strip: number, inStrip: 0 | 1, col: number, corner: number) => {
    const i = ((strip + inStrip) % rows) * cols + col;
    out[o++] = land.x[i]!;
    out[o++] = land.y[i]!;
    out[o++] = strip;
    out[o++] = inStrip;
    out[o++] = land.dz[i]!;
    out[o++] = corner;
  };
  for (let s = 0; s < rows; s++) {
    for (let c = 0; c < cols - 1; c++) {
      // The quad's corners: two near (this row), two far (the next).
      if (land.flip[s * (cols - 1) + c]) {
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
  // The far wall: strip −1 (the shader takes its depth as given, in units), corner 3 (no edges), from below the ground to the camera's height (the horizon), wider than any screen sees at that depth.
  const w = WALL * 6;
  for (const [x, y] of [[-w, -1], [w, -1], [w, CAMERA.height], [-w, -1], [w, CAMERA.height], [-w, CAMERA.height]] as const) {
    out[o++] = x;
    out[o++] = y;
    out[o++] = -1;
    out[o++] = 0;
    out[o++] = WALL;
    out[o++] = 3;
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
  /** The land's edges and its faces. */
  line: Rgb;
  face: Rgb;
}

/**
 * The tones from a palette: the glow from its accent, the land's edges from
 * its cool colour (SYNTH, made for this, gives the reference's pink and
 * teal), the sky a dark plum of the accent.
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
  };
}
