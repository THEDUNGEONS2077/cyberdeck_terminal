/**
 * src/wallpaper/megacity/city.ts: MEGACITY's city, laid out once per
 * screen size: the layers of towers, the signs and beacons on them, the
 * figure's place on her ledge; and what the GPU draws it from.
 *
 * Layer: wallpaper (pure: no canvas, no DOM; seeded, so tests check it, and
 * fluid_motion's Kotlin port lays out the same way, lib/megacity/City.kt).
 *
 * Each layer is a skyline: for every column (one CSS px wide) the top of
 * the tower there and which tower it is. The shader (shaders/city.frag)
 * walks the layers near to far and stops at the first tower a pixel is
 * inside, so every pixel is worked out once, windows and all: nothing in
 * the city is drawn twice, and nothing about it is sent per frame.
 *   - Towers tile each layer left to right with gaps (some left out, so
 *     the layers behind show); some step back to a narrower top, some carry
 *     a spire. Their windows aren't laid out here: the shader makes them
 *     from each tower's seed.
 *   - Signs sit on the middle layers' towers, billboards far off, beacons
 *     on roofs and spires: each only where no nearer tower hides it.
 * Built once per screen: it may allocate.
 */
import type { WallpaperPalette } from '../types';
import { FIGURE_OUTLINES, FIGURE_TRIANGLES, FIGURE_VERTICES } from './figure';
import { BEACONS, BILLBOARDS, FIGURE, LAYERS, SETBACK, SIGNS, SKYLINE_WIDTH, SPIRE } from './params';

/** A random number source returning 0 ≤ n < 1 (seeded in tests). */
export type Rng = () => number;

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();
/** A random whole number in [lo, hi]. */
const pick = (rng: Rng, [lo, hi]: readonly [number, number]) => Math.floor(between(rng, [lo, hi + 1]));

/** A tower (CSS px, whole numbers across): left edge, width, top; a narrower upper part; a spire; the seed its look comes from. */
export interface Tower {
  x: number;
  w: number;
  top: number;
  upper: { x: number; w: number; top: number } | null;
  spire: { x: number; top: number } | null;
  seed: number;
}

/** A neon sign or billboard (CSS px): where, its layer, the cool colour or the accent, upright or wide, its seed and breathing phase. */
export interface Sign {
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  cool: boolean;
  vertical: boolean;
  seed: number;
  phase: number;
}

/** A beacon on a roof or spire: where, its layer, how often it blinks (s) and when. */
export interface Beacon {
  x: number;
  y: number;
  layer: number;
  period: number;
  phase: number;
}

/** The figure's place (CSS px): her middle, her feet, her height; the ledge's right end; the railing's top and right end. */
export interface Placement {
  x: number;
  feet: number;
  height: number;
  ledgeRight: number;
  railTop: number;
  railRight: number;
}

/** A city on a w × h screen (CSS px). */
export interface City {
  w: number;
  h: number;
  /** Columns across (one CSS px each). */
  cols: number;
  layers: Tower[][];
  /** Each layer's top per column (a large number where there's no tower). */
  tops: Float32Array[];
  signs: Sign[];
  beacons: Beacon[];
  figure: Placement;
}

/** A column with no tower: no pixel is below it. */
export const NO_TOWER = 1e6;

