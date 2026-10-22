/**
 * src/app/Bookmarks.tsx: the bookmarks deck, NAV: your bookmarks bar as
 * you've arranged it, or the CONNECT prompt when there are no bookmarks yet.
 *
 * Layer: UI.
 *
 *   ┌ ⠿ > NAV ── [EDIT] [CHROME NEW TAB] [EDIT BOOKMARKS] ● LIVE · 41 LINKS ┐
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
 * (app/panels.tsx). Esc locks it again; Ctrl+Z undoes.
 *
 * With bridge 1.1+ (its `features`): site icons, and CHROME NEW TAB /
 * EDIT BOOKMARKS (Chrome's own pages, in a new tab). An older bridge gets
 * an UPDATE BRIDGE chip instead.
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { type ChromePage, openChromePage } from '@/bridge/client';
import { arrange } from '@/lib/arrange';
import { formatStamp } from '@/lib/backup';
import { type BookmarkNode, countLinks } from '@/lib/bookmarks';
import { editStore } from '@/store/edit';
import { uiStore } from '@/store/ui';

import { useArrangeDrag } from './arrangeDrag';
import { cx } from './cx';
import { ArrangeMenu, type MenuState } from './deck/ArrangeMenu';
import { AreaSection } from './deck/Areas';
import { type DeckApi, DeckProvider } from './deck/context';
import { EditBar, HiddenTray } from './deck/EditBar';
import { SectionItems } from './deck/Items';
import { useBookmarks, useEdit, useLayout } from './hooks';
import { CopyAddress, DownloadBridgeButton, ImportBookmarksButton } from './ImportBookmarks';
import { MoveGrip, ResizeGrip, placeStyle } from './panels';
import { Prompted } from './Prompted';
import { typing } from './useShortcuts';

/** Where the shown bar came from. */
type Source = 'live' | 'cached' | 'imported';

/** The deck's area (placed where you put it), holding the bar or the CONNECT prompt (nothing while the bridge is first asked). */
export function BookmarksDeck() {
  const status = useBookmarks((s) => s.status);
  const liveBar = useBookmarks((s) => s.bar);
  const imported = useLayout((s) => s.layout.bookmarks.imported);
  const importedAt = useLayout((s) => s.layout.bookmarks.importedAt);
  const place = useLayout((s) => s.layout.panels.nav);
  const area = useRef<HTMLDivElement>(null);

  let bar: BookmarkNode | null = null;
  let source: Source = 'live';
  if (liveBar && status !== 'absent') {
    bar = liveBar;
    source = status === 'live' ? 'live' : 'cached';
  } else if (imported) {
    bar = imported;
    source = 'imported';
  }

  return (
    <div ref={area} className="deck-area" data-placed={place ? '' : undefined} style={placeStyle(place)}>
      {bar ? <Deck bar={bar} source={source} importedAt={importedAt} area={area} /> : status === 'absent' ? <ConnectPrompt /> : null}
    </div>
  );
}

/** The bar as arranged: header, edit bar, NAV's items, your areas, the HIDDEN tray. */
function Deck({ bar, source, importedAt, area }: { bar: BookmarkNode; source: Source; importedAt: number | null; area: React.RefObject<HTMLDivElement | null> }) {
  const arrangement = useLayout((s) => s.layout.bookmarks.arrangement);
  const editing = useEdit((s) => s.editing);
  const arranged = useMemo(() => arrange(bar, arrangement), [bar, arrangement]);
  const { start, view } = useArrangeDrag(area);
  const [menu, setMenu] = useState<MenuState | null>(null);
  // A just-made area whose name field takes the cursor.
  const [newArea, setNewArea] = useState<string | null>(null);

  // Editing: Esc locks the layout again; Ctrl+Z undoes. (Not while typing, or in a menu.)
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e) || menu) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        editStore.getState().done();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
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
          {editing && <MoveGrip id="nav" label="NAV" target={() => area.current} startDrag={start} />}
          <h2 className="deck-title">
            <Prompted>NAV</Prompted>
          </h2>
          <button
            type="button"
            className={cx('text-btn small-btn', editing && 'primary')}
            aria-pressed={editing}
            onClick={() => (editing ? editStore.getState().done() : editStore.getState().begin())}
            title={editing ? 'Lock the layout (Esc)' : 'Rearrange: areas, order, hidden items, panels'}
          >
            {editing ? 'DONE' : 'EDIT'}
          </button>
          {source === 'live' && !editing && <ChromeButtons />}
          <span className="deck-source">
            {source === 'live' && (
              <>
                <span className="live-dot" aria-hidden /> LIVE
              </>
            )}
            {source === 'cached' && 'SYNCING…'}
            {source === 'imported' && (
              <>
                COPY {importedAt ? formatStamp(importedAt).slice(0, 10) : ''} ·{' '}
                <button type="button" className="link" onClick={() => uiStore.getState().setPanelOpen(true)}>
                  GO LIVE
                </button>
              </>
            )}
            <span className="dim"> · {countLinks(bar)} LINKS</span>
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
      {view && (
        <>
          {view.line && <div className="drop-line" style={{ left: view.line.left, top: view.line.top, width: view.line.width, height: view.line.height }} aria-hidden />}
          <div className="drag-label" style={{ left: view.x + 14, top: view.y + 10 }} aria-hidden>
            {view.label}
          </div>
        </>
      )}
    </DeckProvider>
  );
}

/**
 * The header's buttons into Chrome itself (bridge 1.1+). A webpage can't open
 * chrome:// pages, so the bridge opens them, in a new tab next to this one.
 * With an older bridge: a chip that opens SYSTEM, where the update is offered.
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
    <span className="deck-actions">
      <button type="button" className="text-btn small-btn" onClick={() => void open('ntp')} title="Chrome’s own New Tab page, with your bookmarks bar">
        CHROME NEW TAB
      </button>
      <button type="button" className="text-btn small-btn" onClick={() => void open('bookmarks')} title="Chrome’s Bookmark manager">
        EDIT BOOKMARKS
      </button>
    </span>
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
