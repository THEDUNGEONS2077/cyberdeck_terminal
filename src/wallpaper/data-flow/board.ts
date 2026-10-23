/**
 * src/wallpaper/data-flow/board.ts: DATA FLOW's circuit board: chips,
 * their pins, and the traces between, laid out once per screen size.
 *
 * Layer: wallpaper (pure: no canvas, no DOM; seeded, so tests check it,
 * and fluid_motion's Kotlin port lays out the same way).
 *
 * The board is a grid of points PITCH apart, a few past every edge of the
 * screen. A trace runs from point to point in the eight directions 45°
 * apart, as a printed board's do: straight runs joined by 45° bends.
 *   - Chips: a big main one a little right of the middle, smaller ones
 *     round it, each with a ring kept clear and pins every PIN_STEP points
 *     along its edges.
 *   - Buses: neighbouring pins run out together, every trace of a bus on
 *     the same route; at a 90° bend the outer traces turn later (by the
 *     spacing for each trace further out), so a bus bends like a ribbon.
 *   - Loose traces fill the rest, wandering, until COVERAGE of the
 *     screen's points carry one.
 * Traces never cross or touch: a point is taken by one trace at most, a
 * diagonal step can't pass between two taken points, and a trace keeps
 * one free point from any other beside it (its four neighbours).
 * A trace that's blocked ends there, in a via; one that runs off the
 * board ends off screen; one blocked at once isn't laid at all.
 */
import {
  BUS,
  COOL_SHARE,
  COVERAGE,
  LOOSE_BUS,
  LOOSE_BUS_SHARE,
  LOOSE_LENGTH,
  LOOSE_TURN,
  MAIN_CHIP,
  MARGIN,
  MIN_STEPS,
  PIN_STEP,
  PITCH,
  POWER_SHARE,
  POWER_WIDTH,
  ROUTE,
  SIDE_CHIP,
  SIDE_CHIPS_MIN,
  SIDE_CHIPS_PER_MPX,
  TRACE_WIDTH,
} from './params';

/** A random number source returning 0 ≤ n < 1 (seeded in tests). */
export type Rng = () => number;

