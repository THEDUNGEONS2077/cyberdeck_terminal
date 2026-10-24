/**
 * src/app/Finder.tsx: the finder (press `/`): type to find any bookmark on
 * the dashboard, at any depth, or to run a command; ↑ / ↓ to choose, Enter
 * to open (in a new tab, like every link here), Esc to close. Last of all,
 * with anything typed: SEARCH THE WEB FOR it (the first SEARCH module's
 * engine, or DuckDuckGo), so `/` + words + Enter searches when nothing on
 * the dashboard matches.
 *
 * Layer: UI. The command-palette pattern (Raycast, VS Code, Linear):
 * keyboard first, results as you type, the best match chosen already, so
 * `/` + a few letters + Enter opens a site. The input is an ARIA combobox
 * driving a listbox (aria-activedescendant), so screen readers follow the
 * choice. Matching and ranking are lib/find.ts.
 *
 *   ┌ > gith█                                            ESC ┐
 *   │ ◉ GitHub          github.com                      DEV  │  ← chosen
 *   │ ◉ GitHub issues   github.com · DEV / WORK              │
 *   │ COMMANDS                                               │
 *   │ ⠿ EDIT LAYOUT                                          │
 *   └ ↑↓ CHOOSE · ↵ OPEN · ESC CLOSE ───────────────────────┘
 */
