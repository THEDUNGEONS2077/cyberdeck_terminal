/**
 * src/lib/versions.ts: comparing dotted version numbers (`1.0.0`).
 *
 * Layer: pure lib. Used to tell whether the installed bridge extension is
 * older than the one this page ships (then SYSTEM offers the update).
 */

/** Negative if `a` < `b`, 0 if equal, positive if `a` > `b`. Missing parts count as 0; non-numbers as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((x) => parseInt(x, 10) || 0);
  const pb = b.split('.').map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
