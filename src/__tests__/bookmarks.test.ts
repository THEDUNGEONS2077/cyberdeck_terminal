/**
 * src/__tests__/bookmarks.test.ts: phase 2: reading bookmarks (exported
 * file, bridge tree, untrusted data), the layout's schema 2 migration and
 * bookmark actions, the bridge's id and tree code, and the bridge zip.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

import { dashboardBar, describeRoots, permanentFolders, simplify } from '../../bridge/tree.js';
import { makeZip } from '../../scripts/zip.ts';

import { BRIDGE_ID, BRIDGE_VERSION, faviconSrcSet } from '@/bridge/client';
import { type BookmarkNode, BookmarksFileError, countLinks, folderKey, hostOf, isOpenable, MAX_NODES, parseBookmarksHtml, sanitizeTree } from '@/lib/bookmarks';
import { defaultLayout, summarizeLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { compareVersions } from '@/lib/versions';
import { createBookmarksStore } from '@/store/bookmarks';
import { KEYS, memoryKV } from '@/store/kv';
import { createLayoutStore } from '@/store/layout';
import { boot } from '@/store/persist';

const NOW = new Date(2026, 9, 22, 14, 30).getTime();

/** A bookmarks.html as Chrome exports it (trimmed: real ones carry ICON data and dates). */
const EXPORT = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="1" LAST_MODIFIED="2" PERSONAL_TOOLBAR_FOLDER="true">Bookmarks bar</H3>
    <DL><p>
        <DT><A HREF="https://github.com/" ADD_DATE="1" ICON="data:image/png;base64,AAAA">GitHub</A>
        <DT><A HREF="https://mail.example.com/?a=1&amp;b=2" ADD_DATE="1">Mail &amp; more</A>
        <DT><H3 ADD_DATE="1">Dev</H3>
        <DL><p>
            <DT><A HREF="https://developer.mozilla.org/">MDN</A>
            <DT><H3 ADD_DATE="1">Tools / Utils</H3>
            <DL><p>
                <DT><A HREF="javascript:alert(1)">Bookmarklet</A>
            </DL><p>
        </DL><p>
        <DT><A HREF="https://news.ycombinator.com/">Hacker News</A>
    </DL><p>
    <DT><H3 ADD_DATE="1">Other bookmarks</H3>
    <DL><p>
        <DT><A HREF="https://other.example/">Not on the bar</A>
    </DL><p>
