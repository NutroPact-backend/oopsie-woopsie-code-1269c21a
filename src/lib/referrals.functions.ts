// @ts-nocheck
/**
 * Referral program.
 * - Each user gets a unique shareable code.
 * - Friend signs up via ?ref=CODE; pending referral row is created.
 * - Admin (or first paid order trigger) marks the referral completed,
 *   crediting wallet rewards to both referrer and referred user.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_REFERRER_REWARD = 150;
const DEFAULT_REFERRED_REWARD = 100;

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

function genCode(seed: string) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return `NP${out}`;
}

async function ensureCode(userId: string) {
  const { data: existing } = await supabaseAdmin
    .from("referral_codes").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing;
  for (let i = 0; i < 5; i++) {
    const code = genCode(userId);
    const { data, error } = await supabaseAdmin
      .from("referral_codes")
      .insert({ user_id: userId, code })
      .select("*").single();
    if (!error) return data;
  }
  throw new Error("Could not generate unique code");
}

// ─── Customer ────────────────────────────────────────────────────────

export const getMyReferralCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const row = await ensureCode(context.userId);
    const { data: refs } = await supabaseAdmin
      .from("referrals").select("id,status,referrer_reward,completed_at,created_at,referred_user_id")
      .eq("referrer_user_id", context.userId)
      .order("created_at", { ascending: false });
    const completed = (refs || []).filter(r => r.status === "completed");
    const earned = completed.reduce((s, r) => s + Number(r.referrer_reward || 0), 0);
    return {
      code: row.code,
      uses: row.uses_count,
      totalReferred: (refs || []).length,
      completed: completed.length,
      pending: (refs || []).filter(r => r.status === "pending").length,
      earned,
      referrals: refs || [],
    };
  });

export const registerReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    code: z.string().min(4).max(40),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const code = data.code.trim().toUpperCase();
    const { userId } = context;

    // self-ref guard
    const { data: own } = await supabaseAdmin
      .from("referral_codes").select("user_id").eq("user_id", userId).maybeSingle();
    if (own?.user_id === userId) {
      const { data: c } = await supabaseAdmin
        .from("referral_codes").select("code").eq("user_id", userId).maybeSingle();
      if (c?.code === code) throw new Error("Cannot use your own code");
    }

    const { data: ref } = await supabaseAdmin
      .from("referral_codes").select("user_id").eq("code", code).maybeSingle();
    if (!ref) throw new Error("Invalid referral code");
    if (ref.user_id === userId) throw new Error("Cannot use your own code");

    const { data: existing } = await supabaseAdmin
      .from("referrals").select("id,status").eq("referred_user_id", userId).maybeSingle();
    if (existing) return { ok: true, already: true, status: existing.status };

    const { error } = await supabaseAdmin.from("referrals").insert({
      referrer_user_id: ref.user_id,
      referred_user_id: userId,
      code,
      status: "pending",
      referrer_reward: DEFAULT_REFERRER_REWARD,
      referred_reward: DEFAULT_REFERRED_REWARD,
    });
    if (error) throw new Error(error.message);

    const { data: rc } = await supabaseAdmin.from("referral_codes")
      .select("uses_count").eq("code", code).maybeSingle();
    if (rc) {
      await supabaseAdmin.from("referral_codes")
        .update({ uses_count: (rc.uses_count || 0) + 1 })
        .eq("code", code);
    }

    return { ok: true };
  });

// ─── Admin ───────────────────────────────────────────────────────────

export const adminListReferrals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    status: z.enum(["all", "pending", "completed", "cancelled"]).default("all"),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("referrals").select("*").order("created_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const ids = Array.from(new Set([
      ...(rows || []).map(r => r.referrer_user_id),
      ...(rows || []).map(r => r.referred_user_id),
    ]));
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,name,email,phone").in("id", ids)
      : { data: [] as any[] };
    const pmap = new Map((profiles || []).map((p: any) => [p.id, p]));

    return {
      referrals: (rows || []).map(r => ({
        ...r,
        referrer: pmap.get(r.referrer_user_id) || null,
        referred: pmap.get(r.referred_user_id) || null,
      })),
    };
  });

export const adminCompleteReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: r, error } = await supabaseAdmin
      .from("referrals").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!r) throw new Error("Not found");
    if (r.status === "completed") return { ok: true, already: true };

    await supabaseAdmin.from("referrals").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", r.id);

    const txs: any[] = [];
    if (Number(r.referrer_reward) > 0) {
      txs.push({
        user_id: r.referrer_user_id,
        amount: Number(r.referrer_reward),
        type: "credit", source: "referral",
        note: `Referral reward (you invited a friend)`,
      });
    }
    if (Number(r.referred_reward) > 0) {
      txs.push({
        user_id: r.referred_user_id,
        amount: Number(r.referred_reward),
        type: "credit", source: "referral",
        note: `Welcome bonus via referral code ${r.code}`,
      });
    }
    if (txs.length) {
      const { error: wErr } = await supabaseAdmin.from("wallet_transactions").insert(txs);
      if (wErr) throw new Error(wErr.message);
    }
    return { ok: true };
  });

export const adminCancelReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("referrals")
      .update({ status: "cancelled" }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
