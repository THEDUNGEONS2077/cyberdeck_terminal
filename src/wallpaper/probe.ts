/**
 * src/wallpaper/probe.ts: reads a wallpaper's canvas for the browser tests
 * (the host's window.__cyberdeckRain.pixels, in its worker or on the page).
 *
 * Layer: wallpaper (canvas; no DOM). Works on a 2D canvas or a WebGL 2 one
 * (ORBIT): whichever context the canvas has. A pixel counts as lit when it
 * shows (alpha above a faint residue) and isn't near-black.
 */

/** How much of a canvas is lit, a fingerprint of it (changes when the picture moves), and its size in pixels. */
export interface PixelsProbe {
  lit: number;
  sig: number;
  /** The canvas's pixels across and down (zoomed or not, as many as at 100%: types.ts zoomedSize). */
  w: number;
  h: number;
}

/** Reads every pixel of `canvas` (RGBA, top-down or bottom-up: the measures don't care). */
function readAll(canvas: HTMLCanvasElement | OffscreenCanvas): Uint8Array | Uint8ClampedArray | null {
  const { width, height } = canvas;
  if (!width || !height) return null;
  const c = canvas as OffscreenCanvas;
  // A canvas has one kind of context: asking for another returns null.
  const gl = c.getContext('webgl2');
  if (gl) {
    const data = new Uint8Array(width * height * 4);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return data;
  }
  return c.getContext('2d')?.getImageData(0, 0, width, height).data ?? null;
}

/** Measures `canvas` now. */
export function measurePixels(canvas: HTMLCanvasElement | OffscreenCanvas | null): PixelsProbe {
  const data = canvas ? readAll(canvas) : null;
  const w = canvas?.width ?? 0;
  const h = canvas?.height ?? 0;
  if (!data?.length) return { lit: 0, sig: 0, w, h };
  let lit = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 40 && Math.max(data[i]!, data[i + 1]!, data[i + 2]!) > 40) lit++;
  // A fingerprint from a sample of pixels (every 997th): enough to tell two moments apart.
  let sig = 0;
  for (let i = 3; i < data.length; i += 4 * 997) sig = (sig * 31 + data[i]! + data[i - 2]! + data[i - 3]!) >>> 0;
  return { lit: lit / (data.length / 4), sig, w, h };
}
