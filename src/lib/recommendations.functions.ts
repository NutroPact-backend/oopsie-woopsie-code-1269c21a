// @ts-nocheck
/**
 * Recommendations — Phase 5.
 *
 *  - getFrequentlyBoughtTogether(productIds): reads from product_cooccurrence
 *    cache. Falls back to same-category trending if cache empty.
 *  - getTrendingProducts(): best sellers in last 7 days (delivered/paid).
 *  - getRelatedProducts(productId): cooccurrence first, category fallback.
 *
 * Lite-mode: all queries indexed, capped at 8 results, response < 4 KB.
 */
import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const PID = z.string().min(1).max(80);

async function hydrate(productIds: string[], limit: number) {
  if (!productIds.length) return [];
  const { data } = await supabaseAdmin
    .from('products')
    .select('id,name,slug,price,images,category,in_stock,pixels')
    .in('id', productIds)
    .eq('in_stock', true)
    .limit(limit);
  // preserve incoming order
  const map = new Map((data || []).map((p: any) => [p.id, p]));
  return productIds.map((id) => map.get(id)).filter(Boolean).slice(0, limit);
}

export const getFrequentlyBoughtTogether = createServerFn({ method: 'POST' })
  .inputValidator((d: { productIds: string[]; limit?: number }) =>
    z.object({
      productIds: z.array(PID).min(1).max(20),
      limit: z.number().int().min(1).max(12).default(6),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 6;
    const exclude = new Set(data.productIds);

    const { data: cooc } = await supabaseAdmin
      .from('product_cooccurrence')
      .select('related_id,score')
      .in('product_id', data.productIds)
      .order('score', { ascending: false })
      .limit(40);

    // aggregate scores across all input products
    const tally = new Map<string, number>();
    for (const r of cooc || []) {
      if (exclude.has(r.related_id)) continue;
      tally.set(r.related_id, (tally.get(r.related_id) || 0) + (r.score as number));
    }
    let ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);

    // fallback: same-category trending
    if (ranked.length < limit) {
      const { data: src } = await supabaseAdmin
        .from('products')
        .select('category').in('id', data.productIds).limit(20);
      const cats = [...new Set((src || []).map((s: any) => s.category).filter(Boolean))];
      if (cats.length) {
        const { data: fallback } = await supabaseAdmin
          .from('products')
          .select('id')
          .in('category', cats)
          .eq('in_stock', true)
          .order('sold_count', { ascending: false, nullsFirst: false } as any)
          .limit(limit * 2);
        for (const p of fallback || []) {
          if (exclude.has(p.id) || ranked.includes(p.id)) continue;
          ranked.push(p.id);
          if (ranked.length >= limit) break;
        }
      }
    }
    return { items: await hydrate(ranked.slice(0, limit), limit) };
  });

export const getRelatedProducts = createServerFn({ method: 'POST' })
  .inputValidator((d: { productId: string; limit?: number }) =>
    z.object({ productId: PID, limit: z.number().int().min(1).max(12).default(8) }).parse(d),
  )
  .handler(async ({ data }) => {
    const limit = data.limit ?? 8;
    const { data: cooc } = await supabaseAdmin
      .from('product_cooccurrence')
      .select('related_id,score')
      .eq('product_id', data.productId)
      .order('score', { ascending: false })
      .limit(limit * 2);
    let ids = (cooc || []).map((r) => r.related_id).filter((id) => id !== data.productId);

    if (ids.length < limit) {
      const { data: cur } = await supabaseAdmin
        .from('products').select('category').eq('id', data.productId).maybeSingle();
      if (cur?.category) {
        const { data: same } = await supabaseAdmin
          .from('products')
          .select('id')
          .eq('category', cur.category)
          .eq('in_stock', true)
          .neq('id', data.productId)
          .limit(limit * 2);
        for (const p of same || []) {
          if (!ids.includes(p.id)) ids.push(p.id);
          if (ids.length >= limit) break;
        }
      }
    }
    return { items: await hydrate(ids.slice(0, limit), limit) };
  });

export const getTrendingProducts = createServerFn({ method: 'POST' })
  .inputValidator((d: { limit?: number; days?: number }) =>
    z.object({
      limit: z.number().int().min(1).max(20).default(8),
      days: z.number().int().min(1).max(90).default(7),
    }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('items')
      .gte('created_at', since)
      .in('order_status', ['delivered', 'shipped', 'out_for_delivery', 'processing'])
      .limit(1000);
    const tally = new Map<string, number>();
    for (const o of orders || []) {
      const arr = (o.items as any[]) || [];
      for (const it of arr) {
        const pid = it?.productId || it?.id;
        if (!pid) continue;
        tally.set(pid, (tally.get(pid) || 0) + (Number(it?.quantity) || 1));
      }
    }
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, data.limit).map(([id]) => id);
    return { items: await hydrate(ranked, data.limit) };
  });
