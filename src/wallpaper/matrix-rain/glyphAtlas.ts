/**
 * src/wallpaper/matrix-rain/glyphAtlas.ts: the rain's glyphs, drawn once
 * into an offscreen sprite sheet so each frame only copies pixels.
 *
 * Layer: wallpaper (canvas). OffscreenCanvas throughout, so it runs the
 * same on the page and in the wallpaper's worker (wallpaper/worker.ts).
 *
 * Text rendering (fillText, shadows for the glow) is the slow part of a
 * matrix rain. Every glyph is drawn here once per layer, in each colour
 * style, glow included; the engine then uses drawImage from this sheet,
 * which the GPU does cheaply.
 *
 * Sheet rows (one column per glyph):
 *   0 HEAD: pale (--text-bright) with a strong accent glow;
 *   1 BODY: --text, muted (BODY_DESATURATE), with a softer glow;
 *   2 DIM:  --text-dim, muted, with the same softer glow;
 *   3 ERASE: the glyph's shape alone, a touch bolder, in white. The engine
 *     draws it with destination-out to take a glyph off the canvas without
 *     touching the glow around it;
 *   4 HALO: a head with that shape cut out: the glow a head leaves behind
 *     when it moves on (used to paint the pre-warmed screen, engine.ts).
 * How strong the glows are is the GLOW level (params.ts). Each row's slots
 * are a cell plus a margin as wide as that row's glow reaches
 * (GLOW_REACH), so the heads' big glows aren't cut off and the bodies,
 * copied far more often, stay small.
 */
import type { WallpaperPalette } from '../types';
import { BODY_DESATURATE, GLOW_REACH, type GlowSpec, type LayerParams } from './params';

/** Sheet rows: the colour styles, the erase mask, and a head's leftover glow. */
export const ROW = { head: 0, body: 1, dim: 2, erase: 3, halo: 4 } as const;
export type AtlasRow = (typeof ROW)[keyof typeof ROW];

/** How much bolder the ERASE shapes are than the glyphs (stroke width, CSS px), so a glyph's soft edges go too. */
const ERASE_STROKE = 0.5;

/** Digits, a few Latin letters and the symbols from the reference. Always available (JetBrains Mono). */
export const BASE_GLYPHS = '0123456789ZTHEMXAKR:.=*+-<>¦|"';

/** Half-width katakana, drawn mirrored as in the film. Need a system font (MS Gothic, Yu Gothic…). */
export const KATAKANA = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

/** The font stack: the app's font, then system fonts that have katakana. */
export const FONT_STACK = '"JetBrains Mono", "MS Gothic", "Yu Gothic", "Hiragino Sans", "Noto Sans CJK JP", monospace';

/** `#rrggbb` → `rgba(r, g, b, a)`. */
export function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/**
 * `#rrggbb` pulled toward its own grey by `amount` (0–1), as `rgb(…)`.
 * Grey = the colour's luma, so it keeps its brightness and loses colour.
 */
