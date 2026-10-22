/**
 * src/app/deck/Areas.tsx: your areas: named sections of the dashboard,
 * each with its own tiles and folder cards.
 *
 * Layer: UI.
 *
 * Locked: a heading (caret, title, link count) that folds the area open
 * and shut, like a folder. Editing: a ⠿ grip to drag the area up or down
 * (or ↑ / ↓ on the grip), the title as a text field (Enter or leaving it
 * saves; Esc puts it back), and ✕, which asks first and then returns the
 * area's bookmarks to where Chrome has them. The whole area is a drop
 * target: dropping on a folded area adds to its end.
 */
import { type KeyboardEvent, useEffect, useId, useRef, useState } from 'react';

import { type Area, type TreeItem, deleteArea, moveArea, renameArea, setAreaCollapsed } from '@/lib/arrange';
import { countLinks } from '@/lib/bookmarks';
import { editStore } from '@/store/edit';
import { layoutStore } from '@/store/instance';

import { cx } from '../cx';
import { G } from '../glyphs';
import { useDeck } from './context';
import { SectionItems } from './Items';

/** Opens or folds an area: an undoable edit while editing, a plain layout change otherwise. */
function toggleArea(area: Area, editing: boolean): void {
  if (editing) {
    editStore.getState().apply((s) => ({ ...s, arrangement: setAreaCollapsed(s.arrangement, area.id, !area.collapsed) }));
    return;
  }
  const store = layoutStore().getState();
  store.setArrangement(setAreaCollapsed(store.layout.bookmarks.arrangement, area.id, !area.collapsed));
}

/** One area. `focusTitle` puts the cursor in its title (a new area, ready to be named). */
export function AreaSection({ area, items, index, count, focusTitle }: { area: Area; items: readonly TreeItem[]; index: number; count: number; focusTitle: boolean }) {
  const { editing, startDrag } = useDeck();
  const bodyId = useId();
  const [confirming, setConfirming] = useState(false);
  const links = items.reduce((n, it) => n + countLinks(it.node), 0);
  const { apply } = editStore.getState();

  /** ↑ / ↓ on the grip move the area one place. */
  const onGripKey = (e: KeyboardEvent) => {
    const areas = layoutStore().getState().layout.bookmarks.arrangement.areas;
    if (e.key === 'ArrowUp' && index > 0) apply((s) => ({ ...s, arrangement: moveArea(s.arrangement, area.id, areas[index - 1]!.id) }));
    else if (e.key === 'ArrowDown' && index < count - 1) apply((s) => ({ ...s, arrangement: moveArea(s.arrangement, area.id, areas[index + 2]?.id ?? null) }));
    else return;
    e.preventDefault();
  };

  return (
    <section className={cx('area', area.collapsed && 'collapsed', editing && 'editing')} data-area-id={area.id} data-drop-section={area.id} aria-label={area.title}>
      <header className="area-head">
        {editing && (
          <button
            type="button"
            className="grip"
            aria-label={`Move area ${area.title} (drag, or the up and down arrows)`}
            title="Drag to move, or ↑ / ↓"
            onPointerDown={(e) => startDrag(e, { kind: 'area', id: area.id, label: area.title })}
            onKeyDown={onGripKey}
          >
            ⠿
          </button>
        )}
        <button type="button" className="area-toggle" aria-expanded={!area.collapsed} aria-controls={bodyId} onClick={() => toggleArea(area, editing)} aria-label={editing ? `Fold ${area.title}` : undefined}>
          <span className={cx('caret', !area.collapsed && 'open')} aria-hidden>
            {G.caret}
          </span>
          {!editing && <span className="area-title">{area.title}</span>}
        </button>
        {editing && <AreaTitle area={area} focus={focusTitle} />}
        <span className="count">{links}</span>
        {editing &&
          (confirming ? (
            <span className="area-confirm">
              <span className="small">DELETE? ITS BOOKMARKS GO BACK WHERE CHROME HAS THEM.</span>
              <button
                type="button"
                className="text-btn small-btn danger"
                autoFocus
                onClick={() => apply((s) => ({ ...s, arrangement: deleteArea(s.arrangement, area.id) }))}
              >
                DELETE
              </button>
              <button type="button" className="text-btn small-btn" onClick={() => setConfirming(false)}>
                CANCEL
              </button>
            </span>
          ) : (
            <button type="button" className="icon-btn small-icon" aria-label={`Delete area ${area.title}`} title="Delete area" onClick={() => setConfirming(true)}>
              {G.close}
            </button>
          ))}
      </header>
      <div className="area-body" id={bodyId} inert={area.collapsed}>
        <div className="area-inner">
          <SectionItems section={area.id} items={items} emptyText="EMPTY" />
        </div>
      </div>
    </section>
  );
}

/** An area's title as a text field (edit mode): saved on Enter or on leaving it; Esc puts it back. */
function AreaTitle({ area, focus }: { area: Area; focus: boolean }) {
  const [value, setValue] = useState(area.title);
  const input = useRef<HTMLInputElement>(null);
  // A new title from elsewhere (undo, revert) replaces what's in the field (the previous-props pattern).
  const [seen, setSeen] = useState(area.title);
  if (seen !== area.title) {
    setSeen(area.title);
    setValue(area.title);
  }
  useEffect(() => {
    if (focus) input.current?.select();
  }, [focus]);
  const save = () => {
    if (value.trim() && value.trim().toUpperCase() !== area.title) editStore.getState().apply((s) => ({ ...s, arrangement: renameArea(s.arrangement, area.id, value) }));
    else setValue(area.title);
  };
  return (
    <input
      ref={input}
      className="area-title-input"
      value={value}
      maxLength={40}
      aria-label={`Name of area ${area.title}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setValue(area.title);
          e.stopPropagation();
          // Let the value reset land before leaving the field.
          requestAnimationFrame(() => input.current?.blur());
        }
      }}
    />
  );
}
