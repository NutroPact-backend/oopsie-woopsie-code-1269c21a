// @ts-nocheck
/**
 * Brand-grade customer chatbot — accuracy-tuned.
 * - Hybrid RAG: Gemini text-embedding-004 cosine sim + keyword fallback
 * - Auto-embed KB articles on upsert; admin "Re-embed all" action
 * - Anti-hallucination: must cite [KB-n]; if no grounding + not order question → asks clarifier
 * - Order-aware: detects ORD-style numbers in the user message AND falls back to last 3 orders
 * - Citations returned to UI as `sources` (id+title) for transparency
 * - Direct Google Gemini API (no Lovable AI Gateway — independent runtime)
 *
 * Conversation states: open → AI replies, handoff → admin replies, closed → read-only
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rateLimit } from "./rate-limit";

// Optionally derive the authenticated user from the request's bearer token,
// without forcing auth (chat allows guests). Returns null if no/invalid token.
async function tryGetCallerId(): Promise<string | null> {
  const auth = getRequestHeader("authorization") || getRequestHeader("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data } = await client.auth.getUser();
    return data?.user?.id ?? null;
  } catch { return null; }
}

const MAX_HISTORY = 14;
const TOP_KB_DOCS = 5;
const EMBED_MODEL = "text-embedding-004";
const MIN_RELEVANCE = 0.18; // hybrid score below this = treated as no grounding


async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

async function loadSettings() {
  const { data } = await supabaseAdmin.from("chat_settings")
    .select("*").eq("id", "default").maybeSingle();
  return data || {
    brand_name: "Store",
    welcome_message: "How can I help you today?",
    system_prompt: "",
    provider: "gemini",
    model: "gemini-2.5-flash",
    api_key_secret_name: "GEMINI_API_KEY",
    quick_actions: [],
    escalation_label: "Connect with team",
    escalation_after_messages: 4,
    enable_order_context: true,
    enabled: true,
    confidence_threshold: 0.55,
    escalate_on_low_confidence: true,
    escalate_on_no_kb: false,
    escalate_on_negative_sentiment: true,
    escalate_keywords: ["refund", "complaint", "manager", "lawsuit", "legal", "cheated", "fraud", "scam"],
    max_failed_turns: 3,
  };
}

// ── Embeddings (direct Gemini, no Lovable Gateway) ─────────────────
async function embedText(apiKey: string, text: string, taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"): Promise<number[] | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${EMBED_MODEL}`,
        content: { parts: [{ text: text.slice(0, 8000) }] },
        taskType,
      }),
    });
    if (!res.ok) return null;
    const j: any = await res.json();
    const v = j?.embedding?.values;
    return Array.isArray(v) ? v : null;
  } catch { return null; }
}

function cosine(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d ? dot / d : 0;
}

// ── Hybrid KB retrieval: embedding cosine + keyword overlap ─────────
function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\u0900-\u097F\s]/g, " ")
    .split(/\s+/).filter(w => w.length > 2);
}

async function retrieveKB(apiKey: string, query: string, k = TOP_KB_DOCS) {
  const { data: rows } = await supabaseAdmin.from("chat_kb_articles")
    .select("id,title,body,tags,category,priority,embedding").eq("active", true);
  if (!rows?.length) return [];

  const qVec = await embedText(apiKey, query, "RETRIEVAL_QUERY");
  const qTokens = new Set(tokenize(query));

  const scored = rows.map((r: any) => {
    // Keyword score (0..1)
    const hay = `${r.title} ${r.body} ${(r.tags || []).join(" ")} ${r.category}`.toLowerCase();
    let kw = 0;
    for (const t of qTokens) if (hay.includes(t)) kw += 1;
    for (const tag of (r.tags || []) as string[]) if (qTokens.has(tag.toLowerCase())) kw += 2;
    const kwNorm = Math.min(1, kw / Math.max(3, qTokens.size));

    // Embedding score (0..1, clamped from cosine -1..1)
    const emb = Array.isArray(r.embedding) ? (r.embedding as number[]) : null;
    const cos = qVec && emb ? Math.max(0, cosine(qVec, emb)) : 0;

    // Hybrid: embeddings carry most weight when available, else fall back to keyword
    const hybrid = qVec && emb
      ? cos * 0.75 + kwNorm * 0.25
      : kwNorm;

    const priorityBoost = (r.priority || 0) * 0.001;
    return { ...r, score: hybrid + priorityBoost, _kw: kwNorm, _cos: cos };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter(x => x.score >= MIN_RELEVANCE)
    .slice(0, k);
}

// ── Order lookup ────────────────────────────────────────────────────
function extractOrderNumbers(msg: string): string[] {
  const out = new Set<string>();
  const re = /\b([A-Z]{2,5}[-_ ]?\d{4,12}|\d{8,14})\b/gi;
  let m;
  while ((m = re.exec(msg)) !== null) out.add(m[1].toUpperCase().replace(/[-_ ]/g, ""));
  return Array.from(out).slice(0, 3);
}

async function loadOrdersByNumber(numbers: string[]) {
  if (!numbers.length) return [];
  const { data } = await supabaseAdmin.from("orders")
    .select("order_number,order_status,payment_status,total,created_at,items")
    .in("order_number", numbers);
  return data || [];
}

async function loadRecentOrders(userId: string) {
  const { data } = await supabaseAdmin.from("orders")
    .select("order_number,order_status,payment_status,total,created_at,items")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(3);
  return data || [];
}


function buildSystemPrompt(opts: {
  brand: string;
  custom: string;
  kb: any[];
  orders: any[];
  escalationLabel: string;
}) {
  const kbBlock = opts.kb.length
    ? opts.kb.map((a, i) =>
        `[KB-${i + 1}] ${a.title} (category: ${a.category})\n${a.body}`
      ).join("\n\n---\n\n")
    : "(no knowledge base articles matched)";

  const ordersBlock = opts.orders.length
    ? opts.orders.map((o: any) => {
        const items = Array.isArray(o.items)
          ? o.items.map((it: any) => `${it.qty || it.quantity || 1}× ${it.name || it.title || "item"}`).join(", ")
          : "items";
        return `• ${o.order_number} — ${o.order_status} (payment: ${o.payment_status}) — ₹${o.total} — ${new Date(o.created_at).toLocaleDateString()} — ${items}`;
      }).join("\n")
    : "(user is a guest or has no orders)";

  const base = `You are ${opts.brand}'s customer support assistant — a brand-grade chatbot like Amazon or MuscleBlaze.

PERSONALITY: Friendly, concise, helpful. Reply in the SAME language the user used (Hindi/Hinglish/English). 2–5 short sentences. Use bullets for lists. NEVER invent facts.

STRICT ANSWERING PROTOCOL (this drives accuracy):
1. GROUND every factual claim in [KB-n] or the user's order context. If you used [KB-1] and [KB-3], put their numbers in the "citations" array.
2. If NO [KB-n] entry and NO order context can support the answer:
   a. If the question is small-talk / greeting / thanks → reply briefly, citations=[].
   b. Otherwise, DO NOT GUESS. Ask ONE short clarifying question (e.g. "Order number share karenge?" / "Kaunsa product?") and set citations=[]. Do NOT set needs_human just for this.
3. For order/return/refund/tracking questions: use the order block. Quote order_number + current status verbatim. NEVER invent tracking numbers, dates, or refund amounts.
4. Product recommendations: only recommend products mentioned in [KB-n]. If none, ask which goal/budget.
5. Set "needs_human": true ONLY for: payment disputes on a specific order, complaints requiring investigation, legal/medical questions, or after the user explicitly says they want a human.
6. NEVER tell the user to "talk to a human" unless needs_human=true. Solve it yourself.
7. After every reply, propose 2–3 short follow-ups (≤ 6 words each) the user is likely to ask next.

ANTI-HALLUCINATION HARD RULES:
- If you cannot cite a [KB-n] and the question isn't about a known order → ask a clarifier instead of answering.
- Never invent prices, stock, ETAs, courier names, refund timelines, or policies that aren't in the KB.
- If KB and user message conflict, follow KB and politely correct.

KNOWLEDGE BASE (cite these as [KB-n]):
${kbBlock}

USER'S ORDER CONTEXT:
${ordersBlock}

ESCALATION BUTTON LABEL: "${opts.escalationLabel}"
${opts.custom ? `\nADDITIONAL BRAND INSTRUCTIONS:\n${opts.custom}` : ""}`;
  return base;
}


// ── Gemini call with structured output ──────────────────────────────
async function callGemini(opts: {
  apiKey: string;
  model: string;
  system: string;
  history: { role: string; content: string }[];
}): Promise<{ reply: string; needs_human: boolean; suggested_followups: string[]; citations: number[]; confidence: number; sentiment: "positive" | "neutral" | "negative" }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
  const contents = opts.history.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = {
    system_instruction: { parts: [{ text: opts.system + `\n\nALSO RETURN: "confidence" (0..1, your honest certainty that the reply is grounded in KB or order data — clarifier questions should be ≤0.4) and "sentiment" of the LAST user message ("positive"|"neutral"|"negative").` }] },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 700,
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          needs_human: { type: "boolean" },
          suggested_followups: { type: "array", items: { type: "string" }, maxItems: 3 },
          citations: { type: "array", items: { type: "integer" }, maxItems: 5 },
          confidence: { type: "number" },
          sentiment: { type: "string", enum: ["positive", "neutral", "negative"] },
        },
        required: ["reply", "needs_human", "suggested_followups", "citations", "confidence", "sentiment"],
      },
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
    ],
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("Too many requests, please try again in a moment.");
  if (res.status === 403) throw new Error("AI key invalid or quota exhausted.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI error (${res.status}) ${t.slice(0, 120)}`);
  }
  const json: any = await res.json();
  const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  try {
    const parsed = JSON.parse(text);
    const conf = Number(parsed.confidence);
    const sent = String(parsed.sentiment || "neutral");
    return {
      reply: String(parsed.reply || "").trim() || "Sorry, mujhe ye samajh nahi aaya. Dobara try karo?",
      needs_human: Boolean(parsed.needs_human),
      suggested_followups: Array.isArray(parsed.suggested_followups)
        ? parsed.suggested_followups.slice(0, 3).map((s: any) => String(s).slice(0, 60))
        : [],
      citations: Array.isArray(parsed.citations)
        ? parsed.citations.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0).slice(0, 5)
        : [],
      confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0.5,
      sentiment: (sent === "positive" || sent === "negative") ? sent : "neutral",
    };
  } catch {
    return { reply: text || "Sorry, mujhe ye samajh nahi aaya.", needs_human: false, suggested_followups: [], citations: [], confidence: 0.3, sentiment: "neutral" };

  }
}

async function getOrCreateConversation(opts: {
  conversationId?: string;
  guestToken?: string;
  userId?: string | null;
}) {
  if (opts.conversationId) {
    const { data } = await supabaseAdmin.from("chat_conversations")
      .select("*").eq("id", opts.conversationId).maybeSingle();
    if (data) return data;
  }
  const { data, error } = await supabaseAdmin.from("chat_conversations").insert({
    user_id: opts.userId ?? null,
    guest_token: opts.userId ? null : (opts.guestToken ?? null),
    status: "open",
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── PUBLIC ──────────────────────────────────────────────────────────

export const getChatBootstrap = createServerFn({ method: "GET" })
  .handler(async () => {
    const s = await loadSettings();
    return {
      enabled: s.enabled,
      brandName: s.brand_name,
      welcome: s.welcome_message,
      quickActions: s.quick_actions || [],
      escalationLabel: s.escalation_label,
      escalationAfterMessages: s.escalation_after_messages,
    };
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d: any) => z.object({
    conversationId: z.string().uuid().optional(),
    guestToken: z.string().min(8).max(64).optional(),
    // userId removed from client input — server derives from bearer token only
    message: z.string().min(1).max(2000),
  }).parse(d))
  .handler(async ({ data }) => {
    const settings = await loadSettings();
    if (!settings.enabled) {
      return { conversationId: null, reply: "Chat temporarily unavailable. Please email support.", status: "closed" as const, needsHuman: true, followups: [] };
    }

    // SECURITY: never trust client-supplied userId. Derive from request bearer token.
    const callerId = await tryGetCallerId();

    // Rate-limit chat to defend against scraping / abuse
    try {
      const key = callerId || data.guestToken || "anon";
      const rl = await rateLimit("chat_send", key, 30, 60);
      if (!rl.allowed) {
        return { conversationId: null, reply: "Too many messages. Please wait a moment.", status: "open" as const, needsHuman: false, followups: [] };
      }
    } catch { /* best effort */ }

    const conv = await getOrCreateConversation({
      conversationId: data.conversationId,
      guestToken: data.guestToken,
      userId: callerId,
    });

    // Verify ownership when continuing an existing conversation
    if (data.conversationId) {
      const ownsByUser = callerId && conv.user_id === callerId;
      const ownsByGuest = !conv.user_id && conv.guest_token && conv.guest_token === data.guestToken;
      const isAdmin = false; // chat sends always come from user/guest, never admin
      if (!ownsByUser && !ownsByGuest && !isAdmin) {
        throw new Error("Forbidden: not the conversation owner");
      }
    }

    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id, role: "user", content: data.message,
    });

    if (conv.status === "handoff" || conv.status === "closed") {
      await supabaseAdmin.from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id);
      return { conversationId: conv.id, reply: null, status: conv.status, needsHuman: true, followups: [] };
    }

    const apiKey = process.env[settings.api_key_secret_name as string] || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const msg = "AI key not configured. Tap below to reach our team.";
      await supabaseAdmin.from("chat_messages").insert({
        conversation_id: conv.id, role: "assistant", content: msg, meta: { needs_human: true },
      });
      return { conversationId: conv.id, reply: msg, status: "open" as const, needsHuman: true, followups: [] };
    }

    // Retrieve grounding context — embeddings RAG + order context (precise + recent)
    const orderNums = extractOrderNumbers(data.message);
    const [kb, recentOrders, namedOrders] = await Promise.all([
      retrieveKB(apiKey, data.message),
      (settings.enable_order_context && callerId) ? loadRecentOrders(callerId) : Promise.resolve([]),
      orderNums.length ? loadOrdersByNumber(orderNums) : Promise.resolve([]),
    ]);
    // Merge orders, dedupe by order_number, named orders first
    const orderMap = new Map<string, any>();
    for (const o of namedOrders) orderMap.set(o.order_number, o);
    for (const o of recentOrders) if (!orderMap.has(o.order_number)) orderMap.set(o.order_number, o);
    const orders = Array.from(orderMap.values()).slice(0, 5);

    const { data: hist } = await supabaseAdmin.from("chat_messages")
      .select("role,content").eq("conversation_id", conv.id)
      .order("created_at", { ascending: true }).limit(MAX_HISTORY);

    const system = buildSystemPrompt({
      brand: settings.brand_name,
      custom: settings.system_prompt || "",
      kb,
      orders,
      escalationLabel: settings.escalation_label,
    });

    let reply = "";
    let needsHuman = false;
    let followups: string[] = [];
    let citations: number[] = [];
    let confidence = 0.5;
    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    let escalateReason: string | null = null;
    try {
      const out = await callGemini({
        apiKey,
        model: settings.model,
        system,
        history: (hist || []).filter(h => h.role === "user" || h.role === "assistant"),
      });
      reply = out.reply;
      needsHuman = out.needs_human;
      followups = out.suggested_followups;
      citations = out.citations;
      confidence = out.confidence;
      sentiment = out.sentiment;
    } catch (e: any) {
      reply = `I'm having a brief issue replying. ${e.message ? `(${e.message}) ` : ""}Please tap "${settings.escalation_label}" if it's urgent.`;
      needsHuman = true;
      escalateReason = "ai_error";
    }

    // ── Auto-escalation rules (admin-configured) ──────────────────────
    if (!needsHuman) {
      const threshold = Number(settings.confidence_threshold ?? 0.55);
      const msgLower = data.message.toLowerCase();
      const kws: string[] = Array.isArray(settings.escalate_keywords) ? settings.escalate_keywords : [];
      const kwHit = kws.find(k => k && msgLower.includes(String(k).toLowerCase()));

      if (kwHit) { needsHuman = true; escalateReason = `keyword:${kwHit}`; }
      else if (settings.escalate_on_low_confidence && confidence < threshold) {
        needsHuman = true; escalateReason = `low_confidence:${confidence.toFixed(2)}`;
      }
      else if (settings.escalate_on_no_kb && citations.length === 0 && kb.length === 0) {
        needsHuman = true; escalateReason = "no_kb_match";
      }
      else if (settings.escalate_on_negative_sentiment && sentiment === "negative") {
        // require at least N consecutive negative turns to avoid one-off venting
        const recent = (hist || []).slice(-((Number(settings.max_failed_turns) || 3) - 1) * 2)
          .filter(h => h.role === "assistant")
          .map((h: any) => (h.meta?.sentiment as string) || "");
        const negStreak = recent.filter(s => s === "negative").length + 1;
        if (negStreak >= (Number(settings.max_failed_turns) || 3)) {
          needsHuman = true; escalateReason = "negative_sentiment_streak";
        }
      }
    }

    // Map citation indices (1-based KB-n) to actual {id,title}
    const sources = citations
      .map(n => kb[n - 1])
      .filter(Boolean)
      .map((a: any) => ({ id: a.id, title: a.title }));

    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: conv.id, role: "assistant", content: reply,
      meta: { needs_human: needsHuman, followups, sources, kb_used: kb.map(k => k.id), confidence, sentiment, escalate_reason: escalateReason },
    });

    if (needsHuman) {
      const meta = { ...((conv.meta as Record<string, any>) || {}), ai_flagged_human: true };
      await supabaseAdmin.from("chat_conversations").update({
        last_message_at: new Date().toISOString(), meta,
      }).eq("id", conv.id);
    } else {
      await supabaseAdmin.from("chat_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conv.id);
    }

    return {
      conversationId: conv.id, reply, status: "open" as const,
      needsHuman, followups, sources,
    };
  });


