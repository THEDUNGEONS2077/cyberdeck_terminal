/**
 * src/app/ImportBookmarks.tsx: the controls shared by the CONNECT prompt
 * and SYSTEM ▸ BOOKMARKS: importing bookmarks.html, downloading the
 * bridge, and copying an address the page can't link to.
 *
 * Layer: UI. Importing keeps the file's bookmarks bar in the layout
 * (store/layout.ts importBookmarks), so it's saved, snapshotted and backed
 * up like the rest of the layout. A file that isn't a bookmarks export is
 * refused with a message saying how to get one.
 */
import { type ChangeEvent, useRef, useState } from 'react';

import { BRIDGE_ZIP } from '@/bridge/client';
import { BookmarksFileError, countLinks, parseBookmarksHtml } from '@/lib/bookmarks';
import { layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';

import { cx } from './cx';
import { Prompted } from './Prompted';

/** Largest bookmarks.html read (exports carry every icon, so they can be big). */
const MAX_FILE_BYTES = 20 * 1024 * 1024;

/** IMPORT BOOKMARKS.HTML…: a button, its hidden file picker, and any error under it. */
export function ImportBookmarksButton({ primary = false }: { primary?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  /** A file was chosen: read its bookmarks bar and keep it. */
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // the same file can be chosen again
    if (!file) return;
    setError(null);
    try {
      if (file.size > MAX_FILE_BYTES) throw new BookmarksFileError('That file is too big to be a bookmarks export.');
      const bar = parseBookmarksHtml(await file.text());
      layoutStore().getState().importBookmarks(bar);
      uiStore.getState().showToast(`IMPORTED ${countLinks(bar)} LINKS FROM YOUR BOOKMARKS BAR`);
    } catch (err) {
      setError(err instanceof BookmarksFileError ? err.message : 'That file couldn’t be read.');
    }
  };

  return (
    <>
      <button type="button" className={cx('text-btn', primary && 'primary')} onClick={() => input.current?.click()}>
        IMPORT BOOKMARKS.HTML…
      </button>
      <input ref={input} type="file" accept=".html,.htm,text/html" hidden onChange={onFile} aria-label="Bookmarks file to import" />
      {error && (
        <p className="panel-error" role="alert">
          <Prompted glyph="✕">{error}</Prompted>
        </p>
      )}
    </>
  );
}

/** DOWNLOAD BRIDGE: the extension's zip, built next to the page. */
export function DownloadBridgeButton({ primary = false, label = 'DOWNLOAD BRIDGE' }: { primary?: boolean; label?: string }) {
  return (
    <a className={cx('text-btn', primary && 'primary')} href={BRIDGE_ZIP} download>
      {label}
    </a>
  );
}

/**
 * An address shown as text with COPY: webpages can't link to chrome://
 * pages (Chrome blocks it), so the address is copied for pasting instead.
 */
export function CopyAddress({ text }: { text: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      uiStore.getState().showToast(`COPIED ${text.toUpperCase()} · PASTE IT IN THE ADDRESS BAR`);
    } catch {
      uiStore.getState().showToast('COULDN’T COPY · TYPE IT IN THE ADDRESS BAR');
    }
  };
  return (
    <span className="copy-address">
      <code>{text}</code>
      <button type="button" className="text-btn" onClick={copy} aria-label={`Copy ${text}`}>
        COPY
      </button>
    </span>
  );
}
