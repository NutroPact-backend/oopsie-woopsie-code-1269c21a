// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./users.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { loadShippingConfig, createShipmentForOrder } from "./shipping.functions";
import { loadBoxes, resolveOrderItemDims, pickBox } from "./packaging.server";

// ───────────────────────────── pause / resume automation ─────────────────────────────
export const toggleShipmentAutomation = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ enabled: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("site_settings")
      .select("settings")
      .eq("key", "default")
      .maybeSingle();
    const settings = (row?.settings as any) ?? {};
    const shipping = settings.shipping ?? {};
    const automation = shipping.automation ?? {};
    automation.enabled = data.enabled;
    shipping.automation = automation;
    settings.shipping = shipping;
    const { error } = await supabaseAdmin
      .from("site_settings")
      .upsert({ key: "default", settings, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });

// ───────────────────────────── manual AWB booking ─────────────────────────────
export const manualBookShipment = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        orderNumber: z.string().min(1).max(100),
        carrier: z.string().min(1).max(40),
        weightGramsOverride: z.number().int().min(1).max(500000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found");

    const cfg = await loadShippingConfig();
    const boxes = await loadBoxes();
    const divisor = Number((cfg as any)?.automation?.volumetricDivisor) || 5000;
    const itemDims = await resolveOrderItemDims((order as any).items || []);
    const pack = pickBox(itemDims, boxes, divisor);
    const weight = data.weightGramsOverride ?? pack.chargeableWeightGrams;

    const orderForCarrier = {
      ...order,
      _pack: pack,
      shipping_weight_grams: weight,
      package_dims: pack.dims,
    };

    const r: any = await createShipmentForOrder(orderForCarrier, cfg as any, data.carrier as any);
    const ts = new Date().toISOString();

    await supabaseAdmin.from("order_tracking").upsert(
      {
        order_id: (order as any).id,
        order_number: (order as any).order_number,
        courier: data.carrier,
        awb_number: r.awb || "",
        tracking_url: r.trackingUrl || "",
        current_status: "shipped",
        status_history: [{ ts, status: "shipped", source: data.carrier, manual: true }],
        updated_at: ts,
        last_synced_at: ts,
        manual_override: true,
      },
      { onConflict: "order_number" },
    );

    await supabaseAdmin
      .from("orders")
      .update({
        order_status: "shipped",
        notes: `${(order as any).notes || ""}\n[Manual] ${data.carrier} · AWB:${r.awb} · ${weight}g`.trim(),
        auto_ship_last_error: null,
        updated_at: ts,
      })
      .eq("id", (order as any).id);

    // Insert reconciliation row with expected values (no rate quote available, leave 0 → admin can edit)
    await supabaseAdmin.from("shipment_charges").upsert(
      {
        order_number: (order as any).order_number,
        courier: data.carrier,
        awb_number: r.awb || "",
        expected_weight_g: weight,
        expected_charge: 0,
        expected_box_id: pack.box?.id || "",
      },
      { onConflict: "order_number" },
    );

    return { ok: true, awb: r.awb, trackingUrl: r.trackingUrl };
  });

// ───────────────────────────── unship / cancel tracking ─────────────────────────────
export const unshipOrder = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) => z.object({ orderNumber: z.string().min(1).max(100) }).parse(input))
  .handler(async ({ data }) => {
    await supabaseAdmin.from("order_tracking").delete().eq("order_number", data.orderNumber);
    await supabaseAdmin
      .from("orders")
      .update({
        order_status: "confirmed",
        auto_ship_attempts: 0,
        auto_ship_last_error: null,
      })
      .eq("order_number", data.orderNumber);
    return { ok: true };
  });