export const getChatHistory = createServerFn({ method: "POST" })
  .inputValidator((d: any) => z.object({
    conversationId: z.string().uuid(),
    guestToken: z.string().min(8).max(64).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: conv } = await supabaseAdmin.from("chat_conversations")
      .select("*").eq("id", data.conversationId).maybeSingle();
    if (!conv) return { conversation: null, messages: [] };

    const callerId = await tryGetCallerId();

    if (conv.user_id != null) {
      // User-owned conversation: caller must be owner or admin
      if (!callerId || callerId !== conv.user_id) {
        let isAdmin = false;
        if (callerId) {
          const { data: roleRow } = await supabaseAdmin
            .from("user_roles").select("role")
            .eq("user_id", callerId).eq("role", "admin").maybeSingle();
          isAdmin = !!roleRow;
        }
        if (!isAdmin) return { conversation: null, messages: [] };
      }
    } else if (conv.guest_token && conv.guest_token !== data.guestToken) {
      return { conversation: null, messages: [] };
    }

    const { data: msgs } = await supabaseAdmin.from("chat_messages")
      .select("id,role,content,created_at,meta").eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });
    return { conversation: conv, messages: msgs || [] };
  });

export const requestHandoff = createServerFn({ method: "POST" })
  .inputValidator((d: any) => z.object({
    conversationId: z.string().uuid(),
    guestToken: z.string().min(8).max(64).optional(),
    note: z.string().max(500).optional(),
    contact: z.string().max(120).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    // SECURITY: verify the caller actually owns this conversation
    const callerId = await tryGetCallerId();
    const { data: conv } = await supabaseAdmin.from("chat_conversations")
      .select("id,user_id,guest_token").eq("id", data.conversationId).maybeSingle();
    if (!conv) throw new Error("Conversation not found");
    const ownsByUser = callerId && conv.user_id === callerId;
    const ownsByGuest = !conv.user_id && conv.guest_token && conv.guest_token === data.guestToken;
    if (!ownsByUser && !ownsByGuest) throw new Error("Forbidden: not the conversation owner");

    await supabaseAdmin.from("chat_conversations").update({
      status: "handoff",
      meta: { handoff_at: new Date().toISOString(), contact: data.contact || null },
      last_message_at: new Date().toISOString(),
    }).eq("id", data.conversationId);
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: data.conversationId, role: "system",
      content: `Our team has been notified${data.contact ? ` (contact: ${data.contact})` : ""}. We'll reply here shortly.`,
      meta: { note: data.note || null },
    });
    return { ok: true };
  });

