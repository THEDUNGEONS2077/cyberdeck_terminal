/**
 * src/app/deck/useFlip.ts: when the deck is rearranged, items glide to
 * their new places instead of jumping (UX pass, 2026-10-22).
 *
 * Layer: UI. The FLIP technique (First, Last, Invert, Play):
 *   - First: when a store says something that moves items is about to
 *     change (your arrangement, the bookmarks bar itself, entering or
 *     leaving edit mode), every item's position is noted. Store listeners
 *     run before React redraws, so this is the old layout;
 *   - Last: right after React has drawn the new layout, each item is
 *     measured again;
 *   - Invert and Play: an item that moved is shifted back to where it was
 *     with a transform, then animated to its new place. Transforms only,
 *     so the compositor does the motion; nothing is laid out again.
 * Items that weren't there before fade in. Covers drops, ⋯ menu moves,
 * hiding and showing, areas, live bookmark changes, the edit bar sliding
 * in, and folders opening and closing (the cards below an opening folder
 * move down). Reduce Motion: nothing animates.
 *
 * Positions are taken relative to NAV's scrolling box (and its scroll), so
 * moving the NAV panel or scrolling it doesn't count as items moving.
 */
import { type RefObject, useEffect, useLayoutEffect, useRef } from 'react';

import { editStore } from '@/store/edit';
import { bookmarksStore, layoutStore } from '@/store/instance';
import { uiZoomNow } from '@/scale';

import { useLayout } from '../hooks';

/** What glides: section items and areas. */
const SELECTOR = '[data-item-key], [data-area-id]';
/** The glide (theme.css --base and --ease). */
const DURATION = 220;
const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
/** A noted layout older than this when React draws is stale (something else moved things meanwhile): ignored. */
const STALE_MS = 250;

interface Point {
  x: number;
  y: number;
}

/** An element's identity across redraws. */
function keyOf(el: HTMLElement): string {
  return el.dataset.itemKey ? `i:${el.dataset.itemKey}` : `a:${el.dataset.areaId}`;
}

/** Where an element is now, as seen (a glide in progress included), in the scroll box's content coordinates (the UI's own px: screen px ÷ UI SCALE's zoom). */
function place(el: HTMLElement, root: HTMLElement, base: DOMRect): Point {
  const r = el.getBoundingClientRect();
  const z = uiZoomNow();
  return { x: (r.left - base.left) / z, y: (r.top - base.top) / z + root.scrollTop };
}

/** Is Reduce Motion on (the OS setting, unless the page overrides it)? */
function reduceMotion(): boolean {
  const own = document.documentElement.dataset.reduceMotion;
  if (own) return own === 'on';
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Glides the items inside `root` (NAV's scrolling box) whenever the deck is rearranged. */
export function useFlip(root: RefObject<HTMLElement | null>): void {
  const before = useRef<{ at: number; points: Map<string, Point> } | null>(null);
  // Folders opening and closing redraw the deck too (FolderItem alone would redraw otherwise), so their moves glide.
  useLayout((s) => s.layout.bookmarks.open);

  // First: note every position just before a change lands.
  useEffect(() => {
    const note = () => {
      const el = root.current;
      if (!el || before.current) return;
      const base = el.getBoundingClientRect();
      const points = new Map<string, Point>();
      for (const item of el.querySelectorAll<HTMLElement>(SELECTOR)) points.set(keyOf(item), place(item, el, base));
      before.current = { at: performance.now(), points };
    };
    const unsubscribe = [
      layoutStore().subscribe((s, p) => {
        if (s.layout.bookmarks.arrangement !== p.layout.bookmarks.arrangement || s.layout.bookmarks.open !== p.layout.bookmarks.open) note();
      }),
      bookmarksStore().subscribe((s, p) => {
        if (s.bar !== p.bar) note();
      }),
      editStore.subscribe((s, p) => {
        if (s.editing !== p.editing) note();
      }),
    ];
    return () => unsubscribe.forEach((u) => u());
  }, [root]);

  // Last, Invert, Play: after every draw that followed a noted change.
  useLayoutEffect(() => {
    const noted = before.current;
    before.current = null;
    const el = root.current;
    if (!noted || !el || performance.now() - noted.at > STALE_MS || reduceMotion()) return;
    const base = el.getBoundingClientRect();
    for (const item of el.querySelectorAll<HTMLElement>(SELECTOR)) {
      // A glide still running from the last change: stop it, so the new layout is measured, not the glide.
      for (const a of item.getAnimations()) if (a.id === 'flip') a.cancel();
      const now = place(item, el, base);
      const was = noted.points.get(keyOf(item));
      let animation: Animation | null = null;
      if (!was) {
        // New here: fade in (only when there was a layout before, not on the first draw).
        if (noted.points.size) animation = item.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: DURATION, easing: EASE });
      } else {
        const dx = was.x - now.x;
        const dy = was.y - now.y;
        if (Math.abs(dx) >= 1 || Math.abs(dy) >= 1) animation = item.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: DURATION, easing: EASE });
      }
      if (animation) animation.id = 'flip';
    }
  });
}
