/**
 * src/wallpaper/matrix-rain/glyphAtlas.ts: the rain's glyphs, drawn once
 * into an offscreen sprite sheet so each frame only copies pixels.
 *
 * Layer: wallpaper (canvas).
 *
 * Text rendering (fillText, shadows for the glow) is the slow part of a
 * matrix rain. Every glyph is drawn here once per layer, in each colour
 * style, glow included; the engine then uses drawImage from this sheet,
 * which the GPU does cheaply.
 *
 * Sheet rows (one column per glyph):
 *   0 HEAD: pale (--text-bright) with a strong accent glow;
 *   1 BODY: --text, muted (BODY_DESATURATE), with a faint glow;
 *   2 DIM:  --text-dim, muted, with a faint glow.
 */
import type { WallpaperPalette } from '../types';
import { BODY_DESATURATE, type LayerParams } from './params';

/** Sheet rows: the colour styles. */
export const ROW = { head: 0, body: 1, dim: 2 } as const;
export type AtlasRow = (typeof ROW)[keyof typeof ROW];

/** Digits, a few Latin letters and the symbols from the reference. Always available (JetBrains Mono). */
export const BASE_GLYPHS = '0123456789ZTHEMXAKR:.=*+-<>¦|"';

/** Half-width katakana, drawn mirrored as in the film. Need a system font (MS Gothic, Yu Gothic…). */
export const KATAKANA = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

/** The font stack: the app's font, then system fonts that have katakana. */
export const FONT_STACK = '"JetBrains Mono", "MS Gothic", "Yu Gothic", "Hiragino Sans", "Noto Sans CJK JP", monospace';

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
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

/** A layer's sprite sheet. */
export interface Atlas {
  canvas: HTMLCanvasElement;
  glyphs: number;
  /** One slot's size in device pixels (a cell plus `pad` on every side, for the glow). */
  slotW: number;
  slotH: number;
  pad: number;
}

/** Builds the sprite sheet for one layer at a device pixel ratio. */
export function buildAtlas(layer: LayerParams, palette: WallpaperPalette, dpr: number, glyphs: readonly Glyph[], accentGlow: string): Atlas {
  const pad = Math.ceil(5 * dpr);
  const slotW = Math.ceil(layer.colW * dpr) + pad * 2;
  const slotH = Math.ceil(layer.rowH * dpr) + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = slotW * glyphs.length;
  canvas.height = slotH * 3;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, glyphs: glyphs.length, slotW, slotH, pad };

  ctx.font = `${Math.round(layer.font * dpr)}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // The three colour styles: [row, colour, glow blur in CSS px, times drawn].
  // Drawing the head twice stacks its glow, so it reads as a light source.
  const styles: [AtlasRow, string, number, number][] = [
    [ROW.head, palette.bright, 6, 2],
    [ROW.body, desaturate(palette.text, BODY_DESATURATE), 2, 1],
    [ROW.dim, desaturate(palette.dim, BODY_DESATURATE), 2, 1],
  ];
  for (const [row, color, blur, times] of styles) {
    ctx.fillStyle = color;
    ctx.shadowColor = accentGlow;
    ctx.shadowBlur = blur * dpr;
    glyphs.forEach((g, i) => {
      const cx = i * slotW + slotW / 2;
      const cy = row * slotH + slotH / 2;
      ctx.save();
      // Mirror around the glyph's own centre.
      if (g.mirrored) {
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.translate(-cx, -cy);
      }
      for (let t = 0; t < times; t++) ctx.fillText(g.char, cx, cy);
      ctx.restore();
    });
  }
  return { canvas, glyphs: glyphs.length, slotW, slotH, pad };
}
