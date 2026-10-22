/**
 * src/app/Bookmarks.tsx: the bookmarks deck: a live mirror of the
 * bookmarks bar, or the CONNECT prompt when there are no bookmarks yet.
 *
 * Layer: UI.
 *
 *   ┌ > BOOKMARKS BAR ─────────────── ● LIVE · 41 LINKS ┐
 *   [› GitHub    ] [› Mail      ] [› Docs      ] …        the bar's own links, as tiles
 *   ┌ ▸ ▤ DEV  12 ┐ ┌ ▾ ▤ NEWS  5 ┐ ┌ ▸ ▤ TOOLS  9 ┐       its folders, as cards that
 *                   │ › Hacker News│                       fold open (nested folders
 *                   │ ▸ ▤ Blogs  3 │                       fold inside them)
 *
 * Which bar is shown: the bridge's live one; while the bridge is being
 * asked, the one cached from last time; with no bridge, the imported copy
 * (layout.bookmarks.imported); with neither, the CONNECT prompt.
 *
 * Links open in this tab (a start page), as plain links, so Ctrl+click and
 * middle-click open new tabs as usual. Links a webpage can't open
 * (chrome://, javascript: bookmarklets) are shown, dimmed, but inert.
 * Which folders are open is part of the layout (saved, backed up).
 */
import { memo, useId, useState } from 'react';

import { formatStamp } from '@/lib/backup';
import { type BookmarkNode, countLinks, folderKey, hostOf, isOpenable } from '@/lib/bookmarks';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

import { cx } from './cx';
import { G } from './glyphs';
import { useBookmarks, useLayout } from './hooks';
import { CopyAddress, DownloadBridgeButton, ImportBookmarksButton } from './ImportBookmarks';
import { Prompted } from './Prompted';

/** Where the shown bar came from. */
type Source = 'live' | 'cached' | 'imported';

/** The deck: the bar, or the CONNECT prompt (nothing while the bridge is first asked). */
export function BookmarksDeck() {
  const status = useBookmarks((s) => s.status);
  const liveBar = useBookmarks((s) => s.bar);
  const imported = useLayout((s) => s.layout.bookmarks.imported);
  const importedAt = useLayout((s) => s.layout.bookmarks.importedAt);

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
    <div className="deck-area">
      {bar ? <Deck bar={bar} source={source} importedAt={importedAt} /> : status === 'absent' ? <ConnectPrompt /> : null}
    </div>
  );
}

/** The bar: its header, its links as tiles, its folders as cards. */
function Deck({ bar, source, importedAt }: { bar: BookmarkNode; source: Source; importedAt: number | null }) {
  const items = bar.children ?? [];
  const links = items.filter((n) => n.url !== undefined);
  const folders = items.filter((n) => n.children);
  return (
    <section className="deck" aria-label="Bookmarks bar">
      <header className="deck-head">
        <h2 className="deck-title">
          <Prompted>BOOKMARKS BAR</Prompted>
        </h2>
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
      {items.length === 0 && (
        <p className="deck-empty dim">
          <Prompted>YOUR BOOKMARKS BAR IS EMPTY.</Prompted>
        </p>
      )}
      {links.length > 0 && (
        <ul className="tiles">
          {links.map((n) => (
            <li key={n.id}>
              <Link node={n} className="tile" />
            </li>
          ))}
        </ul>
      )}
      {folders.length > 0 && (
        <div className="folders">
          {folders.map((f) => (
            <Folder key={f.id} node={f} path={[f.title]} card />
          ))}
        </div>
      )}
    </section>
  );
}

/** One link: a plain link when a webpage can open it, otherwise a dimmed label saying why not. */
const Link = memo(function Link({ node, className }: { node: BookmarkNode; className: string }) {
  const url = node.url ?? '';
  const host = hostOf(url);
  const title = node.title.trim() || host || url;
  if (!isOpenable(url)) {
    return (
      <span className={cx(className, 'off')} title="Chrome doesn’t let a webpage open this kind of link: use your bookmarks bar for it.">
        <span className="link-glyph" aria-hidden>
          {G.blocked}
        </span>
        <span className="link-title">{title}</span>
        <span className="link-host">{url.split(':')[0]}</span>
      </span>
    );
  }
  return (
    <a className={className} href={url} title={url}>
      <span className="link-glyph" aria-hidden>
        {G.link}
      </span>
      <span className="link-title">{title}</span>
      {host && <span className="link-host">{host}</span>}
    </a>
  );
});

/**
 * A folder: a heading that opens and collapses it, and its contents in a
 * fold (the quest_log_desktop sidebar's: the body's grid row grows from
 * nothing). Contents are first drawn when the folder first opens, so a
 * big, collapsed bookmarks tree costs nothing.
 */
const Folder = memo(function Folder({ node, path, card = false }: { node: BookmarkNode; path: string[]; card?: boolean }) {
  const key = folderKey(path);
  const open = useLayout((s) => s.layout.bookmarks.open.includes(key));
  const bodyId = useId();
  // Drawn once opened, and kept while it folds shut (the previous-props pattern).
  const [drawn, setDrawn] = useState(open);
  if (open && !drawn) setDrawn(true);
  const children = node.children ?? [];
  return (
    <section className={cx('folder', card && 'card', !open && 'collapsed')}>
      <button type="button" className="folder-head" aria-expanded={open} aria-controls={bodyId} onClick={() => layoutStore().getState().setFolderOpen(key, !open)}>
        <span className={cx('caret', open && 'open')} aria-hidden>
          {G.caret}
        </span>
        <span className="folder-glyph" aria-hidden>
          {G.folder}
        </span>
        <span className="folder-title">{node.title.trim() || 'UNTITLED'}</span>
        <span className="count">{countLinks(node)}</span>
      </button>
      <div className="folder-body" id={bodyId} inert={!open}>
        <div className="folder-inner">
          {drawn &&
            (children.length ? (
              <ul className="rows">
                {children.map((c) => (
                  <li key={c.id}>{c.url !== undefined ? <Link node={c} className="row-link" /> : <Folder node={c} path={[...path, c.title]} />}</li>
                ))}
              </ul>
            ) : (
              <p className="row-empty dim small">EMPTY</p>
            ))}
        </div>
      </div>
    </section>
  );
});

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
