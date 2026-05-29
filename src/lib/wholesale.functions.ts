// @ts-nocheck
/**
 * Wholesale / B2B pricing.
 * Admin marks a customer as wholesale with a discount % and min order.
 * At checkout, if user is wholesale and subtotal >= min_order, the discount
 * is applied as a separate line.
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

export const getMyWholesale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("is_wholesale,wholesale_discount_percent,wholesale_min_order")
      .eq("id", context.userId).maybeSingle();
    return {
      isWholesale: !!data?.is_wholesale,
      discountPercent: Number(data?.wholesale_discount_percent || 0),
      minOrder: Number(data?.wholesale_min_order || 0),
    };
  });

export const adminListWholesale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    search: z.string().max(120).default(""),
    onlyEnabled: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("profiles")
      .select("id,name,email,phone,is_wholesale,wholesale_discount_percent,wholesale_min_order,wholesale_notes,created_at")
      .order("is_wholesale", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.onlyEnabled) q = q.eq("is_wholesale", true);
    if (data.search) {
      q = q.or(`name.ilike.%${data.search}%,email.ilike.%${data.search}%,phone.ilike.%${data.search}%`);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { users: rows ?? [] };
  });

export const adminSetWholesale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    userId: z.string().uuid(),
    isWholesale: z.boolean(),
    discountPercent: z.number().min(0).max(80).default(0),
    minOrder: z.number().min(0).max(10_000_000).default(0),
    notes: z.string().max(500).default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("profiles").update({
      is_wholesale: data.isWholesale,
      wholesale_discount_percent: data.discountPercent,
      wholesale_min_order: data.minOrder,
      wholesale_notes: data.notes || null,
    }).eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
