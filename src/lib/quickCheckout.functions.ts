// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MethodSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum(["gpay", "phonepe", "paytm", "bhim", "amazonpay", "upi_generic", "razorpay_upi"]),
  label: z.string().min(1).max(40),
  icon_url: z.string().url().nullable().optional(),
  icon_emoji: z.string().max(8).nullable().optional(),
  sort_order: z.number().int().default(0),
  min_order: z.number().nullable().optional(),
  max_order: z.number().nullable().optional(),
  cod_eligible: z.boolean().default(false),
  enabled: z.boolean().default(true),
  config: z.record(z.string(), z.unknown()).default({}),
});

async function requirePerm(userId: string, code: string) {
  const { data } = await supabaseAdmin.rpc("has_permission", { _user_id: userId, _code: code });
  if (!data) throw new Error(`Forbidden: ${code} required`);
}

export const listPublicQuickCheckout = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("quick_checkout_methods")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { methods: data ?? [] };
  });

export const listAllQuickCheckout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "quick_checkout.view");
    const { data, error } = await supabaseAdmin
      .from("quick_checkout_methods").select("*").order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { methods: data ?? [] };
  });

export const upsertQuickCheckoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => MethodSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "quick_checkout.edit");
    const payload = data as any;
    if (data.id) {
      const { error } = await supabaseAdmin.from("quick_checkout_methods").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("quick_checkout_methods").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row!.id };
  });

export const deleteQuickCheckoutMethod = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "quick_checkout.edit");
    const { error } = await supabaseAdmin.from("quick_checkout_methods").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
