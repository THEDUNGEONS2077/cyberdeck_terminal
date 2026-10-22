/**
 * src/__tests__/arrange.test.ts: your arrangement of the bookmarks (areas,
 * order, hidden items, panels) and the layout's schema 3 migration.
 */
import {
  addArea,
  arrange,
  chromeOrder,
  clampPlace,
  deleteArea,
  emptyArrangement,
  folderContents,
  hideItem,
  indexTree,
  isPlaced,
  mergeOrder,
  moveArea,
  moveItem,
  renameArea,
  showItem,
  unplaceItem,
} from '@/lib/arrange';
import type { BookmarkNode } from '@/lib/bookmarks';
import { defaultLayout, summarizeLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';

/** A bar: links A, B; folder Dev (links C, D; folder Deep with E); link F; a second link to A's URL. */
const BAR: BookmarkNode = {
  id: '1',
  title: 'Bookmarks bar',
  children: [
    { id: 'a', title: 'A', url: 'https://a/' },
    { id: 'b', title: 'B', url: 'https://b/' },
    {
      id: 'dev',
      title: 'Dev',
      children: [
        { id: 'c', title: 'C', url: 'https://c/' },
        { id: 'd', title: 'D', url: 'https://d/' },
        { id: 'deep', title: 'Deep', children: [{ id: 'e', title: 'E', url: 'https://e/' }] },
      ],
    },
    { id: 'f', title: 'F', url: 'https://f/' },
    { id: 'a2', title: 'A again', url: 'https://a/' },
  ],
};
const keys = (items: { key: string }[]) => items.map((i) => i.key);

describe('indexTree', () => {
  it('keys links by URL (repeats numbered) and folders by path, in Chrome’s order', () => {
    const { items, top } = indexTree(BAR);
    expect(top).toEqual(['l:https://a/', 'l:https://b/', 'f:Dev', 'l:https://f/', 'l:https://a/#2']);
    expect(items.get('f:Dev/Deep')!.parent).toBe('f:Dev');
    expect(items.get('l:https://e/')!.parent).toBe('f:Dev/Deep');
  });
});

describe('mergeOrder', () => {
  const all = () => true;
  it('keeps your order, and puts new items after the one Chrome has before them', () => {
    // D follows C in Chrome, so it lands after C; B follows A.
    expect(mergeOrder(['a', 'b', 'c', 'd'], ['c', 'a'], all)).toEqual(['c', 'd', 'a', 'b']);
    expect(mergeOrder(['x', 'a', 'b'], ['b', 'a'], all)).toEqual(['x', 'b', 'a']);
  });
  it('drops what no longer exists', () => {
    expect(mergeOrder(['a', 'b'], ['gone', 'b', 'a'], (k) => k !== 'gone')).toEqual(['b', 'a']);
  });
});

describe('arrange', () => {
  it('with no arrangement, everything is where Chrome has it', () => {
    const r = arrange(BAR, emptyArrangement());
    expect(keys(r.main)).toEqual(['l:https://a/', 'l:https://b/', 'f:Dev', 'l:https://f/', 'l:https://a/#2']);
    expect(r.areas).toEqual([]);
    expect(keys(folderContents(r.all.get('f:Dev')!, r))).toEqual(['l:https://c/', 'l:https://d/', 'f:Dev/Deep']);
  });

  it('areas take their items out of NAV, and deeper items out of their folders', () => {
    let arr = addArea(emptyArrangement(), 'w', 'work');
    const mainNow = arrange(BAR, arr).mainKeys;
    arr = moveItem(arr, 'l:https://b/', { section: 'w', before: null }, mainNow);
    arr = moveItem(arr, 'l:https://c/', { section: 'w', before: null }, mainNow);
    const r = arrange(BAR, arr);
    expect(r.areas[0]!.area.title).toBe('WORK');
    expect(keys(r.areas[0]!.items)).toEqual(['l:https://b/', 'l:https://c/']);
    expect(keys(r.main)).not.toContain('l:https://b/');
    expect(keys(folderContents(r.all.get('f:Dev')!, r))).toEqual(['l:https://d/', 'f:Dev/Deep']);
  });

  it('reorders NAV, and a deeper item can be placed in NAV', () => {
    let arr = emptyArrangement();
    arr = moveItem(arr, 'l:https://f/', { section: 'main', before: 'l:https://a/' }, arrange(BAR, arr).mainKeys);
    arr = moveItem(arr, 'l:https://e/', { section: 'main', before: null }, arrange(BAR, arr).mainKeys);
    const r = arrange(BAR, arr);
    expect(keys(r.main)).toEqual(['l:https://f/', 'l:https://a/', 'l:https://b/', 'f:Dev', 'l:https://a/#2', 'l:https://e/']);
    expect(folderContents(r.all.get('f:Dev/Deep')!, r)).toEqual([]);
  });

  it('a new bookmark from Chrome shows up where Chrome has it, even in a custom order', () => {
    let arr = emptyArrangement();
    arr = moveItem(arr, 'l:https://f/', { section: 'main', before: 'l:https://a/' }, arrange(BAR, arr).mainKeys);
    const withNew: BookmarkNode = { ...BAR, children: [...BAR.children!.slice(0, 2), { id: 'n', title: 'New', url: 'https://new/' }, ...BAR.children!.slice(2)] };
    expect(keys(arrange(withNew, arr).main)).toEqual(['l:https://f/', 'l:https://a/', 'l:https://b/', 'l:https://new/', 'f:Dev', 'l:https://a/#2']);
  });

  it('hidden items leave the dashboard (folders hide their contents too) and come back where they were', () => {
    let arr = addArea(emptyArrangement(), 'w', 'WORK');
    arr = moveItem(arr, 'l:https://b/', { section: 'w', before: null }, arrange(BAR, arr).mainKeys);
    arr = hideItem(hideItem(arr, 'l:https://b/'), 'f:Dev');
    let r = arrange(BAR, arr);
    expect(keys(r.hidden).sort()).toEqual(['f:Dev', 'l:https://b/']);
    expect(r.areas[0]!.items).toEqual([]);
    expect(keys(r.main)).not.toContain('f:Dev');
    arr = showItem(arr, 'l:https://b/');
    r = arrange(BAR, arr);
    expect(keys(r.areas[0]!.items)).toEqual(['l:https://b/']);
  });

  it('deleting an area, BACK TO CHROME’S PLACE and CHROME ORDER put items back where Chrome has them', () => {
    let arr = addArea(emptyArrangement(), 'w', 'WORK');
    arr = moveItem(arr, 'l:https://c/', { section: 'w', before: null }, arrange(BAR, arr).mainKeys);
    expect(isPlaced(arr, 'l:https://c/')).toBe(true);
    const back = arrange(BAR, unplaceItem(arr, 'l:https://c/'));
    expect(keys(folderContents(back.all.get('f:Dev')!, back))).toContain('l:https://c/');
    expect(arrange(BAR, deleteArea(arr, 'w')).areas).toEqual([]);
    const hidden = hideItem(arr, 'l:https://f/');
    const reset = chromeOrder(hidden);
    expect(reset).toEqual({ order: [], areas: [], hidden: ['l:https://f/'] });
  });

  it('renames (upper case, never empty) and reorders areas', () => {
    let arr = addArea(addArea(addArea(emptyArrangement(), '1', 'one'), '2', 'two'), '3', 'three');
    arr = renameArea(arr, '2', '  ');
    expect(arr.areas[1]!.title).toBe('AREA');
    arr = moveArea(arr, '3', '1');
    expect(arr.areas.map((a) => a.id)).toEqual(['3', '1', '2']);
    arr = moveArea(arr, '3', null);
    expect(arr.areas.map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('keeps panel places on screen and NAV’s width within limits', () => {
    expect(clampPlace({ x: -1, y: 2, w: 10 })).toEqual({ x: 0, y: 0.95, w: 360 });
    expect(clampPlace({ x: Number.NaN, y: 0.5 })).toEqual({ x: 0, y: 0.5 });
  });
});

describe('layout schema 3', () => {
  it('migrates a real version-2 layout: an empty arrangement, panels in place, nothing else changed', () => {
    const v2 = { schemaVersion: 2, wallpaper: 'matrix-rain', prefs: { backupReminderDays: 7 }, bookmarks: { imported: null, importedAt: null, open: ['Dev'] } };
    const { doc, migrated } = migrateLayout(v2);
    expect(migrated).toBe(true);
    expect(doc).toEqual({ ...defaultLayout(), prefs: { backupReminderDays: 7 }, bookmarks: { ...defaultLayout().bookmarks, open: ['Dev'] } });
  });

  it('drops malformed arrangement pieces one by one, never the layout', () => {
    const { doc } = migrateLayout({
      ...defaultLayout(),
      bookmarks: { ...defaultLayout().bookmarks, arrangement: { order: ['x', 3, 'x'], areas: [{ id: 'a', title: 'ok', items: ['k'] }, { id: 'a', title: 'dupe' }, 'junk', { title: 'no id' }], hidden: 'nope' } },
      panels: { nav: { x: 2, y: 'top' }, brand: { x: 0.1, y: 0.2, w: 900 } },
    });
    expect(doc.bookmarks.arrangement).toEqual({ order: ['x'], areas: [{ id: 'a', title: 'OK', items: ['k'], collapsed: false }], hidden: [] });
    expect(doc.panels).toEqual({ nav: null, brand: { x: 0.1, y: 0.2 } });
  });

  it('summarizes areas, order, hidden items and moved panels for snapshots', () => {
    const doc = { ...defaultLayout(), panels: { nav: { x: 0.2, y: 0.2, w: 800 }, brand: null } };
    doc.bookmarks = { ...doc.bookmarks, arrangement: { order: ['a'], areas: [{ id: 'w', title: 'WORK', items: [], collapsed: false }], hidden: ['b', 'c'] } };
    expect(summarizeLayout(doc)).toBe('1 AREA · CUSTOM ORDER · 2 HIDDEN · PANELS MOVED · WALLPAPER MATRIX-RAIN · REMIND 14D');
  });
});
