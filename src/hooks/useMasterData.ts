// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// ─── Brands ──────────────────────────────────────────────────────────────────
export interface Brand {
  id: string; name: string; slug: string; logo_url: string; description: string;
  sort_order: number; active: boolean;
}
let brandsCache: { at: number; data: Brand[] } | null = null;
const TTL = 60_000;

export async function fetchBrands(opts: { force?: boolean; includeInactive?: boolean } = {}): Promise<Brand[]> {
  if (!opts.force && !opts.includeInactive && brandsCache && Date.now() - brandsCache.at < TTL) return brandsCache.data;
  let q = supabase.from('brands').select('*').order('sort_order').order('name');
  if (!opts.includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Brand[];
  if (!opts.includeInactive) brandsCache = { at: Date.now(), data: rows };
  return rows;
}
export const invalidateBrandsCache = () => { brandsCache = null; };

// ─── Flavors ─────────────────────────────────────────────────────────────────
export interface Flavor {
  id: string; name: string; slug: string; hex_color: string;
  sort_order: number; active: boolean;
}
let flavorsCache: { at: number; data: Flavor[] } | null = null;

export async function fetchFlavors(opts: { force?: boolean; includeInactive?: boolean } = {}): Promise<Flavor[]> {
  if (!opts.force && !opts.includeInactive && flavorsCache && Date.now() - flavorsCache.at < TTL) return flavorsCache.data;
  let q = supabase.from('product_flavors').select('*').order('sort_order').order('name');
  if (!opts.includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Flavor[];
  if (!opts.includeInactive) flavorsCache = { at: Date.now(), data: rows };
  return rows;
}
export const invalidateFlavorsCache = () => { flavorsCache = null; };

// ─── Sizes ───────────────────────────────────────────────────────────────────
export interface Size {
  id: string; name: string; slug: string; value_grams: number;
  sort_order: number; active: boolean;
}
let sizesCache: { at: number; data: Size[] } | null = null;

export async function fetchSizes(opts: { force?: boolean; includeInactive?: boolean } = {}): Promise<Size[]> {
  if (!opts.force && !opts.includeInactive && sizesCache && Date.now() - sizesCache.at < TTL) return sizesCache.data;
  let q = supabase.from('product_sizes').select('*').order('sort_order').order('name');
  if (!opts.includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Size[];
  if (!opts.includeInactive) sizesCache = { at: Date.now(), data: rows };
  return rows;
}
export const invalidateSizesCache = () => { sizesCache = null; };

// ─── Hooks ───────────────────────────────────────────────────────────────────
export function useBrands(includeInactive = false) {
  const [data, setData] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = () => { setLoading(true); fetchBrands({ force: true, includeInactive }).then(setData).catch(() => setData([])).finally(() => setLoading(false)); };
  useEffect(reload, [includeInactive]);
  return { data, loading, reload };
}
export function useFlavors(includeInactive = false) {
  const [data, setData] = useState<Flavor[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = () => { setLoading(true); fetchFlavors({ force: true, includeInactive }).then(setData).catch(() => setData([])).finally(() => setLoading(false)); };
  useEffect(reload, [includeInactive]);
  return { data, loading, reload };
}
export function useSizes(includeInactive = false) {
  const [data, setData] = useState<Size[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = () => { setLoading(true); fetchSizes({ force: true, includeInactive }).then(setData).catch(() => setData([])).finally(() => setLoading(false)); };
  useEffect(reload, [includeInactive]);
  return { data, loading, reload };
}

// ─── Variants (per product, no cache — admin only) ───────────────────────────
export interface ProductVariant {
  id: string; product_id: string; sku: string;
  flavor_id: string | null; size_id: string | null;
  flavor_name: string; size_name: string;
  price: number; compare_price: number; stock: number; low_stock_threshold: number;
  image_url: string; barcode: string; weight_grams: number;
  is_default: boolean; active: boolean; sort_order: number;
}

export async function fetchVariants(productId: string): Promise<ProductVariant[]> {
  const { data, error } = await supabase.from('product_variants').select('*')
    .eq('product_id', productId).order('sort_order').order('size_name').order('flavor_name');
  if (error) throw error;
  return (data || []) as ProductVariant[];
}
