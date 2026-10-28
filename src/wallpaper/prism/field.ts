/**
 * src/wallpaper/prism/field.ts: PRISM's scene: the glass blocks, the lights
 * among them and the neon tubes, made once from a random source; the camera
 * (its matrices, swaying); and the blocks' order back to front.
 *
 * Layer: wallpaper (pure: no canvas, no WebGL), so tests check it and a
 * port can follow it rule for rule (fluid_motion, as with HORIZON's land).
 *
 * World units: a cell is 1 unit; y is up; the field is centred on the
 * origin. Blocks sit on layers (FIELD.layers): the ground fullest, the
 * floating ones sparse, and a block is only placed above cells whose blocks
 * end below its floor, so no two ever cut through each other.
 */
import { BLOCKS, BREATHE, CAMERA, FIELD, LIGHTS, SWAY, TUBES } from './params';

/** A random number source returning 0 ≤ n < 1 (injectable for tests). */
export type Rng = () => number;

/** A random value in [lo, hi). */
const between = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + (hi - lo) * rng();
/** A random whole number in [lo, hi]. */
const whole = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + Math.floor(rng() * (hi - lo + 1));

/** A light among the blocks: where (units), its colour (0 magenta, 1 blue), reach (units), strength, and how it breathes. */
export interface Light {
  x: number;
  y: number;
  z: number;
  kind: 0 | 1;
  reach: number;
  strength: number;
  period: number;
  phase: number;
}

/** A neon line: its ends (units), and where a pulse along it stands (its phase offset). */
export interface Tube {
  a: [number, number, number];
  b: [number, number, number];
  phase: number;
}

/** The scene. */
export interface Field {
  /** Each block: min corner (x, y, z) and size (w, h, d), 6 floats each. */
  boxes: Float32Array;
  count: number;
  lights: Light[];
  tubes: Tube[];
}

/** Half the width of the field's part in view, around the camera's target (units): where the lights and tubes go. */
export const VIEW = 6;

/** Floats per block in `Field.boxes`. */
export const BOX = 6;

/** Builds the field from `rng`. */
export function buildField(rng: Rng): Field {
  const n = FIELD.cells;
  const half = n / 2;
  // The highest top so far over each cell (units), so a block above never cuts one below.
  const top = new Float32Array(n * n);
  const boxes: number[] = [];
  FIELD.layers.forEach((floor, layer) => {
    const nextFloor = FIELD.layers[layer + 1];
    // This layer's own cells: one block per cell.
    const taken = new Uint8Array(n * n);
    const want = Math.round(BLOCKS.fill[layer]! * n * n);
    let covered = 0;
    for (let tries = 0; tries < n * n * 6 && covered < want; tries++) {
      const w = whole(rng, BLOCKS.width);
      const d = whole(rng, BLOCKS.depth);
      const cx = Math.floor(rng() * (n - w + 1));
      const cz = Math.floor(rng() * (n - d + 1));
      let free = true;
      for (let i = cx; i < cx + w && free; i++) for (let k = cz; k < cz + d && free; k++) free = !taken[k * n + i] && top[k * n + i]! <= floor - 0.05;
      if (!free) continue;
      // Below a higher layer, a block stays short enough to slip under it (the floating blocks rest over gaps or short ones).
      const tall = between(rng, BLOCKS.height);
      const h = nextFloor === undefined ? tall : Math.min(tall, Math.max(BLOCKS.height[0], tall * 0.6));
      for (let i = cx; i < cx + w; i++)
        for (let k = cz; k < cz + d; k++) {
          taken[k * n + i] = 1;
          top[k * n + i] = Math.max(top[k * n + i]!, floor + h);
        }
      covered += w * d;
      const s = BLOCKS.seam;
      boxes.push(cx - half + s / 2, floor, cz - half + s / 2, w - s, h, d - s);
    }
  });

  const lights: Light[] = [];
  const light = (kind: 0 | 1, x: number, y: number, z: number, reach: number) =>
    lights.push({ x, y, z, kind, reach, strength: between(rng, LIGHTS.strength), period: between(rng, BREATHE.period), phase: rng() * Math.PI * 2 });
  // The light pools, spread evenly over the part in view (VIEW): one in each patch of a 3 × 3 grid
  // over it, in a random order of patches, magenta first, then blue. Scattered over the whole field,
  // a layout could end up with none in view, dull beside the next.
  const patches = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = patches.length - 1; i > 0; i--) {
    const r = Math.floor(rng() * (i + 1));
    [patches[i], patches[r]] = [patches[r]!, patches[i]!];
  }
  const cell = (2 * VIEW) / 3;
  const inPatch = (p: number): [number, number] => [-VIEW + ((p % 3) + rng()) * cell, -VIEW + (Math.floor(p / 3) + rng()) * cell];
  for (let i = 0; i < LIGHTS.magenta + LIGHTS.blue; i++) {
    const [x, z] = inPatch(patches[i % 9]!);
    light(i < LIGHTS.magenta ? 0 : 1, x, between(rng, [0.3, 2.6]), z, between(rng, LIGHTS.reach));
  }

  // Neon runs: a pair of lines along x or z, on a layer's floor or a block's top, each lighting its surroundings blue.
  const tubes: Tube[] = [];
  for (let i = 0; i < TUBES.runs; i++) {
    const alongX = rng() < 0.5;
    const len = whole(rng, TUBES.length);
    // Running through the part in view: its middle within VIEW, across and along.
    const u0 = Math.round(between(rng, [-VIEW, VIEW]) - len / 2);
    const v = Math.round(between(rng, [-VIEW, VIEW]));
    const y = FIELD.layers[Math.floor(rng() * FIELD.layers.length)]! + between(rng, [0, 1.4]);
    const phase = rng();
    for (const off of [-TUBES.spacing / 2, TUBES.spacing / 2]) {
      const a: [number, number, number] = alongX ? [u0, y, v + off] : [v + off, y, u0];
      const b: [number, number, number] = alongX ? [u0 + len, y, v + off] : [v + off, y, u0 + len];
      tubes.push({ a, b, phase });
    }
    const mid = alongX ? [u0 + len / 2, y, v] : [v, y, u0 + len / 2];
    light(1, mid[0]!, mid[1]!, mid[2]!, Math.max(1.6, len * 0.3));
  }
  return { boxes: new Float32Array(boxes), count: boxes.length / BOX, lights, tubes };
}

