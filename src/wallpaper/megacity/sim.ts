/**
 * src/wallpaper/megacity/sim.ts: what moves in MEGACITY, and how each
 * frame's lights are packed for the GPU.
 *
 * Layer: wallpaper (pure: no canvas; tests check it; fluid_motion's
 * lib/megacity/CitySim.kt is a port). The city itself never changes after
 * it's laid out: its windows go on and off in the shader, by the clock.
 * Here: the signs breathe and now and then flicker like failing tubes, the
 * beacons blink, drones cross the city trailing short tails, patches of
 * haze drift. Pools and arrays are made once: a frame allocates nothing.
 */
import type { GlowLevel } from '@/lib/layout';

import { type City, type CityTones, hazeAt, mixRgb, type Rgb, type Rng } from './city';
import { BEACONS, DRONES, FLICKER, HAZE, LAYERS, MEGACITY_GLOW, TIME_WRAP } from './params';

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();

/** Floats per instance: a sign (rect; colour and brightness; seed, upright, halo, 0), a glow (x, y, rx, ry; colour, strength; core, tail, kind, 0). */
export const SIGN = 12;
export const GLOW = 12;

/** The most drones on a screen. */
export const MAX_DRONES = DRONES.max;

/** MEGACITY's motion on a city. */
export class CitySim {
  /** The city's clock (s), wrapped at TIME_WRAP (the shader's windows run on it). */
  time = 0;
  /** Each sign's brightness now (0–1), and its flicker: seconds until the next, seconds left of this one. */
  readonly signBright: Float32Array;
  private readonly flickerIn: Float32Array;
  private readonly flickerLeft: Float32Array;
  /** Drones: place, speed (CSS px a second, + to the right), tail and size (CSS px), colour (0 white, 1 cool, 2 accent). */
  readonly dx = new Float32Array(MAX_DRONES);
  readonly dy = new Float32Array(MAX_DRONES);
  readonly dv = new Float32Array(MAX_DRONES);
  readonly dTail = new Float32Array(MAX_DRONES);
  readonly dSize = new Float32Array(MAX_DRONES);
  readonly dKind = new Uint8Array(MAX_DRONES);
  drones = 0;
  /** Haze patches: place, size, drift, strength. */
  readonly hx = new Float32Array(HAZE.count);
  readonly hy = new Float32Array(HAZE.count);
  readonly hrx = new Float32Array(HAZE.count);
  readonly hry = new Float32Array(HAZE.count);
  readonly hv = new Float32Array(HAZE.count);
  readonly ha = new Float32Array(HAZE.count);
  private readonly droneTarget: number;

  constructor(
    readonly city: City,
    private readonly rng: Rng,
  ) {
    const n = city.signs.length;
    this.signBright = new Float32Array(n).fill(1);
    this.flickerIn = new Float32Array(n).map(() => between(rng, FLICKER.every));
    this.flickerLeft = new Float32Array(n);
    this.droneTarget = Math.min(DRONES.max, Math.max(DRONES.min, Math.round(city.w / DRONES.per)));
    for (let i = 0; i < HAZE.count; i++) {
      this.hrx[i] = between(rng, HAZE.rx) * city.w;
      this.hry[i] = between(rng, HAZE.ry) * city.h;
      this.hx[i] = rng() * city.w;
      this.hy[i] = between(rng, HAZE.y) * city.h;
      this.hv[i] = between(rng, HAZE.speed) * (rng() < 0.5 ? -1 : 1);
      this.ha[i] = between(rng, HAZE.alpha);
    }
    // Open with the drones already on their way.
    while (this.drones < this.droneTarget) this.launch(true);
  }

  /** A new drone from one edge (or, at the start, anywhere). */
  private launch(anywhere: boolean): void {
    const rng = this.rng;
    const i = this.drones++;
    const right = rng() < 0.5;
    this.dv[i] = between(rng, DRONES.speed) * (right ? 1 : -1);
    this.dTail[i] = between(rng, DRONES.tail);
    this.dSize[i] = between(rng, DRONES.size);
    this.dx[i] = anywhere ? rng() * this.city.w : right ? -this.dTail[i]! : this.city.w + this.dTail[i]!;
    this.dy[i] = between(rng, DRONES.y) * this.city.h;
    this.dKind[i] = rng() < 0.6 ? 0 : rng() < 0.6 ? 1 : 2;
  }

