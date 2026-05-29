/**
 * Translation provider abstraction.
 *
 * Resolution order (server-only env):
 *   1. GOOGLE_TRANSLATE_API_KEY → Google Cloud Translation v2 (best accuracy)
 *   2. AI gateway via getAIConfig() → LLM fallback (lower accuracy, used only
 *      if Google key is missing so the site never breaks).
 *
 * All translation calls go through translateStrings() — content-translations
 * never touches the underlying provider directly.
 */
import { getAIConfig } from "./ai-config.server";
import type { LocaleCode } from "./locales";

const LANG_NAME: Record<LocaleCode, string> = {
  en: "English", hi: "Hindi", ta: "Tamil", te: "Telugu", kn: "Kannada",
  ml: "Malayalam", bn: "Bengali", mr: "Marathi", gu: "Gujarati", pa: "Punjabi",
  ur: "Urdu", or: "Odia", as: "Assamese",
};

export type TranslationProvider = "google" | "ai" | "none";

export function getActiveProvider(): TranslationProvider {
  if (process.env.GOOGLE_TRANSLATE_API_KEY) return "google";
  if (getAIConfig()) return "ai";
  return "none";
}

/**
 * Translate an array of source strings to the given target locale.
 * Returns null on hard failure (caller falls back to source).
 * Order of output strictly matches input.
 */
export async function translateStrings(
  sources: string[],
  locale: LocaleCode,
): Promise<string[] | null> {
  if (!sources.length) return [];
  if (locale === "en") return sources;

  const provider = getActiveProvider();
  if (provider === "google") return translateWithGoogle(sources, locale);
  if (provider === "ai") return translateWithAI(sources, locale);
  return null;
}

// ───────── Google Cloud Translation v2 ─────────
// Docs: https://cloud.google.com/translate/docs/reference/rest/v2/translate
// Single API call accepts an array via repeated `q` params and returns
// translations in the same order. ~92-95% accuracy for Indian languages.
async function translateWithGoogle(
  sources: string[],
  locale: LocaleCode,
): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY!;
  // Use POST with form body to avoid URL length limits.
  const body = new URLSearchParams();
  body.set("key", key);
  body.set("target", locale);
  body.set("source", "en");
  body.set("format", "text");
  for (const s of sources) body.append("q", s);

  try {
    const res = await fetch("https://translation.googleapis.com/language/translate/v2", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`[google-translate] ${res.status}: ${txt.slice(0, 300)}`);
      // Fallback to AI if Google fails (quota exceeded, bad key, etc.)
      return translateWithAI(sources, locale);
    }
    const j: any = await res.json();
    const arr = j?.data?.translations;
    if (!Array.isArray(arr) || arr.length !== sources.length) return null;
    return arr.map((t: any) => String(t?.translatedText || "").slice(0, 4000));
  } catch (err) {
    console.error("[google-translate] request failed:", err);
    return translateWithAI(sources, locale);
  }
}

// ───────── AI gateway fallback (OpenAI-compatible) ─────────
async function translateWithAI(
  sources: string[],
  locale: LocaleCode,
): Promise<string[] | null> {
  const ai = getAIConfig();
  if (!ai) return null;
  const langName = LANG_NAME[locale];
  const numbered = sources.map((s, i) => `${i + 1}. ${s}`).join("\n");

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

  try {
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
    const parsed = JSON.parse(m[0]);
    const arr = Array.isArray(parsed.t) ? parsed.t : null;
    if (!arr || arr.length !== sources.length) return null;
    return arr.map((s: any) => String(s || "").slice(0, 4000));
  } catch { return null; }
}