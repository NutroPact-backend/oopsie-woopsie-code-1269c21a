/**
 * useContentT — translate admin-authored DB strings on the fly.
 *
 * USAGE — single string:
 *   const heading = useContentT("video_section", section.id, "heading", section.heading);
 *
 * USAGE — batch (preferred when rendering a list):
 *   const tr = useContentTBatch([
 *     { entityType: "video_section", entityId: s.id, field: "heading",    source: s.heading },
 *     { entityType: "video_section", entityId: s.id, field: "subheading", source: s.subheading ?? "" },
 *   ]);
 *   tr("video_section", s.id, "heading"); // returns translated string
 *
 * Behaviour:
 *  - English locale → returns source unchanged.
 *  - Cache hit       → returns translated.
 *  - Cache miss      → returns source immediately; background AI fills cache
 *                      and a re-render shows the translation on next visit.
 */
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useLocale } from "./i18n";
import { getContentTranslations } from "./content-translations.functions";
import { dictionaries } from "./i18n.dict";

export type TItem = {
  entityType: string;
  entityId: string;
  field: string;
  source: string;
};

function keyOf(t: { entityType: string; entityId: string; field: string }) {
  return `${t.entityType}:${t.entityId}:${t.field}`;
}

export function useContentTBatch(items: TItem[]) {
  const [loc] = useLocale();
  const call = useServerFn(getContentTranslations);
  const [map, setMap] = useState<Record<string, string>>({});

  // Stable signature based on inputs (drop empty sources).
  const filtered = useMemo(
    () => items.filter((it) => it.source && it.source.trim().length > 0),
    [JSON.stringify(items)],
  );
  const sig = useMemo(
    () => filtered.map((it) => `${keyOf(it)}|${it.source.length}`).join(","),
    [filtered],
  );

  useEffect(() => {
    if (loc === "en" || !filtered.length) {
      // Synchronously map source → source.
      const m: Record<string, string> = {};
      for (const it of filtered) m[keyOf(it)] = it.source;
      setMap(m);
      return;
    }
    let cancelled = false;
    // Chunk into 50-item batches so pages with many products / FAQs
    // don't trip the server-side max(50) validator.
    const chunks: TItem[][] = [];
    for (let i = 0; i < filtered.length; i += 50) {
      chunks.push(filtered.slice(i, i + 50));
    }
    Promise.all(
      chunks.map((c) => call({ data: { locale: loc, items: c } }).catch(() => null)),
    ).then((results) => {
      if (cancelled) return;
      const merged: Record<string, string> = {};
      for (const r of results) {
        if (r?.translations) Object.assign(merged, r.translations);
      }
      setMap(merged);
    });
    return () => { cancelled = true; };
  }, [loc, sig]);

  return (entityType: string, entityId: string, field: string): string => {
    const k = `${entityType}:${entityId}:${field}`;
    if (map[k]) return map[k];
    const src = filtered.find((it) => keyOf(it) === k);
    return src?.source ?? "";
  };
}

export function useContentT(entityType: string, entityId: string, field: string, source: string) {
  const get = useContentTBatch([{ entityType, entityId, field, source }]);
  return get(entityType, entityId, field);
}

// ───────── Auto-translate arbitrary English UI strings ─────────
//
// Use for hardcoded English strings in components when you don't want
// to add a key to i18n.dict.ts. First render returns the source string;
// background AI fills the cache, and subsequent renders (or visitors)
// see the translated version. Length-capped to UI strings (<200 chars).
//
//   <T>Add to Cart</T>
//   const label = useAutoT("Continue shopping");

function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return (h >>> 0).toString(36);
}

// In-memory dedupe: many <T> instances with same text share one server call.
const autoCache: Record<string, string> = {};
const inflight = new Map<string, Promise<Record<string, string>>>();

function autoTranslate(text: string, locale: string, call: ReturnType<typeof useServerFn<typeof getContentTranslations>>) {
  // En → no work; reuse dict if developer happens to have keyed this string.
  if (locale === "en") return Promise.resolve({ [text]: text });
  const k = `${locale}::${text}`;
  if (autoCache[k]) return Promise.resolve({ [text]: autoCache[k] });
  const existing = inflight.get(k);
  if (existing) return existing;

  const id = djb2(text);
  const p = call({
    data: {
      locale,
      items: [{ entityType: "ui_string", entityId: id, field: "text", source: text }],
    },
  })
    .then((r) => {
      const translated = r?.translations?.[`ui_string:${id}:text`] || text;
      autoCache[k] = translated;
      return { [text]: translated };
    })
    .finally(() => { inflight.delete(k); });
  inflight.set(k, p);
  return p;
}

export function useAutoT(text: string): string {
  const [loc] = useLocale();
  const call = useServerFn(getContentTranslations);

  // Synchronous shortcuts: en, empty, or already-cached / dict-keyed.
  const initial = useMemo(() => {
    if (!text) return text;
    if (loc === "en") return text;
    const k = `${loc}::${text}`;
    if (autoCache[k]) return autoCache[k];
    // If the developer happens to have keyed this exact English source in the
    // dict already, prefer that (instant, reviewed copy).
    const dict = (dictionaries as any)[loc];
    if (dict) {
      for (const key in dict) {
        if ((dictionaries.en as any)[key] === text && dict[key]) return dict[key];
      }
    }
    return text;
  }, [loc, text]);

  const [out, setOut] = useState(initial);

  useEffect(() => { setOut(initial); }, [initial]);

  useEffect(() => {
    if (!text || loc === "en") return;
    const k = `${loc}::${text}`;
    if (autoCache[k]) { setOut(autoCache[k]); return; }
    // Skip very long strings — use useContentT(...) with a stable entityId
    // instead so the cache row is keyed by entity, not by hashed text.
    // Cap at 1000 chars to cover FAQ answers, blog excerpts, banner copy,
    // page sections. For long-form content (blog body, full page content)
    // wrap with useContentT(entity, id, field, source) directly.
    if (text.length > 1000) {
      if (typeof window !== "undefined" && import.meta.env?.DEV) {
        console.warn(`[useAutoT] string >1000 chars not translated; use useContentT with a stable entityId. First 80 chars: "${text.slice(0, 80)}..."`);
      }
      return;
    }
    let cancelled = false;
    autoTranslate(text, loc, call).then((map) => {
      if (!cancelled && map[text]) setOut(map[text]);
    }).catch(() => { /* keep source */ });
    return () => { cancelled = true; };
  }, [loc, text]);

  return out;
}

/** Drop-in <T>English text</T> wrapper. Auto-translates on render. */
export function T({ children }: { children: string }) {
  const out = useAutoT(typeof children === "string" ? children : String(children ?? ""));
  return <>{out}</>;
}