  /** Moves everything on by dt seconds. */
  advance(dt: number): void {
    const { city, rng } = this;
    this.time = (this.time + dt) % TIME_WRAP;
    // Signs: a slow breath; now and then a flicker, the tube stuttering on and off.
    for (let i = 0; i < city.signs.length; i++) {
      if (this.flickerLeft[i]! > 0) {
        this.flickerLeft[i] = this.flickerLeft[i]! - dt;
        const on = Math.floor(this.time * FLICKER.rate + i * 7.3) % 3 !== 0;
        this.signBright[i] = on ? 0.95 : 0.12;
      } else {
        this.flickerIn[i] = this.flickerIn[i]! - dt;
        if (this.flickerIn[i]! <= 0) {
          this.flickerIn[i] = between(rng, FLICKER.every);
          this.flickerLeft[i] = between(rng, FLICKER.length);
        }
        this.signBright[i] = 0.88 + 0.12 * Math.sin(this.time * 0.6 + city.signs[i]!.phase);
      }
    }
    // Drones: on across; one gone off the far side, the last takes its place, and a new one sets off.
    let i = 0;
    while (i < this.drones) {
      this.dx[i] = this.dx[i]! + this.dv[i]! * dt;
      const gone = this.dv[i]! > 0 ? this.dx[i]! - this.dTail[i]! > city.w : this.dx[i]! + this.dTail[i]! < 0;
      if (!gone) {
        i++;
        continue;
      }
      this.drones--;
      this.dx[i] = this.dx[this.drones]!;
      this.dy[i] = this.dy[this.drones]!;
      this.dv[i] = this.dv[this.drones]!;
      this.dTail[i] = this.dTail[this.drones]!;
      this.dSize[i] = this.dSize[this.drones]!;
      this.dKind[i] = this.dKind[this.drones]!;
    }
    while (this.drones < this.droneTarget) this.launch(false);
    // Haze: drifting, round again from the other side.
    for (let k = 0; k < HAZE.count; k++) {
      this.hx[k] = this.hx[k]! + this.hv[k]! * dt;
      const r = this.hrx[k]!;
      if (this.hx[k]! > city.w + r) this.hx[k] = -r;
      else if (this.hx[k]! < -r) this.hx[k] = city.w + r;
    }
  }

  /** How bright beacon b is now (0–1): a short blink once a period. */
  beacon(b: number): number {
    const beacon = this.city.beacons[b]!;
    const x = (this.time + beacon.phase * beacon.period) % beacon.period;
    return x < BEACONS.on ? Math.sin((Math.PI * x) / BEACONS.on) : 0;
  }
}

/** Writes a colour at `o` of `out`, softened by the haze at a layer (its fog, times `share`). */
function fogged(out: Float32Array | Rgb, o: number, c: Rgb, t: CityTones, layer: number, y: number, h: number, share: number): void {
  const m = mixRgb(c, hazeAt(t, y, h), LAYERS[layer]!.fog * share);
  out[o] = m[0];
  out[o + 1] = m[1];
  out[o + 2] = m[2];
}

/** This frame's signs into `out` (SIGN floats each): returns how many. */
export function packSigns(sim: CitySim, t: CityTones, glow: GlowLevel, out: Float32Array): number {
  const { city } = sim;
  const g = MEGACITY_GLOW[glow];
  let n = 0;
  for (let i = 0; i < city.signs.length && (n + 1) * SIGN <= out.length; i++) {
    const s = city.signs[i]!;
    const o = n++ * SIGN;
    out[o] = s.x;
    out[o + 1] = s.y;
    out[o + 2] = s.w;
    out[o + 3] = s.h;
    fogged(out, o + 4, s.cool ? t.signCool : t.signWarm, t, s.layer, s.y, city.h, 0.6);
    out[o + 7] = sim.signBright[i]!;
    out[o + 8] = s.seed;
    out[o + 9] = s.vertical ? 1 : 0;
    out[o + 10] = g.sign * (s.layer === 1 ? 0.5 : 1);
    out[o + 11] = 0;
  }
  return n;
}

/** This frame's glows into `out` (GLOW floats each): the haze patches, the beacons, the drones. Returns how many. */
export function packGlows(sim: CitySim, t: CityTones, glow: GlowLevel, out: Float32Array): number {
  const { city } = sim;
  const g = MEGACITY_GLOW[glow];
  let n = 0;
  const put = (x: number, y: number, rx: number, ry: number, c: Rgb, a: number, core: number, tail: number, kind: number) => {
    if ((n + 1) * GLOW > out.length) return;
    const o = n++ * GLOW;
    out[o] = x;
    out[o + 1] = y;
    out[o + 2] = rx;
    out[o + 3] = ry;
    out[o + 4] = c[0];
    out[o + 5] = c[1];
    out[o + 6] = c[2];
    out[o + 7] = a;
    out[o + 8] = core;
    out[o + 9] = tail;
    out[o + 10] = kind;
    out[o + 11] = 0;
  };
  for (let k = 0; k < HAZE.count; k++) {
    const c = hazeAt(t, sim.hy[k]!, city.h);
    put(sim.hx[k]!, sim.hy[k]!, sim.hrx[k]!, sim.hry[k]!, mixRgb(c, [1, 1, 1], 0.25), sim.ha[k]!, 0, 0, 1);
  }
  const spot: Rgb = [0, 0, 0];
  for (let b = 0; b < city.beacons.length; b++) {
    const a = sim.beacon(b);
    if (a <= 0.01) continue;
    const beacon = city.beacons[b]!;
    fogged(spot, 0, t.beacon, t, beacon.layer, beacon.y, city.h, 0.5);
    put(beacon.x, beacon.y, g.light, g.light, spot, a, 1, 0, 0);
  }
  for (let i = 0; i < sim.drones; i++) {
    const kind = sim.dKind[i]!;
    const c = kind === 0 ? t.droneWhite : kind === 1 ? t.droneCool : t.beacon;
    put(sim.dx[i]!, sim.dy[i]!, g.light, g.light, c, 0.9, sim.dSize[i]! / 2, sim.dTail[i]! * Math.sign(sim.dv[i]!), 0);
  }
  return n;
}

/** Room for a city's signs and glows, made once per city. */
export function frameRoom(city: City): { signs: Float32Array; glows: Float32Array } {
  return { signs: new Float32Array(Math.max(1, city.signs.length) * SIGN), glows: new Float32Array((HAZE.count + city.beacons.length + MAX_DRONES) * GLOW) };
}
