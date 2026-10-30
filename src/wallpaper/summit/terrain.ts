/**
 * src/wallpaper/summit/terrain.ts: SUMMIT's shapes and colours: each
 * layer's skyline (peaks for a range, rounded lumps for clouds, flat for the
 * sky), the low-poly facets under it, each shaded flat by which way it faces
 * the low sun, and the colours of all of it from the palette.
 *
 * Layer: wallpaper (pure: the random numbers are passed in, so tests drive
 * it). Everything loops: a layer is `period` CSS px wide and its shapes at
 * x and x + period are the same, so its strip repeats with no seam.
 */
import type { WallpaperPalette } from '../types';
import { type LayerSpec, SUN } from './params';

/** A random number source returning 0 ≤ n < 1. */
export type Rng = () => number;

/** One facet: its corners (CSS px, y down from the screen's top), its light (0 shadow – 1 full sun), snow, and how far down its layer it is (0 top – 1 bottom). */
export interface Facet {
  x: [number, number, number];
  y: [number, number, number];
  light: number;
  snow: boolean;
  depth: number;
}

/** A layer laid out: its facets and its silhouette (the skyline's points, left to right over one loop and a column either side). */
export interface LayerShape {
  facets: Facet[];
  outline: { x: number; y: number }[];
  /** Its highest point and where it ends (CSS px from the top). */
  top: number;
  bottom: number;
}

/** A value in [lo, hi]. */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + rng() * (hi - lo);

/** The distance between x and c on a loop `period` long. */
function loopDistance(x: number, c: number, period: number): number {
  const d = (((x - c) % period) + period) % period;
  return Math.min(d, period - d);
}

/**
 * Points along one loop, `spacing` (CSS px, as [least, most]) apart: the
 * gaps drawn at random, then all stretched a little so the last one meets
 * the first exactly a loop later.
 */
function spaced(rng: Rng, spacing: readonly [number, number], period: number): number[] {
  const gaps: number[] = [];
  let sum = 0;
  while (sum < period) {
    const g = between(rng, spacing);
    gaps.push(g);
    sum += g;
  }
  const k = period / sum;
  const out: number[] = [];
  let x = rng() * gaps[0]! * k;
  for (const g of gaps) {
    out.push(x % period);
    x += g * k;
  }
  return out;
}

/**
 * A layer's skyline, y (CSS px from the top) at any x, looping every
 * `period`: a range is the highest of its peaks' flanks (straight, steep:
 * the reference's alpine peaks); a bank of clouds the highest of its
 * billows (rounded: parabolas, so neighbours meet in a soft dip and no
 * edge is vertical); the sky is flat, just above the screen.
 */
export function skyline(rng: Rng, spec: LayerSpec, h: number, period: number): (x: number) => number {
  const bottom = spec.bottom * h;
  if (spec.kind === 'sky') return () => -spec.facet * h * 0.5;
  const spacing = [spec.spacing[0] * h, spec.spacing[1] * h] as const;
  const centres = spaced(rng, spacing, period);
  if (spec.kind === 'rock') {
    const peaks = centres.map((c) => ({ c, y: between(rng, spec.top) * h }));
    return (x) => {
      let y = bottom;
      for (const p of peaks) y = Math.min(y, p.y + spec.slope * loopDistance(x, p.c, period));
      return y;
    };
  }
  // A billow per centre, about as wide as the gap to its neighbours; `slope` sets how tall for its width.
  const billows = centres.map((c) => {
    const r = between(rng, spacing) * 0.6;
    return { c, r, y: between(rng, spec.top) * h, rise: r * spec.slope };
  });
  return (x) => {
    let y = bottom;
    for (const b of billows) y = Math.min(y, b.y + b.rise * (loopDistance(x, b.c, period) / b.r) ** 2);
    return y;
  };
}

/** How much of a cloud bank's height its light takes to fade from crest to shadow. */
const CLOUD_BODY = 0.55;

/** How far down the sky's band it is warmest (the horizon behind the far peaks). */
const SKY_WARM = 0.62;

/** Stretches the facets' light so its 10th and 90th percentiles become `from` and `to`. */
function stretchLight(facets: Facet[], from: number, to: number): void {
  if (facets.length < 2) return;
  const sorted = facets.map((f) => f.light).sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.1)]!;
  const hi = sorted[Math.floor(sorted.length * 0.9)]!;
  const span = Math.max(0.01, hi - lo);
  for (const f of facets) f.light = Math.min(1, Math.max(0, from + ((f.light - lo) / span) * (to - from)));
}

/** `v` as a unit vector. */
function unit(v: { x: number; y: number; z: number }): readonly [number, number, number] {
  const n = Math.hypot(v.x, v.y, v.z);
  return [v.x / n, v.y / n, v.z / n];
}

/** The light on rock, a unit vector (x right, y up, z away from you). */
const LIGHT = unit(SUN);

