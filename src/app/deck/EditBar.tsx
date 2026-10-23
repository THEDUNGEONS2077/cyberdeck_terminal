/**
 * src/app/deck/EditBar.tsx: edit mode's toolbar, and the HIDDEN tray.
 *
 * Layer: UI.
 *
 * The bar says the layout is unlocked and that changes save as they're
 * made, and holds:
 *   + AREA          a new area at the end, its name ready to type
 *   CHROME ORDER    everything back where Chrome has it (asks first)
 *   RESET PANELS    NAV and the brand back to their usual places
 *   UNDO            one step back (also Ctrl+Z)
 *   REVERT          back to how it was when editing started
 * DONE (in NAV's header) locks it again.
 *
 * The HIDDEN tray lists hidden items with SHOW, and hides whatever is
 * dropped on it.
 */
import { useState } from 'react';

import { type TreeItem, addArea, chromeOrder, defaultPanels, showItem } from '@/lib/arrange';
import { hostOf } from '@/lib/bookmarks';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { useEdit, useLayout } from '../hooks';
import { newAreaId } from './ArrangeMenu';

/** The toolbar. `onNewArea` is told a new area's id (so its name field takes the cursor). */
export function EditBar({ onNewArea }: { onNewArea: (id: string) => void }) {
  const canUndo = useEdit((s) => s.undo.length > 0);
  const changed = useEdit((s) => s.start !== null);
  const panelsMoved = useLayout((s) => s.layout.panels.nav !== null || s.layout.panels.brand !== null);
  const [confirming, setConfirming] = useState(false);
  const { apply, undoLast, revert } = editStore.getState();

  if (confirming) {
    return (
      <div className="edit-bar confirm" role="group" aria-label="Reload Chrome's order">
        <span className="edit-state">RELOAD CHROME ORDER? EVERY BOOKMARK GOES BACK WHERE CHROME HAS IT AND YOUR AREAS ARE REMOVED. HIDDEN ITEMS STAY HIDDEN. UNDO CAN BRING IT BACK.</span>
        <span className="edit-actions">
          <button
            type="button"
            className="text-btn small-btn danger"
            autoFocus
            onClick={() => {
              apply((s) => ({ ...s, arrangement: chromeOrder(s.arrangement) }));
              setConfirming(false);
              uiStore.getState().announce('EVERYTHING IS BACK IN CHROME’S ORDER');
            }}
          >
            RELOAD
          </button>
          <button type="button" className="text-btn small-btn" onClick={() => setConfirming(false)}>
            CANCEL
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="edit-bar" role="toolbar" aria-label="Edit layout">
      <span className="edit-state">
        <span className="live-dot" aria-hidden /> EDIT MODE · SAVED AS YOU GO · DRAG, OR USE ⋯ · ESC LOCKS IT
      </span>
      <span className="edit-actions">
        <button
          type="button"
          className="text-btn small-btn primary"
          onClick={() => {
            const id = newAreaId();
            apply((s) => ({ ...s, arrangement: addArea(s.arrangement, id, `AREA ${s.arrangement.areas.length + 1}`) }));
            onNewArea(id);
            uiStore.getState().announce('NEW AREA: TYPE ITS NAME');
          }}
        >
          + AREA
        </button>
        <button type="button" className="text-btn small-btn" onClick={() => setConfirming(true)} title="Everything back where Chrome has it">
          CHROME ORDER
        </button>
        <button type="button" className="text-btn small-btn" disabled={!panelsMoved} onClick={() => apply((s) => ({ ...s, panels: defaultPanels() }))}>
          RESET PANELS
        </button>
        <button
          type="button"
          className="text-btn small-btn"
          disabled={!canUndo}
          onClick={() => {
            undoLast();
            uiStore.getState().announce('UNDONE');
          }}
          title="Undo (Ctrl+Z)"
        >
          UNDO
        </button>
        <button
          type="button"
          className="text-btn small-btn"
          disabled={!changed || !canUndo}
          onClick={() => {
            revert();
            uiStore.getState().announce('REVERTED TO HOW IT WAS BEFORE EDITING');
          }}
          title="Back to how it was when editing started"
        >
          REVERT
        </button>
      </span>
    </div>
  );
}

/** The HIDDEN tray (edit mode): hidden items with SHOW; drop an item here to hide it. */
export function HiddenTray({ items }: { items: readonly TreeItem[] }) {
  return (
    <section className="hidden-tray" data-drop-hidden aria-label="Hidden">
      <h3 className="section-title">
        HIDDEN <span className="section-count">· {items.length}</span>
      </h3>
      {items.length === 0 ? (
        <p className="small dim">DROP SOMETHING HERE TO HIDE IT FROM THE DASHBOARD (IT STAYS IN CHROME).</p>
      ) : (
        <ul className="hidden-list">
          {items.map((it) => (
            <li key={it.key} className="hidden-item" data-hidden-key={it.key}>
              <span className="link-title">{it.node.title.trim() || hostOf(it.node.url ?? '') || 'ITEM'}</span>
              <button
                type="button"
                className="text-btn small-btn"
                aria-label={`Show ${it.node.title.trim() || 'item'}`}
                onClick={() => {
                  editStore.getState().apply((s) => ({ ...s, arrangement: showItem(s.arrangement, it.key) }));
                  uiStore.getState().announce(`SHOWED ${it.node.title.trim().toUpperCase() || 'ITEM'} AGAIN`);
                }}
              >
                SHOW
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
