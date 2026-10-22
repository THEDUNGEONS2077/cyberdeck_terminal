/**
 * src/app/panels.tsx: placing the movable panels (NAV, the brand panel):
 * their saved place as CSS, and the grips that move and resize them.
 *
 * Layer: UI.
 *
 * A place is stored as shares of the window (lib/arrange.ts PanelPlace),
 * so it holds as the window changes size; app.css turns the variables
 * into a position, kept on screen with clamp(). No transforms: a moved
 * panel's text stays on whole pixels, crisp. Narrow windows ignore the
 * places (the usual stacked layout).
 *
 * Grips (edit mode): drag to move (or to resize, NAV's right edge), or use
 * the arrow keys on the focused grip (Shift for bigger steps).
 */
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

import { type PanelId, type PanelPlace, clampPlace } from '@/lib/arrange';
import { editStore } from '@/store/edit';

import { type DragPayload, placeFromRect } from './arrangeDrag';

/** The CSS variables that put a panel at `place` (app.css `[data-placed]`). */
export function placeStyle(place: PanelPlace | null): CSSProperties | undefined {
  if (!place) return undefined;
  return { '--px': place.x, '--py': place.y, ...(place.w ? { '--pw': `${place.w}px` } : {}) } as CSSProperties;
}

/** Arrow keys on a grip: move the panel (or resize NAV) a step; Shift for a bigger one. */
function nudge(e: KeyboardEvent, id: PanelId, el: HTMLElement | null, resize: boolean): void {
  const dir = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!dir || !el) return;
  e.preventDefault();
  const big = e.shiftKey;
  const place = placeFromRect(el.getBoundingClientRect(), id === 'nav');
  const next: PanelPlace = resize
    ? { ...place, w: (place.w ?? 0) + dir[0]! * (big ? 64 : 16) }
    : { ...place, x: place.x + dir[0]! * (big ? 0.05 : 0.01), y: place.y + dir[1]! * (big ? 0.05 : 0.01) };
  editStore.getState().apply((s) => ({ ...s, panels: { ...s.panels, [id]: clampPlace(next) } }));
}

/** The move grip for panel `id` (edit mode). `target` finds the panel's element. */
export function MoveGrip({ id, label, target, startDrag }: { id: PanelId; label: string; target: () => HTMLElement | null; startDrag: (e: PointerEvent, p: DragPayload) => void }) {
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

/** NAV's resize grip, on its right edge (edit mode). */
export function ResizeGrip({ target, startDrag }: { target: () => HTMLElement | null; startDrag: (e: PointerEvent, p: DragPayload) => void }) {
  return (
    <button
      type="button"
      className="resize-grip"
      aria-label="Resize NAV (drag, or the left and right arrows)"
      title="Drag to resize, or ← / →"
      onPointerDown={(e) => {
        const el = target();
        if (el) startDrag(e, { kind: 'resize', el });
      }}
      onKeyDown={(e) => nudge(e, 'nav', target(), true)}
    />
  );
}
