// @ts-nocheck
/**
 * Subscriptions module — recurring orders (Subscribe & Save).
 * Customers create subscriptions for products with chosen interval & qty.
 * Cron runs every hour: due subs → auto-create orders with discount.
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

// ─── Customer ────────────────────────────────────────────────

export const createSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    productId: z.string().min(1).max(120),
    productName: z.string().min(1).max(255),
    variant: z.record(z.string(), z.any()).optional().default({}),
    qty: z.number().int().min(1).max(50),
    unitPrice: z.number().min(0),
    intervalDays: z.number().int().min(7).max(180),
    discountPercent: z.number().min(0).max(50).default(10),
    shippingAddress: z.record(z.string(), z.any()),
    customerName: z.string().max(255).default(""),
    customerEmail: z.string().email().or(z.literal("")).default(""),
    customerPhone: z.string().max(20).default(""),
    paymentMethod: z.enum(["cod", "prepaid"]).default("cod"),
    notes: z.string().max(1000).optional().default(""),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const nextRun = new Date(Date.now() + data.intervalDays * 86400_000).toISOString();
    const { data: row, error } = await supabaseAdmin.from("subscriptions").insert({
      user_id: userId,
      customer_name: data.customerName,
      customer_email: data.customerEmail,
      customer_phone: data.customerPhone,
      product_id: data.productId,
      product_name: data.productName,
      variant: data.variant,
      qty: data.qty,
      unit_price: data.unitPrice,
      interval_days: data.intervalDays,
      discount_percent: data.discountPercent,
      shipping_address: data.shippingAddress,
      payment_method: data.paymentMethod,
      notes: data.notes,
      next_run_at: nextRun,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const listMySubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { data: subs } = await supabaseAdmin
      .from("subscriptions").select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const ids = (subs ?? []).map((s: any) => s.id);
    let historyMap: Record<string, any[]> = {};
    if (ids.length) {
      const { data: hist } = await supabaseAdmin
        .from("subscription_orders").select("*")
        .in("subscription_id", ids)
        .order("created_at", { ascending: false });
      for (const h of hist ?? []) {
        (historyMap[h.subscription_id] ||= []).push(h);
      }
    }
    return { rows: subs ?? [], history: historyMap };
  });

export const updateMySubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    qty: z.number().int().min(1).max(50).optional(),
    intervalDays: z.number().int().min(7).max(180).optional(),
    shippingAddress: z.record(z.string(), z.any()).optional(),
    status: z.enum(["active", "paused", "cancelled"]).optional(),
    skipNext: z.boolean().optional(),
    customerPhone: z.string().max(20).optional(),
    notes: z.string().max(1000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { data: existing } = await supabaseAdmin
      .from("subscriptions").select("*").eq("id", data.id).maybeSingle();
    if (!existing || existing.user_id !== userId) throw new Error("Not found");
    const patch: Record<string, any> = {};
    if (data.qty !== undefined) patch.qty = data.qty;
    if (data.intervalDays !== undefined) patch.interval_days = data.intervalDays;
    if (data.shippingAddress) patch.shipping_address = data.shippingAddress;
    if (data.status) patch.status = data.status;
    if (data.customerPhone !== undefined) patch.customer_phone = data.customerPhone;
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.skipNext) {
      const base = new Date(existing.next_run_at).getTime();
      patch.next_run_at = new Date(base + existing.interval_days * 86400_000).toISOString();
    }
    const { error } = await supabaseAdmin.from("subscriptions").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// ─── Admin ───────────────────────────────────────────────────

export const adminListSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    status: z.string().optional(),
    limit: z.number().int().min(1).max(500).default(200),
  }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin.from("subscriptions").select("*")
      .order("next_run_at", { ascending: true }).limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows } = await q;
    return { rows: rows ?? [] };
  });

export const adminUpdateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    id: z.string().uuid(),
    status: z.enum(["active", "paused", "cancelled", "expired"]).optional(),
    nextRunAt: z.string().optional(),
    discountPercent: z.number().min(0).max(50).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, any> = {};
    if (data.status) patch.status = data.status;
    if (data.nextRunAt) patch.next_run_at = new Date(data.nextRunAt).toISOString();
    if (data.discountPercent !== undefined) patch.discount_percent = data.discountPercent;
    const { error } = await supabaseAdmin.from("subscriptions").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminRunSubscriptionNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: sub } = await supabaseAdmin.from("subscriptions").select("*").eq("id", data.id).maybeSingle();
    if (!sub) throw new Error("Not found");
    const orderNumber = await runSubscriptionOnce(sub);
    return { ok: true, orderNumber };
  });

// ─── Shared run logic (also used by cron) ─────────────────────

export async function runSubscriptionOnce(sub: any): Promise<string> {
  const unit = Number(sub.unit_price) || 0;
  const qty = Number(sub.qty) || 1;
  const gross = unit * qty;
  const discount = Math.round((gross * (Number(sub.discount_percent) || 0)) / 100 * 100) / 100;
  const total = Math.max(0, gross - discount);

  const orderNumber = `SUB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const orderId = crypto.randomUUID();

  const items = [{
    productId: sub.product_id,
    name: sub.product_name,
    variant: sub.variant,
    qty,
    price: unit,
    subtotal: gross,
  }];

  const { error } = await supabaseAdmin.from("orders").insert({
    id: orderId,
    order_number: orderNumber,
    user_id: sub.user_id,
    items,
    subtotal: gross,
    shipping_cost: 0,
    discount,
    total,
    coupon_code: `SUB${sub.discount_percent}`,
    customer_name: sub.customer_name,
    customer_email: sub.customer_email,
    customer_phone: sub.customer_phone,
    shipping_address: sub.shipping_address,
    order_status: "confirmed",
    payment_status: sub.payment_method === "prepaid" ? "pending" : "pending",
    payment_method: sub.payment_method,
    notes: `Auto-generated from subscription ${sub.id}`,
  });
  if (error) {
    await supabaseAdmin.from("subscriptions")
      .update({ failures_count: (sub.failures_count || 0) + 1 })
      .eq("id", sub.id);
    throw new Error(error.message);
  }

  await supabaseAdmin.from("subscription_orders").insert({
    subscription_id: sub.id,
    order_number: orderNumber,
    total,
    status: "created",
  });

  const nextRun = new Date(Date.now() + (Number(sub.interval_days) || 30) * 86400_000).toISOString();
  await supabaseAdmin.from("subscriptions").update({
    last_run_at: new Date().toISOString(),
    last_order_number: orderNumber,
    next_run_at: nextRun,
    runs_count: (sub.runs_count || 0) + 1,
    failures_count: 0,
  }).eq("id", sub.id);

  // Queue notification to customer
  if (sub.customer_email || sub.customer_phone) {
    const queueRows: any[] = [];
    if (sub.customer_email) queueRows.push({
      channel: "email", recipient: sub.customer_email, template: "subscription_order_created",
      payload: { orderNumber, productName: sub.product_name, qty, total, nextRun },
      status: "pending", order_number: orderNumber,
    });
    if (sub.customer_phone) queueRows.push({
      channel: "whatsapp", recipient: sub.customer_phone, template: "subscription_order_created",
      payload: { orderNumber, productName: sub.product_name, qty, total, nextRun },
      status: "pending", order_number: orderNumber,
    });
    if (queueRows.length) await supabaseAdmin.from("notification_queue").insert(queueRows);
  }


  return orderNumber;
}