import { type KeyboardEvent, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { openChromePage } from '@/bridge/client';
import { arrange } from '@/lib/arrange';
import { type FindHit, findEntries, markPieces, search } from '@/lib/find';
import { engineOf } from '@/lib/search';
import { uiStore } from '@/store/ui';

import { downloadBackup } from './backupFile';
import { toggleEdit } from './Bookmarks';
import { cx } from './cx';
import { SiteIcon } from './deck/Items';
import { toggleFullscreen } from './fullscreen';
import { G } from './glyphs';
import { useBookmarks, useEdit, useLayout, useUi } from './hooks';
import { usePresence } from './usePresence';
import { useShownBar } from './useShownBar';
import { defaultEngine, openSearch } from './modules/actions';
import { zoomWallpaper } from './zoom';

/** How long the finder takes to fade out (matches --fast in theme.css). */
const EXIT_MS = 120;

/** A command the finder can run. */
interface Command {
  id: string;
  glyph: string;
  label: string;
  /** Its own key, shown beside it. */
  key?: string;
  run(): void;
}

/** One row of the results: a bookmark or a command. */
type Row = { kind: 'link'; hit: FindHit } | { kind: 'command'; command: Command };

/** The finder, while open (and while it fades out). */
export function Finder() {
  const open = useUi((s) => s.finderOpen);
  const { shown, leaving } = usePresence(open ? true : null, EXIT_MS);
  return shown ? <FinderPanel leaving={leaving} /> : null;
}

/** Closes the finder and puts the keyboard back where it was. */
function close(returnTo: Element | null): void {
  uiStore.getState().setFinderOpen(false);
  if (returnTo instanceof HTMLElement && returnTo.isConnected) returnTo.focus();
}

/** The finder's panel. */
function FinderPanel({ leaving }: { leaving: boolean }) {
  const { bar } = useShownBar();
  const arrangement = useLayout((s) => s.layout.bookmarks.arrangement);
  const editing = useEdit((s) => s.editing);
  const canOpenChrome = useBookmarks((s) => s.status === 'live' && s.features.includes('open'));
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  // Where the keyboard was before (focus goes back there on close).
  const [returnTo] = useState(() => document.activeElement);
  const listId = useId();

  // Everything findable: built once per bar and arrangement, not per keypress.
  const entries = useMemo(() => (bar ? findEntries(arrange(bar, arrangement)) : []), [bar, arrangement]);

  const commands: Command[] = [
    { id: 'edit', glyph: '⠿', label: editing ? 'LOCK THE LAYOUT' : 'EDIT THE LAYOUT', run: () => toggleEdit() },
    { id: 'system', glyph: G.system, label: 'OPEN SYSTEM', key: 'S', run: () => uiStore.getState().setPanelOpen(true) },
    { id: 'fullscreen', glyph: G.fullscreen, label: 'FULLSCREEN', key: 'F', run: () => void toggleFullscreen() },
    { id: 'backup', glyph: '↓', label: 'EXPORT A BACKUP', run: () => downloadBackup() },
    { id: 'zoom-in', glyph: '+', label: 'ZOOM THE WALLPAPER IN', key: '+', run: () => zoomWallpaper('in') },
    { id: 'zoom-out', glyph: '−', label: 'ZOOM THE WALLPAPER OUT', key: '−', run: () => zoomWallpaper('out') },
    { id: 'zoom-reset', glyph: '0', label: 'WALLPAPER ZOOM 100%', key: '0', run: () => zoomWallpaper('reset') },
    ...(canOpenChrome
      ? [
          { id: 'ntp', glyph: G.external, label: 'CHROME NEW TAB', run: () => void openChromePage('ntp') },
          { id: 'manager', glyph: G.external, label: 'BOOKMARK MANAGER', run: () => void openChromePage('bookmarks') },
        ]
      : []),
  ];

  // What's shown: matching bookmarks first, then matching commands (all commands with nothing typed).
  const q = query.trim().toLowerCase();
  const hits = search(entries, q, 8);
  const shownCommands = q ? commands.filter((c) => q.split(/\s+/).every((w) => c.label.toLowerCase().includes(w))).slice(0, 4) : commands;
  // The web, last: chosen at once when nothing on the dashboard matches.
  if (q) {
    const engine = defaultEngine();
    shownCommands.push({ id: 'web', glyph: G.external, label: `SEARCH ${engineOf(engine).label} FOR “${query.trim()}”`, run: () => void openSearch(engine, query) });
  }
  const rows: Row[] = [...hits.map((hit) => ({ kind: 'link' as const, hit })), ...shownCommands.map((command) => ({ kind: 'command' as const, command }))];
  const chosen = Math.min(active, Math.max(0, rows.length - 1));
  const optionId = (i: number) => `${listId}-${i}`;

  // Into the field as it opens.
  useLayoutEffect(() => {
    if (!leaving) input.current?.focus();
  }, [leaving]);
  // The chosen row stays in view.
  useLayoutEffect(() => {
    list.current?.querySelector(`#${CSS.escape(optionId(chosen))}`)?.scrollIntoView({ block: 'nearest' });
  });

  /** Opens or runs row `i`, and closes the finder. */
  const act = (i: number) => {
    const row = rows[i];
    if (!row) return;
    close(row.kind === 'command' && row.command.id === 'edit' ? null : returnTo);
    if (row.kind === 'link') {
      window.open(row.hit.entry.url, '_blank', 'noopener,noreferrer');
      uiStore.getState().announce(`OPENED ${row.hit.entry.title.toUpperCase()}`);
    } else {
      row.command.run();
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (rows.length) setActive((chosen + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      act(chosen);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // Esc clears what's typed first, then closes.
      if (query) setQuery('');
      else close(returnTo);
    } else if (e.key === 'Tab') {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  return (
    <div className={cx('finder-layer', leaving && 'leaving')} onMouseDown={() => close(returnTo)} inert={leaving}>
      <div className="finder" role="dialog" aria-modal aria-label="Find" onMouseDown={(e) => e.stopPropagation()}>
        <div className="finder-field">
          <span className="prompt" aria-hidden>
            {G.prompt}
          </span>
          <input
            ref={input}
            role="combobox"
            aria-expanded
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={rows.length ? optionId(chosen) : undefined}
            aria-label="Find a bookmark or a command"
            placeholder="FIND A BOOKMARK, OR A COMMAND"
            spellCheck={false}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <kbd>ESC</kbd>
        </div>
        <ul ref={list} className="finder-list" id={listId} role="listbox" aria-label="Results">
          {q && hits.length === 0 && <li className="finder-empty dim">NO BOOKMARK MATCHES “{query.trim()}”</li>}
          {rows.map((row, i) => {
            const firstCommand = row.kind === 'command' && (i === 0 || rows[i - 1]!.kind === 'link');
            return (
              <li key={row.kind === 'link' ? row.hit.entry.key : row.command.id} role="presentation">
                {firstCommand && <p className="finder-heading" aria-hidden>COMMANDS</p>}
                <div
                  id={optionId(i)}
                  role="option"
                  aria-selected={i === chosen}
                  className={cx('finder-row', i === chosen && 'chosen')}
                  onMouseMove={() => i !== chosen && setActive(i)}
                  onClick={() => act(i)}
                >
                  {row.kind === 'link' ? <LinkRow hit={row.hit} /> : <CommandRow command={row.command} />}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="finder-foot" aria-hidden>
          ↑↓ CHOOSE · ↵ OPEN (NEW TAB) · ESC CLOSE
        </p>
      </div>
    </div>
  );
}

/** A bookmark result: its icon, the title with the matched part lit, its site, and its folders. */
function LinkRow({ hit }: { hit: FindHit }) {
  const { entry } = hit;
  return (
    <>
      <SiteIcon url={entry.url} />
      <span className="finder-title">
        {markPieces(entry.title, hit.marks).map((p, i) => (p.mark ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
      </span>
      <span className="finder-host">{entry.host}</span>
      {entry.folders.length > 0 && <span className="finder-path">{entry.folders.join(' / ').toUpperCase()}</span>}
    </>
  );
}

/** A command result: its glyph, its name, and its own key if it has one. */
function CommandRow({ command }: { command: Command }) {
  return (
    <>
      <span className="finder-glyph" aria-hidden>
        {command.glyph}
      </span>
      <span className="finder-title">{command.label}</span>
      {command.key && <kbd>{command.key}</kbd>}
    </>
  );
}
