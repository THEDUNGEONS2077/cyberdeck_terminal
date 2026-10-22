/**
 * src/app/arrangeDrag.ts: dragging in edit mode: bookmarks and folders
 * between NAV, your areas and the HIDDEN tray; areas up and down; the
 * panels around the screen, and NAV's width.
 *
 * Layer: UI (pointer events and the DOM). Pointer events, so a mouse, a
 * pen and a touch screen all work. A press only becomes a drag after the
 * pointer moves DRAG_THRESHOLD px, so a plain click still clicks (a folder
 * head still opens). While dragging:
 *   - a small label follows the pointer, and a glowing line shows where
 *     the drop lands (positions are read from the page's own layout:
 *     `data-drop-section`, `data-item-key`, `data-area-id`);
 *   - the NAV panel scrolls when the pointer nears its top or bottom;
 *   - Esc cancels; dropping applies one undoable change.
 * Panels move live (CSS variables on the element), and are saved on drop.
 *
 * Every drag here has a keyboard way too: the ⋯ menus, and arrow keys on
 * the grips (app/Bookmarks.tsx, app/panels.tsx).
 */
import { useEffect, useRef, useState } from 'react';

import { type PanelId, type PanelPlace, clampPlace, hideItem, keyKind, moveArea, moveItem } from '@/lib/arrange';
import { editStore } from '@/store/edit';

/** How far the pointer must move before a press becomes a drag (px). */
export const DRAG_THRESHOLD = 5;

/** Within this distance of NAV's top or bottom edge, a drag scrolls it (px). */
const SCROLL_EDGE = 48;

/** What's being dragged. */
export type DragPayload =
  | { kind: 'item'; key: string; label: string; mainKeys: readonly string[] }
  | { kind: 'area'; id: string; label: string }
  | { kind: 'panel'; id: PanelId; el: HTMLElement }
  | { kind: 'resize'; el: HTMLElement };

/** Where a drop would land, and the line that shows it (viewport px). */
type Target =
  | { kind: 'move'; section: string; before: string | null; line: Line }
  | { kind: 'hide'; line: Line }
  | { kind: 'area'; before: string | null; line: Line };
