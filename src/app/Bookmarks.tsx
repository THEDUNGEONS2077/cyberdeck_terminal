/**
 * src/app/Bookmarks.tsx: the bookmarks deck, NAV: your bookmarks bar as
 * you've arranged it, or the CONNECT prompt when there are no bookmarks yet.
 *
 * Layer: UI.
 *
 *   ┌ ⠿ > NAV ──────────────── [CHROME NEW TAB ↗] [BOOKMARK MANAGER ↗] [EDIT] ┐
 *   [› GitHub ] [› Mail ] [› Docs ] …        NAV's links, as tiles
 *   ┌ ▸ ▤ DEV 12 ┐ ┌ ▸ ▤ NEWS 5 ┐          NAV's folders, as cards that fold open
 *   ▾ WORK ─────────────────────── 9        your areas, each with its own
 *   [› Jira ] [› Mail ]                      tiles and folder cards
 *
 * Which bar is shown: the bridge's live one; while the bridge is being
 * asked, the one cached from last time; with no bridge, the imported copy
 * (layout.bookmarks.imported); with neither, the CONNECT prompt. What goes
 * where comes from your arrangement (lib/arrange.ts): NAV, your areas,
 * hidden items; anything you haven't placed sits where Chrome has it.
 *
 * EDIT (in the header; DONE to lock again) unlocks the layout
 * (store/edit.ts): the edit bar, dragging (app/arrangeDrag.ts), the ⋯
 * menus (deck/ArrangeMenu.tsx), area names and grips (deck/Areas.tsx), the
 * HIDDEN tray, and grips to move NAV and the brand panel and resize NAV
 * (app/panels.tsx); the modules get theirs too (app/modules/Modules.tsx).
 * Esc locks it again; Ctrl+Z undoes.
 *
 * With bridge 1.1+ (its `features`): site icons, and CHROME NEW TAB /
 * BOOKMARK MANAGER (Chrome's own pages, in a new tab: hence ↗). An older
 * bridge gets an UPDATE BRIDGE chip instead.
 *
 * The header follows the usual pattern: what this is and its state on the
 * left (title, LIVE, link count), what you can do on the right, EDIT last
 * (UX pass, 2026-10-22: EDIT beside EDIT BOOKMARKS read as one control).
 * Rearrangements glide (deck/useFlip.ts).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type ChromePage, openChromePage } from '@/bridge/client';
import { arrange } from '@/lib/arrange';
import { formatStamp } from '@/lib/backup';
import type { BookmarkNode } from '@/lib/bookmarks';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { useStore } from 'zustand';

import { dragViewStore, useArrangeDrag } from './arrangeDrag';
import { cx } from './cx';
import { ArrangeMenu, type MenuState } from './deck/ArrangeMenu';
import { AreaSection } from './deck/Areas';
import { type DeckApi, DeckProvider } from './deck/context';
import { EditBar, HiddenTray } from './deck/EditBar';
import { SectionItems } from './deck/Items';
import { useArrowNav } from './deck/useArrowNav';
import { useFlip } from './deck/useFlip';
import { type BarSource, useShownBar } from './useShownBar';
import { G } from './glyphs';
import { useBookmarks, useEdit, useLayout } from './hooks';
import { CopyAddress, DownloadBridgeButton, ImportBookmarksButton } from './ImportBookmarks';
import { StackedModules } from './modules/Modules';
import { MoveGrip, ResizeGrip, placeStyle } from './panels';
import { Prompted } from './Prompted';
import { typing } from './useShortcuts';

/** Where the shown bar came from. */
type Source = BarSource;

/** The deck's area (placed where you put it), holding the bar or the CONNECT prompt (nothing while the bridge is first asked). */
export function BookmarksDeck() {
  const { bar, source, status } = useShownBar();
  const importedAt = useLayout((s) => s.layout.bookmarks.importedAt);
  const place = useLayout((s) => s.layout.panels.nav);
  const area = useRef<HTMLDivElement>(null);

  return (
    <div ref={area} className="deck-area" data-placed={place ? '' : undefined} style={placeStyle(place)}>
      {bar ? <Deck bar={bar} source={source} importedAt={importedAt} area={area} /> : status === 'absent' ? <ConnectPrompt /> : null}
      {/* Narrow windows: the modules stack under NAV, in its scrolling area. */}
      <StackedModules />
    </div>
  );
}

