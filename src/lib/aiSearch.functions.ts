// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const inputSchema = z.object({
  query: z.string().min(2).max(300),
});

type Citation = {
  type: "product" | "blog";
  title: string;
  url: string;
  snippet?: string;
};

export const aiSearch = createServerFn({ method: "POST" })
  .inputValidator((data) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    // Service-role client so we can read admin-only app_secrets
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!,
    );

    // 1) Try admin-managed key from app_secrets, 2) fallback to env GEMINI_API_KEY
    let GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
    try {
      const { data: row } = await supabase
        .from("app_secrets")
        .select("value")
        .eq("key", "gemini_api_key")
        .maybeSingle();
      const dbKey = (row?.value || "").trim();
      if (dbKey) GEMINI_API_KEY = dbKey;
    } catch { /* table missing or no access — keep env */ }

    if (!GEMINI_API_KEY) {
      return { answer: "AI search is not configured.", citations: [] as Citation[], disabled: true };
    }

    const { data: settingsRow } = await supabase
      .from("site_settings")
      .select("settings")
      .eq("key", "default")
      .maybeSingle();
    const ai = (settingsRow?.settings as any)?.ai ?? {};
    if (ai.enabled === false) {
      return { answer: "AI search is currently disabled by the site owner.", citations: [], disabled: true };
    }

    // Free Google Gemini model (generativelanguage.googleapis.com).
    // Admin can override (e.g. gemini-2.0-flash, gemini-1.5-flash, gemini-2.5-flash).
    const rawModel: string = ai.model || "gemini-2.0-flash";
    const model = rawModel.replace(/^google\//, "");
    const systemPrompt = ai.systemPrompt || "You are NutroPact's helpful shopping assistant. Answer in 3-5 short sentences using ONLY the catalog and blog snippets provided. If the answer isn't in the context, say so and suggest contacting support. Be honest, concise, and friendly. Mention specific product names when relevant. Do not invent products or prices.";
    const maxProducts = Math.max(1, Math.min(20, Number(ai.maxProducts) || 8));
    const maxBlogs = Math.max(0, Math.min(20, Number(ai.maxBlogs) || 5));
    const maxFaqs = Math.max(0, Math.min(20, Number(ai.maxFaqs) ?? 6));
    const useFaqs = ai.useFaqs !== false;

    const q = data.query.trim().replace(/[%,]/g, " ");

    const [{ data: products }, { data: posts }, { data: faqs }] = await Promise.all([
      supabase
        .from("products")
        .select("name,slug,short_description,category,price")
        .eq("is_active", true)
        .or(`name.ilike.%${q}%,description.ilike.%${q}%,short_description.ilike.%${q}%,category.ilike.%${q}%`)
        .limit(maxProducts),
      maxBlogs > 0
        ? supabase
            .from("blog_posts")
            .select("title,slug,excerpt")
            .eq("published", true)
            .or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`)
            .limit(maxBlogs)
        : Promise.resolve({ data: [] as any[] }),
      useFaqs && maxFaqs > 0
        ? supabase
            .from("faqs")
            .select("question,answer,category")
            .eq("enabled", true)
            .or(`question.ilike.%${q}%,answer.ilike.%${q}%,category.ilike.%${q}%`)
            .limit(maxFaqs)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const citations: Citation[] = [
      ...(products ?? []).map((p: any) => ({
        type: "product" as const,
        title: p.name,
        url: `/products/${p.slug}`,
        snippet: p.short_description ?? "",
      })),
      ...(posts ?? []).map((p: any) => ({
        type: "blog" as const,
        title: p.title,
        url: `/blog/${p.slug}`,
        snippet: p.excerpt ?? "",
      })),
    ];

    const context = [
      ...(products ?? []).map((p: any, i: number) =>
        `[P${i + 1}] ${p.name} (${p.category}) — ₹${p.price} — ${p.short_description ?? ""}`,
      ),
      ...(posts ?? []).map((p: any, i: number) =>
        `[B${i + 1}] ${p.title} — ${p.excerpt ?? ""}`,
      ),
      ...(faqs ?? []).map((f: any, i: number) =>
        `[FAQ${i + 1}] Q: ${f.question}\nA: ${f.answer}`,
      ),
    ].join("\n");

    const userMsg = `User question: ${data.query}\n\nCatalog & blog context:\n${context || "(no matching items)"}\n\nAnswer:`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userMsg }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 512 },
        }),
      });

      if (res.status === 429) {
        return { answer: "Too many requests right now. Please try again in a moment.", citations };
      }
      if (res.status === 401 || res.status === 403) {
        return { answer: "AI search key invalid. Please contact the site owner.", citations };
      }
      if (!res.ok) {
        return { answer: "AI search is temporarily unavailable. Showing matching items below.", citations };
      }

      const json = await res.json();
      const answer: string =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n") ??
        "No answer available.";
      return { answer, citations };
    } catch {
      return { answer: "AI search failed. Showing matching items below.", citations };
    }
  });

