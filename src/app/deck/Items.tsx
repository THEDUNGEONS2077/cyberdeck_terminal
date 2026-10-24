/**
 * src/app/deck/Items.tsx: a section's items (link tiles and folder cards),
 * a link, a folder, and a site icon.
 *
 * Layer: UI.
 *
 * Every item shows its name only, never its address (user request,
 * 2026-10-24; the address is in its tooltip).
 *
 * Locked (the usual state): links open in a new tab (`noopener
 * noreferrer`, so sites aren't told where you came from), or switch to
 * their open tab where you've turned that on (app/switchTab.ts); folders
 * fold open and shut. Links a webpage can't open (chrome://, bookmarklets) are
 * listed, dimmed, inert. An item that has just arrived from Chrome is lit
 * for a moment (`fresh`, store/bookmarks.ts).
 *
 * Editing (app/store/edit.ts): links don't open. Every tile, folder card
 * and folder row can be dragged (a press that moves; a plain click on a
 * folder head still opens it), and has a ⋯ menu that does the same things
 * from the keyboard (deck/ArrangeMenu.tsx). The wrappers carry
 * `data-item-key`, `data-kind` and `data-section` so a drag can work out
 * where it lands (app/arrangeDrag.ts).
 */
import { memo, type PointerEvent, useId, useState } from 'react';

import { faviconSrcSet } from '@/bridge/client';
import { folderContents, type TreeItem } from '@/lib/arrange';
import { countLinks, folderKey, hostOf, isOpenable } from '@/lib/bookmarks';
import { layoutStore } from '@/store/instance';

import { cx } from '../cx';
import { followLink } from '../switchTab';
import { G } from '../glyphs';
import { useBookmarks, useLayout } from '../hooks';
import { type SectionId, useDeck } from './context';

/** A section's items: its links as a grid of tiles, then its folders as a grid of cards. */
export function SectionItems({ section, items, emptyText }: { section: SectionId; items: readonly TreeItem[]; emptyText?: string }) {
  const { editing } = useDeck();
  const links = items.filter((it) => it.node.url !== undefined);
  const folders = items.filter((it) => it.node.children);
  return (
    <div className="section-items" data-drop-section={section}>
      {links.length > 0 && (
        <ul className="tiles">
          {links.map((it) => (
            <li key={it.key} data-item-key={it.key} data-kind="link" data-section={section}>
              <LinkItem item={it} section={section} className="tile" />
            </li>
          ))}
        </ul>
      )}
      {folders.length > 0 && (
        <div className="folders">
          {folders.map((it) => (
            <div key={it.key} data-item-key={it.key} data-kind="folder" data-section={section}>
              <FolderItem item={it} section={section} card />
            </div>
          ))}
        </div>
      )}
      {items.length === 0 && (editing || emptyText) && <p className="section-empty dim small">{editing ? 'DRAG BOOKMARKS OR FOLDERS HERE' : emptyText}</p>}
    </div>
  );
}

/** Starts a drag of `item` from a press on it (edit mode only). */
function useItemDrag(item: TreeItem) {
  const { editing, mainKeys, startDrag } = useDeck();
  return (e: PointerEvent) => {
    if (!editing) return;
    startDrag(e, { kind: 'item', key: item.key, label: item.node.title.trim() || hostOf(item.node.url ?? '') || 'ITEM', mainKeys });
  };
}

/** The ⋯ button that opens an item's arrange menu (edit mode). */
function MenuButton({ item, section }: { item: TreeItem; section: SectionId }) {
  const { openMenu } = useDeck();
  const title = item.node.title.trim() || hostOf(item.node.url ?? '') || 'item';
  return (
    <button
      type="button"
      className="item-menu-btn"
      aria-label={`Arrange ${title}`}
      aria-haspopup="menu"
      // Pressing the button mustn't start a drag of the item under it.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenu(item.key, section, e.currentTarget);
      }}
    >
      ⋯
    </button>
  );
}

/**
 * A bookmark's site icon from Chrome's icon cache (via the bridge), or the
 * accent `›` when there's no bridge with icons, or the icon can't load.
 */
