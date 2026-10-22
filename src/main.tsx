/**
 * src/main.tsx: the first code to run: the wallpaper, at once.
 *
 * Layer: entry point (first stage). It holds only the styles and the
 * wallpaper (wallpaper/host.ts), so it's small and runs as soon as it
 * arrives: the rain starts filling while the rest of the app (React,
 * storage, the dashboard: start.tsx) is still loading, in parallel.
 */
import './styles/theme.css';
import './styles/app.css';

import { showWallpaper, wallpaperHint } from './wallpaper/host';

showWallpaper(wallpaperHint());

// The app: storage, then the dashboard (its own chunk, fetched in parallel).
void import('./start');
