/**
 * src/__tests__/find.test.ts: the finder's search (lib/find.ts): what can be
 * found, how matches rank, and highlighting.
 */
import { arrange, emptyArrangement, hideItem } from '@/lib/arrange';
import type { BookmarkNode } from '@/lib/bookmarks';
import { findEntries, markPieces, search } from '@/lib/find';

const BAR: BookmarkNode = {
  id: '1',
  title: 'Bookmarks bar',
  children: [
    { id: 'a', title: 'GitHub', url: 'https://github.com/' },
    { id: 'b', title: 'Hub page', url: 'https://hub.example/' },
    { id: 's', title: 'Settings', url: 'chrome://settings' },
    { id: 'dev', title: 'Dev', children: [{ id: 'c', title: 'MDN web docs', url: 'https://developer.mozilla.org/' }, { id: 'tools', title: 'Tools', children: [{ id: 'd', title: 'JSON formatter', url: 'https://json.example/' }] }] },
  ],
};

describe('findEntries', () => {
  it('lists every openable bookmark at any depth, with its folders, and leaves out chrome:// and hidden ones', () => {
    const entries = findEntries(arrange(BAR, emptyArrangement()));
    expect(entries.map((e) => e.title)).toEqual(['GitHub', 'Hub page', 'MDN web docs', 'JSON formatter']);
    expect(entries.find((e) => e.title === 'JSON formatter')!.folders).toEqual(['Dev', 'Tools']);
    const hidden = findEntries(arrange(BAR, hideItem(emptyArrangement(), 'f:Dev')));
    expect(hidden.map((e) => e.title)).toEqual(['GitHub', 'Hub page']);
  });
});

describe('search', () => {
  const entries = findEntries(arrange(BAR, emptyArrangement()));
  const titles = (q: string) => search(entries, q).map((h) => h.entry.title);

  it('ranks a title start above a word start above the middle of a word', () => {
    expect(titles('hub')).toEqual(['Hub page', 'GitHub']);
    expect(titles('git')).toEqual(['GitHub']);
  });

  it('matches the site, a folder name, and letters in order', () => {
    expect(titles('mozilla')).toEqual(['MDN web docs']);
    expect(titles('tools')).toEqual(['JSON formatter']);
    expect(titles('gthb')).toEqual(['GitHub']);
  });

  it('needs every word to match, and finds nothing for nothing', () => {
    expect(titles('json tools')).toEqual(['JSON formatter']);
    expect(titles('json github')).toEqual([]);
    expect(titles('   ')).toEqual([]);
  });

  it('marks where the title matched', () => {
    const [hit] = search(entries, 'web');
    expect(markPieces(hit!.entry.title, hit!.marks)).toEqual([
      { text: 'MDN ', mark: false },
      { text: 'web', mark: true },
      { text: ' docs', mark: false },
    ]);
  });
});