// ─── ADMIN: conversations inbox ──────────────────────────────────────

export const adminListConversations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    status: z.enum(["open", "handoff", "closed", "all"]).default("all"),
    limit: z.number().int().min(1).max(200).default(100),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("chat_conversations").select("*")
      .order("last_message_at", { ascending: false }).limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { conversations: rows || [] };
  });

export const adminGetConversation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ conversationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: conv } = await supabaseAdmin.from("chat_conversations")
      .select("*").eq("id", data.conversationId).maybeSingle();
    const { data: msgs } = await supabaseAdmin.from("chat_messages")
      .select("*").eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });
    return { conversation: conv, messages: msgs || [] };
  });

export const adminReplyMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    conversationId: z.string().uuid(),
    content: z.string().min(1).max(4000),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("chat_messages").insert({
      conversation_id: data.conversationId, role: "admin", content: data.content,
    });
    await supabaseAdmin.from("chat_conversations").update({
      status: "handoff",
      assigned_admin_id: context.userId,
      last_message_at: new Date().toISOString(),
    }).eq("id", data.conversationId);
    return { ok: true };
  });

export const adminSetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    conversationId: z.string().uuid(),
    status: z.enum(["open", "handoff", "closed"]),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("chat_conversations")
      .update({ status: data.status }).eq("id", data.conversationId);
    return { ok: true };
  });

