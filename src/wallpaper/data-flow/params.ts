/**
 * src/wallpaper/data-flow/params.ts: the tunable numbers of the DATA FLOW
 * wallpaper: a circuit board at night, data running through it.
 *
 * Layer: wallpaper (data only). No reference image (the user chose the
 * idea, 2026-10-23: "circuit-board traces at right angles with pulses of
 * light running along them"); the look is a printed circuit board's:
 *   - traces on a fine grid, at right angles with 45° bends, leaving the
 *     chips' pins in parallel buses and running off the screen; loose ones
 *     in between, ending in vias and pads; a faint dot grid under it all;
 *   - a big main chip a little right of the middle (the CSS glow sits
 *     behind it: app.css), smaller ones round it;
 *   - packets of light running along the traces, round the bends, with
 *     fading tails; a trace that just carried one keeps an afterglow; a via
 *     reached flashes; a chip glows while data arrives; now and then a
 *     whole bus fires a volley.
 * Sizes are CSS px (grid cells for the board).
 */
import { SHARP_DPR } from '@/lib/sharpness';
import type { GlowLevel } from '@/lib/layout';

/** The board's grid pitch (CSS px): traces run on its points. */
export const PITCH = 14;

/** Cells the board runs past every edge of the screen (traces run off it). */
export const MARGIN = 4;

/** The main chip: size (cells, range), and where its centre sits (shares of the screen). */
export const MAIN_CHIP = { w: [14, 18], h: [10, 13], at: [0.62, 0.46] } as const;

/** The other chips: how many per million CSS px² (at least SIDE_CHIPS_MIN), and their size (cells). */
export const SIDE_CHIPS_PER_MPX = 1.6;
export const SIDE_CHIPS_MIN = 2;
export const SIDE_CHIP = { w: [5, 9], h: [4, 7] } as const;

/** Pins along a chip's edges, one every this many cells (so bus traces have a free cell between them). */
export const PIN_STEP = 2;

/** A bus: how many neighbouring pins run out together (range). */
export const BUS = [2, 6] as const;

/** A route: its first run (cells, straight out), its 45° runs, its straight runs, and its whole length (cells). */
export const ROUTE = { first: [2, 6], diagonal: [1, 5], straight: [4, 18], length: [24, 90] } as const;

/** A trace blocked within this many steps isn't laid (a stub and a via right by a chip only clutter). */
export const MIN_STEPS = 3;

/** Loose traces: added until this share of the screen's grid points carry a trace; their length (cells); chance to turn at each step. */
export const COVERAGE = 0.16;
/** The share of loose starts that run as a small bus (and its size), so open board reads as wired too. */
export const LOOSE_BUS_SHARE = 0.5;
export const LOOSE_BUS = [2, 4] as const;
export const LOOSE_LENGTH = [10, 48] as const;
export const LOOSE_TURN = 0.12;

/** Share of buses and loose traces in the palette's cool hue (the rest warm). */
export const COOL_SHARE = 0.3;

/** Trace widths (CSS px): signal traces, and the odd heavy power trace (its share). */
export const TRACE_WIDTH = [0.9, 1.5] as const;
export const POWER_WIDTH = 2.6;
export const POWER_SHARE = 0.06;

/** Packets of light: new ones a second per million CSS px², speed (px/s), tail length (px). */
export const PULSES_PER_MPX = 2.2;
export const PULSE_SPEED = [90, 260] as const;
export const PULSE_TAIL = [40, 150] as const;
/** The share of a chip's packets that run in to it (the rest run out). */
export const INBOUND = 0.5;

/** A volley along a whole bus: every this many seconds (range), its packets this far apart (s, at most). */
export const VOLLEY_EVERY = [2.5, 6] as const;
export const VOLLEY_STAGGER = 0.18;

/** How long a trace's afterglow takes to fade (s), a via's flash, a chip's glow. */
export const AFTERGLOW_SECONDS = 1.6;
export const FLASH_SECONDS = 0.6;
export const CHIP_GLOW_SECONDS = 1.4;

/** Seconds of packets simulated before the first frame (so it opens busy). */
export const PREWARM_SECONDS = 2.5;

/** One glow level: the board's soft glow (blur, CSS px), the packets' halo (width ×, opacity), their heads' size (px). */
export interface FlowGlow {
  board: number;
  halo: number;
  haloAlpha: number;
  head: number;
}

/** The glow levels (SYSTEM ▸ APPEARANCE ▸ GLOW). */
export const FLOW_GLOW: Record<GlowLevel, FlowGlow> = {
  low: { board: 0, halo: 3, haloAlpha: 0.16, head: 5 },
  medium: { board: 2, halo: 4, haloAlpha: 0.2, head: 7 },
  high: { board: 3, halo: 5, haloAlpha: 0.24, head: 9 },
  max: { board: 5, halo: 6.5, haloAlpha: 0.3, head: 12 },
};

/** The longest real time step (s) the motion takes in one frame. */
export const MAX_FRAME_STEP = 0.1;

/**
 * The most canvas pixels per CSS px this engine draws (before the zoom:
 * types.ts zoomedSize): the screen's own, up to SHARP_DPR. The wallpaper
 * host passes in the ratio in force, its safe cap (catalog.ts) if the
 * sharpness guard stepped back (lib/sharpness.ts).
 */
export const MAX_DPR = SHARP_DPR;
