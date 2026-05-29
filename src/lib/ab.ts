// @ts-nocheck
// Lightweight client-side A/B experiment helper. No deps. Lite-mode safe.
import { recordAbExposure, recordAbConversion } from './admin-phase3.functions';

const STORAGE_KEY = 'np_ab_assignments';
const SESSION_KEY = 'np_ab_session';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function getAssignments(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

function saveAssignments(a: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(a)); } catch {}
}

/** Deterministic variant pick based on weights. Returns variant id. */
export function pickVariant(
  experimentId: string,
  variants: { id: string; weight?: number }[],
  opts?: { userId?: string }
): string {
  if (!variants?.length) return 'control';
  const assignments = getAssignments();
  if (assignments[experimentId]) return assignments[experimentId];

  const total = variants.reduce((s, v) => s + (v.weight ?? 1), 0);
  let r = Math.random() * total;
  let chosen = variants[0].id;
  for (const v of variants) {
    r -= (v.weight ?? 1);
    if (r <= 0) { chosen = v.id; break; }
  }
  assignments[experimentId] = chosen;
  saveAssignments(assignments);

  // Fire exposure (best-effort, non-blocking)
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      recordAbExposure({ data: { experimentId, variant: chosen, sessionId: getSessionId() } }).catch(() => {});
    });
  } else {
    setTimeout(() => {
      recordAbExposure({ data: { experimentId, variant: chosen, sessionId: getSessionId() } }).catch(() => {});
    }, 100);
  }

  return chosen;
}

export function trackAbConversion(
  experimentId: string,
  opts?: { value?: number; orderNumber?: string; userId?: string }
) {
  const variant = getAssignments()[experimentId];
  if (!variant) return;
  const { userId: _u, orderNumber: _o, value: _v, ...rest } = (opts || {}) as any;
  recordAbConversion({ data: { experimentId, variant } }).catch(() => {});
}

export function getActiveVariant(experimentId: string): string | undefined {
  return getAssignments()[experimentId];
}
