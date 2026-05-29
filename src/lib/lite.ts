// @ts-nocheck
/**
 * Lite-mode helpers — detect 2G / data saver to skip non-essential UI.
 */
export function isLiteMode(): boolean {
  if (typeof navigator === "undefined") return false;
  const c: any = (navigator as any).connection;
  if (!c) return false;
  if (c.saveData) return true;
  const t = c.effectiveType;
  return t === "slow-2g" || t === "2g";
}

/** Run cb when browser is idle (or after fallback timeout). SSR-safe. */
export function onIdle(cb: () => void, timeout = 2500): () => void {
  if (typeof window === "undefined") return () => {};
  const ric: any = (window as any).requestIdleCallback;
  if (ric) {
    const id = ric(cb, { timeout });
    return () => (window as any).cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, timeout);
  return () => window.clearTimeout(id);
}
