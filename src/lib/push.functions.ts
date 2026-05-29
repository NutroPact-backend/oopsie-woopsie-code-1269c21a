// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import webpush from "web-push";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Web Push (VAPID) helpers.
 *
 * Required env (set when keys are ready):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or https URL)
 *
 * Public env exposed to browser via VITE_VAPID_PUBLIC_KEY (same value).
 *
 * Generate keys once with: npx web-push generate-vapid-keys
 */

function configureVapid(): boolean {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subj = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
  if (!pub || !priv) return false;
  try {
    webpush.setVapidDetails(subj, pub, priv);
    return true;
  } catch {
    return false;
  }
}

export const getVapidPublicKey = createServerFn({ method: "GET" })
  .handler(async () => {
    return { publicKey: process.env.VAPID_PUBLIC_KEY || "" };
  });

export const subscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      endpoint: z.string().url().max(2000),
      p256dh: z.string().min(1).max(512),
      auth: z.string().min(1).max(512),
      userAgent: z.string().max(512).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("push_subscriptions").upsert({
      user_id: context.userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
      user_agent: data.userAgent || null,
      last_used_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    return { ok: true };
  });

export const unsubscribePush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ endpoint: z.string().url().max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    await supabaseAdmin.from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    return { ok: true };
  });

/**
 * Send a push to one user (all their devices). Admin-only.
 * Body is JSON: { title, body, url? }
 */
export const sendPushToUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      userId: z.string().uuid(),
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(500),
      url: z.string().max(512).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    // admin check
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Admin only");

    if (!configureVapid()) throw new Error("VAPID not configured");

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions").select("*").eq("user_id", data.userId);
    if (!subs?.length) return { sent: 0 };

    const payload = JSON.stringify({ title: data.title, body: data.body, url: data.url || "/" });
    let sent = 0;
    const dead: string[] = [];
    await Promise.all(subs.map(async (s: any) => {
      try {
        await webpush.sendNotification({
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }, payload);
        sent += 1;
      } catch (err: any) {
        if (err?.statusCode === 404 || err?.statusCode === 410) dead.push(s.endpoint);
      }
    }));
    if (dead.length) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
    }
    return { sent, removed: dead.length };
  });
