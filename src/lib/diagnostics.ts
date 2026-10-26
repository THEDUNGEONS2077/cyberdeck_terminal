/**
 * src/lib/diagnostics.ts: SYSTEM's COPY DIAGNOSTICS: what this browser,
 * screen and wallpaper are doing, as one text to paste back while tuning
 * (as fluid_motion's own COPY DIAGNOSTICS on the phone).
 *
 * Layer: pure lib (the app gathers the figures; this formats them;
 * tested). Counts and settings only: no address, title or bookmark is
 * ever part of it, and nothing is sent anywhere (the user pastes it).
 */
import { type FrameSummary, summarizeFrames } from './sharpness';

/** What COPY DIAGNOSTICS reports (gathered in app/SystemPanel.tsx). */
export interface DiagnosticsInput {
  app: { version: string; build: number };
  /** The browser and OS, as the browser names them. */
  browser: string;
  /** The screen (CSS px), its pixel ratio, and the window (CSS px). */
  screen: { w: number; h: number; dpr: number; windowW: number; windowH: number };
  /** The graphics card, as WebGL names it ('' if unknown). */
  gpu: string;
  /**
   * The sizes (lib/scale.ts): UI SCALE, TEXT SIZE, MODULE SIZE, Chrome's zoom
   * as worked out and whether it's cancelled, the window's outer width (the
   * figure it's worked out from, with the window's), and the zoom the UI is drawn at.
   */
  sizes?: { ui: number; text: number; modules: number; browserZoom: number; cancelled: boolean; outerW: number; drawnAt: number };
  wallpaper: {
    id: string;
    label: string;
    mode: 'worker' | 'page';
    zoom: number;
    screenDpr: number;
    drawnDpr: number;
    safeDpr: number;
    verdict: 'full' | 'safe' | null;
    /** Its canvas (px) and its last seconds of frames: gaps and drawing times (ms); null on the page. */
    canvas: { w: number; h: number } | null;
    gaps: number[] | null;
    durations: number[] | null;
  } | null;
  /** Startup marks (ms since the page began loading), by name; NaN when not set. */
  startup: Record<string, number>;
  /** The look and the arrangement, as counts and choices. */
  layout: {
    palette: string;
    wallpaperPalette: string;
    glow: string;
    reduceMotion: boolean;
    links: number;
    areas: number;
    hidden: number;
    modules: string[];
    panelsMoved: boolean;
    brandShown: boolean;
    switchPlaces: number;
  };
  /** The bookmarks' source: live (and the bridge's version), cached, imported, or none. */
  source: string;
}

/** A number of ms, or n/a. */
const ms = (v: number) => (Number.isFinite(v) ? `${v.toFixed(v < 10 ? 2 : 0)} ms` : 'n/a');

/** The frames summed up in a line. */
function framesLine(f: FrameSummary): string {
  return `frames: ${Number.isFinite(f.fps) ? f.fps.toFixed(1) : 'n/a'} a second · gap median ${ms(f.medianGap)}, p95 ${ms(f.p95Gap)} · drawing ${ms(f.drawPerSecond)} a second, p95 ${ms(f.p95Draw)} a frame`;
}

/** The text COPY DIAGNOSTICS copies. */
export function diagnosticsText(d: DiagnosticsInput, at: Date): string {
  const lines = [
    '=== cyberdeck_terminal DIAGNOSTICS ===',
    `cyberdeck_terminal ${d.app.version} (build ${d.app.build}) · ${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`,
    d.browser,
    `screen ${d.screen.w} × ${d.screen.h} CSS px at ${d.screen.dpr}× (${Math.round(d.screen.w * d.screen.dpr)} × ${Math.round(d.screen.h * d.screen.dpr)} px) · window ${d.screen.windowW} × ${d.screen.windowH}`,
    `GPU ${d.gpu || 'unknown'}`,
  ];
  const z = d.sizes;
  if (z) {
    const pct = (n: number) => `${Math.round(n * 100)}%`;
    lines.push(
      `sizes: UI ${pct(z.ui)} · text ${pct(z.text)} · modules ${pct(z.modules)} · Chrome at ${pct(z.browserZoom)} (${z.cancelled ? 'cancelled' : 'on top'}; outer width ${z.outerW}) · UI drawn at ${z.drawnAt.toFixed(3)}×`,
    );
  }
  lines.push('--- WALLPAPER ---');
  const w = d.wallpaper;
  if (!w) lines.push('none running');
  else {
    const verdict = w.verdict === 'safe' ? 'stepped back (frames too slow)' : w.verdict === 'full' ? 'kept (frames fast enough)' : w.drawnDpr > w.safeDpr ? 'being watched' : 'not needed (the screen is no sharper than the cap)';
    lines.push(
      `${w.label} · in the ${w.mode === 'worker' ? 'worker' : 'page (no worker)'} · zoom ${Math.round(w.zoom * 100)}%`,
      `sharpness: drawn at ${w.drawnDpr}× (screen ${w.screenDpr}×, safe cap ${w.safeDpr}×) · guard ${verdict}`,
      w.canvas ? `canvas ${w.canvas.w} × ${w.canvas.h} px` : 'canvas: n/a',
      w.gaps && w.durations ? framesLine(summarizeFrames(w.gaps, w.durations)) : 'frames: n/a (on the page)',
    );
  }
  lines.push('--- STARTUP (ms since the page began loading) ---');
  lines.push(Object.entries(d.startup).map(([k, v]) => `${k} ${Number.isFinite(v) ? Math.round(v) : 'n/a'}`).join(' · ') || 'n/a');
  const l = d.layout;
  lines.push(
    '--- LAYOUT ---',
    `bookmarks: ${d.source} · ${l.links} links · ${l.areas} areas · ${l.hidden} hidden · ${l.switchPlaces} switch-to-open-tab places`,
    `modules: ${l.modules.length ? l.modules.join(', ') : 'none'} · brand panel ${l.brandShown ? 'shown' : 'off'} · panels ${l.panelsMoved ? 'moved' : 'in place'}`,
    `look: dashboard ${l.palette} · wallpaper ${l.wallpaperPalette} · glow ${l.glow} · reduce motion ${l.reduceMotion ? 'on' : 'off'}`,
    '=== END ===',
  );
  return lines.join('\n');
}
