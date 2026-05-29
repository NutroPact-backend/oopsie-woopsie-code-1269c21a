// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./users.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LOCALE_CODES } from "./locales";

// ───────────── Types ─────────────
const BrandSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(60),
  logo: z.string().url().max(1000),
  url: z.string().url().max(1000),
  enabled: z.boolean().default(true),
});

const SettingsSchema = z.object({
  marketplace: z.object({
    enabled: z.boolean(),
    heading: z.string().max(80),
    brands: z.array(BrandSchema).max(50),
  }),
  emptyCart: z.object({
    enabled: z.boolean(),
    heading: z.string().max(80),
    subheading: z.string().max(200),
    ctaLabel: z.string().max(30),
    productIds: z.array(z.string().min(1).max(100)).max(12),
  }),
  ratingFilter: z.object({
    enabled: z.boolean(),
  }),
  multiLang: z.object({
    enabled: z.boolean(),
    defaultLocale: z.string().max(5),
    enabledLocales: z.array(z.string().min(2).max(5)).max(20),
    autoTranslateProducts: z.boolean(),
    model: z.string().max(80),
  }),
});

export type GrowthBoostersSettings = z.infer<typeof SettingsSchema>;

const DEFAULT: GrowthBoostersSettings = {
  marketplace: { enabled: false, heading: "Also available on", brands: [] },
  emptyCart: {
    enabled: true,
    heading: "You might love these",
    subheading: "Hand-picked bestsellers our customers swear by",
    ctaLabel: "Add to cart",
    productIds: [],
  },
  ratingFilter: { enabled: false },
  multiLang: {
    enabled: true,
    defaultLocale: "en",
    enabledLocales: [...LOCALE_CODES],
    autoTranslateProducts: false,
    model: "google/gemini-2.5-flash",
  },
};

function merge(raw: any): GrowthBoostersSettings {
  return {
    marketplace: { ...DEFAULT.marketplace, ...(raw?.marketplace || {}) },
    emptyCart: { ...DEFAULT.emptyCart, ...(raw?.emptyCart || {}) },
    ratingFilter: { ...DEFAULT.ratingFilter, ...(raw?.ratingFilter || {}) },
    multiLang: { ...DEFAULT.multiLang, ...(raw?.multiLang || {}) },
  };
}

// ───────────── Public read (used by site) ─────────────
export const getGrowthBoosters = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("site_settings").select("settings").eq("key", "growth_boosters").maybeSingle();
  return merge((data?.settings as any) || {});
});

// ───────────── Admin save ─────────────
export const saveGrowthBoosters = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => SettingsSchema.parse(i))
  .handler(async ({ data }) => {
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "growth_boosters", settings: data as any, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
