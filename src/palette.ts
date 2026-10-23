/**
 * src/palette.ts: puts a colour palette on the page.
 *
 * Layer: entry point helper (DOM, no React, no stores), used by main.tsx
 * at the very start and by the app when the layout's palette changes. A
 * palette (lib/palettes.ts) sets the base colour tokens on <html>; theme.css
 * mixes every other colour from them. The wallpaper has a palette of its
 * own (wallpaper/host.ts setWallpaperColors).
 *
 * Which palette to start with is remembered in localStorage (a hint only,
 * like the wallpaper's), because the layout itself is read later, from
 * IndexedDB: without it a non-default palette would flash green first.
 */
import { DEFAULT_PALETTE, findPalette, PALETTE_TOKENS, type PaletteColors, type PaletteId } from '@/lib/palettes';

/** The localStorage key of the start-up hint: this app's own prefix (quest_log_desktop shares the origin). */
const HINT_KEY = 'cyberdeck_terminal:palette';

/** The palette the last visit chose (or the default). */
export function paletteHint(): string {
  try {
    return localStorage.getItem(HINT_KEY) || DEFAULT_PALETTE;
  } catch {
    return DEFAULT_PALETTE;
  }
}

/** The palette on the page now. */
let current: PaletteId | null = null;

/** Sets palette `id`'s colours on the page and remembers it for the next start. True if that changed the colours. */
export function applyPalette(id: string): boolean {
  const palette = findPalette(id);
  if (palette.id === current) return false;
  current = palette.id;
  const root = document.documentElement;
  for (const [key, token] of Object.entries(PALETTE_TOKENS) as [keyof PaletteColors, string][]) root.style.setProperty(token, palette.colors[key]);
  root.dataset.palette = palette.id;
  try {
    localStorage.setItem(HINT_KEY, palette.id);
  } catch {
    // Storage blocked: the next start shows the default first, then switches once the layout loads.
  }
  return true;
}
