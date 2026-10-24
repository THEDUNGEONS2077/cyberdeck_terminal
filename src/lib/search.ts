/**
 * src/lib/search.ts: the SEARCH module's rules: which engines it knows,
 * its settings, and the address a search opens.
 *
 * Layer: pure lib. The page never sends a request itself (no network
 * code): a search is only an address, opened in a new tab like any link.
 * A custom engine is an address with `%s` where the words go, e.g.
 * `https://search.example/?q=%s`.
 */

/** The engines a search can use. */
export type EngineId = 'ddg' | 'google' | 'bing' | 'kagi' | 'custom';

/** An engine: its id, its name as shown, and its address with `%s` for the words (empty for custom). */
export interface Engine {
  id: EngineId;
  label: string;
  template: string;
}

/** The engines, in the order the settings list them (DuckDuckGo first: it's the default). */
export const ENGINES: readonly Engine[] = [
  { id: 'ddg', label: 'DUCKDUCKGO', template: 'https://duckduckgo.com/?q=%s' },
  { id: 'google', label: 'GOOGLE', template: 'https://www.google.com/search?q=%s' },
  { id: 'bing', label: 'BING', template: 'https://www.bing.com/search?q=%s' },
  { id: 'kagi', label: 'KAGI', template: 'https://kagi.com/search?q=%s' },
  { id: 'custom', label: 'CUSTOM', template: '' },
];

/** The longest custom address kept. */
export const MAX_TEMPLATE = 500;

/** The SEARCH module's settings. */
export interface SearchSettings {
  engine: EngineId;
  /** The custom engine's address (used when `engine` is 'custom'). */
  custom: string;
}

/** A new SEARCH module's settings: DuckDuckGo, no custom address. */
export function defaultSearch(): SearchSettings {
  return { engine: 'ddg', custom: '' };
}

/** Is `t` a usable custom address: http(s), with `%s` in it, not too long? */
export function isTemplate(t: string): boolean {
  return t.length <= MAX_TEMPLATE && /^https?:\/\/[^\s]+$/i.test(t) && t.includes('%s');
}

/** The settings, checked: an unknown engine becomes the default; a custom address is kept only if usable. */
export function normalizeSearch(v: unknown): SearchSettings {
  const out = defaultSearch();
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const s = v as Record<string, unknown>;
  if (ENGINES.some((e) => e.id === s.engine)) out.engine = s.engine as EngineId;
  if (typeof s.custom === 'string' && isTemplate(s.custom.trim())) out.custom = s.custom.trim();
  // A custom engine with no usable address falls back to the default, so a search always goes somewhere.
  if (out.engine === 'custom' && !out.custom) out.engine = 'ddg';
  return out;
}

/** The engine the settings use (custom with its own address). */
export function engineOf(settings: SearchSettings): Engine {
  const engine = ENGINES.find((e) => e.id === settings.engine) ?? ENGINES[0]!;
  return engine.id === 'custom' ? { ...engine, template: settings.custom } : engine;
}

/**
 * The address that searches for `query` with the settings' engine, or null
 * when there's nothing to search for (or no usable address). The words are
 * URL-encoded wherever `%s` stands.
 */
export function searchUrl(settings: SearchSettings, query: string): string | null {
  const words = query.trim();
  const { template } = engineOf(settings);
  if (!words || !isTemplate(template)) return null;
  return template.split('%s').join(encodeURIComponent(words));
}
