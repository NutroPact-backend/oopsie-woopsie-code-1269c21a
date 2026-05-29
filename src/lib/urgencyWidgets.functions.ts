// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const WidgetSchema = z.object({
  id: z.string().uuid().optional(),
  widget_type: z.enum(["low_stock", "recent_purchase", "live_viewers", "cart_urgency"]),
  label_template: z.string().max(300).default(""),
  icon: z.string().max(40).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
  bg_color: z.string().max(20).nullable().optional(),
  animation: z.enum(["none", "pulse", "shake", "fade"]).default("none"),
  threshold: z.number().int().nullable().optional(),
  min_to_show: z.number().int().min(0).default(1),
  window_hours: z.number().int().min(1).max(168).default(24),
  exclude_product_ids: z.array(z.string()).default([]),
  include_product_ids: z.array(z.string()).default([]),
  sort_order: z.number().int().default(0),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});

async function requirePerm(userId: string, code: string) {
  const { data } = await supabaseAdmin.rpc("has_permission", { _user_id: userId, _code: code });
  if (!data) throw new Error(`Forbidden: ${code} required`);
}

// Public — list ENABLED widgets (used by PDP)
export const listPublicUrgencyWidgets = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("urgency_widgets")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { widgets: data ?? [] };
  });

// Admin — list all
export const listAllUrgencyWidgets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "urgency.view");
    const { data, error } = await supabaseAdmin
      .from("urgency_widgets").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { widgets: data ?? [] };
  });

export const upsertUrgencyWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => WidgetSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "urgency.edit");
    const payload = data as any;
    if (data.id) {
      const { error } = await supabaseAdmin.from("urgency_widgets").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("urgency_widgets").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row!.id };
  });

export const deleteUrgencyWidget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "urgency.edit");
    const { error } = await supabaseAdmin.from("urgency_widgets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Public — get real-data counts for a single product (recent purchase + cart adds).
// Lite-mode: single query, capped to last 500 orders in window, JS-side filter on items.
export const getProductUrgencyStats = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    product_id: z.string().min(1).max(100),
    window_hours: z.number().int().min(1).max(168).default(24),
  }).parse(i))
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - data.window_hours * 3_600_000).toISOString();
    const { data: rows } = await supabaseAdmin
      .from("orders")
      .select("items, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);
    let purchaseCount = 0;
    for (const r of (rows ?? []) as any[]) {
      const items = Array.isArray(r.items) ? r.items : [];
      if (items.some((it: any) => String(it?.id ?? it?._id ?? it?.product_id) === data.product_id)) {
        purchaseCount += 1;
      }
    }
    return { purchase_count: purchaseCount };
  });
