// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./users.functions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { LOCALE_CODES, type LocaleCode, isLocale } from "./locales";
import { getAIConfig } from "./ai-config.server";

// ───────── helpers ─────────
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const LANG_NAME: Record<LocaleCode, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada",
  ml: "Malayalam", bn: "Bengali", mr: "Marathi", gu: "Gujarati", pa: "Punjabi",
  ur: "Urdu", or: "Odia", as: "Assamese",
};

// ───────── Read user's saved language (auth) ─────────
export const getMyLanguage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("profiles")
      .select("preferred_language")
      .eq("id", userId)
      .maybeSingle();
    return { language: (data?.preferred_language as LocaleCode) || "en" };
  });

// ───────── Save user's language (auth) ─────────
export const setMyLanguage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    language: z.string().refine(isLocale, { message: "Invalid locale" }),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ preferred_language: data.language })
      .eq("id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────── Get translated product content (public, cached, auto-fill) ─────────
const EMPTY = { translated: false, name: null, description: null, benefits: null, usage: null } as const;

export const getProductTranslation = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    productId: z.string().min(1).max(100),
    locale: z.string().min(2).max(5),
  }).parse(i))
  .handler(async ({ data }) => {
    if (!isLocale(data.locale) || data.locale === "en") return EMPTY;

    // 1) Try cache
    const { data: row } = await supabaseAdmin
      .from("product_translations")
      .select("name, description, benefits, usage")
      .eq("product_id", data.productId)
      .eq("locale", data.locale)
      .maybeSingle();
    if (row && row.name) {
      return { translated: true, name: row.name, description: row.description, benefits: row.benefits, usage: row.usage };
    }

    // 2) Auto-translate on first miss (if admin enabled it). Inline so first viewer
    // pays one-time ~2-3s latency; every subsequent viewer hits the cache.
    const { data: settingsRow } = await supabaseAdmin
      .from("site_settings").select("settings").eq("key", "growth_boosters").maybeSingle();
    const ml = (settingsRow?.settings as any)?.multiLang || {};
    if (!ml.autoTranslateProducts) return EMPTY;
    const enabled: string[] = Array.isArray(ml.enabledLocales) ? ml.enabledLocales : [];
    if (enabled.length && !enabled.includes(data.locale)) return EMPTY;

    const prod = await fetchProduct(data.productId);
    if (!prod) return EMPTY;
    const model = ml.model || "google/gemini-2.5-pro";
    try {
      const t = await translateOne(prod, data.locale, model);
      if (!t || !t.name) return EMPTY;
      const source = JSON.stringify({
        n: prod.name, d: prod.description || prod.short_description || "",
        b: prod.benefits, h: prod.how_to_use,
      });
      await supabaseAdmin.from("product_translations").upsert({
        product_id: prod.id, locale: data.locale,
        name: t.name, description: t.description, benefits: t.benefits, usage: t.usage,
        source_hash: djb2(source), updated_at: new Date().toISOString(),
      });
      return { translated: true, name: t.name, description: t.description, benefits: t.benefits, usage: t.usage };
    } catch {
      return EMPTY;
    }
  });