/**
 * Lays out one layer: a lattice of rows from its skyline down to its
 * bottom, every other row shifted half a column (so no edge runs straight
 * down: a square grid's columns read as cliffs), its corners nudged off
 * the lattice, each pair of rows zipped into triangles. The lattice loops: its last column's corners are its first
 * ones a loop along, so the facets at the seam join exactly. Each facet is
 * shaded by its slope, as if the layer were a land seen from the front (the
 * skyline its far ridge, its bottom near you); the sky is shaded by height.
 */
export function layLayer(rng: Rng, spec: LayerSpec, h: number, period: number): LayerShape {
  const line = skyline(rng, spec, h, period);
  const bottom = spec.bottom * h;
  const rowH = spec.facet * h;
  const cols = Math.max(4, Math.round(period / (rowH * spec.stretch)));
  const colW = period / cols;
  // The skyline's height on average sets the rows (a facet's height each).
  let mean = 0;
  for (let i = 0; i < cols; i++) mean += line(i * colW) / cols;
  const rows = Math.max(2, Math.round((bottom - mean) / rowH));
  // How deep the land is, front to back: its slopes about as steep as they look.
  const deep = Math.max(rowH, bottom - mean);

  // The corners, column by column (one loop of columns; the next loop's are these shifted).
  const corners: { x: number; y: number; z: number }[][] = [];
  for (let i = 0; i < cols; i++) {
    const column: { x: number; y: number; z: number }[] = [];
    for (let j = 0; j <= rows; j++) {
      const t = j / rows;
      const x = (i + (j % 2) * 0.5 + (rng() - 0.5) * spec.rough) * colW;
      const top = line(x);
      // Inside the layer each corner wanders up or down too; the skyline and the bottom stay put.
      const wobble = j > 0 && j < rows ? (rng() - 0.5) * spec.rough * ((bottom - top) / rows) : 0;
      column.push({ x, y: top + (bottom - top) * t + wobble, z: (1 - t) * deep });
    }
    corners.push(column);
  }
  /** Corner (i, j), for i up to `cols` (the first column again, a loop along). */
  const at = (i: number, j: number) => {
    const c = corners[i % cols]![j]!;
    return i >= cols ? { x: c.x + period, y: c.y, z: c.z } : c;
  };

  const facets: Facet[] = [];
  const snowLine = (spec.top[0] + spec.snow * (spec.bottom - spec.top[0])) * h;
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      // Rows j and j + 1: the shifted one's corner sits between the other's two.
      const a = at(i, j);
      const b = at(i + 1, j);
      const c = at(i + 1, j + 1);
      const d = at(i, j + 1);
      const tris = j % 2 === 0 ? [[a, b, d], [b, c, d]] : [[a, b, c], [a, c, d]];
      for (const [p, q, r] of tris as [typeof a, typeof a, typeof a][]) {
        const cy = (p.y + q.y + r.y) / 3;
        const depth = Math.min(1, Math.max(0, (j + 0.5) / rows));
        let light: number;
        let up = 1;
        if (spec.kind === 'cloud') {
          // A cloud is lit along its crests and sinks into shadow below (the dusk light skims its top), each facet a little off its neighbours.
          const mx = (p.x + q.x + r.x) / 3;
          const crest = line(mx);
          const t = Math.min(1, Math.max(0, (cy - crest) / Math.max(1, (bottom - crest) * CLOUD_BODY)));
          light = Math.min(1, Math.max(0, (1 - t) ** 1.4 * 0.95 + (rng() - 0.5) * 0.1));
        } else if (spec.kind === 'sky') {
          // The sky: lighter toward the horizon (its warmest at the far peaks, SKY_WARM of the way down), each facet a little off its neighbours (the reference's bands).
          light = Math.min(1, Math.max(0, cy / (bottom * SKY_WARM) + (rng() - 0.5) * 0.16));
        } else {
          // The facet's normal in a land: x right, height up (−y), depth away (z); pointing up, out of the ground.
          const u = [q.x - p.x, p.y - q.y, q.z - p.z];
          const v = [r.x - p.x, p.y - r.y, r.z - p.z];
          let n = [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
          if (n[1]! < 0) n = n.map((k) => -k);
          const len = Math.hypot(n[0]!, n[1]!, n[2]!) || 1;
          up = n[1]! / len;
          const dot = (n[0]! * LIGHT[0] + n[1]! * LIGHT[1] + n[2]! * LIGHT[2]) / len;
          light = Math.min(1, Math.max(0, dot + (rng() - 0.5) * 0.08));
        }
        const snow = spec.snow > 0 && cy < snowLine && up > 0.35 && rng() < 0.8;
        facets.push({ x: [p.x, q.x, r.x], y: [p.y, q.y, r.y], light, snow, depth });
      }
    }
  }

  // Each range uses the whole ramp, deep shadow to full sun (a gentle
  // range's slopes alone would all fall in its middle, one muddy tone; the
  // reference is strong light against shadow).
  if (spec.kind === 'rock') stretchLight(facets, 0.06, 0.94);

  // The silhouette: the skyline's corners from a column before the loop to a column after it.
  const outline: { x: number; y: number }[] = [];
  for (let i = -1; i <= cols + 1; i++) {
    const c = i < 0 ? { x: at(cols - 1, 0).x - period, y: at(cols - 1, 0).y } : at(i, 0);
    outline.push({ x: c.x, y: c.y });
  }
  let top = bottom;
  for (const p of outline) top = Math.min(top, p.y);
  return { facets, outline, top, bottom };
}