/** The eight directions, 45° apart, clockwise from east (screen y runs down). */
export const DIRS: readonly (readonly [number, number])[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/** A chip's pin: its point (just outside the chip's edge), the direction away from the chip, and the chip. */
export interface Pin {
  x: number;
  y: number;
  dir: number;
  chip: number;
}

/** A chip: its corner point and size (points), whether it's the main one, its pins. */
export interface Chip {
  x: number;
  y: number;
  w: number;
  h: number;
  main: boolean;
  pins: Pin[];
}

/** What a trace's end is: a chip's pin, a via, a pad, or off the board. */
export type End = 'chip' | 'via' | 'pad' | 'edge';

/** A trace: its corner points (flat x0, y0, x1, y1, …; start to end) and the length up to each (grid units). */
export interface Trace {
  pts: number[];
  len: number[];
  width: number;
  cool: boolean;
  start: End;
  end: End;
  /** The chip it leaves (index), or -1. */
  chip: number;
  /** Its bus (index into Board.buses), or -1. */
  bus: number;
}

/** The board: the screen's size (CSS px) and points, the chips, the traces, the buses (their traces' indexes). */
export interface Board {
  w: number;
  h: number;
  cols: number;
  rows: number;
  chips: Chip[];
  traces: Trace[];
  buses: number[][];
}

/** A value between lo and hi (inclusive for integers). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();
const pick = (rng: Rng, range: readonly [number, number]) => Math.floor(between(rng, [range[0], range[1] + 1]));

/** One segment of a route: a direction and how many steps. */
interface Seg {
  dir: number;
  steps: number;
  /** For a straight run that ends in a 90° bend: the bend's way (+1 clockwise, −1 the other), else 0. */
  bend: number;
}

/** Lays out a board for a screen of `w` × `h` CSS px. */
export function buildBoard(w: number, h: number, rng: Rng): Board {
  // Screen points 0..sw, 0..sh; the board MARGIN points further on every side.
  const sw = Math.ceil(w / PITCH);
  const sh = Math.ceil(h / PITCH);
  const cols = sw + 2 * MARGIN + 1;
  const rows = sh + 2 * MARGIN + 1;
  // Each point: 0 free, -1 a chip or its clear ring, t + 1 trace t.
  const occ = new Int32Array(cols * rows);
  const at = (x: number, y: number) => x + MARGIN + (y + MARGIN) * cols;
  const inBoard = (x: number, y: number) => x >= -MARGIN && y >= -MARGIN && x <= sw + MARGIN && y <= sh + MARGIN;
  const onScreen = (x: number, y: number) => x >= 0 && y >= 0 && x <= sw && y <= sh;
  const screenPoints = (sw + 1) * (sh + 1);
  let covered = 0;

  const chips: Chip[] = [];
  const traces: Trace[] = [];
  const buses: number[][] = [];

  /** Whether a chip of w × h points centred near (cx, cy) fits: it and a three-point ring round it free and on screen. */
  const fits = (cw: number, ch: number, cx: number, cy: number): boolean => {
    const x = Math.round(cx - cw / 2);
    const y = Math.round(cy - ch / 2);
    for (let gy = y - 3; gy <= y + ch + 2; gy++) {
      for (let gx = x - 3; gx <= x + cw + 2; gx++) {
        if (!onScreen(gx, gy) || occ[at(gx, gy)] !== 0) return false;
      }
    }
    return true;
  };

  /** Places a chip of w × h points centred near (cx, cy), if it fits. */
  const placeChip = (cw: number, ch: number, cx: number, cy: number, main: boolean): boolean => {
    if (!fits(cw, ch, cx, cy)) return false;
    const x = Math.round(cx - cw / 2);
    const y = Math.round(cy - ch / 2);
    // The chip and the ring its pins sit in are kept clear of other traces.
    for (let gy = y - 1; gy <= y + ch; gy++) for (let gx = x - 1; gx <= x + cw; gx++) occ[at(gx, gy)] = -1;
    const index = chips.length;
    const pins: Pin[] = [];
    for (let i = 1; i <= cw - 2; i += PIN_STEP) pins.push({ x: x + i, y: y - 1, dir: 6, chip: index });
    for (let j = 1; j <= ch - 2; j += PIN_STEP) pins.push({ x: x + cw, y: y + j, dir: 0, chip: index });
    for (let i = 1; i <= cw - 2; i += PIN_STEP) pins.push({ x: x + i, y: y + ch, dir: 2, chip: index });
    for (let j = 1; j <= ch - 2; j += PIN_STEP) pins.push({ x: x - 1, y: y + j, dir: 4, chip: index });
    chips.push({ x, y, w: cw, h: ch, main, pins });
    return true;
  };

  /** The point one step from (x, y) towards `dir`, if trace `t` may take it: 'edge' off the board, null if blocked. */
  const step = (t: number, x: number, y: number, dir: number): [number, number] | 'edge' | null => {
    const [dx, dy] = DIRS[dir]!;
    const nx = x + dx;
    const ny = y + dy;
    if (!inBoard(nx, ny)) return 'edge';
    if (occ[at(nx, ny)] !== 0) return null;
    // A diagonal step can't pass between two taken points (it would cross a trace).
    if (dx !== 0 && dy !== 0) {
      const a = inBoard(nx, y) ? occ[at(nx, y)]! : 0;
      const b = inBoard(x, ny) ? occ[at(x, ny)]! : 0;
      if (a > 0 && b > 0) return null;
    }
    // One free point from any other trace beside it.
    for (const [ox, oy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      if (!inBoard(nx + ox, ny + oy)) continue;
      const v = occ[at(nx + ox, ny + oy)]!;
      if (v > 0 && v !== t + 1) return null;
    }
    return [nx, ny];
  };

  // The points the trace being laid has taken (to give them back if it comes out too short).
  const taken: number[] = [];

  /** Takes a point for trace t. */
  const take = (t: number, x: number, y: number) => {
    occ[at(x, y)] = t + 1;
    taken.push(at(x, y));
    if (onScreen(x, y)) covered++;
  };

  /** Gives back every point the trace being laid has taken. */
  const giveBack = () => {
    for (const i of taken) {
      occ[i] = 0;
      const gx = (i % cols) - MARGIN;
      const gy = Math.floor(i / cols) - MARGIN;
      if (onScreen(gx, gy)) covered--;
    }
    taken.length = 0;
  };

  /**
   * Walks trace t from (x, y) along `segs` (or, for a loose trace, as
   * `next` directs), taking points; returns its corners and how it ended.
   */
  const walk = (t: number, x0: number, y0: number, next: (stepIndex: number, dir: number) => number, maxSteps: number) => {
    const pts = [x0, y0];
    let x = x0;
    let y = y0;
    let lastDir = -1;
    let end: End = 'via';
    let steps = 0;
    for (; steps < maxSteps; steps++) {
      const dir = next(steps, lastDir);
      if (dir < 0) break;
      const s = step(t, x, y, dir);
      if (s === 'edge') {
        end = 'edge';
        break;
      }
      if (s === null) break;
      // A corner where the direction changes.
      if (lastDir !== -1 && dir !== lastDir) pts.push(x, y);
      lastDir = dir;
      [x, y] = s;
      take(t, x, y);
    }
    if (pts[pts.length - 2] !== x || pts[pts.length - 1] !== y) pts.push(x, y);
    return { pts, end, steps };
  };

  /** Adds a trace from its corners. */
  const addTrace = (pts: number[], width: number, cool: boolean, start: End, end: End, chip: number, bus: number): number => {
    const len = [0];
    for (let i = 2; i < pts.length; i += 2) {
      const dx = pts[i]! - pts[i - 2]!;
      const dy = pts[i + 1]! - pts[i - 1]!;
      len.push(len[len.length - 1]! + Math.hypot(dx, dy));
    }
    traces.push({ pts, len, width, cool, start, end, chip, bus });
    return traces.length - 1;
  };

  /** A route out from a chip's edge going `dir0`: a first run, then 45° bends with runs between, to about `length` steps. */
  const plan = (dir0: number): Seg[] => {
    const segs: Seg[] = [{ dir: dir0, steps: pick(rng, ROUTE.first), bend: 0 }];
    const length = pick(rng, ROUTE.length);
    let total = segs[0]!.steps;
    let dir = dir0;
    while (total < length) {
      const turn = rng() < 0.5 ? 1 : -1;
      const diagonal = (dir + turn + 8) % 8;
      // Back to the way it was going (a jog sideways), or on round to 90°: never back towards the chip.
      let after = rng() < 0.55 ? dir : (dir + 2 * turn + 8) % 8;
      if (after === (dir0 + 4) % 8) after = dir;
      // The straight run before a 90° bend knows it, so a bus's outer traces can turn later.
      segs[segs.length - 1]!.bend = after === dir ? 0 : turn;
      const d = pick(rng, ROUTE.diagonal);
      const s = pick(rng, ROUTE.straight);
      segs.push({ dir: diagonal, steps: d, bend: 0 }, { dir: after, steps: s, bend: 0 });
      total += d + s;
      dir = after;
    }
    return segs;
  };

  // 1. Chips: the main one, then the others wherever they fit.
  const mainW = Math.min(pick(rng, MAIN_CHIP.w), Math.floor(sw * 0.5));
  const mainH = Math.min(pick(rng, MAIN_CHIP.h), Math.floor(sh * 0.3));
  placeChip(Math.max(4, mainW), Math.max(3, mainH), sw * MAIN_CHIP.at[0], sh * MAIN_CHIP.at[1], true);
  const sideCount = Math.max(SIDE_CHIPS_MIN, Math.round((SIDE_CHIPS_PER_MPX * w * h) / 1e6));
  for (let placed = 0; placed < sideCount; placed++) {
    const cw = pick(rng, SIDE_CHIP.w);
    const ch = pick(rng, SIDE_CHIP.h);
    // Spread out: of several places, the one farthest from the chips already down (and placeable).
    let best: [number, number] | null = null;
    let bestGap = -1;
    for (let tries = 0; tries < 60; tries++) {
      const cx = 3 + rng() * (sw - 6);
      const cy = 3 + rng() * (sh - 6);
      const gap = Math.min(...chips.map((c) => Math.hypot(c.x + c.w / 2 - cx, c.y + c.h / 2 - cy)));
      if (gap > bestGap && fits(cw, ch, cx, cy)) {
        best = [cx, cy];
        bestGap = gap;
      }
    }
    if (best) placeChip(cw, ch, best[0], best[1], false);
  }
  /**
   * Routes a bus: traces from `starts` (in a row across the way they run),
   * all going `dir0` on one route; before a 90° bend the outer traces run
   * on further, so the bus bends like a ribbon. A trace blocked within
   * `minSteps` is given back (its pin stays bare, or it's not laid).
   */
  const routeBus = (starts: { x: number; y: number }[], dir0: number, chip: number, startEnd: () => End, minSteps: number): number[] => {
    const n = starts.length;
    const segs = plan(dir0);
    const cool = rng() < COOL_SHARE;
    const width = between(rng, TRACE_WIDTH);
    // Each member's place across the bus, counted from its left (facing the way it runs).
    const [rx, ry] = DIRS[(dir0 + 2) % 8]!;
    const lateral = starts.map((p) => p.x * rx + p.y * ry);
    const order = [...lateral].sort((a, b) => a - b);
    const bus = buses.length;
    const ids: number[] = [];
    starts.forEach((start, m) => {
      const L = order.indexOf(lateral[m]!);
      const own = segs.map((sg) => (sg.bend === 0 ? sg : { ...sg, steps: sg.steps + (sg.bend > 0 ? n - 1 - L : L) * PIN_STEP }));
      const t = traces.length;
      taken.length = 0;
      take(t, start.x, start.y);
      let si = 0;
      let left = own[0]!.steps;
      const route = walk(
        t,
        start.x,
        start.y,
        () => {
          while (left <= 0) {
            si++;
            if (si >= own.length) return -1;
            left = own[si]!.steps;
          }
          left--;
          return own[si]!.dir;
        },
        10_000,
      );
      if (route.steps < minSteps) {
        // Blocked at once: a stub and a via right by the chip would only clutter.
        giveBack();
        if (chip >= 0) occ[at(start.x, start.y)] = -1;
        return;
      }
      ids.push(addTrace(route.pts, width, cool, chip >= 0 ? 'chip' : startEnd(), route.end, chip, bus));
    });
    if (ids.length > 0) buses.push(ids);
    return ids;
  };

  // 2. Buses from every chip's pins (the main chip first: its buses take the board).
  chips.forEach((chip, ci) => {
    // Pins grouped by edge (they were listed edge by edge), then into buses of neighbours.
    const edges = new Map<number, Pin[]>();
    for (const p of chip.pins) edges.set(p.dir, [...(edges.get(p.dir) ?? []), p]);
    for (const pins of edges.values()) {
      for (let i = 0; i < pins.length; ) {
        const n = Math.min(pins.length - i, pick(rng, BUS));
        const members = pins.slice(i, i + n);
        i += n;
        // Some pins stay bare stubs: a board isn't wired everywhere.
        if (rng() < 0.15) continue;
        routeBus(members, members[0]!.dir, ci, () => 'chip', MIN_STEPS);
      }
    }
  });

  /** Whether (x, y) is free with no trace or chip round it (a start for a loose trace). */
  const roomy = (x: number, y: number): boolean => {
    if (!onScreen(x, y)) return false;
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        if (inBoard(x + ox, y + oy) && occ[at(x + ox, y + oy)]! !== 0) return false;
      }
    }
    return true;
  };

  // 3. Loose traces, until the screen is covered enough: some as small buses from a row of vias, the rest alone.
  for (let tries = 0; covered / screenPoints < COVERAGE && tries < 4000; tries++) {
    const x0 = Math.floor(rng() * (sw + 1));
    const y0 = Math.floor(rng() * (sh + 1));
    if (rng() < LOOSE_BUS_SHARE) {
      const dir0 = Math.floor(rng() * 4) * 2;
      const [rx, ry] = DIRS[(dir0 + 2) % 8]!;
      const n = pick(rng, LOOSE_BUS);
      const starts = Array.from({ length: n }, (_, k) => ({ x: x0 + rx * k * PIN_STEP, y: y0 + ry * k * PIN_STEP }));
      if (!starts.every((p) => roomy(p.x, p.y))) continue;
      const end: End = rng() < 0.4 ? 'pad' : 'via';
      // A loose bus must run a while: short ones read as combs of stubs.
      routeBus(starts, dir0, -1, () => end, MIN_STEPS * 2);
      continue;
    }
    const t = traces.length;
    if (!roomy(x0, y0)) continue;
    taken.length = 0;
    take(t, x0, y0);
    const length = pick(rng, LOOSE_LENGTH);
    // Mostly straight, sometimes diagonal; a diagonal run turns back straight after a few steps.
    let dir = rng() < 0.7 ? Math.floor(rng() * 4) * 2 : Math.floor(rng() * 4) * 2 + 1;
    let diagonalLeft = dir % 2 === 1 ? pick(rng, [1, 4]) : 0;
    const route = walk(
      t,
      x0,
      y0,
      () => {
        if (dir % 2 === 1) {
          if (diagonalLeft-- <= 0) dir = (dir + (rng() < 0.5 ? 1 : -1) + 8) % 8;
        } else if (rng() < LOOSE_TURN) {
          dir = (dir + (rng() < 0.5 ? 1 : -1) + 8) % 8;
          diagonalLeft = pick(rng, [1, 4]);
        }
        return dir;
      },
      length,
    );
    if (route.steps < 4) {
      // Too short to read as a trace: give its points back.
      giveBack();
      continue;
    }
    const power = rng() < POWER_SHARE;
    addTrace(route.pts, power ? POWER_WIDTH : between(rng, TRACE_WIDTH), rng() < COOL_SHARE, rng() < 0.3 ? 'pad' : 'via', route.end === 'edge' ? 'edge' : rng() < 0.3 ? 'pad' : 'via', -1, -1);
  }

  return { w, h, cols, rows, chips, traces, buses };
}

/** The point `d` grid units along trace `t` (clamped to its ends), into `out` ([x, y], grid units). */
export function pointAt(t: Trace, d: number, out: number[]): number[] {
  const total = t.len[t.len.length - 1]!;
  const s = Math.min(Math.max(d, 0), total);
  let i = 1;
  while (i < t.len.length - 1 && t.len[i]! < s) i++;
  const a = t.len[i - 1]!;
  const b = t.len[i]!;
  const f = b > a ? (s - a) / (b - a) : 0;
  out[0] = t.pts[2 * (i - 1)]! + (t.pts[2 * i]! - t.pts[2 * (i - 1)]!) * f;
  out[1] = t.pts[2 * (i - 1) + 1]! + (t.pts[2 * i + 1]! - t.pts[2 * (i - 1) + 1]!) * f;
  return out;
}

/** A trace's whole length (grid units). */
export const traceLength = (t: Trace) => t.len[t.len.length - 1]!;
