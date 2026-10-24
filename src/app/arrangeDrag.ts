/**
 * src/app/arrangeDrag.ts: dragging in edit mode: bookmarks and folders
 * between NAV, your areas and the HIDDEN tray; areas up and down; the
 * panels (NAV, the brand panel, the modules) around the screen, and the
 * widths of NAV and the modules.
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
import { useCallback, useEffect, useRef } from 'react';
import { createStore } from 'zustand/vanilla';

import { NAV_WIDTH, type PanelPlace, type WidthLimits, clampPlace, hideItem, keyKind, moveArea, moveItem } from '@/lib/arrange';
import { MODULE_SCALE, MODULE_WIDTH, isModuleId } from '@/lib/modules';
import { editStore, withPlace } from '@/store/edit';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

/** How far the pointer must move before a press becomes a drag (px). */
export const DRAG_THRESHOLD = 5;

/** Within this distance of NAV's top or bottom edge, a drag scrolls it (px). */
const SCROLL_EDGE = 48;

/** What's being dragged. */
export type DragPayload =
  | { kind: 'item'; key: string; label: string; mainKeys: readonly string[] }
  | { kind: 'area'; id: string; label: string }
  | { kind: 'panel'; id: string; el: HTMLElement }
  | { kind: 'resize'; id: string; el: HTMLElement };

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
  /** A whole zone (an empty section, the HIDDEN tray), drawn as a tinted outline, not a line. */
  zone?: boolean;
}

/** What the page draws while dragging (null when not dragging). */
export interface DragView {
  label: string;
  x: number;
  y: number;
  line: Line | null;
}

/**
 * The drag's picture (the label at the pointer, the drop line), in a store
 * of its own: only app/Bookmarks.tsx's DragOverlay listens, so moving the
 * pointer redraws those two small elements and nothing else
 * (optimization pass, 2026-10-22: it used to redraw every tile, every frame).
 */
export const dragViewStore = createStore<{ view: DragView | null }>(() => ({ view: null }));
const setView = (view: DragView | null) => dragViewStore.setState({ view });

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
    return { kind: 'hide', line: { left: r.left, top: r.top, width: r.width, height: r.height, zone: true } };
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
  return { kind: 'move', section: sectionId, before: null, line: { left: r.left, top: r.top, width: r.width, height: r.height, zone: true } };
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

/**
 * A panel's place from its box on screen (shares of the window; a panel
 * with `width` limits keeps its width, in its own sizes: the box's width
 * divided by how big it's drawn, `scale`).
 */
export function placeFromRect(r: DOMRect, width: WidthLimits | null, scale = 1): PanelPlace {
  return clampPlace({ x: r.left / window.innerWidth, y: r.top / window.innerHeight, w: width ? r.width / scale : undefined }, width ?? NAV_WIDTH);
}

/** How big panel `id` is drawn: a module at MODULE_SCALE, NAV and the brand panel as they are. */
export function scaleOf(id: string): number {
  return isModuleId(id) ? MODULE_SCALE : 1;
}

/** How wide panel `id` may be: NAV's limits, a module's, or null for the brand panel (it has no width). */
export function widthOf(id: string): WidthLimits | null {
  if (id === 'brand') return null;
  return id === 'nav' ? NAV_WIDTH : MODULE_WIDTH;
}

/** A section's name for announcements: NAV, or the area's title. */
export function sectionName(section: string): string {
  if (section === 'main') return 'NAV';
  return layoutStore().getState().layout.bookmarks.arrangement.areas.find((a) => a.id === section)?.title ?? 'AN AREA';
}

/** Applies a drop, and tells screen readers what it did. */
function drop(payload: DragPayload, target: Target | null): void {
  if (!target) return;
  const { apply } = editStore.getState();
  const { announce } = uiStore.getState();
  if (payload.kind === 'item') {
    if (target.kind === 'hide') {
      apply((s) => ({ ...s, arrangement: hideItem(s.arrangement, payload.key) }));
      announce(`HID ${payload.label}`);
    }
    if (target.kind === 'move') {
      apply((s) => ({ ...s, arrangement: moveItem(s.arrangement, payload.key, { section: target.section, before: target.before }, payload.mainKeys) }));
      announce(`MOVED ${payload.label} TO ${sectionName(target.section)}`);
    }
  }
  if (payload.kind === 'area' && target.kind === 'area') {
    apply((s) => ({ ...s, arrangement: moveArea(s.arrangement, payload.id, target.before) }));
    announce(`MOVED AREA ${payload.label}`);
  }
}

/**
 * The drag controller: `start` on a pointerdown. `start` keeps the same
 * identity for the component's life, so passing it down never re-renders
 * anything. What's drawn while dragging lives in dragViewStore.
 */
export function useArrangeDrag(scroller: React.RefObject<HTMLElement | null>) {
  const active = useRef<(() => void) | null>(null);

  // Leaving edit mode (or unmounting) ends any drag.
  useEffect(() => () => active.current?.(), []);

  const start = useCallback((e: React.PointerEvent, payload: DragPayload) => {
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
    // What's being picked up (an item or an area): dimmed in place while it's dragged.
    const source = payload.kind === 'item' || payload.kind === 'area' ? (e.currentTarget as HTMLElement).closest<HTMLElement>('[data-item-key], [data-area-id], li') : null;

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
          if (widthOf(payload.id)) el.style.setProperty('--pw', `${box.width / scaleOf(payload.id)}px`);
        } else {
          const width = widthOf(payload.id) ?? NAV_WIDTH;
          const scale = scaleOf(payload.id);
          const place = placeFromRect(box, width, scale);
          el.style.setProperty('--px', String(place.x));
          el.style.setProperty('--py', String(place.y));
          // The pointer moves the drawn edge; the width kept is in the panel's own sizes.
          el.style.setProperty('--pw', `${clampPlace({ ...place, w: (box.width + px - sx) / scale }, width).w}px`);
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
        if (source) source.dataset.dragSource = '';
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
      if (source) delete source.dataset.dragSource;
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
        const { id } = payload;
        if (commit) {
          const place = placeFromRect(el.getBoundingClientRect(), widthOf(id), scaleOf(id));
          editStore.getState().apply((s) => withPlace(s, id, place));
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
  }, [scroller]);

  return { start };
}
