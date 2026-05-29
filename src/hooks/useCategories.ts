// @ts-nocheck
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  image_url: string;
  parent_id: string | null;
  sort_order: number;
  active: boolean;
  featured: boolean;
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  visible_on_pages?: string[];
  created_at?: string;
  updated_at?: string;
}

let cache: { at: number; data: Category[] } | null = null;
const TTL = 60_000; // 1 min — lite mode, low traffic

export async function fetchCategories(opts: { force?: boolean; includeInactive?: boolean } = {}): Promise<Category[]> {
  if (!opts.force && !opts.includeInactive && cache && Date.now() - cache.at < TTL) return cache.data;
  let q = supabase.from('categories').select('*').order('sort_order', { ascending: true }).order('name');
  if (!opts.includeInactive) q = q.eq('active', true);
  const { data, error } = await q;
  if (error) throw error;
  const rows = (data || []) as Category[];
  if (!opts.includeInactive) cache = { at: Date.now(), data: rows };
  return rows;
}

export function invalidateCategoriesCache() { cache = null; }

/** Lightweight hook — returns names only (used by legacy dropdowns) */
export function useCategoryNames(): string[] {
  const [names, setNames] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    fetchCategories().then(rows => { if (alive) setNames(rows.map(r => r.name)); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  return names;
}

export function useCategories(includeInactive = false) {
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const reload = () => {
    setLoading(true);
    fetchCategories({ force: true, includeInactive })
      .then(setData).catch(() => setData([])).finally(() => setLoading(false));
  };
  useEffect(reload, [includeInactive]);
  return { data, loading, reload };
}