// ─── ADMIN: Knowledge Base ───────────────────────────────────────────

export const adminListKB = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("chat_kb_articles")
      .select("*").order("priority", { ascending: false }).order("created_at", { ascending: false });
    return { items: data || [] };
  });

export const adminUpsertKB = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    title: z.string().min(2).max(200),
    body: z.string().min(5).max(8000),
    tags: z.array(z.string().min(1).max(40)).max(20).default([]),
    category: z.string().min(1).max(40).default("general"),
    priority: z.number().int().min(0).max(1000).default(0),
    active: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.GEMINI_API_KEY;
    const embedSrc = `${data.title}\n${data.body}\nTags: ${(data.tags || []).join(", ")}\nCategory: ${data.category}`;
    const embedding = apiKey ? await embedText(apiKey, embedSrc, "RETRIEVAL_DOCUMENT") : null;
    const baseFields: any = {
      title: data.title, body: data.body, tags: data.tags,
      category: data.category, priority: data.priority, active: data.active,
    };
    if (embedding) { baseFields.embedding = embedding; baseFields.embedded_at = new Date().toISOString(); }
    if (data.id) {
      await supabaseAdmin.from("chat_kb_articles").update(baseFields).eq("id", data.id);
      return { ok: true, id: data.id, embedded: Boolean(embedding) };
    }
    const { data: row } = await supabaseAdmin.from("chat_kb_articles").insert(baseFields).select("id").single();
    return { ok: true, id: row?.id, embedded: Boolean(embedding) };
  });