/** A 4×4 matrix, column-major (as WebGL takes it). */
export type Mat4 = Float32Array;

/** The camera at time `t` (s): where it is, which way it looks, and its view-projection matrix for an `aspect` (w/h) screen and `zoom`. */
export interface Camera {
  eye: [number, number, number];
  forward: [number, number, number];
  viewProj: Mat4;
}

/** The camera at `t` seconds (the sway is a slow drift of its yaw and pitch). */
export function cameraAt(t: number, aspect: number, zoom: number): Camera {
  const rad = Math.PI / 180;
  const yaw = (CAMERA.yaw + SWAY.yaw * Math.sin((t / SWAY.yawPeriod) * Math.PI * 2)) * rad;
  const pitch = (CAMERA.pitch + SWAY.pitch * Math.sin((t / SWAY.pitchPeriod) * Math.PI * 2)) * rad;
  const [tx, ty, tz] = CAMERA.target;
  // From the target, back along the view: up by the pitch, round by the yaw.
  const eye: [number, number, number] = [tx + CAMERA.distance * Math.cos(pitch) * Math.sin(yaw), ty + CAMERA.distance * Math.sin(pitch), tz + CAMERA.distance * Math.cos(pitch) * Math.cos(yaw)];
  const f = norm([tx - eye[0], ty - eye[1], tz - eye[2]]);
  const r = norm(cross(f, [0, 1, 0]));
  const u = cross(r, f);
  // Zoomed in: a narrower view (things drawn larger), as the other wallpapers' zoom.
  const fov = (CAMERA.fov * rad) / (zoom > 0 ? zoom : 1);
  const k = 1 / Math.tan(fov / 2);
  const near = 0.5;
  const far = 80;
  const view = new Float32Array([r[0], u[0], -f[0], 0, r[1], u[1], -f[1], 0, r[2], u[2], -f[2], 0, -dot(r, eye), -dot(u, eye), dot(f, eye), 1]);
  const proj = new Float32Array([k / aspect, 0, 0, 0, 0, k, 0, 0, 0, 0, (far + near) / (near - far), -1, 0, 0, (2 * far * near) / (near - far), 0]);
  return { eye, forward: f, viewProj: multiply(proj, view) };
}

/**
 * The blocks' order back to front for a camera (indexes into `field`),
 * sorted in place in `order` (kept from frame to frame: the camera only
 * sways, so it's nearly sorted already and an insertion sort is quick).
 * `depth` is scratch space, one float per block.
 */
export function sortBackToFront(field: Field, cam: Camera, order: Uint16Array, depth: Float32Array): void {
  const b = field.boxes;
  const [ex, ey, ez] = cam.eye;
  const [fx, fy, fz] = cam.forward;
  for (let i = 0; i < field.count; i++) {
    const o = i * BOX;
    depth[i] = (b[o]! + b[o + 3]! / 2 - ex) * fx + (b[o + 1]! + b[o + 4]! / 2 - ey) * fy + (b[o + 2]! + b[o + 5]! / 2 - ez) * fz;
  }
  // Farthest first.
  for (let i = 1; i < field.count; i++) {
    const v = order[i]!;
    const dv = depth[v]!;
    let j = i - 1;
    while (j >= 0 && depth[order[j]!]! < dv) {
      order[j + 1] = order[j]!;
      j--;
    }
    order[j + 1] = v;
  }
}

/** A brightness multiplier for light `l` at time `t`: it breathes. */
export function breath(l: Light, t: number): number {
  return 1 + BREATHE.amount * Math.sin((t / l.period) * Math.PI * 2 + l.phase);
}

function dot(a: readonly number[], b: readonly number[]): number {
  return a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;
}
function cross(a: readonly number[], b: readonly number[]): [number, number, number] {
  return [a[1]! * b[2]! - a[2]! * b[1]!, a[2]! * b[0]! - a[0]! * b[2]!, a[0]! * b[1]! - a[1]! * b[0]!];
}
function norm(a: readonly number[]): [number, number, number] {
  const l = Math.hypot(a[0]!, a[1]!, a[2]!) || 1;
  return [a[0]! / l, a[1]! / l, a[2]! / l];
}
/** a × b (column-major). */
function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = a[r]! * b[c * 4]! + a[4 + r]! * b[c * 4 + 1]! + a[8 + r]! * b[c * 4 + 2]! + a[12 + r]! * b[c * 4 + 3]!;
  return out;
}
