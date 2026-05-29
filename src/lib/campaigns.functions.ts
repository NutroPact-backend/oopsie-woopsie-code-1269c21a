// @ts-nocheck
/**
 * Customer Segments + Bulk Campaigns
 *
 * - Segments: stored rule blobs evaluated server-side against profiles + orders.
 * - Campaigns: targeted broadcasts (email/whatsapp/sms/push) → enqueued into
 *   notification_queue, picked up by the existing dispatcher cron.
 *
 * Lite-mode: small payloads, single aggregate query, cap at 10k matched users.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const MAX_MATCH = 10000;

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

// ─── Rules schema ────────────────────────────────────────────

const RulesSchema = z.object({
  minOrders: z.number().int().min(0).max(100).optional(),
  minLifetimeValue: z.number().min(0).max(10_000_000).optional(),
  lastOrderDaysAgoMin: z.number().int().min(0).max(3650).optional(), // lapsed since X days
  lastOrderDaysAgoMax: z.number().int().min(0).max(3650).optional(), // active within X days
  city: z.string().max(80).optional(),
  state: z.string().max(80).optional(),
  pincode: z.string().max(10).optional(),
  hasSubscription: z.boolean().optional(),
  registeredOnly: z.boolean().optional(),
  channelRequired: z.enum(["email", "phone", "any"]).optional(),
}).strict();

export type SegmentRules = z.infer<typeof RulesSchema>;

// ─── Audience evaluation ─────────────────────────────────────

type Audience = {
  total: number;
  withEmail: number;
  withPhone: number;
  rows: Array<{ user_id: string | null; email: string; phone: string; name: string }>;
};

async function evaluateAudience(rules: SegmentRules): Promise<Audience> {
  // Aggregate per-user spend & last order date from orders
  const { data: orders } = await supabaseAdmin
    .from("orders")
    .select("user_id,customer_email,customer_phone,customer_name,total,created_at,shipping_address")
    .order("created_at", { ascending: false })
    .limit(50000); // cap raw orders scanned for lite-mode

  const byKey = new Map<string, {
    user_id: string | null;
    email: string;
    phone: string;
    name: string;
    city: string;
    state: string;
    pincode: string;
    orders: number;
    ltv: number;
    lastAt: number;
  }>();

  for (const o of orders ?? []) {
    const email = (o.customer_email || "").trim().toLowerCase();
    const phone = (o.customer_phone || "").trim();
    const key = o.user_id || (email ? `e:${email}` : phone ? `p:${phone}` : "");
    if (!key) continue;
    const addr = (o.shipping_address || {}) as any;
    const ex = byKey.get(key) || {
      user_id: o.user_id,
      email, phone,
      name: o.customer_name || "",
      city: String(addr.city || ""),
      state: String(addr.state || ""),
      pincode: String(addr.pincode || addr.zip || ""),
      orders: 0, ltv: 0, lastAt: 0,
    };
    ex.orders += 1;
    ex.ltv += Number(o.total) || 0;
    const t = new Date(o.created_at).getTime();
    if (t > ex.lastAt) ex.lastAt = t;
    byKey.set(key, ex);
  }

  // Optionally include profiles with zero orders (registered users)
  if (!rules.minOrders || rules.minOrders === 0) {
    const { data: profiles } = await supabaseAdmin
      .from("profiles").select("id,email,phone,name").limit(20000);
    for (const p of profiles ?? []) {
      const key = p.id;
      if (byKey.has(key)) continue;
      byKey.set(key, {
        user_id: p.id,
        email: (p.email || "").toLowerCase(),
        phone: p.phone || "",
        name: p.name || "",
        city: "", state: "", pincode: "",
        orders: 0, ltv: 0, lastAt: 0,
      });
    }
  }

  // Optional subscription filter
  let subUserIds: Set<string> | null = null;
  if (rules.hasSubscription) {
    const { data: subs } = await supabaseAdmin
      .from("subscriptions").select("user_id").eq("status", "active").limit(50000);
    subUserIds = new Set((subs ?? []).map((s: any) => s.user_id).filter(Boolean));
  }

  const now = Date.now();
  const matched: Audience["rows"] = [];
  let withEmail = 0, withPhone = 0;

  for (const r of byKey.values()) {
    if (rules.minOrders !== undefined && r.orders < rules.minOrders) continue;
    if (rules.minLifetimeValue !== undefined && r.ltv < rules.minLifetimeValue) continue;
    if (rules.registeredOnly && !r.user_id) continue;
    if (rules.city && r.city.toLowerCase() !== rules.city.toLowerCase()) continue;
    if (rules.state && r.state.toLowerCase() !== rules.state.toLowerCase()) continue;
    if (rules.pincode && r.pincode !== rules.pincode) continue;
    if (subUserIds && (!r.user_id || !subUserIds.has(r.user_id))) continue;

    if (rules.lastOrderDaysAgoMin !== undefined) {
      const daysAgo = r.lastAt ? (now - r.lastAt) / 86400_000 : Infinity;
      if (daysAgo < rules.lastOrderDaysAgoMin) continue;
    }
    if (rules.lastOrderDaysAgoMax !== undefined) {
      const daysAgo = r.lastAt ? (now - r.lastAt) / 86400_000 : Infinity;
      if (daysAgo > rules.lastOrderDaysAgoMax) continue;
    }

    if (rules.channelRequired === "email" && !r.email) continue;
    if (rules.channelRequired === "phone" && !r.phone) continue;
    if (rules.channelRequired === "any" && !r.email && !r.phone) continue;

    if (r.email) withEmail++;
    if (r.phone) withPhone++;
    matched.push({ user_id: r.user_id, email: r.email, phone: r.phone, name: r.name });
    if (matched.length >= MAX_MATCH) break;
  }

  return { total: matched.length, withEmail, withPhone, rows: matched };
}

// ─── Segment CRUD ────────────────────────────────────────────

export const listSegments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("customer_segments").select("*")
      .order("created_at", { ascending: false }).limit(200);
    return { rows: data ?? [] };
  });

export const saveSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(120),
    description: z.string().max(500).default(""),
    rules: RulesSchema,
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const aud = await evaluateAudience(data.rules);
    const patch = {
      name: data.name,
      description: data.description,
      rules: data.rules,
      cached_count: aud.total,
      cached_at: new Date().toISOString(),
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("customer_segments").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id, count: aud.total };
    }
    const { data: row, error } = await supabaseAdmin
      .from("customer_segments").insert(patch).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id, count: aud.total };
  });

export const deleteSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("customer_segments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewSegment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ rules: RulesSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const aud = await evaluateAudience(data.rules);
    return {
      total: aud.total,
      withEmail: aud.withEmail,
      withPhone: aud.withPhone,
      sample: aud.rows.slice(0, 10).map(r => ({
        name: r.name,
        email: r.email ? r.email.replace(/(.{2}).+(@.+)/, "$1***$2") : "",
        phone: r.phone ? r.phone.replace(/(.{2}).+(.{2})/, "$1***$2") : "",
      })),
    };
  });

// ─── Campaigns ───────────────────────────────────────────────

export const listCampaigns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("bulk_campaigns").select("*")
      .order("created_at", { ascending: false }).limit(100);
    return { rows: data ?? [] };
  });

export const saveCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(160),
    segmentId: z.string().uuid(),
    channel: z.enum(["email", "whatsapp", "sms", "push"]),
    subject: z.string().max(200).default(""),
    body: z.string().min(1).max(8000),
    scheduledAt: z.string().optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = {
      name: data.name,
      segment_id: data.segmentId,
      channel: data.channel,
      subject: data.subject,
      body: data.body,
      template: "broadcast",
      payload: { subject: data.subject, body: data.body },
      scheduled_at: data.scheduledAt ? new Date(data.scheduledAt).toISOString() : null,
      status: data.scheduledAt ? "scheduled" : "draft",
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("bulk_campaigns").update(patch).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin.from("bulk_campaigns").insert(patch).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("bulk_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: camp } = await supabaseAdmin
      .from("bulk_campaigns").select("*").eq("id", data.id).maybeSingle();
    if (!camp) throw new Error("Campaign not found");
    if (camp.status === "sending" || camp.status === "sent") {
      throw new Error(`Already ${camp.status}`);
    }
    if (!camp.segment_id) throw new Error("Campaign segment missing");
    const { data: seg } = await supabaseAdmin
      .from("customer_segments").select("*").eq("id", camp.segment_id).maybeSingle();
    if (!seg) throw new Error("Segment missing");

    await supabaseAdmin.from("bulk_campaigns")
      .update({ status: "sending" }).eq("id", camp.id);

    let aud: Audience;
    try {
      aud = await evaluateAudience(RulesSchema.parse(seg.rules || {}));
    } catch (e: any) {
      await supabaseAdmin.from("bulk_campaigns")
        .update({ status: "failed" }).eq("id", camp.id);
      throw new Error("Segment rules invalid: " + e?.message);
    }

    // Pick recipient field per channel
    const recipientField = camp.channel === "email" ? "email" : "phone";
    const queueRows = aud.rows
      .filter((r): r is Audience["rows"][number] & { user_id: string | null } => Boolean(r[recipientField]))
      .map(r => ({
        user_id: r.user_id,
        channel: camp.channel,
        template: "broadcast",
        recipient: r[recipientField],
        payload: {
          campaignId: camp.id,
          campaignName: camp.name,
          subject: camp.subject,
          body: camp.body,
          name: r.name,
        },
        status: camp.channel === "email" ? "pending" : "pending_external",
      }));

    // Insert in chunks of 500 to keep payload small
    let inserted = 0, failed = 0;
    for (let i = 0; i < queueRows.length; i += 500) {
      const chunk = queueRows.slice(i, i + 500);
      const { error } = await supabaseAdmin.from("notification_queue").insert(chunk);
      if (error) failed += chunk.length;
      else inserted += chunk.length;
    }

    await supabaseAdmin.from("bulk_campaigns").update({
      status: failed > 0 && inserted === 0 ? "failed" : "sent",
      sent_at: new Date().toISOString(),
      total_recipients: aud.total,
      sent_count: inserted,
      failed_count: failed + (aud.total - queueRows.length),
    }).eq("id", camp.id);

    return { ok: true, queued: inserted, skipped: aud.total - queueRows.length, failed };
  });
