// @ts-nocheck
/**
 * Return / refund workflow.
 * Admin generates a short-lived token → shares via WhatsApp/email/SMS.
 * Customer opens /return/<token> within window → submits reason+photos.
 * After submit, admin reviews in Admin → Returns tab.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function randomToken(len = 32) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

async function getDefaultExpiryMinutes(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "default")
    .maybeSingle();
  const m = Number((data?.settings as any)?.returnLinkExpiryMinutes);
  return Number.isFinite(m) && m > 0 ? m : 30;
}

// ─── Admin: create return link ────────────────────────────────────────────────
export const createReturnLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderNumber: z.string().min(1).max(100),
    expiryMinutes: z.number().int().min(5).max(1440).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: order, error: oerr } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, items, total, user_id")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (oerr || !order) throw new Error("Order not found");

    const minutes = data.expiryMinutes ?? (await getDefaultExpiryMinutes());
    const token = randomToken();
    const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();

    const { error } = await supabaseAdmin.from("return_requests").insert({
      order_number: order.order_number,
      order_id: order.id,
      user_id: order.user_id,
      customer_name: order.customer_name || "",
      customer_email: order.customer_email || "",
      customer_phone: order.customer_phone || "",
      items: order.items || [],
      amount: order.total || 0,
      access_token: token,
      token_expires_at: expiresAt,
      status: "awaiting_submission",
    });
    if (error) throw new Error(error.message);

    return {
      ok: true,
      token,
      expiresAt,
      expiryMinutes: minutes,
      // path only — caller can prefix with origin
      path: `/return/${token}`,
    };
  });

// ─── Public: fetch return by token ────────────────────────────────────────────
export const getReturnByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("return_requests")
      .select("id, order_number, customer_name, items, amount, status, token_expires_at, submitted_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (!row) return { ok: false, error: "Invalid or expired link" };
    if (new Date(row.token_expires_at).getTime() < Date.now()) {
      return { ok: false, error: "This link has expired. Contact support for a new one." };
    }
    if (row.submitted_at) {
      return { ok: false, error: "Return request already submitted. We'll be in touch." };
    }
    return {
      ok: true,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      items: row.items || [],
      amount: row.amount,
      expiresAt: row.token_expires_at,
    };
  });

// ─── Public: submit return ────────────────────────────────────────────────────
export const submitReturn = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().min(8).max(64),
    reason: z.string().min(3).max(200),
    details: z.string().max(2000).optional().default(""),
    photos: z.array(z.string().url().max(2000)).max(6).optional().default([]),
    refundMode: z.enum(["wallet", "source"]).default("wallet"),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("return_requests")
      .select("id, token_expires_at, submitted_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (!row) throw new Error("Invalid link");
    if (new Date(row.token_expires_at).getTime() < Date.now()) throw new Error("Link expired");
    if (row.submitted_at) throw new Error("Already submitted");

    const { error } = await supabaseAdmin
      .from("return_requests")
      .update({
        reason: data.reason,
        details: data.details,
        photos: data.photos,
        refund_mode: data.refundMode,
        status: "pending_review",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

// ─── Admin: list returns ──────────────────────────────────────────────────────
export const listReturns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    status: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("return_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows || [] };
  });

// ─── Admin: update return status / notes ──────────────────────────────────────
export const updateReturn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["awaiting_submission", "pending_review", "approved", "rejected", "refunded", "completed"]).optional(),
    adminNotes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.adminNotes !== undefined) patch.admin_notes = data.adminNotes;
    const { error } = await supabaseAdmin.from("return_requests").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
