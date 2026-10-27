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
 * SEARCH and QUICK LAUNCH are bare (catalog.ts `bare`): no header outside
 * edit mode, the frame only a thin scanlined ring round the field or the
 * tiles. Every module is drawn at 70% of its own sizes (MODULE_SCALE; the
 * brand panel keeps its size).
 *
 * Wide windows: each module sits at its place (app/panels.tsx), on top of
 * NAV where they overlap (added later, drawn later). Narrow windows: the
 * modules stack under NAV in its scrolling area (app/Bookmarks.tsx), and
 * places are ignored, as NAV's own is.
 *
 * Its own sizes (0.18.0): SETTINGS has UI SCALE, TEXT SIZE and MODULE SIZE
 * for this module alone. Each one chosen replaces the dashboard's (SYSTEM ▸
 * APPEARANCE) for it; RESET goes back to following the dashboard. They're
 * applied as CSS variables on the module's frame (--m, --text-scale), as the
 * dashboard's are, so text stays crisp.
 *
 * Edit mode: the grip moves a module (drag, or the arrow keys), the right
 * edge resizes it, and ⋯ has SETTINGS and REMOVE. The module's own panel
 * is inert while editing (nothing opens mid-arrangement, as links don't).
 * Every change goes through editStore.apply, so UNDO and REVERT cover it.
 */
import { type CSSProperties, memo, useId, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import { type DashboardSizes, type ModuleInstance, type ModuleSizes, moduleScaleOf, moduleTextOf, removeModule, setSizes } from '@/lib/modules';
import { MODULE_SCALE_STEPS, TEXT_SCALE_STEPS, UI_SCALE_STEPS, percentLabel } from '@/lib/scale';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { useArrangeDrag } from '../arrangeDrag';
import { cx } from '../cx';
import { Dialog } from '../Dialog';
import { useEdit, useLayout, useUi } from '../hooks';
import { MoveGrip, ResizeGrip, placeStyle } from '../panels';
import { PopupMenu } from '../PopupMenu';
import { Prompted } from '../Prompted';
import { Stepper } from '../Stepper';
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
  // In screen order (top to bottom, then left to right), so Tab goes through them as they're seen (0.14.0).
  const shown = useMemo(() => [...modules].sort((a, b) => a.place.y - b.place.y || a.place.x - b.place.x), [modules]);
  if (narrow) return null;
  return (
    <>
      {shown.map((m) => (
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

/** The dashboard's sizes (SYSTEM ▸ APPEARANCE), which a module follows unless it has its own. */
function useDashboardSizes(): DashboardSizes {
  const uiScale = useLayout((s) => s.layout.prefs.uiScale);
  const textScale = useLayout((s) => s.layout.prefs.textScale);
  const moduleScale = useLayout((s) => s.layout.prefs.moduleScale);
  return useMemo(() => ({ uiScale, textScale, moduleScale }), [uiScale, textScale, moduleScale]);
}

/**
 * A module's own sizes as CSS variables on its frame (none when it follows
 * the dashboard: app.css's .module then reads the dashboard's).
 */
function sizeStyle(sizes: ModuleSizes | undefined, dashboard: DashboardSizes): CSSProperties {
  if (!sizes) return {};
  return { '--m': moduleScaleOf(sizes, dashboard), '--text-scale': moduleTextOf(sizes, dashboard) } as CSSProperties;
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
  const dashboard = useDashboardSizes();
  const box = useRef<HTMLElement>(null);
  const noScroll = useRef<HTMLElement>(null);
  const { start } = useArrangeDrag(noScroll);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const info = CATALOG[module.kind];
  const note = info.note(module);
  // A bare module shows its header only while it's being arranged (its grip and ⋯ live there).
  const head = !info.bare || editing;

  const closeMenu = () => {
    const anchor = menu;
    setMenu(null);
    if (anchor?.isConnected) anchor.focus();
  };

  return (
    <section
      ref={box}
      className={cx('module', editing && 'editing', stacked && 'stacked', info.bare && 'bare')}
      data-module={module.id}
      data-kind={module.kind}
      data-placed={stacked ? undefined : ''}
      style={{ ...(stacked ? {} : placeStyle(module.place)), ...sizeStyle(module.sizes, dashboard) }}
      aria-label={info.label}
    >
      {head && (
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
      )}
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
        <ModuleSizeSettings module={shown} />
        <info.Settings module={shown} />
        <p className="small dim">CHANGES SAVE AS YOU MAKE THEM · UNDO IN THE EDIT BAR TAKES THEM BACK.</p>
      </div>
    </Dialog>
  );
}

/** One of a module's own sizes: its value, or the dashboard's (marked so) while it follows it. */
function OwnSize(props: { label: string; own: number | undefined; dashboard: number; steps: readonly number[]; set: (value: number | undefined) => void }) {
  const id = useId();
  const value = props.own ?? props.dashboard;
  const name = props.label.toLowerCase();
  return (
    <div className="setting">
      <span id={id}>{props.label}</span>
      <Stepper
        labelledBy={id}
        value={value}
        steps={props.steps}
        fallback={props.dashboard}
        less={`Make this module's ${name} smaller`}
        more={`Make this module's ${name} bigger`}
        reset={`Follow the dashboard's ${name}`}
        resetText="DASHBOARD"
        label={(v) => (props.own === undefined ? `${percentLabel(v)} · DASHBOARD` : percentLabel(v))}
        // Back at the dashboard's value (RESET, or stepped onto it) means following it again.
        onChange={(v) => props.set(v === props.dashboard ? undefined : v)}
      />
    </div>
  );
}

/** SIZE: this module's own UI SCALE, TEXT SIZE and MODULE SIZE (0.18.0). Each change is one undoable step. */
function ModuleSizeSettings({ module }: { module: ModuleInstance }) {
  const dashboard = useDashboardSizes();
  const own = module.sizes ?? {};
  const save = (next: ModuleSizes) => editStore.getState().apply((s) => ({ ...s, modules: setSizes(s.modules, module.id, next) }));
  const set = (key: keyof ModuleSizes) => (value: number | undefined) => save({ ...own, [key]: value });
  return (
    <div className="settings-group">
      <span className="setting-label">THIS MODULE'S SIZE · DASHBOARD = SYSTEM ▸ APPEARANCE</span>
      <OwnSize label="UI SCALE" own={own.uiScale} dashboard={dashboard.uiScale} steps={UI_SCALE_STEPS} set={set('uiScale')} />
      <OwnSize label="TEXT SIZE" own={own.textScale} dashboard={dashboard.textScale} steps={TEXT_SCALE_STEPS} set={set('textScale')} />
      <OwnSize label="MODULE SIZE" own={own.moduleScale} dashboard={dashboard.moduleScale} steps={MODULE_SCALE_STEPS} set={set('moduleScale')} />
    </div>
  );
}
