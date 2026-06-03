// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const BASE_URL = 'https://www.nutropact.com';

const STATIC_PATHS = [
  '/', '/products', '/combo', '/about', '/contact', '/blog', '/faq',
  '/shipping', '/refund', '/privacy', '/terms', '/testimonials', '/track-order',
  '/search', '/support', '/answers',
];


function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function urlEntry(loc: string, lastmod?: string, priority = '0.7', changefreq = 'weekly') {
  return `  <url>\n    <loc>${esc(loc)}</loc>` +
    (lastmod ? `\n    <lastmod>${esc(lastmod)}</lastmod>` : '') +
    `\n    <changefreq>${changefreq}</changefreq>` +
    `\n    <priority>${priority}</priority>\n  </url>`;
}

async function buildSitemap(origin: string): Promise<string> {
  const [products, posts, categories] = await Promise.all([
    supabaseAdmin.from('products').select('slug,updated_at,is_active').eq('is_active', true).limit(2000),
    supabaseAdmin.from('blog_posts').select('slug,updated_at,published').eq('published', true).limit(2000),
    supabaseAdmin.from('categories').select('slug,updated_at').limit(500),
  ]);

  const entries: string[] = [];
  for (const p of STATIC_PATHS) {
    entries.push(urlEntry(`${origin}${p}`, undefined, p === '/' ? '1.0' : '0.8', 'daily'));
  }
  for (const row of (categories.data || [])) {
    entries.push(urlEntry(`${origin}/category/${row.slug}`, row.updated_at || undefined, '0.8', 'weekly'));
  }
  for (const row of (products.data || [])) {
    entries.push(urlEntry(`${origin}/products/${row.slug}`, row.updated_at || undefined, '0.9', 'weekly'));
  }
  for (const row of (posts.data || [])) {
    entries.push(urlEntry(`${origin}/blog/${row.slug}`, row.updated_at || undefined, '0.6', 'weekly'));
  }


  return `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    entries.join('\n') + `\n</urlset>\n`;
}

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Always advertise the canonical production host so id-preview
          // and per-PR domains never leak into Google's index.
          const xml = await buildSitemap(BASE_URL);
          return new Response(xml, {
            status: 200,
            headers: {
              'Content-Type': 'application/xml; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=3600',
            },
          });
        } catch (e) {
          return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>', {
            status: 200,
            headers: { 'Content-Type': 'application/xml; charset=utf-8' },
          });
        }
      },
    },
  },
});
