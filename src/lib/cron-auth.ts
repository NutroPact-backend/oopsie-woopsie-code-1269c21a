// @ts-nocheck
/**
 * Shared cron / system auth for createServerFn handlers.
 *
 * Validates an `Authorization: Bearer <secret>` header against either the
 * `MESSAGING_CRON_SECRET` env var or `site_settings.messaging.cronSecret`.
 *
 * Use inside .handler() of any system-only server function that is otherwise
 * unauthenticated (cron drainers, admin maintenance, carrier triggers).
 */
import { getRequestHeader } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function requireCronSecret(): Promise<void> {
  const auth = getRequestHeader("authorization") || getRequestHeader("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  const envSecret = (process.env.MESSAGING_CRON_SECRET || "").trim();

  let expected = envSecret;
  if (!expected) {
    const { data } = await supabaseAdmin
      .from("site_settings")
      .select("settings")
      .eq("key", "messaging")
      .maybeSingle();
    expected = ((data?.settings as any)?.cronSecret as string | undefined)?.trim() || "";
  }
  if (!expected) {
    // Fail-closed: never run if no secret is configured.
    throw new Error("Unauthorized: cron secret not configured");
  }
  if (!token || !timingSafeEqual(token, expected)) {
    throw new Error("Unauthorized: invalid cron secret");
  }
}