/** Lays out a layer's towers, left to right across the screen. */
function towersFor(layer: number, w: number, h: number, rng: Rng): Tower[] {
  const p = LAYERS[layer]!;
  const towers: Tower[] = [];
  let x = -pick(rng, [0, 20]);
  while (x < w) {
    const tw = pick(rng, p.width);
    const gap = pick(rng, p.gap);
    if (rng() >= p.skip) {
      const top = Math.round(between(rng, p.top) * h);
      const seed = 1 + Math.floor(rng() * 0x7fffff);
      let upper: Tower['upper'] = null;
      if (rng() < SETBACK.chance && tw >= 12) {
        const uw = Math.max(4, Math.round(tw * between(rng, SETBACK.width)));
        upper = { x: x + Math.floor(rng() * (tw - uw + 1)), w: uw, top: Math.round(top - between(rng, SETBACK.rise) * h) };
      }
      let spire: Tower['spire'] = null;
      const roof = upper ?? { x, w: tw, top };
      if (roof.top > 0 && rng() < SPIRE.chance) spire = { x: roof.x + Math.floor(rng() * roof.w), top: Math.round(roof.top - between(rng, SPIRE.rise) * h) };
      towers.push({ x, w: tw, top, upper, spire, seed });
    }
    x += tw + gap;
  }
  return towers;
}

/** A layer's top per column (the tallest part of the tower there). */
function columnTops(towers: readonly Tower[], cols: number): Float32Array {
  const tops = new Float32Array(cols).fill(NO_TOWER);
  const set = (from: number, width: number, top: number) => {
    for (let c = Math.max(0, from); c < Math.min(cols, from + width); c++) tops[c] = Math.min(tops[c]!, top);
  };
  for (const t of towers) {
    set(t.x, t.w, t.top);
    if (t.upper) set(t.upper.x, t.upper.w, t.upper.top);
    if (t.spire) set(t.spire.x, 1, t.spire.top);
  }
  return tops;
}

/** Is the stretch of columns [x0, x1] at height y (CSS px) in sight: no tower of a layer nearer than `layer` covers it? */
export function inSight(city: Pick<City, 'tops' | 'cols'>, layer: number, x0: number, x1: number, y: number): boolean {
  for (let l = layer + 1; l < city.tops.length; l++) {
    const tops = city.tops[l]!;
    for (let c = Math.max(0, Math.floor(x0)); c <= Math.min(city.cols - 1, Math.floor(x1)); c++) if (tops[c]! <= y) return false;
  }
  return true;
}

/** Places signs (layers 2, 3) and billboards (layer 1) on towers, where they can be seen and don't overlap. */
function placeSigns(city: City, rng: Rng): Sign[] {
  const signs: Sign[] = [];
  const mpx = (city.w * city.h) / 1e6;
  const want = [
    { n: Math.round(SIGNS.perMpx * mpx), billboard: false },
    { n: Math.round(BILLBOARDS.perMpx * mpx), billboard: true },
  ];
  for (const { n, billboard } of want) {
    let placed = 0;
    for (let tries = 0; placed < n && tries < n * 40; tries++) {
      const layer = billboard ? 1 : 2 + Math.floor(rng() * 2);
      const vertical = !billboard && rng() < SIGNS.vertical;
      const size = billboard ? BILLBOARDS : vertical ? SIGNS.tall : SIGNS.wide;
      const sw = pick(rng, size.w);
      const sh = pick(rng, size.h);
      const towers = city.layers[layer]!;
      const t = towers[Math.floor(rng() * towers.length)];
      if (!t || t.w < sw + 4) continue;
      const x = t.x + 2 + Math.floor(rng() * (t.w - sw - 3));
      const top = Math.max(t.top, 0) + 6;
      const y = Math.round(between(rng, [top, city.h * 0.8]));
      // Wholly on the screen, and in sight.
      if (x < 0 || x + sw > city.w || y + sh > city.h * 0.85 || !inSight(city, layer, x - 1, x + sw + 1, y + sh + 1)) continue;
      if (signs.some((s) => x < s.x + s.w + 3 && s.x < x + sw + 3 && y < s.y + s.h + 3 && s.y < y + sh + 3)) continue;
      signs.push({ x, y, w: sw, h: sh, layer, cool: billboard || rng() < SIGNS.cool, vertical, seed: 1 + Math.floor(rng() * 0x7fffff), phase: rng() * Math.PI * 2 });
      placed++;
    }
  }
  return signs;
}

