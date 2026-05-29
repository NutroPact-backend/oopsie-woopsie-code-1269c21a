// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Mega menu stored in feature_flags.config under key 'mega_menu'.
// Structure:
// {
//   items: [{
//     id, label, layout: 'simple'|'grid-2'|'grid-3'|'grid-4'|'featured',
//     trigger: 'hover'|'click',
//     enabled: bool,
//     columns: [{ title, links: [{ label, href, icon?, badge? }] }],
//     featured?: { image, heading, sub, cta_label, cta_href },
//     promo?: { text, href, bg, color },
//   }]
// }

const LinkSchema = z.object({
  label: z.string().min(1).max(80),
  href: z.string().min(1).max(300),
  icon: z.string().max(40).optional(),
  badge: z.string().max(20).optional(),
});

const ColumnSchema = z.object({
  title: z.string().max(80).default(""),
  links: z.array(LinkSchema).default([]),
});

const ItemSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  layout: z.enum(["simple", "grid-2", "grid-3", "grid-4", "featured"]).default("grid-3"),
  trigger: z.enum(["hover", "click"]).default("hover"),
  enabled: z.boolean().default(true),
  columns: z.array(ColumnSchema).default([]),
  featured: z.object({
    image: z.string().max(500),
    heading: z.string().max(80),
    sub: z.string().max(160),
    cta_label: z.string().max(40),
    cta_href: z.string().max(300),
  }).nullable().optional(),
  promo: z.object({
    text: z.string().max(160),
    href: z.string().max(300),
    bg: z.string().max(20),
    color: z.string().max(20),
  }).nullable().optional(),
});

const MegaMenuSchema = z.object({ items: z.array(ItemSchema).default([]) });

async function requirePerm(userId: string, code: string) {
  const { data } = await supabaseAdmin.rpc("has_permission", { _user_id: userId, _code: code });
  if (!data) throw new Error(`Forbidden: ${code} required`);
}

export const getMegaMenu = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from("feature_flags")
      .select("enabled, config")
      .eq("key", "mega_menu")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      enabled: !!data?.enabled,
      items: ((data?.config as any)?.items ?? []) as z.infer<typeof ItemSchema>[],
    };
  });

export const setMegaMenu = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => MegaMenuSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { userId } = context as { userId: string };
    await requirePerm(userId, "navigation.megamenu.edit");
    const { error } = await supabaseAdmin
      .from("feature_flags")
      .update({ config: { items: data.items } as any, updated_by: userId, updated_at: new Date().toISOString() })
      .eq("key", "mega_menu");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