export function desaturate(hex: string, amount: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const grey = 0.299 * r + 0.587 * g + 0.114 * b;
  const mix = (c: number) => Math.round(c + (grey - c) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

/** One glyph to draw. */
export interface Glyph {
  char: string;
  /** Drawn flipped left-to-right. */
  mirrored: boolean;
}

/**
 * The glyph set: katakana (mirrored) when this computer can draw them,
 * plus the base glyphs. Katakana are listed twice as often as the rest,
 * as in the reference, where they dominate.
 */
export function glyphSet(katakana: boolean): Glyph[] {
  const base = [...BASE_GLYPHS].map((char) => ({ char, mirrored: false }));
  if (!katakana) return base;
  const kana = [...KATAKANA].map((char) => ({ char, mirrored: true }));
  return [...kana, ...kana, ...base];
}

/**
 * Can this computer draw `char`? Draws it next to a code point no font has
 * (U+0378, unassigned) and compares: if the two come out the same (both
 * blank, or both the "missing glyph" box), it can't.
 */
export function canDraw(char: string): boolean {
  const size = 24;
  const ctx = new OffscreenCanvas(size, size).getContext('2d', { willReadFrequently: true });
  if (!ctx) return false;
  const pixels = (c: string) => {
    ctx.clearRect(0, 0, size, size);
    ctx.font = `16px ${FONT_STACK}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.fillText(c, size / 2, size / 2);
    return ctx.getImageData(0, 0, size, size).data;
  };
  const a = pixels(char);
  const missing = pixels('͸');
  let blank = true;
  let same = true;
  for (let i = 3; i < a.length; i += 4) {
    if (a[i]) blank = false;
    if (a[i] !== missing[i]) same = false;
  }
  return !blank && !same;
}

/** One sheet row's slots, in device pixels. */
export interface AtlasSlots {
  /** Where the row starts. */
  y: number;
  /** One slot's size: a cell plus `pad` on every side, for the glow. */
  w: number;
  h: number;
  pad: number;
}

/** A layer's sprite sheet. */
export interface Atlas {
  canvas: OffscreenCanvas;
  glyphs: number;
  /** Each row's slots, by ROW. */
  rows: readonly AtlasSlots[];
  /**
   * Draws ERASE and HALO, which the screen's first paint doesn't use, so
   * the rain can show sooner (the engine calls it right after); null once
   * done.
   */
  finish: (() => void) | null;
}

/** Builds the sprite sheet for one layer at a device pixel ratio, with a glow level. */
export function buildAtlas(layer: LayerParams, palette: WallpaperPalette, dpr: number, glyphs: readonly Glyph[], glow: GlowSpec): Atlas {
  // Each row's glow blur in CSS px, by ROW (HALO is a head's), and its slots:
  // the cell plus as far as that glow reaches.
  const blurs = [glow.head, glow.body, glow.body, 0, glow.head];
  let top = 0;
  const rows = blurs.map((blur): AtlasSlots => {
    const pad = Math.ceil((blur * GLOW_REACH + 1) * dpr);
    const slots = { y: top, w: Math.ceil(layer.colW * dpr) + pad * 2, h: Math.ceil(layer.rowH * dpr) + pad * 2, pad };
    top += slots.h;
    return slots;
  });
  const canvas = new OffscreenCanvas(Math.max(...rows.map((r) => r.w)) * glyphs.length, top);
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, glyphs: glyphs.length, rows, finish: null };

  /** Calls `paint` for each glyph at the centre of its slot in `row` (drawn at `y` on `c`), mirrored glyphs flipped around it. */
  const each = (c: OffscreenCanvasRenderingContext2D, row: AtlasRow, y: number, paint: (char: string, cx: number, cy: number) => void) => {
    const slots = rows[row]!;
    glyphs.forEach((g, i) => {
      const cx = i * slots.w + slots.w / 2;
      const cy = y + slots.h / 2;
      c.save();
      if (g.mirrored) {
        c.translate(cx, cy);
        c.scale(-1, 1);
        c.translate(-cx, -cy);
      }
      paint(g.char, cx, cy);
      c.restore();
    });
  };
  /** Sets a context up for drawing glyphs: font, centring, and the glow colour. */
  const setUp = (c: OffscreenCanvasRenderingContext2D) => {
    c.font = `${Math.round(layer.font * dpr)}px ${FONT_STACK}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.shadowColor = withAlpha(palette.accent, glow.alpha);
    c.lineWidth = ERASE_STROKE * dpr;
  };
  /** Draws the bare shapes, a touch bolder (no blur, so no shadow), into `row` at `y`. */
  const shapes = (c: OffscreenCanvasRenderingContext2D, row: AtlasRow, y: number) => {
    c.shadowBlur = 0;
    c.fillStyle = c.strokeStyle = '#fff';
    each(c, row, y, (char, cx, cy) => {
      c.fillText(char, cx, cy);
      c.strokeText(char, cx, cy);
    });
  };
  setUp(ctx);

  // The heads, glow included, on a canvas of their own: copied in as HEAD
  // now, and as HALO later (finish), so the slow part (every shadowed
  // fillText is blurred) is done once. (A canvas drawn onto itself would be
  // copied whole for every draw.)
  const head = rows[ROW.head]!;
  const heads = new OffscreenCanvas(head.w * glyphs.length, head.h);
  const hctx = heads.getContext('2d');
  if (hctx) {
    setUp(hctx);
    hctx.fillStyle = palette.bright;
    hctx.shadowBlur = blurs[ROW.head]! * dpr;
    each(hctx, ROW.head, 0, (char, cx, cy) => {
      for (let t = 0; t < glow.headLayers; t++) hctx.fillText(char, cx, cy);
    });
    ctx.drawImage(heads, 0, head.y);
  }

  // BODY and DIM, glow included.
  for (const [row, color] of [
    [ROW.body, desaturate(palette.text, BODY_DESATURATE)],
    [ROW.dim, desaturate(palette.dim, BODY_DESATURATE)],
  ] as const) {
    ctx.fillStyle = color;
    ctx.shadowBlur = blurs[row]! * dpr;
    each(ctx, row, rows[row]!.y, (char, cx, cy) => ctx.fillText(char, cx, cy));
  }

  const atlas: Atlas = { canvas, glyphs: glyphs.length, rows, finish: null };
  // ERASE: the bare shapes. HALO: the heads again, with the same shapes cut out.
  atlas.finish = () => {
    atlas.finish = null;
    shapes(ctx, ROW.erase, rows[ROW.erase]!.y);
    ctx.drawImage(heads, 0, rows[ROW.halo]!.y);
    ctx.globalCompositeOperation = 'destination-out';
    shapes(ctx, ROW.halo, rows[ROW.halo]!.y);
    ctx.globalCompositeOperation = 'source-over';
  };
  return atlas;
}
