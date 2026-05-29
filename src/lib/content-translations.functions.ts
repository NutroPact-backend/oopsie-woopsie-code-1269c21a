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
import { translateStrings } from "./translation-provider.server";

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const ItemSchema = z.object({
  entityType: z.string().min(1).max(64),
  entityId: z.string().min(1).max(128),
  field: z.string().min(1).max(64),
  source: z.string().min(1).max(4000),
});

type Item = z.infer<typeof ItemSchema>;

async function translateBatch(items: Item[], locale: LocaleCode): Promise<string[] | null> {
  return translateStrings(items.map((it) => it.source), locale);
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