// ───────── Admin: translate one product into all enabled locales ─────────
async function fetchProduct(id: string) {
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, description, short_description, category, benefits, how_to_use")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

async function translateOne(prod: any, locale: LocaleCode, model: string): Promise<{
  name: string; description: string; benefits: string; usage: string;
} | null> {
  const ai = getAIConfig();
  if (!ai) throw new Error("AI key missing");
  const langName = LANG_NAME[locale];

  const prompt = `You are a professional Indian e-commerce localiser writing copy for Amazon.in-quality product pages.
Translate the following product info from English to ${langName}. Use NATIVE SCRIPT only (no Latin/romanised text).

STRICT RULES:
1. Tone: natural, warm, trustworthy, classy — like Amazon.in / Flipkart top sellers. Use formal/respectful "you" (आप / आपण / நீங்கள் / etc.), never casual "tu".
2. KEEP IN LATIN/ARABIC NUMERALS (CRITICAL — never localise to Devanagari ०१२ / Bengali ০১২ / Tamil ௦௧௨ / etc.): ALL digits 0-9, prices, quantities, dates, phone numbers, PIN codes, percentages, ratings. ALSO keep in Latin: brand names, trade-marks, model numbers, SKUs, units (g, mg, kg, ml, L, oz, cm, mm, %), URLs, emails, hashtags, "UPI", "COD", "WhatsApp", "PIN".
3. GLOSSARY — translate these consistently:
   - "Cash on Delivery" / "COD" → use the standard regional term, keep "(COD)" in Latin in brackets.
   - "Free shipping" → standard regional phrase; never "free ki shipping".
   - "Return policy" / "Refund" / "Exchange" / "Warranty" → use the well-known regional term.
   - Ayurvedic, herbal, natural, organic → use the established regional term, NOT a literal calque.
4. Do NOT add disclaimers, do NOT invent facts not in the source, do NOT change numbers, do NOT translate proper nouns.
5. Sentence-case (not Title Case). Keep punctuation native to the language (। for Devanagari/Bengali/Punjabi/Odia/Assamese; . for others).
6. If the source is empty or just whitespace for a field, return "" for that field.

EXAMPLE (English → Hindi, for tone reference only):
Source name: "ABC Ashwagandha Capsules 500mg — Stress Relief, 60 Tablets"
Good: "ABC अश्वगंधा कैप्सूल 500mg — तनाव से राहत, 60 टैबलेट"
Bad:  "एबीसी अश्वगन्धा कैप्सूल्स ५००mg — स्ट्रेस रिलीफ़, ६० टैब्लेट्स"

Source product:
- Name: ${prod.name}
- Category: ${prod.category || ""}
- Description: ${(prod.description || prod.short_description || "").slice(0, 1500)}
- Benefits: ${prod.benefits ? JSON.stringify(prod.benefits).slice(0, 800) : ""}
- How to use: ${prod.how_to_use ? String(prod.how_to_use).slice(0, 500) : ""}

Reply ONLY as compact minified JSON, no markdown, no commentary:
{"name":"…","description":"…","benefits":"…","usage":"…"}`;

  const res = await fetch(ai.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ai.key}` },
    body: JSON.stringify({
      model: ai.model(model),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const j: any = await res.json();
  const txt: string = j?.choices?.[0]?.message?.content || "";
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    return {
      name: String(parsed.name || "").slice(0, 500),
      description: String(parsed.description || "").slice(0, 5000),
      benefits: String(parsed.benefits || "").slice(0, 2000),
      usage: String(parsed.usage || "").slice(0, 1500),
    };
  } catch { return null; }
}

export const translateProduct = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({
    productId: z.string().min(1).max(100),
    locales: z.array(z.string()).optional(),
    force: z.boolean().default(false),
  }).parse(i))
  .handler(async ({ data }) => {
    const prod = await fetchProduct(data.productId);
    if (!prod) throw new Error("Product not found");

    const { data: settingsRow } = await supabaseAdmin
      .from("site_settings").select("settings").eq("key", "growth_boosters").maybeSingle();
    const ml = (settingsRow?.settings as any)?.multiLang || {};
    const model = ml.model || "google/gemini-2.5-pro";
    const enabled: string[] = Array.isArray(ml.enabledLocales) ? ml.enabledLocales : [...LOCALE_CODES];

    const requested = (data.locales || enabled)
      .filter(isLocale)
      .filter((l) => l !== "en"); // never translate English to English

    const source = JSON.stringify({
      n: prod.name, d: prod.description || prod.short_description || "",
      b: prod.benefits, h: prod.how_to_use,
    });
    const sourceHash = djb2(source);

    let done = 0, skipped = 0, failed = 0;
    const errors: string[] = [];

    for (const locale of requested) {
      try {
        if (!data.force) {
          const { data: existing } = await supabaseAdmin
            .from("product_translations")
            .select("source_hash")
            .eq("product_id", prod.id)
            .eq("locale", locale)
            .maybeSingle();
          if (existing?.source_hash === sourceHash) { skipped++; continue; }
        }
        const t = await translateOne(prod, locale as LocaleCode, model);
        if (!t || !t.name) { failed++; errors.push(`${locale}: empty`); continue; }
        const { error } = await supabaseAdmin.from("product_translations").upsert({
          product_id: prod.id,
          locale,
          name: t.name,
          description: t.description,
          benefits: t.benefits,
          usage: t.usage,
          source_hash: sourceHash,
          updated_at: new Date().toISOString(),
        });
        if (error) { failed++; errors.push(`${locale}: ${error.message.slice(0, 60)}`); continue; }
        done++;
      } catch (e: any) {
        failed++;
        errors.push(`${locale}: ${(e?.message || "err").slice(0, 60)}`);
      }
    }

    return { ok: true, done, skipped, failed, errors: errors.slice(0, 5) };
  });

// ───────── Admin: bulk translate first N products ─────────
export const translateAllProducts = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((i) => z.object({
    limit: z.number().int().min(1).max(50).default(5),
    locales: z.array(z.string()).optional(),
  }).parse(i))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("products").select("id").limit(data.limit);
    const ids = (rows || []).map((r: any) => r.id);

    const { data: settingsRow } = await supabaseAdmin
      .from("site_settings").select("settings").eq("key", "growth_boosters").maybeSingle();
    const ml = (settingsRow?.settings as any)?.multiLang || {};
    const model = ml.model || "google/gemini-2.5-pro";
    const enabled: string[] = Array.isArray(ml.enabledLocales) ? ml.enabledLocales : [...LOCALE_CODES];
    const requested = (data.locales || enabled).filter(isLocale).filter((l) => l !== "en");

    let totalDone = 0, totalSkipped = 0, totalFailed = 0;
    const errors: string[] = [];

    for (const id of ids) {
      const prod = await fetchProduct(id);
      if (!prod) { totalFailed++; continue; }
      const source = JSON.stringify({
        n: prod.name, d: prod.description || prod.short_description || "",
        b: prod.benefits, h: prod.how_to_use,
      });
      const sourceHash = djb2(source);

      for (const locale of requested) {
        try {
          const { data: existing } = await supabaseAdmin
            .from("product_translations")
            .select("source_hash").eq("product_id", id).eq("locale", locale).maybeSingle();
          if (existing?.source_hash === sourceHash) { totalSkipped++; continue; }
          const t = await translateOne(prod, locale as LocaleCode, model);
          if (!t || !t.name) { totalFailed++; continue; }
          await supabaseAdmin.from("product_translations").upsert({
            product_id: id, locale,
            name: t.name, description: t.description, benefits: t.benefits, usage: t.usage,
            source_hash: sourceHash, updated_at: new Date().toISOString(),
          });
          totalDone++;
        } catch (e: any) {
          totalFailed++;
          errors.push(`${id}/${locale}: ${(e?.message || "err").slice(0, 50)}`);
        }
      }
    }

    return {
      ok: true, products: ids.length, locales: requested.length,
      done: totalDone, skipped: totalSkipped, failed: totalFailed,
      errors: errors.slice(0, 8),
    };
  });
