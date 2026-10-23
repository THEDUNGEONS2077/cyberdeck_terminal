/**
 * src/app/deck/useArrowNav.ts: the arrow keys move between NAV's items:
 * tiles, folder headings, the links inside open folders, area headings.
 *
 * Layer: UI. Tab still walks everything in order; the arrows are the
 * quick way through a grid (UX pass, 2026-10-22):
 *   ← →    the previous / next item in reading order (wrapping across rows)
 *   ↑ ↓    the nearest item in the row above / below (by position on screen)
 *   Home / End   the first / last item
 * Only from an item itself, with no modifier keys, and never while typing.
 * Items inside a folded area or folder are skipped (they're inert).
 */
import { type RefObject, useEffect } from 'react';

/** What the arrows move between. */
const ITEMS = '.tile, .row-link, .folder-head, .area-toggle';

/** The items that can take the keyboard now, in page order. */
function items(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(ITEMS)].filter((el) => !el.closest('[inert]') && el.offsetParent !== null);
}

/**
 * The item below (dir = 1) or above (-1) `from`: in the nearest row in that
 * direction, the one whose middle is closest across.
 */
function vertical(from: HTMLElement, all: HTMLElement[], dir: 1 | -1): HTMLElement | null {
  const a = from.getBoundingClientRect();
  const ax = a.left + a.width / 2;
  let best: HTMLElement | null = null;
  let bestRow = Infinity;
  let bestDx = Infinity;
  for (const el of all) {
    if (el === from) continue;
    const r = el.getBoundingClientRect();
    // Strictly beyond `from` in that direction (a few px of overlap allowed).
    const gap = dir === 1 ? r.top - a.bottom : a.top - r.bottom;
    if (gap < -4) continue;
    const dx = Math.abs(r.left + r.width / 2 - ax);
    // A nearer row wins; within a row (8 px of slack), the nearest across.
    if (gap < bestRow - 8 || (Math.abs(gap - bestRow) <= 8 && dx < bestDx)) {
      best = el;
      bestRow = Math.min(gap, bestRow);
      bestDx = dx;
    }
  }
  return best;
}

/** Moves the keyboard between NAV's items with the arrow keys, inside `root`. */
export function useArrowNav(root: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      const from = e.target as HTMLElement;
      if (!from.matches?.(ITEMS)) return;
      const all = items(el);
      const at = all.indexOf(from);
      const targets: Record<string, () => HTMLElement | null | undefined> = {
        ArrowRight: () => all[at + 1],
        ArrowLeft: () => all[at - 1],
        ArrowDown: () => vertical(from, all, 1),
        ArrowUp: () => vertical(from, all, -1),
        Home: () => all[0],
        End: () => all[all.length - 1],
      };
      const pick = targets[e.key];
      if (!pick) return;
      const to = pick();
      e.preventDefault();
      if (!to) return;
      to.focus({ preventScroll: true });
      to.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [root]);
}
