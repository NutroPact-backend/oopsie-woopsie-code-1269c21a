/**
 * Generic per-row content translation.
 *
 * Any admin-authored string (video section heading, banner title, custom
 * page block, etc.) can be wrapped with `useContentT(...)` on the client
 * to render in the visitor's current locale. First viewer pays a one-time
 * ~2s AI translation; everyone after hits the cache row.
 *
 * Source-of-truth string lives in its own table (e.g. video_sections.heading).
 * Translations live in `content_translations` keyed by
 * (entity_type, entity_id, field, locale).
 *
 * If AI gateway is not configured, callers fall back to the source string.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
// Cast to `any` because generated Database types lag the new
// `content_translations` table until the migration is applied.
const db: any = supabaseAdmin;
import { isLocale, type LocaleCode } from "./locales";
import { getAIConfig } from "./ai-config.server";

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

const ItemSchema = z.object({
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(128),
  field: z.string().min(1).max(64),
  source: z.string().min(1).max(4000),
});

type Item = z.infer<typeof ItemSchema>;

async function translateBatch(items: Item[], locale: LocaleCode): Promise<string[] | null> {
  const ai = getAIConfig();
  if (!ai) return null;
  const langName = LANG_NAME[locale];
  const numbered = items.map((it, i) => `${i + 1}. ${it.source}`).join("\n");

  const prompt = `You are a professional Indian e-commerce UI localiser.
Translate each numbered UI string from English to ${langName}.

STRICT RULES:
1. NATIVE SCRIPT only — no Latin/romanised text.
2. Tone: short, natural, like Amazon.in / Flipkart UI. Formal "you".
3. Keep in Latin/Arabic: digits 0-9, brand names, trademarks, units (g, mg, kg, ml, L, %, cm), URLs, emails, "COD", "UPI", "WhatsApp", "PIN".
4. Sentence-case (not Title Case). Preserve original punctuation style.
5. Do NOT invent facts, do NOT add disclaimers, do NOT translate proper nouns.
6. Keep length similar to source — UI strings, not paragraphs.

Strings to translate:
${numbered}

Reply ONLY as compact minified JSON, no markdown, no commentary, format:
{"t":["translation1","translation2",...]}`;

  const res = await fetch(ai.url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ai.key}` },
    body: JSON.stringify({
      model: ai.model("google/gemini-2.5-flash"),
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return null;
  const j: any = await res.json();
  const txt: string = j?.choices?.[0]?.message?.content || "";
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    const arr = Array.isArray(parsed.t) ? parsed.t : null;
    if (!arr || arr.length !== items.length) return null;
    return arr.map((s: any) => String(s || "").slice(0, 4000));
  } catch { return null; }
}

/**
 * Get translations for a batch of (entityType, entityId, field) items.
 * Returns a map keyed by `${entityType}:${entityId}:${field}` → translated string.
 * If a translation is missing, it is auto-generated in background and cached;
 * the source string is returned for this call so the UI never blocks.
 */
export const getContentTranslations = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    locale: z.string().min(2).max(5),
    items: z.array(ItemSchema).min(1).max(50),
  }).parse(i))
  .handler(async ({ data }) => {
    const out: Record<string, string> = {};
    if (!isLocale(data.locale) || data.locale === "en") {
      // English (or unknown locale) → source wins
      for (const it of data.items) {
        out[`${it.entityType}:${it.entityId}:${it.field}`] = it.source;
      }
      return { translations: out };
    }

    const locale = data.locale;

    // 1) Bulk-read existing cache rows for this batch
    const ids = Array.from(new Set(data.items.map((it) => it.entityId)));
    const types = Array.from(new Set(data.items.map((it) => it.entityType)));
    const { data: rows } = await db
      .from("content_translations")
      .select("entity_type, entity_id, field, source_hash, translated")
      .in("entity_type", types)
      .in("entity_id", ids)
      .eq("locale", locale);

    const cache = new Map<string, { hash: string; translated: string }>();
    for (const r of rows || []) {
      cache.set(`${r.entity_type}:${r.entity_id}:${r.field}`,
        { hash: r.source_hash, translated: r.translated });
    }

    // 2) Resolve each item: cache hit (fresh) or queue for translation
    const misses: Item[] = [];
    for (const it of data.items) {
      const k = `${it.entityType}:${it.entityId}:${it.field}`;
      const hash = djb2(it.source);
      const cached = cache.get(k);
      if (cached && cached.hash === hash) {
        out[k] = cached.translated;
      } else {
        misses.push(it);
        out[k] = it.source; // fallback for this call
      }
    }

    // 3) Translate misses inline (small batches; bounded to 50)
    if (misses.length) {
      try {
        const translated = await translateBatch(misses, locale);
        if (translated) {
          const upserts = misses.map((it, i) => ({
            entity_type: it.entityType,
            entity_id: it.entityId,
            field: it.field,
            locale,
            source_hash: djb2(it.source),
            translated: translated[i] || it.source,
            updated_at: new Date().toISOString(),
          }));
          await db.from("content_translations")
            .upsert(upserts, { onConflict: "entity_type,entity_id,field,locale" });
          for (let i = 0; i < misses.length; i++) {
            const it = misses[i];
            out[`${it.entityType}:${it.entityId}:${it.field}`] = translated[i] || it.source;
          }
        }
      } catch { /* silent — source already in out as fallback */ }
    }

    return { translations: out };
  });