/** A colour as [r, g, b] (0–255). */
export type Rgb = [number, number, number];

/** `#rrggbb` → [r, g, b]. */
export function rgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** `a` mixed toward `b` by `k` (0–1). */
export function mix(a: Rgb, b: Rgb, k: number): Rgb {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/** How much of a range or cloud is in shadow: its light is raised to this power before the ramp, so only the faces turned well to the sun are crimson (the reference is mostly navy). */
const SHADOW_CURVE = 1.6;

/** A ramp of colours from 0 to 1, evenly spaced, read at `t`. */
function ramp(stops: readonly Rgb[], t: number): Rgb {
  const k = Math.min(1, Math.max(0, t)) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(k));
  return mix(stops[i]!, stops[i + 1]!, k - i);
}

/** SUMMIT's colours, all from the palette (ALPENGLOW gives the reference's crimson and navy). */
export interface SummitTones {
  /** The sky, top to horizon. */
  sky: Rgb[];
  /** A range's faces, shadow to full sun, and its snow, shadow to sun. */
  rock: Rgb[];
  snow: Rgb[];
  /** The clouds, shadow to sun: greys in every palette (the user, 0.28.1), and the grey far clouds fade toward. */
  cloud: Rgb[];
  cloudHaze: Rgb;
  /** What distance fades toward (the sky low down), and the horizon's glow. */
  haze: Rgb;
  glow: Rgb;
}

/** White, for the clouds' greys (mixed with the palette's black background, so they carry no hue). */
const WHITE: Rgb = [255, 255, 255];

/** The clouds' greys, shadow to crest, as shares of the way from black to white. */
const CLOUD_GREYS = [0.09, 0.17, 0.3, 0.5, 0.7] as const;

/** The grey distant clouds fade toward (share of the way from black to white). */
const CLOUD_HAZE_GREY = 0.24;

/** The tones for `p`. */
export function summitTones(p: WallpaperPalette): SummitTones {
  const bg = rgb(p.bg);
  const cool = rgb(p.cool);
  const accent = rgb(p.accent);
  const bright = rgb(p.bright);
  const dim = rgb(p.dim);
  // Navy shadow, an indigo-plum middle, crimson in the sun, peach at the brightest edge.
  const navy = mix(bg, cool, 0.42);
  const indigo = mix(mix(cool, accent, 0.3), bg, 0.45);
  const crimson = mix(accent, bg, 0.18);
  const peach = mix(accent, bright, 0.3);
  return {
    sky: [mix(bg, cool, 0.32), mix(mix(cool, dim, 0.35), bg, 0.42), mix(mix(cool, accent, 0.45), bg, 0.25), mix(accent, bright, 0.42)],
    rock: [mix(navy, bg, 0.35), navy, indigo, crimson, peach],
    snow: [mix(cool, bright, 0.35), mix(bright, cool, 0.2), mix(bright, accent, 0.15)],
    // The clouds are grey in every palette (the user, 0.28.1: "always just gray based shades"): the black background mixed toward white, dark beneath to pale on the crests.
    cloud: CLOUD_GREYS.map((k) => mix(bg, WHITE, k)),
    cloudHaze: mix(bg, WHITE, CLOUD_HAZE_GREY),
    haze: mix(mix(cool, dim, 0.4), bg, 0.3),
    glow: mix(accent, bright, 0.45),
  };
}

/** A facet's colour in its layer, as `rgb(…)`. */
export function facetColour(t: SummitTones, spec: LayerSpec, f: Facet): string {
  let c: Rgb;
  if (spec.kind === 'sky') c = ramp(t.sky, f.light);
  else if (f.snow) c = ramp(t.snow, f.light);
  else if (spec.kind === 'cloud') {
    // Clouds darken toward their bottoms: the front sea is in its own shadow, as the reference's foreground.
    c = mix(ramp(t.cloud, f.light), t.cloud[0]!, f.depth ** 1.5 * 0.5);
  } else {
    // A range darkens a little toward its foot (its valleys are in shadow).
    c = mix(ramp(t.rock, f.light ** SHADOW_CURVE), t.rock[0]!, f.depth * 0.3);
  }
  if (spec.haze > 0) c = mix(c, spec.kind === 'cloud' ? t.cloudHaze : t.haze, spec.haze);
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}

/** A layer's base colour, under its facets (so no hairline shows between them): its shadow, hazed. */
export function baseColour(t: SummitTones, spec: LayerSpec): string {
  let c = spec.kind === 'sky' ? t.sky[1]! : spec.kind === 'cloud' ? t.cloud[0]! : t.rock[1]!;
  if (spec.haze > 0) c = mix(c, spec.kind === 'cloud' ? t.cloudHaze : t.haze, spec.haze);
  return `rgb(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])})`;
}
