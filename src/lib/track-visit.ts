// @ts-nocheck
/**
 * Tiny visitor tracker — lite-mode friendly.
 * Fires once per page on idle; uses sendBeacon (zero-blocking).
 * Stays anonymous; respects saveData / 2G.
 */
import { isLiteMode, onIdle } from "./lite";

const SS_KEY = "sv_sid";
const SENT_KEY = "sv_last_path";

function sid(): string {
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

function utm(search: string) {
  try {
    const p = new URLSearchParams(search);
    return {
      utm_source: p.get("utm_source") || sessionStorage.getItem("utm_source") || null,
      utm_medium: p.get("utm_medium") || sessionStorage.getItem("utm_medium") || null,
      utm_campaign: p.get("utm_campaign") || sessionStorage.getItem("utm_campaign") || null,
    };
  } catch { return { utm_source: null, utm_medium: null, utm_campaign: null }; }
}

export function trackVisit() {
  if (typeof window === "undefined") return;
  // Skip admin and api paths
  const path = window.location.pathname;
  if (path.startsWith("/admin") || path.startsWith("/api/")) return;

  // Dedupe per path within session
  try {
    if (sessionStorage.getItem(SENT_KEY) === path) return;
    sessionStorage.setItem(SENT_KEY, path);
  } catch {}

  const u = utm(window.location.search);
  // Persist utm for downstream attribution
  try {
    if (u.utm_source) sessionStorage.setItem("utm_source", u.utm_source);
    if (u.utm_medium) sessionStorage.setItem("utm_medium", u.utm_medium);
    if (u.utm_campaign) sessionStorage.setItem("utm_campaign", u.utm_campaign);
  } catch {}

  const payload = {
    session_id: sid(),
    path: path.slice(0, 500),
    referrer: (document.referrer || "").slice(0, 500) || null,
    device: device(),
    ...u,
  };

  onIdle(() => {
    try {
      const body = JSON.stringify(payload);
      const url = "/api/public/track-visit";
      if (navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: "application/json" }));
      } else {
        fetch(url, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
      }
    } catch {}
  }, isLiteMode() ? 3000 : 1000);
}
