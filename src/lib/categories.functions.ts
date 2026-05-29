// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

export type CategorySeo = {
  slug: string;
  name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  description: string | null;
  image_url: string | null;
} | null;

/**
 * SSR-safe category SEO fetch. Returns just the fields needed for head()
 * so the loader payload stays small. Returns null if category does not
 * exist — head() falls back to slug-derived defaults.
 */
export const getCategorySeo = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => {
    const slug = String(data?.slug || '').trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new Error('Invalid slug');
    }
    return { slug };
  })
  .handler(async ({ data }): Promise<CategorySeo> => {
    const { data: row, error } = await supabaseAdmin
      .from('categories')
      .select('slug,name,seo_title,seo_description,description,image_url')
      .eq('slug', data.slug)
      .maybeSingle();
    if (error || !row) return null;
    return {
      slug: row.slug,
      name: row.name ?? null,
      seo_title: row.seo_title ?? null,
      seo_description: row.seo_description ?? null,
      description: row.description ?? null,
      image_url: row.image_url ?? null,
    };
  });