export const adminDeleteKB = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("chat_kb_articles").delete().eq("id", data.id);
    return { ok: true };
  });

// Re-embed all active KB articles (for migration or after editing many)
export const adminReembedKB = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const { data: rows } = await supabaseAdmin.from("chat_kb_articles")
      .select("id,title,body,tags,category").eq("active", true);
    let ok = 0, fail = 0;
    for (const r of rows || []) {
      const src = `${r.title}\n${r.body}\nTags: ${(r.tags || []).join(", ")}\nCategory: ${r.category}`;
      const v = await embedText(apiKey, src, "RETRIEVAL_DOCUMENT");
      if (v) {
        await supabaseAdmin.from("chat_kb_articles")
          .update({ embedding: v, embedded_at: new Date().toISOString() }).eq("id", r.id);
        ok++;
      } else fail++;
    }
    return { ok: true, embedded: ok, failed: fail, total: (rows || []).length };
  });


// ─── ADMIN: Settings ─────────────────────────────────────────────────

export const adminGetChatSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("chat_settings")
      .select("*").eq("id", "default").maybeSingle();
    return { settings: data };
  });

export const adminUpdateChatSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    brand_name: z.string().min(1).max(80),
    welcome_message: z.string().min(5).max(500),
    system_prompt: z.string().max(4000).default(""),
    provider: z.enum(["gemini"]).default("gemini"),
    model: z.string().min(1).max(80),
    api_key_secret_name: z.string().min(1).max(80),
    quick_actions: z.array(z.object({
      label: z.string().min(1).max(40),
      prompt: z.string().min(1).max(200),
    })).max(8),
    escalation_label: z.string().min(1).max(40),
    escalation_after_messages: z.number().int().min(1).max(20),
    enable_order_context: z.boolean(),
    enabled: z.boolean(),
    confidence_threshold: z.number().min(0).max(1),
    escalate_on_low_confidence: z.boolean(),
    escalate_on_no_kb: z.boolean(),
    escalate_on_negative_sentiment: z.boolean(),
    escalate_keywords: z.array(z.string().min(1).max(40)).max(30),
    max_failed_turns: z.number().int().min(1).max(10),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await supabaseAdmin.from("chat_settings").update(data).eq("id", "default");
    return { ok: true };
  });
