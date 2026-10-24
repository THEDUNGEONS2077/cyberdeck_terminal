/**
 * src/app/modules/Modules.tsx: the modules on the dashboard: each in its
 * own framed panel where you put it, and the SETTINGS dialog.
 *
 * Layer: UI.
 *
 *   ┌ ⠿ > SEARCH ──────────────── DUCKDUCKGO  ⋯ ┐   the grip and ⋯ in edit mode
 *   │ [ search the web…                      ↵ ] │   the kind's own panel
 *   └────────────────────────────────────────────┘   a resize edge on the right
 *
 * Wide windows: each module sits at its place (app/panels.tsx), on top of
 * NAV where they overlap (added later, drawn later). Narrow windows: the
 * modules stack under NAV in its scrolling area (app/Bookmarks.tsx), and
 * places are ignored, as NAV's own is.
 *
 * Edit mode: the grip moves a module (drag, or the arrow keys), the right
 * edge resizes it, and ⋯ has SETTINGS and REMOVE. The module's own panel
 * is inert while editing (nothing opens mid-arrangement, as links don't).
 * Every change goes through editStore.apply, so UNDO and REVERT cover it.
 */
import { memo, useRef, useState, useSyncExternalStore } from 'react';

import { type ModuleInstance, removeModule } from '@/lib/modules';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { useArrangeDrag } from '../arrangeDrag';
import { cx } from '../cx';
import { Dialog } from '../Dialog';
import { useEdit, useLayout, useUi } from '../hooks';
import { MoveGrip, ResizeGrip, placeStyle } from '../panels';
import { PopupMenu } from '../PopupMenu';
import { Prompted } from '../Prompted';
import { usePresence } from '../usePresence';
import { CATALOG } from './catalog';

/** The width at and below which the dashboard stacks (app.css "Narrow windows"). */
const NARROW = '(max-width: 600px)';

/** Is the window narrow (the stacked layout)? Follows the window as it's resized. */
export function useNarrow(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(NARROW);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    () => window.matchMedia(NARROW).matches,
  );
}

/** The modules where you put them (wide windows; in narrow ones app/Bookmarks.tsx stacks them under NAV). */
export function Modules() {
  const modules = useLayout((s) => s.layout.modules);
  const narrow = useNarrow();
  if (narrow) return null;
  return (
    <>
      {modules.map((m) => (
        <ModulePanel key={m.id} module={m} stacked={false} />
      ))}
    </>
  );
}

/** The modules stacked one under another (narrow windows, under NAV). */
export function StackedModules() {
  const modules = useLayout((s) => s.layout.modules);
  const narrow = useNarrow();
  if (!narrow || !modules.length) return null;
  return (
    <div className="module-stack">
      {modules.map((m) => (
        <ModulePanel key={m.id} module={m} stacked />
      ))}
    </div>
  );
}

/** Removes module `id` (undoable), says so, and puts the keyboard on + MODULE. */
function remove(module: ModuleInstance): void {
  editStore.getState().apply((s) => ({ ...s, modules: removeModule(s.modules, module.id) }));
  uiStore.getState().announce(`REMOVED ${CATALOG[module.kind].label} · UNDO BRINGS IT BACK`);
  requestAnimationFrame(() => document.querySelector<HTMLElement>('.edit-bar [data-add-module]')?.focus());
}

/** One module: its frame (header, grips, ⋯ menu) around its kind's panel. */
const ModulePanel = memo(function ModulePanel({ module, stacked }: { module: ModuleInstance; stacked: boolean }) {
  const editing = useEdit((s) => s.editing);
  const box = useRef<HTMLElement>(null);
  const noScroll = useRef<HTMLElement>(null);
  const { start } = useArrangeDrag(noScroll);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const info = CATALOG[module.kind];
  const note = info.note(module);

  const closeMenu = () => {
    const anchor = menu;
    setMenu(null);
    if (anchor?.isConnected) anchor.focus();
  };

  return (
    <section
      ref={box}
      className={cx('module', editing && 'editing', stacked && 'stacked')}
      data-module={module.id}
      data-kind={module.kind}
      data-placed={stacked ? undefined : ''}
      style={stacked ? undefined : placeStyle(module.place)}
      aria-label={info.label}
    >
      <header className="module-head">
        {editing && !stacked && <MoveGrip id={module.id} label={`the ${info.label} module`} target={() => box.current} startDrag={start} />}
        <h2 className="module-title">
          <Prompted>{info.label}</Prompted>
        </h2>
        {note && <span className="module-note">{note}</span>}
        {editing && (
          <button type="button" className="item-menu-btn" aria-label={`${info.label} module options`} aria-haspopup="menu" onClick={(e) => setMenu(e.currentTarget)}>
            ⋯
          </button>
        )}
      </header>
      <div className="module-body" inert={editing}>
        <info.Panel module={module} />
      </div>
      {editing && !stacked && <ResizeGrip id={module.id} label={`the ${info.label} module`} target={() => box.current} startDrag={start} />}
      {menu && (
        <PopupMenu
          heading={info.label}
          label={`${info.label} module options`}
          anchor={menu}
          onClose={closeMenu}
          groups={[[{ glyph: '≡', label: 'SETTINGS…', act: () => uiStore.getState().setModuleSettings(module.id) }], [{ glyph: '✕', label: 'REMOVE', act: () => remove(module) }]]}
        />
      )}
    </section>
  );
});

/** How long the dialog takes to fade out (matches --fast in theme.css). */
const EXIT_MS = 120;

/** The SETTINGS dialog of the module whose ⋯ ▸ SETTINGS was chosen (app/App.tsx shows it). */
export function ModuleSettingsDialog() {
  const id = useUi((s) => s.moduleSettings);
  const module = useLayout((s) => s.layout.modules.find((m) => m.id === id) ?? null);
  // Kept while it fades out, so the dialog doesn't empty as it goes.
  const { shown, leaving } = usePresence(module, EXIT_MS);
  if (!shown) return null;
  const info = CATALOG[shown.kind];
  const close = () => {
    uiStore.getState().setModuleSettings(null);
    // Back to the module's ⋯ button.
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-module="${CSS.escape(shown.id)}"] .item-menu-btn`)?.focus());
  };
  return (
    <Dialog title={`${info.label} · SETTINGS`} onClose={close} leaving={leaving}>
      <div className="panel-body">
        <info.Settings module={shown} />
        <p className="small dim">CHANGES SAVE AS YOU MAKE THEM · UNDO IN THE EDIT BAR TAKES THEM BACK.</p>
      </div>
    </Dialog>
  );
}
