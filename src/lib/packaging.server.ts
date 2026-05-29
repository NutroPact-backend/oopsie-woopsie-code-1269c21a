// @ts-nocheck
// Server-only packaging selection + volumetric weight calculation.
// Picks the smallest fitting box for the items in an order.

import { createClient } from "@supabase/supabase-js";

export type DbBox = {
  id: string;
  name: string;
  length: number;
  width: number;
  height: number;
  weight: number; // dead weight grams
  max_weight: number; // capacity grams (0 = unlimited)
  unit?: string;
};

export type OrderItemDim = {
  qty: number;
  weightGrams: number; // gross per unit
  length?: number;
  width?: number;
  height?: number;
};

export type PackResult = {
  box: DbBox | null;
  totalUnits: number;
  grossWeightGrams: number; // items only
  packageWeightGrams: number; // items + box dead weight
  volumetricWeightGrams: number; // (L*W*H)/divisor in kg → grams
  chargeableWeightGrams: number; // max(package, volumetric)
  chargeableWeightKg: number; // for carrier APIs
  dims: { length: number; width: number; height: number };
  warnings: string[];
};

function getSb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function loadBoxes(): Promise<DbBox[]> {
  const sb = getSb();
  const { data } = await sb.from("packaging_boxes").select("*");
  return (data ?? []) as DbBox[];
}

// Resolve per-item dimensions/weight from products + variants
export async function resolveOrderItemDims(items: any[]): Promise<OrderItemDim[]> {
  if (!items?.length) return [];
  const sb = getSb();
  const productIds = Array.from(new Set(items.map((i) => String(i.productId || i.id || "")).filter(Boolean)));
  const variantIds = Array.from(new Set(items.map((i) => String(i.variantId || "")).filter(Boolean)));

  const [pRes, vRes] = await Promise.all([
    productIds.length
      ? sb.from("products").select("id,weight,shipping_weight,dimensions").in("id", productIds)
      : Promise.resolve({ data: [] as any[] }),
    variantIds.length
      ? sb.from("product_variants").select("id,weight_grams,length_cm,width_cm,height_cm").in("id", variantIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const pMap = new Map((pRes.data || []).map((p: any) => [p.id, p]));
  const vMap = new Map((vRes.data || []).map((v: any) => [v.id, v]));

  return items.map((it) => {
    const qty = Number(it.quantity || it.qty || 1);
    const v = vMap.get(String(it.variantId || ""));
    const p = pMap.get(String(it.productId || it.id || ""));
    const dims = (p?.dimensions ?? {}) as any;
    const weightGrams =
      Number(v?.weight_grams) ||
      Number(p?.shipping_weight) * 1000 ||
      Number(p?.weight) * 1000 ||
      500;
    return {
      qty,
      weightGrams,
      length: Number(v?.length_cm) || Number(dims?.length) || undefined,
      width: Number(v?.width_cm) || Number(dims?.width) || undefined,
      height: Number(v?.height_cm) || Number(dims?.height) || undefined,
    };
  });
}

export function pickBox(items: OrderItemDim[], boxes: DbBox[], volumetricDivisor = 5000): PackResult {
  const warnings: string[] = [];
  const totalUnits = items.reduce((s, i) => s + (i.qty || 0), 0);
  const grossWeightGrams = items.reduce((s, i) => s + i.weightGrams * i.qty, 0);

  // Filter by max_weight if set
  const eligible = boxes.filter((b) => {
    const cap = Number(b.max_weight) || 0;
    return cap === 0 || cap >= grossWeightGrams;
  });

  // Pick smallest-volume eligible box
  let chosen: DbBox | null = null;
  if (eligible.length) {
    chosen = [...eligible].sort((a, b) => a.length * a.width * a.height - b.length * b.width * b.height)[0];
  } else if (boxes.length) {
    chosen = [...boxes].sort((a, b) => b.length * b.width * b.height - a.length * a.width * a.height)[0];
    warnings.push(`No box fits ${grossWeightGrams}g — using largest available.`);
  } else {
    warnings.push("No packaging boxes configured.");
  }

  const dims = chosen
    ? { length: Number(chosen.length), width: Number(chosen.width), height: Number(chosen.height) }
    : { length: 22, width: 15, height: 10 };

  const packageWeightGrams = grossWeightGrams + (Number(chosen?.weight) || 0);
  // Volumetric in kg = (L*W*H)/divisor → grams = *1000
  const volumetricWeightGrams = Math.round((dims.length * dims.width * dims.height) / volumetricDivisor * 1000);
  const chargeableWeightGrams = Math.max(packageWeightGrams, volumetricWeightGrams);
  const chargeableWeightKg = Math.max(0.05, Math.round(chargeableWeightGrams) / 1000);

  return {
    box: chosen,
    totalUnits,
    grossWeightGrams,
    packageWeightGrams,
    volumetricWeightGrams,
    chargeableWeightGrams,
    chargeableWeightKg,
    dims,
    warnings,
  };
}
