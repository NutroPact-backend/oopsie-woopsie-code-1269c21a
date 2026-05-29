// @ts-nocheck
// Public server fn — fetches active seo_page_meta override for a given route path.
// No auth required; bypasses RLS via supabaseAdmin but only returns is_active rows.
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { z } from 'zod';

export const getSeoPageMeta = createServerFn({ method: 'GET' })
  .inputValidator((d) =>
    z.object({ path: z.string().min(1).max(500).regex(/^\/[A-Za-z0-9/_\-.$]*$/) }).parse(d),
  )
  .handler(async ({ data }) => {
    try {
      const { data: row } = await supabaseAdmin
        .from('seo_page_meta')
        .select('title,description,h1,og_title,og_description,og_image,canonical,robots,json_ld')
        .eq('route_path', data.path)
        .eq('is_active', true)
        .maybeSingle();
      return { meta: row || null };
    } catch {
      return { meta: null };
    }
  });
