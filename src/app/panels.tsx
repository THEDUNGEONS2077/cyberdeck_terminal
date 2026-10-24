/**
 * src/app/panels.tsx: placing the movable panels (NAV, the brand panel and
 * the modules): their saved place as CSS, and the grips that move and
 * resize them.
 *
 * Layer: UI.
 *
 * A place is stored as shares of the window (lib/arrange.ts PanelPlace),
 * so it holds as the window changes size; app.css turns the variables
 * into a position, kept on screen with clamp(). No transforms: a moved
 * panel's text stays on whole pixels, crisp. Narrow windows ignore the
 * places (the usual stacked layout).
 *
 * Grips (edit mode): drag to move (or to resize, by the right edge of NAV
 * or a module), or use the arrow keys on the focused grip (Shift for
 * bigger steps).
 */
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

import { NAV_WIDTH, type PanelPlace, clampPlace } from '@/lib/arrange';
import { editStore, withPlace } from '@/store/edit';

import { type DragPayload, placeFromRect, widthOf } from './arrangeDrag';

/** The CSS variables that put a panel at `place` (app.css `[data-placed]`). */
export function placeStyle(place: PanelPlace | null): CSSProperties | undefined {
  if (!place) return undefined;
  return { '--px': place.x, '--py': place.y, ...(place.w ? { '--pw': `${place.w}px` } : {}) } as CSSProperties;
}

/** Arrow keys on a grip: move the panel (or resize it) a step; Shift for a bigger one. */
function nudge(e: KeyboardEvent, id: string, el: HTMLElement | null, resize: boolean): void {
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!dir || !el) return;
  e.preventDefault();
  const big = e.shiftKey;
  const width = widthOf(id);
  const place = placeFromRect(el.getBoundingClientRect(), width);
  const next: PanelPlace = resize
    ? { ...place, w: (place.w ?? 0) + dir[0]! * (big ? 64 : 16) }
    : { ...place, x: place.x + dir[0]! * (big ? 0.05 : 0.01), y: place.y + dir[1]! * (big ? 0.05 : 0.01) };
  editStore.getState().apply((s) => withPlace(s, id, clampPlace(next, width ?? NAV_WIDTH)));
}

/** The move grip for panel `id` (edit mode). `target` finds the panel's element. */
export function MoveGrip({ id, label, target, startDrag }: { id: string; label: string; target: () => HTMLElement | null; startDrag: (e: PointerEvent, p: DragPayload) => void }) {
  return (
    <button
      type="button"
      className="grip panel-grip"
      aria-label={`Move ${label} (drag, or the arrow keys)`}
      title="Drag to move, or arrow keys"
      onPointerDown={(e) => {
        const el = target();
        if (el) startDrag(e, { kind: 'panel', id, el });
      }}
      onKeyDown={(e) => nudge(e, id, target(), false)}
    >
      ⠿
    </button>
  );
}

/** The resize grip on the right edge of panel `id`, NAV or a module (edit mode). */
export function ResizeGrip({ id = 'nav', label = 'NAV', target, startDrag }: { id?: string; label?: string; target: () => HTMLElement | null; startDrag: (e: PointerEvent, p: DragPayload) => void }) {
  return (
    <button
      type="button"
      className="resize-grip"
      aria-label={`Resize ${label} (drag, or the left and right arrows)`}
      title="Drag to resize, or ← / →"
      onPointerDown={(e) => {
        const el = target();
        if (el) startDrag(e, { kind: 'resize', id, el });
      }}
      onKeyDown={(e) => nudge(e, id, target(), true)}
    />
  );
}
