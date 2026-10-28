/**
 * src/wallpaper/prism/params.ts: the tunable numbers of the PRISM wallpaper:
 * a field of glass blocks lit magenta and blue from inside.
 *
 * Layer: wallpaper (data only). Reference: the user's image
 * ("wallhaven-lymvol.png", 2026-10-28), measured at 2560×1440:
 *   - smoky glass blocks of many sizes, seen from high up at an angle
 *     (their edges run down-right and up-right), some stacked, some
 *     floating; thin lit edges, dark navy faces (about rgb(11, 10, 44),
 *     56% of the picture), the scene brighter towards the bottom;
 *   - magenta and violet light inside and behind the glass (hue about
 *     300°), electric blue elsewhere (200–240°);
 *   - bright blue-white neon tubes in pairs (left out at the user's word,
 *     0.23.1: "the glowing lines don't make a lot of sense");
 *   - a hint of colour fringing at the brightest edges (left out: it
 *     would cost a pass over every pixel).
 * Its motion is our own and slow: the camera sways a little and the
 * lights breathe.
 *
 * Colours come from the palette (NEON suits it: --accent magenta, --cool
 * electric blue); every palette makes its own PRISM.
 */
import { SHARP_DPR } from '@/lib/sharpness';

/** The field: cells across and deep (units), and the layers blocks sit on (their floors, units up). */
export const FIELD = { cells: 30, layers: [0, 1.15, 2.5] } as const;

/** Blocks: their footprint (cells, ranges), height (units), how full each layer is, and the seam between neighbours (units). */
export const BLOCKS = {
  width: [1, 3],
  depth: [1, 3],
  height: [0.5, 2.2],
  /** Share of each layer's cells covered (the ground layer is fullest; the floating ones sparse). */
  fill: [0.9, 0.42, 0.2],
  seam: 0.035,
} as const;

/** The camera: what it looks at (units), its yaw and pitch (degrees), distance (units) and vertical field of view (degrees). */
export const CAMERA = { target: [0, 0.6, 0], yaw: 36, pitch: 38, distance: 12.5, fov: 34 } as const;

/** The camera's sway: how far (degrees) and how slowly (seconds a cycle), for yaw and pitch. */
export const SWAY = { yaw: 4, yawPeriod: 53, pitch: 1.6, pitchPeriod: 67 } as const;

/** The glass: its body's opacity (front and back faces), and how much brighter it gets at grazing angles (fresnel). */
export const GLASS = { front: 0.8, back: 0.3, fresnel: 0.3 } as const;

/** The lights inside and behind the glass: how many of each colour, their reach (units) and strength. */
export const LIGHTS = { magenta: 6, blue: 4, reach: [1.3, 2.8], strength: [0.9, 1.8] } as const;

/** How the lights breathe: how much and how slowly (seconds a cycle, range). */
export const BREATHE = { amount: 0.22, period: [9, 17] } as const;

/**
 * The edges: the core's width and the glow's reach (CSS px). 1 px, not the
 * first pass's 0.6: thin lines stepped (the user, 0.23.1: "thicken the
 * lines"). Each line sits wholly inside its face (box.frag).
 */
export const EDGE = { width: 1, glow: 2.4 } as const;

/** Per glow level: the edges' glow and the lights' strength (multipliers). */
export const PRISM_GLOW = {
  low: { edge: 0.25, light: 0.85 },
  medium: { edge: 0.4, light: 0.95 },
  high: { edge: 0.55, light: 1 },
  max: { edge: 0.75, light: 1.1 },
} as const;

/** Up to about 72 frames a second (the others' cap). */
export const MIN_FRAME_MS = 1000 / 72;

/** The longest step the motion takes in one frame (s). */
export const MAX_FRAME_STEP = 0.1;

/** Px per CSS px it may draw at: the screen's own, up to SHARP_DPR (lib/sharpness.ts). */
export const MAX_DPR = SHARP_DPR;
