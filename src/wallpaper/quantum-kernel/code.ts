/**
 * src/wallpaper/quantum-kernel/code.ts: the code QUANTUM KERNEL shows, laid
 * out as code: blocks of lines in lanes across the screen, each block
 * indented the way a function body is (deeper after an opening line, back
 * out later), each line a statement: words of glyphs joined by operators
 * (`=`, `->`, `==`, `+=`, `:`, `.`, `*`, `|`, quotes). Every character is one
 * of the MATRIX RAIN's (matrix-rain/glyphAtlas.ts): mirrored half-width
 * katakana, digits, a few letters and its symbols.
 *
 * Layer: wallpaper (pure: the random numbers are passed in, so tests drive
 * it). Rows wrap: a layer's code is a loop `rows` long, scrolled forever.
 */
import type { DepthSpec } from './params';

/** A random number source returning 0 ≤ n < 1. */
export type Rng = () => number;

/** One line of code: its row (0 ≤ row < rows), its first column, and its characters (spaces between words). */
export interface CodeLine {
  row: number;
  col: number;
  text: string;
}

/** A whole number in [lo, hi]. */
const pick = (rng: Rng, [lo, hi]: readonly [number, number]) => lo + Math.floor(rng() * (hi - lo + 1));

/** The joins between words: the rain's own symbols, read as operators. */
const JOINS = [' = ', '->', ' == ', ' += ', ': ', '.', ' * ', ' | ', ' ', ' ', ' '];

/** A word of `letters` (2–7 glyphs). */
function word(rng: Rng, letters: readonly string[]): string {
  const n = 2 + Math.floor(rng() * 6);
  let out = '';
  for (let i = 0; i < n; i++) out += letters[Math.floor(rng() * letters.length)]!;
  return out;
}

/** A statement about `length` glyphs long: words joined by operators, now and then in quotes or ending in a colon. */
export function statement(rng: Rng, letters: readonly string[], length: number): string {
  let out = word(rng, letters);
  while (out.length < length) {
    const join = JOINS[Math.floor(rng() * JOINS.length)]!;
    out += join + (rng() < 0.12 ? `"${word(rng, letters)}"` : word(rng, letters));
  }
  if (rng() < 0.15) out += ':';
  return out;
}

/**
 * A layer's code: `cols` × `rows` cells (rows loop), its lanes each running
 * blocks then gaps down the whole loop. A block starts near its lane's left
 * edge, its first line at indent 0; a line ending in `:` (an opening one)
 * indents the next by two, and now and then a line steps back out. Lines
 * may run past their lane, as in the reference.
 */
export function writeCode(rng: Rng, cols: number, rows: number, spec: Pick<DepthSpec, 'lanes' | 'block' | 'gap' | 'length'>, letters: readonly string[]): CodeLine[] {
  const lines: CodeLine[] = [];
  const laneW = cols / spec.lanes;
  for (let lane = 0; lane < spec.lanes; lane++) {
    // Each lane starts part way into a gap, so the lanes' blocks don't line up.
    let row = Math.floor(rng() * (spec.gap[1] + 1));
    while (row < rows) {
      const left = Math.floor(lane * laneW + rng() * laneW * 0.25);
      const n = pick(rng, spec.block);
      let indent = 0;
      for (let i = 0; i < n && row < rows; i++, row++) {
        const text = statement(rng, letters, pick(rng, spec.length));
        lines.push({ row, col: left + indent * 2, text });
        if (text.endsWith(':')) indent = Math.min(indent + 1, 4);
        else if (indent > 0 && rng() < 0.25) indent--;
      }
      row += pick(rng, spec.gap);
    }
  }
  return lines;
}