/** The bar as arranged: header, edit bar, NAV's items, your areas, the HIDDEN tray. */
function Deck({ bar, source, importedAt, area }: { bar: BookmarkNode; source: Source; importedAt: number | null; area: React.RefObject<HTMLDivElement | null> }) {
  const arrangement = useLayout((s) => s.layout.bookmarks.arrangement);
  const editing = useEdit((s) => s.editing);
  const arranged = useMemo(() => arrange(bar, arrangement), [bar, arrangement]);
  const { start } = useArrangeDrag(area);
  useFlip(area);
  useArrowNav(area);
  const [menu, setMenu] = useState<MenuState | null>(null);
  // A just-made area whose name field takes the cursor.
  const [newArea, setNewArea] = useState<string | null>(null);

  // Editing: Esc locks the layout again; Ctrl+Z undoes. (Not while typing, or in a menu.)
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      // Not while a module's SETTINGS is open either: its Esc closes it, not edit mode.
      if (typing(e) || menu || uiStore.getState().moduleSettings) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        toggleEdit();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (editStore.getState().undo.length) uiStore.getState().announce('UNDONE');
        editStore.getState().undoLast();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing, menu]);

  // Locking again closes any open menu (the previous-props pattern).
  const [wasEditing, setWasEditing] = useState(editing);
  if (wasEditing !== editing) {
    setWasEditing(editing);
    if (!editing) setMenu(null);
  }

  const api: DeckApi = useMemo(
    () => ({
      editing,
      all: arranged.all,
      children: arranged.children,
      excluded: arranged.excluded,
      mainKeys: arranged.mainKeys,
      startDrag: start,
      openMenu: (key, section, anchor) => setMenu({ key, section, anchor }),
    }),
    [editing, arranged, start],
  );

  const closeMenu = () => {
    const anchor = menu?.anchor;
    setMenu(null);
    // Back to the ⋯ button, if it's still there.
    if (anchor?.isConnected) anchor.focus();
  };

  return (
    <DeckProvider value={api}>
      <section className={cx('deck', editing && 'editing')} aria-label="Nav">
        <header className="deck-head">
          {/* A slow light sweeping across the header, like the brand panel's refresh band. */}
          <span className="deck-scan" aria-hidden>
            <span />
          </span>
          {editing && <MoveGrip id="nav" label="NAV" target={() => area.current} startDrag={start} />}
          <h2 className="deck-title">
            <Prompted>NAV</Prompted>
          </h2>
          {/* Only when it isn't simply live (user request, 2026-10-23: no LIVE, no link count). */}
          <span className="deck-source" data-source={source}>
            {source === 'cached' && 'SYNCING…'}
            {source === 'imported' && (
              <>
                COPY {importedAt ? formatStamp(importedAt).slice(0, 10) : ''} ·{' '}
                <button type="button" className="link" onClick={() => uiStore.getState().setPanelOpen(true)}>
                  GO LIVE
                </button>
              </>
            )}
          </span>
          <span className="deck-actions">
            {source === 'live' && !editing && <ChromeButtons />}
            <button
              type="button"
              className={cx('text-btn small-btn edit-toggle', editing && 'primary')}
              aria-pressed={editing}
              onClick={toggleEdit}
              title={editing ? 'Lock the layout (Esc)' : 'Rearrange: areas, order, hidden items, panels'}
            >
              {editing ? 'DONE' : 'EDIT'}
            </button>
          </span>
        </header>
        {editing && <EditBar onNewArea={setNewArea} />}
        {(bar.children ?? []).length === 0 && (
          <p className="deck-empty dim">
            <Prompted>YOUR BOOKMARKS BAR IS EMPTY.</Prompted>
          </p>
        )}
        <SectionItems section="main" items={arranged.main} />
        {arranged.areas.map(({ area: a, items }, i) => (
          <AreaSection key={a.id} area={a} items={items} index={i} count={arranged.areas.length} focusTitle={editing && newArea === a.id} />
        ))}
        {editing && <HiddenTray items={arranged.hidden} />}
      </section>
      {editing && <ResizeGrip target={() => area.current} startDrag={start} />}
      {menu && <ArrangeMenu menu={menu} arranged={arranged} onClose={closeMenu} onNewArea={setNewArea} />}
      <DragOverlay />
    </DeckProvider>
  );
}

/**
 * While dragging: the label at the pointer and the line where the drop
 * lands (the only things redrawn as the pointer moves). Drawn straight into
 * <body>, outside NAV's scrolling box, and moved with transforms on their
 * own layers: following the pointer repaints nothing else (optimization
 * pass, 2026-10-22). Whole pixels, so the label's text stays crisp.
 */