/** Beacons on spires and roofs that can be seen. */
function placeBeacons(city: City, rng: Rng): Beacon[] {
  const beacons: Beacon[] = [];
  city.layers.forEach((towers, layer) => {
    if (layer < 2) return;
    for (const t of towers) {
      const roof = t.spire ? { x: t.spire.x + 0.5, y: t.spire.top } : { x: t.x + t.w / 2, y: (t.upper ?? t).top };
      if (roof.y <= 2 || roof.y > city.h * 0.7) continue;
      if (!t.spire && rng() >= BEACONS.chance) continue;
      if (!inSight(city, layer, roof.x - 2, roof.x + 2, roof.y - 2)) continue;
      beacons.push({ x: roof.x, y: roof.y - 1, layer, period: between(rng, BEACONS.period), phase: rng() });
    }
  });
  return beacons;
}

/** Where the figure stands: left of the middle (smaller and lower on a wide screen); her ledge, her railing. */
export function placeFigure(w: number, h: number): Placement {
  const shape = w < h ? FIGURE.tall : FIGURE.wide;
  const height = shape.height * h;
  const x = shape.x * w;
  const feet = shape.feet * h;
  return { x, feet, height, ledgeRight: x + FIGURE.ledgeOut * height, railTop: feet - FIGURE.railHeight * height, railRight: x - FIGURE.railEnd * height };
}

/** Lays out the city for a w × h screen (CSS px). */
export function buildCity(w: number, h: number, rng: Rng): City {
  const cols = Math.ceil(w) + 1;
  const layers = LAYERS.map((_, l) => towersFor(l, w, h, rng));
  const city: City = { w, h, cols, layers, tops: layers.map((t) => columnTops(t, cols)), signs: [], beacons: [], figure: placeFigure(w, h) };
  city.signs = placeSigns(city, rng);
  city.beacons = placeBeacons(city, rng);
  return city;
}

/** Rows of the skyline texture each layer takes (its columns wrap at SKYLINE_WIDTH). */
export function skylineRows(city: Pick<City, 'cols'>): number {
  return Math.ceil(city.cols / SKYLINE_WIDTH);
}

/**
 * The skyline texture (RGBA float, SKYLINE_WIDTH across, skylineRows rows
 * per layer): per column, the top there, the tower's left edge and width
 * (its windows line up with them), and its seed (negative on a spire: no
 * windows there). NO_TOWER where there's none.
 */
export function skyline(city: City): Float32Array {
  const rows = skylineRows(city);
  const data = new Float32Array(SKYLINE_WIDTH * rows * city.layers.length * 4);
  const at = (l: number, c: number) => ((l * rows + Math.floor(c / SKYLINE_WIDTH)) * SKYLINE_WIDTH + (c % SKYLINE_WIDTH)) * 4;
  for (let l = 0; l < city.layers.length; l++) {
    for (let c = 0; c < city.cols; c++) data[at(l, c)] = NO_TOWER;
    for (const t of city.layers[l]!) {
      const put = (from: number, width: number, top: number, seed: number) => {
        for (let c = Math.max(0, from); c < Math.min(city.cols, from + width); c++) {
          const i = at(l, c);
          if (top > data[i]!) continue;
          data[i] = top;
          data[i + 1] = t.x;
          data[i + 2] = t.w;
          data[i + 3] = seed;
        }
      };
      put(t.x, t.w, t.top, t.seed);
      if (t.upper) put(t.upper.x, t.upper.w, t.upper.top, t.seed);
      if (t.spire) put(t.spire.x, 1, t.spire.top, -t.seed);
    }
  }
  return data;
}

/** An RGB colour, each 0–1. */
export type Rgb = [number, number, number];