</DL><p>
`;

describe('parseBookmarksHtml', () => {
  it('reads the bookmarks bar, in order, with folders nested', () => {
    const bar = parseBookmarksHtml(EXPORT);
    expect(bar.children!.map((c) => c.title)).toEqual(['GitHub', 'Mail & more', 'Dev', 'Hacker News']);
    expect(bar.children![1]!.url).toBe('https://mail.example.com/?a=1&b=2');
    const dev = bar.children![2]!;
    expect(dev.children!.map((c) => c.title)).toEqual(['MDN', 'Tools / Utils']);
    expect(dev.children![1]!.children![0]!.url).toBe('javascript:alert(1)');
    expect(countLinks(bar)).toBe(5);
  });

  it('gives every node a unique id', () => {
    const ids: string[] = [];
    const walk = (n: { id: string; children?: { id: string }[] }) => {
      ids.push(n.id);
      n.children?.forEach(walk);
    };
    walk(parseBookmarksHtml(EXPORT));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('falls back to the first folder when none is marked as the bar', () => {
    const bar = parseBookmarksHtml(EXPORT.replace(' PERSONAL_TOOLBAR_FOLDER="true"', ''));
    expect(bar.children![0]!.title).toBe('GitHub');
  });

  it('refuses files that are not bookmarks exports, saying how to get one', () => {
    expect(() => parseBookmarksHtml('<html><body>hi</body></html>')).toThrow(BookmarksFileError);
    expect(() => parseBookmarksHtml('<html>')).toThrow('Export bookmarks');
    expect(() => parseBookmarksHtml('<!DOCTYPE NETSCAPE-Bookmark-file-1><DL></DL>')).toThrow('no bookmarks bar');
  });
});

describe('bookmark trees', () => {
  it('sanitizeTree keeps only id, title, url and children', () => {
    const tree = sanitizeTree({ id: 1, title: 'bar', children: [{ id: '2', title: 'a', url: 'https://a/', dateAdded: 5, extra: { x: 1 } }, 'junk', null] });
    expect(tree).toEqual({ id: '1', title: 'bar', children: [{ id: '2', title: 'a', url: 'https://a/' }] });
    expect(sanitizeTree({ title: 'a link', url: 'https://x/' })).toBeNull(); // the root must be a folder
    expect(sanitizeTree('nope')).toBeNull();
  });

  it(`sanitizeTree stops at ${MAX_NODES} nodes`, () => {
    const big = { id: 'r', title: '', children: Array.from({ length: MAX_NODES + 50 }, (_, i) => ({ id: String(i), title: '', url: 'https://x/' })) };
    expect(countLinks(sanitizeTree(big))).toBe(MAX_NODES - 1);
  });

  it('only opens http(s) links (a webpage can’t open the rest)', () => {
    expect(isOpenable('https://github.com/')).toBe(true);
    expect(isOpenable('HTTP://example.com')).toBe(true);
    for (const url of ['javascript:alert(1)', 'chrome://settings', 'file:///C:/x.txt', 'data:text/html,hi', '']) expect(isOpenable(url)).toBe(false);
  });

  it('shows hosts without www', () => {
    expect(hostOf('https://www.GitHub.com/x?y')).toBe('github.com');
    expect(hostOf('chrome://settings')).toBe('settings');
    expect(hostOf('javascript:alert(1)')).toBe('');
  });

  it('keys folders by their path of titles', () => {
    expect(folderKey(['Dev', 'Tools / Utils'])).toBe('Dev/Tools ∕ Utils');
    expect(folderKey(['A/B'])).not.toBe(folderKey(['A', 'B']));
  });
});

describe('layout schema 2', () => {
  it('migrates a real version-1 layout: bookmarks arrive empty, nothing else changes', () => {
    const v1 = { schemaVersion: 1, wallpaper: 'matrix-rain', prefs: { backupReminderDays: 30 } };
    const { doc, migrated } = migrateLayout(v1);
    expect(migrated).toBe(true);
    expect(doc).toEqual({ ...defaultLayout(), prefs: { backupReminderDays: 30, rainGlow: 'high', palette: 'phosphor' as const, wallpaperPalette: 'phosphor' as const } });
  });

  it('drops a damaged imported tree instead of the whole layout, and tidies open folders', () => {
    const { doc } = migrateLayout({ ...defaultLayout(), bookmarks: { imported: { broken: true }, importedAt: 5, open: ['b', 'a', 'b', 7] } });
    expect(doc.bookmarks).toEqual({ imported: null, importedAt: null, open: ['a', 'b'], arrangement: { order: [], areas: [], hidden: [] } });
  });

  it('summarizes the imported copy and open folders', () => {
    const bar = parseBookmarksHtml(EXPORT);
    expect(summarizeLayout({ ...defaultLayout(), bookmarks: { ...defaultLayout().bookmarks, imported: bar, importedAt: NOW, open: ['Dev'] } })).toBe(
      'BAR COPY 5 LINKS · 1 OPEN · WALLPAPER MATRIX-RAIN · REMIND 14D',
    );
  });
});

describe('layout store: bookmarks', () => {
  async function setup() {
    const kv = memoryKV();
    const store = createLayoutStore(kv, await boot(kv, NOW), undefined, () => NOW);
    return { kv, store };
  }

  it('opens and collapses folders, keeping the list sorted and unique', async () => {
    const { store } = await setup();
    store.getState().setFolderOpen('Dev', true);
    store.getState().setFolderOpen('Apps', true);
    store.getState().setFolderOpen('Dev', true);
    expect(store.getState().layout.bookmarks.open).toEqual(['Apps', 'Dev']);
    store.getState().setFolderOpen('Dev', false);
    expect(store.getState().layout.bookmarks.open).toEqual(['Apps']);
  });

  it('keeps an imported copy in the saved layout, and forgets it on request', async () => {
    const { kv, store } = await setup();
    store.getState().importBookmarks(parseBookmarksHtml(EXPORT));
    await store.getState().settled();
    const saved = kv.data.get(KEYS.layout) as ReturnType<typeof defaultLayout>;
    expect(countLinks(saved.bookmarks.imported)).toBe(5);
    expect(saved.bookmarks.importedAt).toBe(NOW);
    store.getState().removeImported();
    expect(store.getState().layout.bookmarks.imported).toBeNull();
  });
});

describe('bookmarks store (the live bar)', () => {
  const bar = { id: '1', title: 'Bookmarks bar', children: [{ id: '2', title: 'a', url: 'https://a/' }] };

  it('shows the cached bar while checking, then the live one; caches only changes', async () => {
    const kv = memoryKV();
    const store = createBookmarksStore(kv, bar);
    expect(store.getState()).toMatchObject({ status: 'checking', bar });
    const set = vi.spyOn(kv, 'set');
    store.getState().setLive(structuredClone(bar), '1.0.0');
    expect(store.getState()).toMatchObject({ status: 'live', bridgeVersion: '1.0.0' });
    expect(set).not.toHaveBeenCalled(); // same bar: no write
    store.getState().setLive({ ...bar, children: [] }, '1.0.0');
    expect(set).toHaveBeenCalledWith(KEYS.bookmarksCache, { ...bar, children: [] });
  });

  it('keeps the bridge’s features, and drops them with the bridge', () => {
    const store = createBookmarksStore(memoryKV(), null);
    store.getState().setLive(bar, '1.1.0', ['favicons', 'open']);
    const first = store.getState().features;
    store.getState().setLive(bar, '1.1.0', ['favicons', 'open']);
    expect(store.getState().features).toBe(first); // same array: no re-render
    store.getState().setAbsent();
    expect(store.getState().features).toEqual([]);
  });

  it('drops the bar when the bridge is absent', () => {
    const store = createBookmarksStore(memoryKV(), bar);
    store.getState().setAbsent();
    expect(store.getState()).toMatchObject({ status: 'absent', bar: null });
  });
});

describe('the bridge extension', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../bridge/manifest.json', import.meta.url), 'utf8')) as Record<string, unknown>;

  it('its id (from the manifest key) is the one the page talks to', () => {
    // Chrome's rule: the first 16 bytes of SHA-256(public key), as hex digits mapped 0-f → a-p.
    const hex = createHash('sha256').update(Buffer.from(String(manifest.key), 'base64')).digest('hex').slice(0, 32);
    expect([...hex].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('')).toBe(BRIDGE_ID);
  });

  it('the page ships the manifest’s version, and lists only the dashboard as a caller', () => {
    expect(manifest.version).toBe(BRIDGE_VERSION);
    expect(BRIDGE_VERSION).toBe('1.2.0');
    expect(manifest.permissions).toEqual(['bookmarks', 'favicon']);
    // Only the dashboard's tabs are visible to it (to switch to an open one on New Tab).
    expect(manifest.host_permissions).toEqual(['https://thedungeons2077.github.io/cyberdeck_terminal/*']);
    // Site icons: only the dashboard's origin may load them.
    expect(manifest.web_accessible_resources).toEqual([{ resources: ['_favicon/*'], matches: ['https://thedungeons2077.github.io/*', 'http://127.0.0.1/*'] }]);
    expect((manifest.externally_connectable as { matches: string[] }).matches).toEqual(['https://thedungeons2077.github.io/cyberdeck_terminal/*', 'http://127.0.0.1/*']);
  });

  it('passes on only id, title, url and children', () => {
    expect(simplify({ id: 1, title: 'A', url: 'https://a/', dateAdded: 1, syncing: true } as never)).toEqual({ id: '1', title: 'A', url: 'https://a/' });
  });

  /** Chrome's roots as getTree() gives them, signed in: a bar, Other and Mobile on this device, and in the account. */
  const SIGNED_IN = [
    {
      id: '0',
      title: '',
      children: [
        { id: '1', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: false, children: [{ id: '10', title: 'Old', url: 'https://old/' }] },
        { id: '2', title: 'Other bookmarks', folderType: 'other', syncing: false, children: [] },
        { id: '3', title: 'Mobile bookmarks', folderType: 'mobile', syncing: false, children: [] },
        { id: '4', title: 'Bookmarks bar', folderType: 'bookmarks-bar', syncing: true, children: [{ id: '40', title: 'New', url: 'https://new/' }] },
        { id: '5', title: 'Other bookmarks', folderType: 'other', syncing: true, children: [{ id: '50', title: 'Starred', url: 'https://starred/' }] },
        { id: '6', title: 'Mobile bookmarks', folderType: 'mobile', syncing: true, children: [] },
      ],
    },
  ];

  /** What the bridge sends for these roots, typed as the page reads it. */
  const sent = (roots: unknown) => simplify(dashboardBar(roots as never)) as unknown as BookmarkNode & { children: BookmarkNode[] };

  it('joins both bookmarks bars (account first), then Other bookmarks as a folder: a new bookmark always shows up', () => {
    const bar = sent(SIGNED_IN);
    expect(bar.children.map((c) => c.title)).toEqual(['New', 'Old', 'Other bookmarks']);
    expect(bar.children[2]!.children!.map((c) => c.title)).toEqual(['Starred']);
    // Mobile bookmarks is empty: no folder for it.
    expect(bar.children.some((c) => c.title === 'Mobile bookmarks')).toBe(false);
    expect(describeRoots(SIGNED_IN as never)).toEqual({ bars: 2, bar: 2, other: 1, mobile: 0 });
  });

  it('finds the permanent folders by their old ids on a Chrome without folderType', () => {
    const old = [{ id: '0', title: '', children: [{ id: '1', title: 'Bar', children: [] }, { id: '2', title: 'Other', children: [{ id: '9', title: 'x', url: 'https://x/' }] }] }];
    expect(permanentFolders(old as never, 'bar').map((n: { id: string }) => n.id)).toEqual(['1']);
    expect(sent(old).children.map((c) => c.title)).toEqual(['Other bookmarks']);
    expect(dashboardBar([{ id: '0', title: '', children: [] }] as never)).toBeNull();
  });
});

describe('site icons', () => {
  it('come from the bridge’s copy of Chrome’s icon cache, 16 px and 32 px', () => {
    const set = faviconSrcSet('https://github.com/a?b=1&c=2');
    const base = `chrome-extension://${BRIDGE_ID}/_favicon/?pageUrl=https%3A%2F%2Fgithub.com%2Fa%3Fb%3D1%26c%3D2`;
    expect(set).toBe(`${base}&size=16 1x, ${base}&size=32 2x`);
  });
});

