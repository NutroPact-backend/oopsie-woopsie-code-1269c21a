// @ts-nocheck
// Minimal SSR error capture used by src/server.ts
let lastError: unknown = null;

if (typeof globalThis !== "undefined") {
  const g = globalThis as unknown as {
    addEventListener?: (e: string, cb: (ev: { error?: unknown; reason?: unknown }) => void) => void;
  };
  g.addEventListener?.("error", (ev) => { lastError = ev?.error ?? lastError; });
  g.addEventListener?.("unhandledrejection", (ev) => { lastError = ev?.reason ?? lastError; });
}

export function consumeLastCapturedError(): unknown {
  const err = lastError;
  lastError = null;
  return err;
}
