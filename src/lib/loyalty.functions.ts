// @ts-nocheck
/**
 * Loyalty Tiers — Bronze/Silver/Gold based on lifetime spend on paid orders.
 * - Admin CRUD on tier thresholds + perks.
 * - recomputeMyTier / adminRecomputeAll: sums paid orders -> picks highest qualifying tier.
 * - getMyLoyalty: returns current tier, lifetime spend, next-tier delta.
 * - applyLoyaltyDiscount: used at checkout to apply tier discount %.
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

async function pickTier(spend: number) {
  const { data: tiers } = await supabaseAdmin.from("loyalty_tiers")
    .select("*").eq("active", true).order("min_lifetime_spend", { ascending: true });
  let chosen = null as any;
  for (const t of tiers || []) {
    if (spend >= Number(t.min_lifetime_spend)) chosen = t;
  }
  return chosen;
}

async function computeForUser(userId: string) {
  const { data: orders } = await supabaseAdmin.from("orders")
    .select("total,payment_status,order_status")
    .eq("user_id", userId)
    .eq("payment_status", "paid");
  const valid = (orders || []).filter(o => o.order_status !== "cancelled" && o.order_status !== "refunded");
  const spend = valid.reduce((s, o) => s + Number(o.total || 0), 0);
  const tier = await pickTier(spend);
  await supabaseAdmin.from("loyalty_status").upsert({
    user_id: userId,
    tier_id: tier?.id ?? null,
    lifetime_spend: spend,
    order_count: valid.length,
    last_recalc_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  return { spend, orderCount: valid.length, tier };
}

// ─── Public / customer ──────────────────────────────────────────────

export const listTiers = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data } = await supabaseAdmin.from("loyalty_tiers")
      .select("*").eq("active", true).order("min_lifetime_spend", { ascending: true });
    return { tiers: data || [] };
  });

export const getMyLoyalty = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const computed = await computeForUser(userId);
    const { data: tiers } = await supabaseAdmin.from("loyalty_tiers")
      .select("*").eq("active", true).order("min_lifetime_spend", { ascending: true });
    const next = (tiers || []).find(t => Number(t.min_lifetime_spend) > computed.spend) || null;
    return {
      spend: computed.spend,
      orderCount: computed.orderCount,
      tier: computed.tier,
      nextTier: next,
      toNext: next ? Math.max(0, Number(next.min_lifetime_spend) - computed.spend) : 0,
      tiers: tiers || [],
    };
  });

export const applyLoyaltyDiscount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ subtotal: z.number().min(0).max(1_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: st } = await supabaseAdmin.from("loyalty_status")
      .select("tier_id").eq("user_id", context.userId).maybeSingle();
    if (!st?.tier_id) return { discount: 0, percent: 0, freeShipping: false };
    const { data: tier } = await supabaseAdmin.from("loyalty_tiers")
      .select("*").eq("id", st.tier_id).maybeSingle();
    if (!tier) return { discount: 0, percent: 0, freeShipping: false };
    const pct = Number(tier.discount_percent || 0);
    return {
      discount: Math.round((data.subtotal * pct) / 100 * 100) / 100,
      percent: pct,
      freeShipping: !!tier.free_shipping,
      tierName: tier.name,
    };
  });

// ─── Admin ──────────────────────────────────────────────────────────

export const adminListTiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("loyalty_tiers").select("*").order("sort_order");
    return { tiers: data || [] };
  });

export const adminSaveTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(40),
    min_lifetime_spend: z.number().min(0).max(10_000_000),
    discount_percent: z.number().min(0).max(50),
    free_shipping: z.boolean(),
    perks: z.array(z.string().max(200)).max(20).default([]),
    badge_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#cd7f32"),
    active: z.boolean().default(true),
    sort_order: z.number().int().min(0).max(100).default(0),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch = { ...data, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error } = await supabaseAdmin.from("loyalty_tiers").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("loyalty_tiers").insert(patch).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteTier = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("loyalty_tiers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRecomputeAll = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    // Sum paid, non-cancelled orders grouped by user.
    const { data: orders } = await supabaseAdmin.from("orders")
      .select("user_id,total,payment_status,order_status")
      .eq("payment_status", "paid");
    const byUser = new Map<string, { spend: number; count: number }>();
    for (const o of orders || []) {
      if (!o.user_id) continue;
      if (o.order_status === "cancelled" || o.order_status === "refunded") continue;
      const cur = byUser.get(o.user_id) || { spend: 0, count: 0 };
      cur.spend += Number(o.total || 0);
      cur.count += 1;
      byUser.set(o.user_id, cur);
    }
    let updated = 0;
    for (const [uid, agg] of byUser) {
      const tier = await pickTier(agg.spend);
      await supabaseAdmin.from("loyalty_status").upsert({
        user_id: uid, tier_id: tier?.id ?? null,
        lifetime_spend: agg.spend, order_count: agg.count,
        last_recalc_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      updated++;
    }
    return { updated };
  });

export const adminListMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    limit: z.number().int().min(1).max(500).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin.from("loyalty_status")
      .select("user_id,lifetime_spend,order_count,tier_id,updated_at")
      .order("lifetime_spend", { ascending: false }).limit(data.limit);
    const userIds = (rows || []).map(r => r.user_id);
    const tierIds = Array.from(new Set((rows || []).map(r => r.tier_id).filter(Boolean))) as string[];
    const [{ data: profiles }, { data: tiers }] = await Promise.all([
      userIds.length ? supabaseAdmin.from("profiles").select("id,name,email").in("id", userIds) : Promise.resolve({ data: [] } as any),
      tierIds.length ? supabaseAdmin.from("loyalty_tiers").select("id,name,badge_color").in("id", tierIds) : Promise.resolve({ data: [] } as any),
    ]);
    const pMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    const tMap = new Map((tiers || []).map((t: any) => [t.id, t]));
    return {
      members: (rows || []).map(r => ({
        ...r,
        profile: pMap.get(r.user_id) || null,
        tier: r.tier_id ? tMap.get(r.tier_id) || null : null,
      })),
    };
  });
