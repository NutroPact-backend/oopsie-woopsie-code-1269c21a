// @ts-nocheck
/**
 * Order Modify workflow (mirrors return-token flow).
 * Admin generates a short-lived token → shares via WhatsApp/email/SMS.
 * Customer opens /modify/<token> within window → edits address / phone / items / notes.
 * After submit, admin reviews in Admin → Order Modify tab and applies changes manually.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function randomToken(len = 32) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

async function getDefaultExpiryMinutes(): Promise<number> {
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "default")
    .maybeSingle();
  const m = Number((data?.settings as any)?.modifyLinkExpiryMinutes);
  return Number.isFinite(m) && m > 0 ? m : 30;
}

// ─── Admin: create modify link ────────────────────────────────────────────────
export const createOrderModifyLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    orderNumber: z.string().min(1).max(100),
    expiryMinutes: z.number().int().min(5).max(1440).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const { data: order, error: oerr } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_name, customer_email, customer_phone, items, shipping_address, user_id, order_status")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (oerr || !order) throw new Error("Order not found");

    // only allow modification for orders not yet shipped
    const blocked = ["shipped", "out_for_delivery", "delivered", "cancelled", "returned"];
    if (blocked.includes(String(order.order_status))) {
      throw new Error(`Order is '${order.order_status}'. Cannot modify after dispatch.`);
    }

    const minutes = data.expiryMinutes ?? (await getDefaultExpiryMinutes());
    const token = randomToken();
    const expiresAt = new Date(Date.now() + minutes * 60_000).toISOString();

    const { error } = await supabaseAdmin.from("order_modify_requests").insert({
      order_number: order.order_number,
      order_id: order.id,
      user_id: order.user_id,
      customer_name: order.customer_name || "",
      customer_email: order.customer_email || "",
      customer_phone: order.customer_phone || "",
      original_items: order.items || [],
      original_address: order.shipping_address || {},
      access_token: token,
      token_expires_at: expiresAt,
      status: "awaiting_submission",
    });
    if (error) throw new Error(error.message);

    return { ok: true, token, expiresAt, expiryMinutes: minutes, path: `/modify/${token}` };
  });

// ─── Public: fetch order-modify request by token ──────────────────────────────
export const getOrderModifyByToken = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("order_modify_requests")
      .select("id, order_number, customer_name, customer_phone, original_items, original_address, status, token_expires_at, submitted_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (!row) return { ok: false as const, error: "Invalid or expired link" };
    if (new Date(row.token_expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "This link has expired. Contact support for a new one." };
    }
    if (row.submitted_at) {
      return { ok: false as const, error: "Modification request already submitted. We'll be in touch." };
    }
    return {
      ok: true as const,
      orderNumber: row.order_number,
      customerName: row.customer_name,
      customerPhone: row.customer_phone,
      originalItems: row.original_items || [],
      originalAddress: row.original_address || {},
      expiresAt: row.token_expires_at,
    };
  });

const AddressSchema = z.object({
  fullName: z.string().min(1).max(200).optional(),
  line1: z.string().min(1).max(300).optional(),
  line2: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z.string().min(4).max(12).optional(),
  country: z.string().max(100).optional(),
}).passthrough();

const ItemSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().max(300).optional(),
  qty: z.number().int().min(0).max(999).optional(),
  quantity: z.number().int().min(0).max(999).optional(),
}).passthrough();

// ─── Public: submit modification ──────────────────────────────────────────────
export const submitOrderModify = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    token: z.string().min(8).max(64),
    requestedAddress: AddressSchema.optional(),
    requestedPhone: z.string().min(6).max(20).optional(),
    requestedItems: z.array(ItemSchema).max(50).optional(),
    customerNotes: z.string().max(2000).optional().default(""),
  }).parse(d))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("order_modify_requests")
      .select("id, token_expires_at, submitted_at")
      .eq("access_token", data.token)
      .maybeSingle();
    if (!row) throw new Error("Invalid link");
    if (new Date(row.token_expires_at).getTime() < Date.now()) throw new Error("Link expired");
    if (row.submitted_at) throw new Error("Already submitted");

    const patch: any = {
      customer_notes: data.customerNotes,
      status: "pending_review",
      submitted_at: new Date().toISOString(),
    };
    if (data.requestedAddress) patch.requested_address = data.requestedAddress;
    if (data.requestedPhone) patch.requested_phone = data.requestedPhone;
    if (data.requestedItems) patch.requested_items = data.requestedItems;

    const { error } = await supabaseAdmin
      .from("order_modify_requests")
      .update(patch)
      .eq("id", row.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });

// ─── Admin: list ──────────────────────────────────────────────────────────────
export const listOrderModifyRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ status: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("order_modify_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { rows: rows || [] };
  });

// ─── Admin: update status / notes ─────────────────────────────────────────────
export const updateOrderModifyRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["awaiting_submission", "pending_review", "approved", "rejected", "applied", "completed"]).optional(),
    adminNotes: z.string().max(2000).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: any = {};
    if (data.status) patch.status = data.status;
    if (data.adminNotes !== undefined) patch.admin_notes = data.adminNotes;
    const { error } = await supabaseAdmin
      .from("order_modify_requests")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ─── Admin: apply requested changes to the actual order ───────────────────────
export const applyOrderModify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row, error: rerr } = await supabaseAdmin
      .from("order_modify_requests")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (rerr || !row) throw new Error("Request not found");

    const patch: any = {};
    if (row.requested_address) patch.shipping_address = row.requested_address;
    if (row.requested_phone) patch.customer_phone = row.requested_phone;
    if (row.requested_items) patch.items = row.requested_items;

    if (Object.keys(patch).length === 0) {
      throw new Error("Nothing requested to apply");
    }

    const { error: oerr } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("order_number", row.order_number);
    if (oerr) throw new Error(oerr.message);

    await supabaseAdmin
      .from("order_modify_requests")
      .update({ status: "applied" })
      .eq("id", row.id);

    return { ok: true };
  });
