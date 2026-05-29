// @ts-nocheck
/**
 * Gift Cards module.
 * Admin issues codes with an amount + expiry; customer redeems code
 * which credits the equivalent amount to their wallet (via wallet_transactions).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

function genCode(prefix = "GC") {
  // 16-char readable code: GC-XXXX-XXXX-XXXX (CSPRNG)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) => {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return Array.from({ length: n }, (_, i) => chars[buf[i] % chars.length]).join("");
  };
  return `${prefix}-${part(4)}-${part(4)}-${part(4)}`;
}

// ─── Admin ───────────────────────────────────────────────────────────

export const adminIssueGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    amount: z.number().min(1).max(100000),
    recipientEmail: z.string().email().or(z.literal("")).default(""),
    recipientName: z.string().max(120).default(""),
    senderName: z.string().max(120).default(""),
    message: z.string().max(500).default(""),
    expiresInDays: z.number().int().min(1).max(1825).default(365),
    notes: z.string().max(500).default(""),
    code: z.string().min(6).max(40).regex(/^[A-Z0-9-]+$/).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const code = (data.code || genCode()).toUpperCase();
    const expires = new Date(Date.now() + data.expiresInDays * 86400_000).toISOString();
    const { data: row, error } = await supabaseAdmin.from("gift_cards").insert({
      code, amount: data.amount, balance: data.amount,
      recipient_email: data.recipientEmail, recipient_name: data.recipientName,
      sender_name: data.senderName, message: data.message,
      expires_at: expires, notes: data.notes,
      issued_by_user_id: context.userId, source: "admin",
    }).select("*").single();
    if (error) throw new Error(error.message);
    return { card: row };
  });

export const adminListGiftCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    status: z.enum(["all", "active", "redeemed", "expired", "disabled"]).default("all"),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("gift_cards").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { cards: rows ?? [] };
  });

export const adminUpdateGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "disabled"]).optional(),
    expiresAt: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.expiresAt) patch.expires_at = data.expiresAt;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await supabaseAdmin.from("gift_cards").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Customer ────────────────────────────────────────────────────────

export const checkGiftCard = createServerFn({ method: "POST" })
  .inputValidator((d: any) => z.object({
    code: z.string().min(4).max(40),
  }).parse(d))
  .handler(async ({ data }) => {
    const code = data.code.trim().toUpperCase();
    const { data: row } = await supabaseAdmin.from("gift_cards")
      .select("code,balance,amount,currency,status,expires_at")
      .eq("code", code).maybeSingle();
    if (!row) return { valid: false, reason: "Invalid code" };
    if (row.status === "disabled") return { valid: false, reason: "Disabled" };
    if (row.status === "redeemed" || Number(row.balance) <= 0) return { valid: false, reason: "Already redeemed" };
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return { valid: false, reason: "Expired" };
    return { valid: true, balance: Number(row.balance), currency: row.currency };
  });

export const redeemGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    code: z.string().min(4).max(40),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const code = data.code.trim().toUpperCase();
    const { data: card, error: cErr } = await supabaseAdmin.from("gift_cards")
      .select("*").eq("code", code).maybeSingle();
    if (cErr) throw new Error(cErr.message);
    if (!card) throw new Error("Invalid gift card code");
    if (card.status === "disabled") throw new Error("This gift card is disabled");
    if (card.status === "redeemed" || Number(card.balance) <= 0) throw new Error("Gift card already redeemed");
    if (card.expires_at && new Date(card.expires_at).getTime() < Date.now()) throw new Error("Gift card expired");

    const amount = Number(card.balance);

    // Atomic-ish: mark redeemed first; if wallet credit fails we still log
    const { error: uErr } = await supabaseAdmin.from("gift_cards").update({
      status: "redeemed",
      balance: 0,
      redeemed_by_user_id: userId,
      redeemed_at: new Date().toISOString(),
    }).eq("id", card.id).eq("status", "active");
    if (uErr) throw new Error(uErr.message);

    const { error: wErr } = await supabaseAdmin.from("wallet_transactions").insert({
      user_id: userId,
      amount,
      type: "credit",
      source: "giftcard",
      note: `Gift card ${card.code}`,
    });
    if (wErr) throw new Error(wErr.message);

    return { ok: true, credited: amount };
  });

export const myRedeemedGiftCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin.from("gift_cards")
      .select("code,amount,redeemed_at,currency")
      .eq("redeemed_by_user_id", context.userId)
      .order("redeemed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { cards: data ?? [] };
  });
