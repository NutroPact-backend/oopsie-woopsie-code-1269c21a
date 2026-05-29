// @ts-nocheck
/**
 * Web Push client helpers (browser only). Lazy — does nothing if the user
 * has not granted permission or VAPID public key is missing.
 */
import { subscribePush, unsubscribePush, getVapidPublicKey } from "./push.functions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
  return out;
}

export async function pushSupported(): Promise<boolean> {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (!(await pushSupported())) return { ok: false, reason: "unsupported" };

  let publicKey = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) || "";
  if (!publicKey) {
    try {
      const r = await getVapidPublicKey();
      publicKey = r.publicKey;
    } catch { /* no-op */ }
  }
  if (!publicKey) return { ok: false, reason: "not_configured" };

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "denied" };

  const reg = await navigator.serviceWorker.register("/sw-push.js");
  await navigator.serviceWorker.ready;

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = urlBase64ToUint8Array(publicKey);
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key.buffer.slice(key.byteOffset, key.byteOffset + key.byteLength) as ArrayBuffer,
    });
  }
  const json = sub.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } };
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return { ok: false, reason: "bad_subscription" };
  }
  await subscribePush({ data: {
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    userAgent: navigator.userAgent.slice(0, 256),
  }});
  return { ok: true };
}

export async function disablePushNotifications(): Promise<void> {
  if (!(await pushSupported())) return;
  const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try { await unsubscribePush({ data: { endpoint: sub.endpoint } }); } catch {}
    try { await sub.unsubscribe(); } catch {}
  }
}