/** `#rrggbb` → RGB 0–1. */
export function rgb(hex: string): Rgb {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** a → b by t. */
export function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

const WHITE: Rgb = [1, 1, 1];

/** MEGACITY's colours. */
export interface CityTones {
  skyTop: Rgb;
  skyMid: Rgb;
  skyLow: Rgb;
  lowGlow: Rgb;
  faceFar: Rgb;
  faceNear: Rgb;
  edge: Rgb;
  winPale: Rgb;
  winViolet: Rgb;
  winPink: Rgb;
  winWhite: Rgb;
  signWarm: Rgb;
  signCool: Rgb;
  beacon: Rgb;
  droneWhite: Rgb;
  droneCool: Rgb;
  figure: Rgb;
  rim: Rgb;
  ledge: Rgb;
  ledgeTop: Rgb;
  rail: Rgb;
  glass: Rgb;
}

/**
 * The city's colours from a palette. With NEON they're the reference's:
 * the haze is --cool (blue) at the top, turning violet towards the accent
 * lower down, a pink glow rising from below; the windows pale blue, violet,
 * pink and white; the signs the accent (pink); the figure and her ledge
 * near-black blue.
 */
export function cityTones(p: WallpaperPalette): CityTones {
  const bg = rgb(p.bg);
  const cool = rgb(p.cool);
  const accent = rgb(p.accent);
  const bright = rgb(p.bright);
  return {
    skyTop: cool,
    skyMid: mixRgb(mixRgb(cool, accent, 0.18), bg, 0.08),
    skyLow: mixRgb(cool, accent, 0.5),
    lowGlow: mixRgb(bg, accent, 0.18),
    faceFar: mixRgb(cool, bg, 0.3),
    faceNear: mixRgb(cool, bg, 0.8),
    edge: mixRgb(cool, WHITE, 0.55),
    winPale: mixRgb(cool, WHITE, 0.55),
    winViolet: mixRgb(mixRgb(cool, accent, 0.5), WHITE, 0.3),
    winPink: mixRgb(accent, WHITE, 0.3),
    winWhite: mixRgb(cool, WHITE, 0.82),
    signWarm: accent,
    signCool: mixRgb(cool, WHITE, 0.45),
    beacon: accent,
    droneWhite: mixRgb(bright, WHITE, 0.5),
    droneCool: mixRgb(cool, WHITE, 0.5),
    figure: mixRgb(bg, cool, 0.16),
    rim: mixRgb(cool, WHITE, 0.35),
    ledge: mixRgb(bg, cool, 0.16),
    ledgeTop: mixRgb(mixRgb(cool, WHITE, 0.15), bg, 0.3),
    rail: mixRgb(bg, cool, 0.3),
    glass: mixRgb(bg, cool, 0.45),
  };
}

/** The haze's colour at height y on a screen h tall: as the shader works it out (shaders/city.frag haze). */
export function hazeAt(t: CityTones, y: number, h: number): Rgb {
  const k = Math.min(1, Math.max(0, y / h));
  const c = k < 0.5 ? mixRgb(t.skyTop, t.skyMid, k * 2) : mixRgb(t.skyMid, t.skyLow, k * 2 - 1);
  const s = Math.min(1, Math.max(0, (k - 0.4) / 0.6));
  const glow = s * s * (3 - 2 * s);
  return [c[0] + t.lowGlow[0] * glow, c[1] + t.lowGlow[1] * glow, c[2] + t.lowGlow[2] * glow];
}

/** Floats per foreground vertex: x, y (CSS px), r, g, b, a (premultiplied). */
export const SHAPE = 6;

/**
 * The foreground as triangles (SHAPE floats a vertex): the glass railing,
 * the ledge with its lit edge and seams, the figure's rim of light (her
 * outline shifted up and towards the city), then the figure. `pxPerUnit`
 * is canvas px per CSS px: each outline gets a one-pixel edge fading out
 * (anti-aliasing, with no multisampling).
 */
export function foreground(city: City, t: CityTones, pxPerUnit: number): Float32Array {
  const out: number[] = [];
  const vertex = (x: number, y: number, c: Rgb, a: number) => out.push(x, y, c[0] * a, c[1] * a, c[2] * a, a);
  const rect = (x0: number, y0: number, x1: number, y1: number, c: Rgb, a: number) => {
    vertex(x0, y0, c, a);
    vertex(x1, y0, c, a);
    vertex(x0, y1, c, a);
    vertex(x1, y0, c, a);
    vertex(x1, y1, c, a);
    vertex(x0, y1, c, a);
  };
  const f = city.figure;
  const { w, h } = city;
  // The glass railing: tinted glass, a top rail, posts.
  rect(-2, f.railTop, f.railRight, f.feet, t.glass, 0.3);
  rect(-2, f.railTop, f.railRight, f.railTop + 2.2, t.rail, 1);
  for (const x of [w * 0.02, (w * 0.02 + f.railRight) / 2, f.railRight - 3]) rect(x, f.railTop, x + 3, f.feet, t.rail, 1);
  // The ledge: its block, the light along its edge, a band and seams on its face.
  rect(-2, f.feet, f.ledgeRight, h + 2, t.ledge, 1);
  rect(-2, f.feet, f.ledgeRight, f.feet + 1.6, t.ledgeTop, 0.85);
  rect(-2, f.feet + h * 0.03, f.ledgeRight, f.feet + h * 0.042, t.figure, 0.6);
  for (const k of [0.22, 0.51, 0.8]) rect(f.ledgeRight * k, f.feet + h * 0.042, f.ledgeRight * k + 1, h + 2, t.figure, 0.5);
  // The figure: once as a rim of light, then herself.
  const figure = (dx: number, dy: number, c: Rgb, a: number) => {
    const X = (i: number) => f.x + FIGURE_VERTICES[2 * i]! * f.height + dx;
    const Y = (i: number) => f.feet - f.height + FIGURE_VERTICES[2 * i + 1]! * f.height + dy;
    for (const i of FIGURE_TRIANGLES) vertex(X(i), Y(i), c, a);
    // The edge: a band one pixel wide outside each outline, fading from the colour to nothing.
    const fringe = 1 / pxPerUnit;
    for (const [first, count] of FIGURE_OUTLINES) {
      const nx: number[] = [];
      const ny: number[] = [];
      for (let k = 0; k < count; k++) {
        const a0 = first + ((k + count - 1) % count);
        const a1 = first + k;
        const a2 = first + ((k + 1) % count);
        // Outward is to the left of travel on screen (y down) for these clockwise outlines: (dy, -dx).
        const e1x = Y(a1) - Y(a0);
        const e1y = -(X(a1) - X(a0));
        const e2x = Y(a2) - Y(a1);
        const e2y = -(X(a2) - X(a1));
        const l1 = Math.hypot(e1x, e1y) || 1;
        const l2 = Math.hypot(e2x, e2y) || 1;
        const sx = e1x / l1 + e2x / l2;
        const sy = e1y / l1 + e2y / l2;
        const ls = Math.hypot(sx, sy) || 1;
        nx.push(sx / ls);
        ny.push(sy / ls);
      }
      for (let k = 0; k < count; k++) {
        const k2 = (k + 1) % count;
        const i1 = first + k;
        const i2 = first + k2;
        const o1 = [X(i1) + nx[k]! * fringe, Y(i1) + ny[k]! * fringe] as const;
        const o2 = [X(i2) + nx[k2]! * fringe, Y(i2) + ny[k2]! * fringe] as const;
        vertex(X(i1), Y(i1), c, a);
        vertex(X(i2), Y(i2), c, a);
        vertex(o2[0], o2[1], c, 0);
        vertex(X(i1), Y(i1), c, a);
        vertex(o2[0], o2[1], c, 0);
        vertex(o1[0], o1[1], c, 0);
      }
    }
  };
  const rim = Math.max(1.2, f.height * 0.003);
  figure(rim, -rim * 0.6, t.rim, 0.45);
  figure(0, 0, t.figure, 1);
  return new Float32Array(out);
}
