// @ts-nocheck
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "./users.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// ───────────────────────────── list rows ─────────────────────────────
export const listShipmentCharges = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        status: z.enum(["all", "pending", "matched", "overcharge", "undercharge"]).default("all"),
        courier: z.string().max(40).optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().min(1).max(500).default(200),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("shipment_charges")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.courier) q = q.eq("courier", data.courier);
    if (data.from) q = q.gte("created_at", data.from);
    if (data.to) q = q.lte("created_at", data.to);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const all = rows ?? [];
    const totalExpected = all.reduce((s, r: any) => s + Number(r.expected_charge || 0), 0);
    const totalActual = all.reduce((s, r: any) => s + Number(r.actual_charge || 0), 0);
    const variance = totalActual - totalExpected;
    const counts = {
      total: all.length,
      pending: all.filter((r: any) => r.status === "pending").length,
      matched: all.filter((r: any) => r.status === "matched").length,
      overcharge: all.filter((r: any) => r.status === "overcharge").length,
      undercharge: all.filter((r: any) => r.status === "undercharge").length,
    };
    return { rows: all, stats: { totalExpected, totalActual, variance, counts } };
  });

// ───────────────────────────── manual single update ─────────────────────────────
export const updateShipmentCharge = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z
      .object({
        orderNumber: z.string().min(1).max(100),
        actualWeightG: z.number().int().min(0).max(500000).optional(),
        actualCharge: z.number().min(0).max(1000000).optional(),
        notes: z.string().max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const patch: any = { updated_at: new Date().toISOString() };
    if (data.actualWeightG !== undefined) patch.actual_weight_g = data.actualWeightG;
    if (data.actualCharge !== undefined) patch.actual_charge = data.actualCharge;
    if (data.notes !== undefined) patch.notes = data.notes;
    const { error } = await supabaseAdmin
      .from("shipment_charges")
      .update(patch)
      .eq("order_number", data.orderNumber);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ───────────────────────────── bulk CSV import ─────────────────────────────
const RowSchema = z.object({
  orderNumber: z.string().min(1).max(100),
  actualWeightG: z.number().int().min(0).max(500000).optional(),
  actualCharge: z.number().min(0).max(1000000),
  notes: z.string().max(500).optional(),
});

export const importShipmentChargesCsv = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .inputValidator((input) =>
    z.object({ rows: z.array(RowSchema).min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    let updated = 0;
    let inserted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of data.rows) {
      // Find existing
      const { data: existing } = await supabaseAdmin
        .from("shipment_charges")
        .select("id")
        .eq("order_number", row.orderNumber)
        .maybeSingle();
      const patch: any = {
        actual_charge: row.actualCharge,
        actual_weight_g: row.actualWeightG ?? null,
        notes: row.notes ?? undefined,
        updated_at: new Date().toISOString(),
      };
      if (existing) {
        const { error } = await supabaseAdmin
          .from("shipment_charges")
          .update(patch)
          .eq("id", existing.id);
        if (error) { failed++; errors.push(`${row.orderNumber}: ${error.message}`); }
        else updated++;
      } else {
        const { error } = await supabaseAdmin.from("shipment_charges").insert({
          order_number: row.orderNumber,
          ...patch,
          expected_charge: 0,
          expected_weight_g: 0,
        });
        if (error) { failed++; errors.push(`${row.orderNumber}: ${error.message}`); }
        else inserted++;
      }
    }
    return { ok: true, updated, inserted, failed, errors: errors.slice(0, 20) };
  });