interface Line {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** What the page draws while dragging (null when not dragging). */
export interface DragView {
  label: string;
  x: number;
  y: number;
  line: Line | null;
}

/** The item wrappers that are drop positions in a section: its own top-level items of one kind, in page order. */
function sectionItems(section: Element, sectionId: string, kind: string): HTMLElement[] {
  return [...section.querySelectorAll<HTMLElement>(`[data-item-key][data-section="${CSS.escape(sectionId)}"][data-kind="${kind}"]`)];
}

/**
 * Where an item dropped at (x, y) lands. In a section's grid (reading
 * order: left to right, then down), it goes before the first item the
 * pointer is above, or level with and left of the middle of; else at the
 * end. Links land among links, folders among folders.
 */
function itemTarget(x: number, y: number, key: string): Target | null {
  const el = document.elementFromPoint(x, y);
  const tray = el?.closest('[data-drop-hidden]');
  if (tray) {
    const r = tray.getBoundingClientRect();
    return { kind: 'hide', line: { left: r.left, top: r.top, width: r.width, height: r.height } };
  }
  const section = el?.closest<HTMLElement>('[data-drop-section]');
  if (!section) return null;
  const sectionId = section.dataset.dropSection!;
  const items = sectionItems(section, sectionId, keyKind(key)).filter((it) => it.dataset.itemKey !== key);
  for (const it of items) {
    const r = it.getBoundingClientRect();
    if (y < r.top || (y <= r.bottom && x < r.left + r.width / 2)) {
      return { kind: 'move', section: sectionId, before: it.dataset.itemKey!, line: { left: r.left - 4, top: r.top, width: 2, height: r.height } };
    }
  }
  const last = items[items.length - 1];
  if (last) {
    const r = last.getBoundingClientRect();
    return { kind: 'move', section: sectionId, before: null, line: { left: r.right + 2, top: r.top, width: 2, height: r.height } };
  }
  // An empty section (or none of this kind yet): the whole section lights.
  const r = section.getBoundingClientRect();
  return { kind: 'move', section: sectionId, before: null, line: { left: r.left, top: r.top, width: r.width, height: r.height } };
}

/** Where an area dropped at height y lands: before the first area whose middle is below the pointer. */
function areaTarget(y: number, id: string): Target | null {
  const areas = [...document.querySelectorAll<HTMLElement>('[data-area-id]')].filter((a) => a.dataset.areaId !== id);
  for (const a of areas) {
    const r = a.getBoundingClientRect();
    if (y < r.top + r.height / 2) return { kind: 'area', before: a.dataset.areaId!, line: { left: r.left, top: r.top - 4, width: r.width, height: 2 } };
  }
  const last = areas[areas.length - 1];
  if (!last) return null;
  const r = last.getBoundingClientRect();
  return { kind: 'area', before: null, line: { left: r.left, top: r.bottom + 2, width: r.width, height: 2 } };
}

/** A panel's place from its box on screen (shares of the window; NAV keeps its width). */
export function placeFromRect(r: DOMRect, withWidth: boolean): PanelPlace {
  return clampPlace({ x: r.left / window.innerWidth, y: r.top / window.innerHeight, w: withWidth ? r.width : undefined });
}

/** Applies a drop. */
function drop(payload: DragPayload, target: Target | null): void {
  if (!target) return;
  const { apply } = editStore.getState();
  if (payload.kind === 'item') {
    if (target.kind === 'hide') apply((s) => ({ ...s, arrangement: hideItem(s.arrangement, payload.key) }));
    if (target.kind === 'move') apply((s) => ({ ...s, arrangement: moveItem(s.arrangement, payload.key, { section: target.section, before: target.before }, payload.mainKeys) }));
  }
  if (payload.kind === 'area' && target.kind === 'area') apply((s) => ({ ...s, arrangement: moveArea(s.arrangement, payload.id, target.before) }));
}

/**
 * The drag controller for the deck: `start` on a pointerdown; `view` is
 * what to draw (the label and the drop line) while a drag is on.
 */
export function useArrangeDrag(scroller: React.RefObject<HTMLElement | null>) {
  const [view, setView] = useState<DragView | null>(null);
  const active = useRef<(() => void) | null>(null);

  // Leaving edit mode (or unmounting) ends any drag.
  useEffect(() => () => active.current?.(), []);

  const start = (e: React.PointerEvent, payload: DragPayload) => {
    if (e.button !== 0 || active.current) return;
    const sx = e.clientX;
    const sy = e.clientY;
    let dragging = false;
    let target: Target | null = null;
    let frame = 0;
    let px = sx;
    let py = sy;
    // A panel's starting box, for live moving and resizing.
    const box = payload.kind === 'panel' || payload.kind === 'resize' ? payload.el.getBoundingClientRect() : null;

    /** Recomputes the target and redraws, once per frame at most. */
    const update = () => {
      frame = 0;
      if (payload.kind === 'panel' || payload.kind === 'resize') {
        if (!box) return;
        // Live: the element's own position variables (app.css [data-placed]).
        const el = payload.el;
        el.dataset.placed = '';
        if (payload.kind === 'panel') {
          el.style.setProperty('--px', String((box.left + px - sx) / window.innerWidth));
          el.style.setProperty('--py', String((box.top + py - sy) / window.innerHeight));
          if (payload.id === 'nav') el.style.setProperty('--pw', `${box.width}px`);
        } else {
          const place = placeFromRect(box, true);
          el.style.setProperty('--px', String(place.x));
          el.style.setProperty('--py', String(place.y));
          el.style.setProperty('--pw', `${clampPlace({ ...place, w: box.width + px - sx }).w}px`);
        }
        return;
      }
      target = payload.kind === 'item' ? itemTarget(px, py, payload.key) : areaTarget(py, payload.id);
      // Near NAV's top or bottom edge: scroll it, a little more the closer.
      const sc = scroller.current?.getBoundingClientRect();
      if (sc && scroller.current) {
        if (py < sc.top + SCROLL_EDGE) scroller.current.scrollTop -= 12;
        else if (py > sc.bottom - SCROLL_EDGE) scroller.current.scrollTop += 12;
      }
      setView({ label: payload.label, x: px, y: py, line: target?.line ?? null });
    };

    const onMove = (ev: PointerEvent) => {
      px = ev.clientX;
      py = ev.clientY;
      if (!dragging) {
        if (Math.hypot(px - sx, py - sy) < DRAG_THRESHOLD) return;
        dragging = true;
        document.documentElement.dataset.dragging = '';
      }
      if (!frame) frame = requestAnimationFrame(update);
    };
    const finish = (commit: boolean) => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      delete document.documentElement.dataset.dragging;
      active.current = null;
      setView(null);
      if (!dragging) return;
      // The click that ends a drag mustn't also press what's under the pointer.
      const swallow = (ev: MouseEvent) => {
        ev.stopPropagation();
        ev.preventDefault();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, true), 0);
      if (payload.kind === 'panel' || payload.kind === 'resize') {
        const el = payload.el;
        const id: PanelId = payload.kind === 'panel' ? payload.id : 'nav';
        if (commit) {
          const place = placeFromRect(el.getBoundingClientRect(), id === 'nav');
          editStore.getState().apply((s) => ({ ...s, panels: { ...s.panels, [id]: place } }));
        } else {
          // Cancelled: back where it was (React's next render restores the saved place).
          el.style.removeProperty('--px');
          el.style.removeProperty('--py');
          el.style.removeProperty('--pw');
        }
        return;
      }
      if (commit) drop(payload, target);
    };
    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !dragging) return;
      ev.preventDefault();
      ev.stopPropagation();
      finish(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    active.current = () => finish(false);
  };

  return { start, view };
}
