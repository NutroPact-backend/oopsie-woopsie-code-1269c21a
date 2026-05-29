// @ts-nocheck
/**
 * Cloudflare Turnstile (CAPTCHA) server-side verification helper.
 *
 * Required env: TURNSTILE_SECRET_KEY
 * Public env (exposed to browser via VITE_): VITE_TURNSTILE_SITE_KEY
 *
 * Usage inside any server fn:
 *   import { verifyTurnstile } from "@/lib/turnstile.server";
 *   await verifyTurnstile(token, ip);
 *
 * If TURNSTILE_SECRET_KEY is not set, verification is skipped (no-op) so
 * the app continues to work in development without a key.
 */
export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true as const };
  if (!token || typeof token !== "string" || token.length > 4096) {
    return { ok: false, error: "missing_token" as const };
  }
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!res.ok) return { ok: false, error: `http_${res.status}` };
  const json = await res.json() as { success?: boolean; "error-codes"?: string[] };
  if (json.success) return { ok: true as const };
  return { ok: false, error: (json["error-codes"]?.[0] || "verify_failed") };
}
