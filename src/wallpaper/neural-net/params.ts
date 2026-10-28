/**
 * src/wallpaper/neural-net/params.ts: the tunable numbers of the neural
 * net, matched to its reference wallpaper ("neural net pape.jpg", a plexus).
 *
 * Layer: wallpaper (data only).
 *
 * What the reference shows, and how it maps here:
 *   - glowing nodes (cores about 2 px at 1080p, a few bigger) joined by
 *     long, thin, straight lines; most nodes have 3 or 4 links, a few are
 *     hubs with many; lines run off the edges of the screen → nodes are
 *     placed past the edges too (PAD) and linked to near neighbours, and
 *     longer links are fainter;
 *   - more nodes on the right half than the left → node homes are drawn
 *     from a few loose clusters (CLUSTERS) over an even scatter;
 *   - colour by place: teal at the top, pale in the middle, a strong red
 *     glow in the bottom right → the palette's --cool, --text-bright and
 *     --accent along the same diagonal (and the CSS glow, app.css);
 *   - the reference's out-of-focus particles (bokeh) are left out: the
 *     user had them removed (0.19.0).
 * Motion is the animation's own: each node drifts slowly round its home,
 * and now and then a signal runs along a few links and
 * lights the nodes it reaches.
 */
import { SHARP_DPR } from '@/lib/sharpness';
import type { GlowLevel } from '@/lib/layout';

/** Nodes per million CSS px² of the padded area. */
export const NODES_PER_MPX = 26;

/** Nodes are placed this far past every edge (share of the screen), so lines run off it. */
export const PAD = 0.14;

/** Loose clusters the node homes gather round: [x, y (shares of the screen), spread (share of the width), weight]. */
export const CLUSTERS: readonly (readonly [number, number, number, number])[] = [
  [0.78, 0.18, 0.16, 0.24],
  [0.6, 0.55, 0.18, 0.18],
  [0.88, 0.62, 0.12, 0.16],
  [0.32, 0.42, 0.2, 0.12],
];

/** The share of nodes scattered evenly instead (the rest gather round CLUSTERS). */
export const SCATTER = 0.55;

/** How many links a node reaches out with, picked at random: mostly 2–4, sometimes a hub. */
export const LINKS: readonly number[] = [2, 2, 3, 3, 3, 4, 4, 6, 9];

/** The longest link, as a share of the screen's diagonal. */
export const MAX_LINK = 0.42;

/** A node picks its links at random from this many times as many of its nearest neighbours (so some links reach far). */
export const LINK_POOL = 3;

/** A node's drift round its home: amplitude (CSS px) and period (s), ranges. */
export const DRIFT: readonly [number, number] = [10, 38];
export const DRIFT_PERIOD: readonly [number, number] = [26, 70];

/** A node's core radius (CSS px), range; hubs get the top of it. */
export const NODE_RADIUS: readonly [number, number] = [1.3, 3.6];

/** A link's opacity: short links up to the first, the longest down to the second (then times its weight). */
export const LINE_ALPHA: readonly [number, number] = [0.6, 0.16];

/** Each link's own brightness, range: most are faint, a few shine. */
export const LINK_WEIGHT: readonly [number, number] = [0.35, 1.6];

/**
 * A link's width (CSS px). 1.3 since 0.23.1 (was 0.9): the user still saw
 * some jagged links on the web, and a line under a pixel wide can only be
 * so smooth. The phone keeps its own 0.9 (NeuralParams.LINE_WIDTH): the
 * user called it perfect there.
 */
export const LINE_WIDTH = 1.3;

/** Signals: new ones a second, speed (CSS px/s), links they run (range), and how long a reached node stays lit (s). */
export const PULSES_PER_SECOND = 1.1;
export const PULSE_SPEED: readonly [number, number] = [240, 460];
export const PULSE_HOPS: readonly [number, number] = [1, 4];
export const FLASH_SECONDS = 0.8;
/** How long a reached node's light takes to rise (s): a quick swell, not a pop. */
export const FLASH_RISE = 0.12;

/** Colours along the diagonal, in this many steps: fine enough that a node or link drifting across one doesn't visibly change colour. */
export const COLOR_STEPS = 32;

/** One glow level: the nodes' halo strength and size, and the links' soft second stroke. */
export interface NeuralGlow {
  /** Halo opacity at the node's edge. */
  halo: number;
  /** Halo radius, in core radii. */
  haloSize: number;
  /** Opacity of the links' wide, soft stroke (0: none). */
  lineGlow: number;
}

/** The glow levels (SYSTEM ▸ APPEARANCE ▸ GLOW), as for the rain. */
export const NEURAL_GLOW: Record<GlowLevel, NeuralGlow> = {
  low: { halo: 0.35, haloSize: 4, lineGlow: 0 },
  medium: { halo: 0.5, haloSize: 5, lineGlow: 0.08 },
  high: { halo: 0.65, haloSize: 6.5, lineGlow: 0.14 },
  max: { halo: 0.8, haloSize: 8, lineGlow: 0.22 },
};

/** The longest real time step taken in one frame (s): after a stall the motion resumes instead of jumping. */
export const MAX_FRAME_STEP = 0.1;

/**
 * The most canvas pixels per CSS px this engine draws (before the zoom:
 * types.ts zoomedSize): the screen's own, up to SHARP_DPR. The wallpaper
 * host passes in the ratio in force, its safe cap (catalog.ts) if the
 * sharpness guard stepped back (lib/sharpness.ts).
 */
export const MAX_DPR = SHARP_DPR;

/**
 * The largest canvas, either way (px), when supersampled (tuner.ts picks how
 * sharp; this caps it so a big screen doesn't ask for a canvas the graphics
 * card can't hold).
 */
export const MAX_CANVAS = 8192;
