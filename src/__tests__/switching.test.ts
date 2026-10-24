/**
 * src/__tests__/switching.test.ts: SWITCH TO OPEN TAB's rules
 * (lib/switching.ts): which place a link switches within, which site the
 * bridge must be allowed to see, and the stored list.
 */
import { defaultLayout } from '@/lib/layout';
import { migrateLayout } from '@/lib/migrations';
import { covers, isSwitchPattern, normalizeSwitchTabs, patternFor, siteNeeded, siteOf, switchPattern, withPattern, withoutPattern } from '@/lib/switching';

describe('switch to open tab', () => {
  it('takes a link’s place: its origin and path up to the last /', () => {
    expect(switchPattern('https://thedungeons2077.github.io/quest_log_desktop/')).toBe('https://thedungeons2077.github.io/quest_log_desktop/*');
    expect(switchPattern('https://thedungeons2077.github.io/quest_log_desktop/index.html?x=1#y')).toBe('https://thedungeons2077.github.io/quest_log_desktop/*');
    expect(switchPattern('https://mail.example.com')).toBe('https://mail.example.com/*');
    // A port can't go in a Chrome match pattern (and the pattern matches any).
    expect(switchPattern('http://127.0.0.1:5173/app/')).toBe('http://127.0.0.1/app/*');
    expect(switchPattern('chrome://settings')).toBeNull();
    expect(switchPattern('not a url')).toBeNull();
  });

  it('asks the bridge for the whole site (Chrome grants sites, not paths)', () => {
    expect(siteOf('https://thedungeons2077.github.io/quest_log_desktop/*')).toBe('https://thedungeons2077.github.io/*');
    expect(siteOf('http://127.0.0.1/app/*')).toBe('http://127.0.0.1/*');
  });

  it('switches a link only within its place, the nearest place first', () => {
    const quest = 'https://thedungeons2077.github.io/quest_log_desktop/*';
    expect(covers(quest, 'https://thedungeons2077.github.io/quest_log_desktop/#today')).toBe(true);
    expect(covers(quest, 'https://thedungeons2077.github.io/cyberdeck_terminal/')).toBe(false);
    expect(covers(quest, 'http://thedungeons2077.github.io/quest_log_desktop/')).toBe(false);
    expect(covers(quest, 'https://evil.example/quest_log_desktop/')).toBe(false);
    const list = ['https://a.example/*', 'https://a.example/docs/*'];
    expect(patternFor(list, 'https://a.example/docs/page')).toBe('https://a.example/docs/*');
    expect(patternFor(list, 'https://a.example/blog/')).toBe('https://a.example/*');
    expect(patternFor(list, 'https://b.example/')).toBeNull();
  });

  it('keeps the list sorted and once, and knows when a site is no longer needed', () => {
    let list = withPattern([], 'https://b.example/*');
    list = withPattern(list, 'https://a.example/x/*');
    expect(withPattern(list, 'https://a.example/x/*')).toEqual(list);
    expect(list).toEqual(['https://a.example/x/*', 'https://b.example/*']);
    expect(siteNeeded(list, 'https://a.example/*')).toBe(true);
    expect(siteNeeded(withoutPattern(list, 'https://a.example/x/*'), 'https://a.example/*')).toBe(false);
  });

  it('checks a stored list: place patterns only (no wildcard hosts, nothing but http(s))', () => {
    expect(isSwitchPattern('https://*.example/*')).toBe(false);
    expect(isSwitchPattern('https://a.example/x')).toBe(false);
    expect(normalizeSwitchTabs(['https://b.example/*', 'https://a.example/*', 'https://a.example/*', '<all_urls>', 'file:///*', 'ftp://a/*', 5])).toEqual(['https://a.example/*', 'https://b.example/*']);
    expect(normalizeSwitchTabs('junk')).toEqual([]);
    // In a layout: kept as is, and an older layout has none.
    const { doc } = migrateLayout({ ...defaultLayout(), prefs: { ...defaultLayout().prefs, switchTabs: ['https://a.example/*', '*://*/*'] } });
    expect(doc.prefs.switchTabs).toEqual(['https://a.example/*']);
    expect(defaultLayout().prefs.switchTabs).toEqual([]);
  });
});
