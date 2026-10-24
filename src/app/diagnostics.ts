/**
 * src/app/diagnostics.ts: SYSTEM ▸ COPY DIAGNOSTICS: gathers what this
 * browser, screen and wallpaper are doing and copies it as text
 * (lib/diagnostics.ts formats it), to paste back while tuning.
 *
 * Layer: UI (reads the stores, the browser, and the wallpaper host). Only
 * counts and choices go in: no addresses, titles or bookmarks. Nothing is
 * sent anywhere: the clipboard is the only way out, by the user's paste.
 */
import { countLinks } from '@/lib/bookmarks';
import { type DiagnosticsInput, diagnosticsText } from '@/lib/diagnostics';
import { bookmarksStore, layoutStore } from '@/store/instance';
import { uiStore } from '@/store/ui';
import { WALLPAPER_LIST } from '@/wallpaper/catalog';
import { wallpaperReport } from '@/wallpaper/host';

import { APP_INFO } from './backupFile';
import { CATALOG } from './modules/catalog';

/** The browser and OS by name: Client Hints where the browser has them, else the user agent. */
function browserName(): string {
  const hints = (navigator as Navigator & { userAgentData?: { brands: { brand: string; version: string }[]; platform: string } }).userAgentData;
  if (!hints) return navigator.userAgent;
  // Chrome lists made-up brands too ("Not A Brand"), to keep sites honest: left out.
  const brands = hints.brands.filter((b) => !/not.?a.?brand/i.test(b.brand)).map((b) => `${b.brand} ${b.version}`);
  return `${brands.join(' · ')} · ${hints.platform}`;
}

/** The graphics card, as WebGL names it (one throwaway context, released at once); '' if it can't say. */
function gpuName(): string {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return '';
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return name;
  } catch {
    return '';
  }
}

/** When each startup mark was set (ms since the page began loading). */
function startupMarks(): Record<string, number> {
  const at = (name: string) => performance.getEntriesByName(name, 'mark')[0]?.startTime ?? Number.NaN;
  return { 'app start': at('app:start'), 'layout read': at('app:booted'), 'dashboard on screen': at('app:ui'), 'wallpaper on screen': at('wallpaper:ready') };
}

/** Everything COPY DIAGNOSTICS reports, gathered now. */
async function gather(): Promise<DiagnosticsInput> {
  const { layout } = layoutStore().getState();
  const bm = bookmarksStore().getState();
  const bar = bm.status === 'live' ? bm.bar : layout.bookmarks.imported;
  const w = await wallpaperReport();
  return {
    app: APP_INFO,
    browser: browserName(),
    screen: { w: screen.width, h: screen.height, dpr: window.devicePixelRatio || 1, windowW: window.innerWidth, windowH: window.innerHeight },
    gpu: gpuName(),
    wallpaper: w && {
      id: w.id,
      label: WALLPAPER_LIST.find((x) => x.id === w.id)?.label ?? w.id,
      mode: w.mode,
      zoom: w.zoom,
      screenDpr: w.sharpness.screenDpr,
      drawnDpr: w.sharpness.drawnDpr,
      safeDpr: w.sharpness.safeDpr,
      verdict: w.sharpness.verdict,
      canvas: w.stats ? { w: w.stats.w, h: w.stats.h } : null,
      gaps: w.stats?.gaps ?? null,
      durations: w.stats?.durations ?? null,
    },
    startup: startupMarks(),
    layout: {
      palette: layout.prefs.palette,
      wallpaperPalette: layout.prefs.wallpaperPalette,
      glow: layout.prefs.rainGlow,
      reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      links: bar ? countLinks(bar) : 0,
      areas: layout.bookmarks.arrangement.areas.length,
      hidden: layout.bookmarks.arrangement.hidden.length,
      modules: layout.modules.map((m) => CATALOG[m.kind].label),
      panelsMoved: layout.panels.nav !== null || layout.panels.brand !== null,
      brandShown: !layout.panels.brandOff,
      switchPlaces: layout.prefs.switchTabs.length,
    },
    source: bm.status === 'live' ? `live (bridge ${bm.bridgeVersion ?? '?'})` : layout.bookmarks.imported ? 'imported copy' : 'none',
  };
}

/** COPY DIAGNOSTICS: gathers, copies, and says so (or that it couldn't). */
export async function copyDiagnostics(): Promise<void> {
  try {
    await navigator.clipboard.writeText(diagnosticsText(await gather(), new Date()));
    uiStore.getState().showToast('DIAGNOSTICS COPIED · PASTE THEM WHERE YOU LIKE');
  } catch {
    uiStore.getState().showToast('COULDN’T COPY THE DIAGNOSTICS');
  }
}