function DragOverlay() {
  const view = useStore(dragViewStore, (s) => s.view);
  if (!view) return null;
  const at = (x: number, y: number) => `translate3d(${Math.round(x)}px, ${Math.round(y)}px, 0)`;
  return createPortal(
    <>
      {view.line && (
        <div className={view.line.zone ? 'drop-zone' : 'drop-line'} style={{ transform: at(view.line.left, view.line.top), width: view.line.width, height: view.line.height }} aria-hidden />
      )}
      <div className="drag-label" style={{ transform: at(view.x + 14, view.y + 10) }} aria-hidden>
        {view.label}
      </div>
    </>,
    document.body,
  );
}

/** EDIT / DONE: unlocks or locks the layout, and says so to screen readers. */
export function toggleEdit(): void {
  const edit = editStore.getState();
  if (edit.editing) {
    edit.done();
    uiStore.getState().announce('LAYOUT LOCKED');
  } else {
    edit.begin();
    uiStore.getState().announce('EDITING THE LAYOUT: DRAG ITEMS, OR USE THEIR ⋯ MENUS. ESC LOCKS IT.');
  }
}

/**
 * The header's buttons into Chrome itself (bridge 1.1+). A webpage can't open
 * chrome:// pages, so the bridge opens them, in a new tab next to this one
 * (↗ says so). With an older bridge: a chip that opens SYSTEM, where the
 * update is offered.
 */
function ChromeButtons() {
  const canOpen = useBookmarks((s) => s.features.includes('open'));
  const open = async (target: ChromePage) => {
    if (!(await openChromePage(target))) uiStore.getState().showToast('THE BRIDGE COULDN’T OPEN THAT · UPDATE IT IN SYSTEM [S]');
  };
  if (!canOpen) {
    return (
      <button type="button" className="text-btn small-btn primary deck-update" onClick={() => uiStore.getState().setPanelOpen(true)}>
        UPDATE BRIDGE: ICONS + CHROME NEW TAB
      </button>
    );
  }
  return (
    <>
      <button type="button" className="text-btn small-btn" onClick={() => void open('ntp')} title="Chrome’s own New Tab page, with your bookmarks bar (opens in a new tab)">
        CHROME NEW TAB <span aria-hidden>{G.external}</span>
      </button>
      <button type="button" className="text-btn small-btn" onClick={() => void open('bookmarks')} title="Chrome’s Bookmark manager, to add, rename and sort bookmarks (opens in a new tab)">
        BOOKMARK MANAGER <span aria-hidden>{G.external}</span>
      </button>
    </>
  );
}

/** No bridge and no imported copy: the two ways to bring the bookmarks bar in. */
function ConnectPrompt() {
  return (
    <section className="deck connect" aria-label="Connect your bookmarks">
      <header className="deck-head">
        <h2 className="deck-title">
          <Prompted>LINK YOUR BOOKMARKS BAR</Prompted>
        </h2>
        <span className="deck-source dim">NO SOURCE</span>
      </header>
      <div className="connect-options">
        <div className="connect-option">
          <h3 className="section-title">BRIDGE · LIVE, AND OPENS ON NEW TABS</h3>
          <ol className="steps">
            <li>
              <DownloadBridgeButton primary />
              <span>UNZIP IT TO A FOLDER YOU’LL KEEP (E.G. DOCUMENTS\CYBERDECK-BRIDGE).</span>
            </li>
            <li>
              <span>OPEN</span> <CopyAddress text="chrome://extensions" /> <span>AND TURN ON DEVELOPER MODE.</span>
            </li>
            <li>
              <span>LOAD UNPACKED ▸ CHOOSE THE FOLDER WITH MANIFEST.JSON IN IT.</span>
            </li>
            <li>
              <button type="button" className="text-btn" onClick={() => location.reload()}>
                RELOAD THIS PAGE
              </button>
              <span>IT CONNECTS BY ITSELF.</span>
            </li>
          </ol>
          <p className="small dim">READ-ONLY: THE BRIDGE SHARES YOUR BOOKMARKS BAR WITH THIS PAGE ONLY. CHROME MAY ASK ONCE WHETHER TO KEEP ITS NEW TAB PAGE: KEEP IT.</p>
        </div>
        <div className="connect-option">
          <h3 className="section-title">IMPORT · A COPY</h3>
          <p>
            IN CHROME: BOOKMARK MANAGER (<kbd>CTRL</kbd>+<kbd>SHIFT</kbd>+<kbd>O</kbd>) ▸ ⋮ ▸ EXPORT BOOKMARKS. THEN:
          </p>
          <div className="button-row">
            <ImportBookmarksButton primary />
          </div>
          <p className="small dim">A SNAPSHOT: IMPORT AGAIN AFTER CHANGING YOUR BOOKMARKS. IT’S KEPT IN YOUR LAYOUT AND ITS BACKUPS.</p>
        </div>
      </div>
    </section>
  );
}
