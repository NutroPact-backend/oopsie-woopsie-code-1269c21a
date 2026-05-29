// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ConfigSchema = z.object({
  product_id: z.string().min(1).max(100),
  config: z.object({
    display_mode: z.enum(["dropdown", "radio-cards", "tabs"]).default("radio-cards"),
    recommended_variant_id: z.string().nullable().optional(),
    badges: z.record(z.string(), z.object({
      text: z.string().max(30),
      color: z.string().max(20).optional(),
      bg_color: z.string().max(20).optional(),
      icon: z.string().max(20).optional(),
    })).default({}),
    per_pack_offers: z.record(z.string(), z.string().max(120)).default({}),
    show_per_day_cost: z.boolean().default(false),
    per_day_divisor: z.record(z.string(), z.number()).default({}),
    show_save_chip: z.boolean().default(true),
  }).default({} as any),
});

async function requirePerm(userId: string, code: string) {
  const { data } = await supabaseAdmin.rpc("has_permission", { _user_id: userId, _code: code });
  if (!data) throw new Error(`Forbidden: ${code} required`);
}

export const getVariantsProConfig = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ product_id: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("products")
      .select("id, variants_pro_config")
      .eq("id", data.product_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { config: JSON.parse(JSON.stringify(row?.variants_pro_config ?? {})) as any };
  });

export const setVariantsProConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => ConfigSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "products.variants_pro.edit");
    const { error } = await supabaseAdmin
      .from("products")
      .update({ variants_pro_config: data.config as any })
      .eq("id", data.product_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Lightweight product search for admin tab
export const searchProductsForVariantsPro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ q: z.string().max(80).default("") }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "products.variants_pro.edit");
    let q = supabaseAdmin
      .from("products")
      .select("id, name, images, price, variants_pro_config")
      .limit(40);
    if (data.q.trim()) q = q.ilike("name", `%${data.q.trim()}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { products: rows ?? [] };
  });

// Get variants for a product (for badge assignment)
export const getProductVariantsList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ product_id: z.string().min(1).max(100) }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "products.variants_pro.edit");
    const { data: rows, error } = await supabaseAdmin
      .from("product_variants")
      .select("id, sku, price, compare_price, flavor_name, size_name, active")
      .eq("product_id", data.product_id)
      .order("price", { ascending: true });
    if (error) throw new Error(error.message);
    return { variants: rows ?? [] };
  });
