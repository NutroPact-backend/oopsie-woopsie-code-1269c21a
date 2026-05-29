// @ts-nocheck
/**
 * Product Q&A — customers ask questions on PDP, admin answers.
 * Default flow: question lands as `pending`; admin answers + publishes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

// ── Public ──────────────────────────────────────────────────────────────

export const listProductQA = createServerFn({ method: "GET" })
  .inputValidator((d: any) => z.object({
    productId: z.string().min(1).max(255),
    limit: z.number().int().min(1).max(100).default(50),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: rows } = await supabaseAdmin
      .from("product_questions")
      .select("id,asker_name,question,answer,answered_by_name,answered_at,helpful_count,created_at")
      .eq("product_id", data.productId)
      .eq("status", "published")
      .order("helpful_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    return { items: rows || [] };
  });

export const askProductQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    productId: z.string().min(1).max(255),
    productName: z.string().min(1).max(255),
    question: z.string().min(5).max(1000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: profile } = await supabaseAdmin
      .from("profiles").select("name,email").eq("id", userId).maybeSingle();
    const askerName = (profile?.name || profile?.email?.split("@")[0] || "Customer").slice(0, 60);
    const { error } = await supabaseAdmin.from("product_questions").insert({
      product_id: data.productId,
      product_name: data.productName,
      user_id: userId,
      asker_name: askerName,
      question: data.question.trim(),
      status: "pending",
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const markQuestionHelpful = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("product_questions").select("helpful_count").eq("id", data.id).maybeSingle();
    if (!row) return { ok: false as const };
    await supabaseAdmin.from("product_questions")
      .update({ helpful_count: (row.helpful_count || 0) + 1 }).eq("id", data.id);
    return { ok: true as const };
  });

// ── Admin ───────────────────────────────────────────────────────────────

export const adminListAllQA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    status: z.enum(["all", "pending", "published", "hidden"]).default("all"),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("product_questions").select("*")
      .order("created_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return { items: rows || [] };
  });

export const adminAnswerQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    answer: z.string().min(1).max(2000),
    answeredByName: z.string().min(1).max(80).default("NutroPact Team"),
    publish: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("product_questions").update({
      answer: data.answer.trim(),
      answered_by_user_id: context.userId,
      answered_by_name: data.answeredByName,
      answered_at: new Date().toISOString(),
      status: data.publish ? "published" : "pending",
    }).eq("id", data.id);
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });

export const adminSetQAStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "published", "hidden"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("product_questions").update({ status: data.status }).eq("id", data.id);
    return { ok: true as const };
  });

export const adminDeleteQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("product_questions").delete().eq("id", data.id);
    return { ok: true as const };
  });
