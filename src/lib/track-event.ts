// @ts-nocheck
/**
 * Site event beacon — pushes granular behaviour events
 * (page_view, view_item, add_to_cart, wishlist_add, begin_checkout,
 *  purchase, search, heartbeat) to /api/public/track-event for the
 * admin Live dashboard. Fire-and-forget; never throws.
 */

const SS_KEY = "sv_sid";

function sid(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let s = sessionStorage.getItem(SS_KEY);
    if (!s) {
      s = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(SS_KEY, s);
    }
    return s;
  } catch { return "anon" + Date.now().toString(36); }
}

function device(): "mobile" | "desktop" | "tablet" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|Tablet|PlayBook/i.test(ua)) return "tablet";
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return "mobile";
  return "desktop";
}

export type SiteEventType =
  | "page_view"
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "wishlist_add"
  | "wishlist_remove"
  | "begin_checkout"
  | "purchase"
  | "search"
  | "heartbeat";

export interface SiteEventPayload {
  product_id?: string | null;
  product_name?: string | null;
  value?: number | null;
  quantity?: number | null;
  meta?: Record<string, any>;
}

export function trackSiteEvent(eventType: SiteEventType, payload: SiteEventPayload = {}) {
  if (typeof window === "undefined") return;
  try {
    const path = window.location.pathname;
    // Skip admin/api noise
    if (path.startsWith("/admin") || path.startsWith("/api/")) return;
    const body = JSON.stringify({
      session_id: sid(),
      event_type: eventType,
      path: path.slice(0, 500),
      device: device(),
      product_id: payload.product_id ?? null,
      product_name: payload.product_name ?? null,
      value: payload.value ?? null,
      quantity: payload.quantity ?? null,
      meta: payload.meta ?? {},
    });
    const url = "/api/public/track-event";
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
    } else {
      fetch(url, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } catch {}
}

// ─── Heartbeat for time-on-site ────────────────────────────────────────────
let heartbeatTimer: number | null = null;

export function startHeartbeat(intervalMs = 30_000) {
  if (typeof window === "undefined" || heartbeatTimer != null) return;
  // Initial ping so even single-page sessions register a duration
  trackSiteEvent("heartbeat");
  heartbeatTimer = window.setInterval(() => {
    if (document.visibilityState === "visible") trackSiteEvent("heartbeat");
  }, intervalMs) as unknown as number;

  // Final ping on tab close so we capture the last timestamp
  window.addEventListener("pagehide", () => trackSiteEvent("heartbeat"), { capture: true });
}