describe('versions and the bridge zip', () => {
  it('compares dotted versions', () => {
    expect(compareVersions('1.0.0', '1.0.1')).toBeLessThan(0);
    expect(compareVersions('1.10', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('2', '2.0.0')).toBe(0);
  });

  it('makeZip writes files that read back exactly', () => {
    const files = [
      { name: 'cyberdeck-bridge/a.txt', data: Buffer.from('hello '.repeat(200)) },
      { name: 'cyberdeck-bridge/b.bin', data: Buffer.from([1, 2, 3]) },
    ];
    const zip = makeZip(files);
    // Walk the local headers and inflate each file again.
    let at = 0;
    for (const f of files) {
      expect(zip.readUInt32LE(at)).toBe(0x04034b50);
      const method = zip.readUInt16LE(at + 8);
      const size = zip.readUInt32LE(at + 18);
      const nameLen = zip.readUInt16LE(at + 26);
      expect(zip.subarray(at + 30, at + 30 + nameLen).toString()).toBe(f.name);
      const body = zip.subarray(at + 30 + nameLen, at + 30 + nameLen + size);
      expect(method === 8 ? inflateRawSync(body) : body).toEqual(f.data);
      at += 30 + nameLen + size;
    }
    // Then the central directory, then the end record.
    expect(zip.readUInt32LE(at)).toBe(0x02014b50);
    expect(zip.readUInt32LE(zip.length - 22)).toBe(0x06054b50);
  });
});