export function SiteIcon({ url }: { url: string }) {
  const icons = useBookmarks((s) => s.status === 'live' && s.features.includes('favicons'));
  const [failed, setFailed] = useState(false);
  if (!icons || failed) {
    return (
      <span className="link-glyph" aria-hidden>
        {G.link}
      </span>
    );
  }
  const srcSet = faviconSrcSet(url);
  return <img className="favicon" src={srcSet.split(' ')[0]} srcSet={srcSet} width={16} height={16} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setFailed(true)} />;
}

/** One link: a plain link when a webpage can open it, otherwise a dimmed label saying why not. */
export const LinkItem = memo(function LinkItem({ item, section, className }: { item: TreeItem; section: SectionId; className: string }) {
  const { editing } = useDeck();
  const fresh = useBookmarks((s) => s.fresh.has(item.key));
  const onDrag = useItemDrag(item);
  const url = item.node.url ?? '';
  const host = hostOf(url);
  const title = item.node.title.trim() || host || url;
  if (!isOpenable(url)) {
    return (
      <span className={cx(className, 'off', editing && 'editable', fresh && 'fresh')} title="Chrome doesn’t let a webpage open this kind of link: use your bookmarks bar for it." onPointerDown={onDrag}>
        <span className="link-glyph" aria-hidden>
          {G.blocked}
        </span>
        <span className="link-title">{title}</span>
        {editing && <MenuButton item={item} section={section} />}
      </span>
    );
  }
  return (
    <a
      className={cx(className, editing && 'editable', fresh && 'fresh')}
      href={url}
      title={editing ? `${title}: drag to move, or ⋯` : url}
      target="_blank"
      rel="noopener noreferrer"
      draggable={false}
      onPointerDown={onDrag}
      // Editing: a link doesn't open (it's being arranged). Otherwise it may switch to its open tab (app/switchTab.ts).
      onClick={(e) => (editing ? e.preventDefault() : followLink(e, url))}
    >
      <SiteIcon url={url} />
      <span className="link-title">{title}</span>
      {editing && <MenuButton item={item} section={section} />}
    </a>
  );
});

/**
 * A folder: a heading that opens and collapses it, and its contents in a
 * fold (the quest_log_desktop sidebar's: the body's grid row grows from
 * nothing). Contents are first drawn when the folder first opens, so a
 * big, collapsed bookmarks tree costs nothing. What it shows: its
 * contents in Chrome's order, minus anything placed elsewhere or hidden.
 */
export const FolderItem = memo(function FolderItem({ item, section, card = false }: { item: TreeItem; section: SectionId; card?: boolean }) {
  const deck = useDeck();
  const { editing } = deck;
  const fresh = useBookmarks((s) => s.fresh.has(item.key));
  const onDrag = useItemDrag(item);
  const key = folderKey(item.path);
  const open = useLayout((s) => s.layout.bookmarks.open.includes(key));
  const bodyId = useId();
  // Drawn once opened, and kept while it folds shut (the previous-props pattern).
  const [drawn, setDrawn] = useState(open);
  if (open && !drawn) setDrawn(true);
  const children = drawn ? folderContents(item, deck) : [];
  return (
    <section className={cx('folder', card && 'card', !open && 'collapsed', fresh && 'fresh')}>
      <div className={cx('folder-head-row', editing && 'editable')} onPointerDown={onDrag}>
        <button type="button" className="folder-head" aria-expanded={open} aria-controls={bodyId} onClick={() => layoutStore().getState().setFolderOpen(key, !open)}>
          <span className={cx('caret', open && 'open')} aria-hidden>
            {G.caret}
          </span>
          <span className="folder-glyph" aria-hidden>
            {G.folder}
          </span>
          <span className="folder-title">{item.node.title.trim() || 'UNTITLED'}</span>
          <span className="count">{countLinks(item.node)}</span>
        </button>
        {editing && <MenuButton item={item} section={section} />}
      </div>
      <div className="folder-body" id={bodyId} inert={!open}>
        <div className="folder-inner">
          {drawn &&
            (children.length ? (
              <ul className="rows">
                {children.map((c) => (
                  <li key={c.key}>{c.node.url !== undefined ? <LinkItem item={c} section="folder" className="row-link" /> : <FolderItem item={c} section="folder" />}</li>
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
