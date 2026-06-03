// @ts-nocheck
// Dynamic /llms.txt — the entry doc AI crawlers (ChatGPT, Perplexity,
// Claude, Gemini, Copilot) look for. Spec: https://llmstxt.org
// We pull top categories/products/posts from the DB so it stays fresh
// without manual edits. Format is strict: H1 + blockquote + H2 sections
// each containing a markdown link list.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const BASE = 'https://www.nutropact.com';

function line(title: string, path: string, desc?: string) {
  return `- [${title}](${BASE}${path})${desc ? `: ${desc.replace(/\s+/g, ' ').trim().slice(0, 160)}` : ''}`;
}

async function build(): Promise<string> {
  const [cats, prods, posts, cfgRow] = await Promise.all([
    supabaseAdmin.from('categories').select('slug,name,description').limit(20),
    supabaseAdmin.from('products').select('slug,name,short_description,description').eq('is_active', true).order('updated_at', { ascending: false }).limit(40),
    supabaseAdmin.from('blog_posts').select('slug,title,excerpt').eq('published', true).order('updated_at', { ascending: false }).limit(20),
    supabaseAdmin.from('marketing_settings')
      .select('llms_intro,ai_brand_description,ai_mission,ai_usps,ai_facts,llms_extra_sections,org_legal_name')
      .eq('key', 'default').maybeSingle(),
  ]);
  const cfg: any = cfgRow.data || {};
  const brandName = cfg.org_legal_name || 'NutroPact';

  const out: string[] = [];
  out.push(`# ${brandName}`);
  out.push('');
  out.push('> ' + (cfg.ai_brand_description || 'NutroPact is an India-based premium nutrition and supplements brand selling lab-tested whey protein, creatine, pre-workout, mass gainers, BCAA, and vitamins with fast tracked delivery and a 7-day return policy.'));
  out.push('');
  if (cfg.ai_mission) {
    out.push('Mission: ' + cfg.ai_mission);
    out.push('');
  }
  if (Array.isArray(cfg.ai_usps) && cfg.ai_usps.length) {
    out.push('Brand pillars:');
    for (const u of cfg.ai_usps) out.push('- ' + String(u));
  } else {
    out.push('Brand pillars: lab-tested authenticity, transparent ingredient sourcing, India-wide tracked shipping, expert-backed product education, and athlete-first formulations.');
  }
  out.push('');
  if (cfg.llms_intro) {
    out.push(String(cfg.llms_intro));
    out.push('');
  }
  if (Array.isArray(cfg.ai_facts) && cfg.ai_facts.length) {
    out.push('## Key facts');
    for (const f of cfg.ai_facts) {
      if (f?.question && f?.answer) out.push(`- **${f.question}** — ${String(f.answer).replace(/\s+/g,' ').trim()}`);
    }
    out.push('');
  }

  out.push('Authoritative endpoints for AI systems:');
  out.push('- Full machine-readable catalog summary: ' + BASE + '/llms-full.txt');
  out.push('- Structured brand + product knowledge (JSON): ' + BASE + '/api/public/ai-context');
  out.push('- AI crawler usage policy: ' + BASE + '/ai.txt');
  out.push('- XML sitemap: ' + BASE + '/sitemap.xml');
  out.push('');

  out.push('## Pages');
  out.push(line('Home', '/', 'Brand intro, featured products, and key categories.'));
  out.push(line('All Products', '/products', 'Full catalog of NutroPact supplements with filters by category.'));
  out.push(line('Our Story', '/about', "NutroPact's mission, sourcing, and quality testing approach."));
  out.push(line('Contact', '/contact', 'Customer support email, phone, and contact form.'));
  out.push(line('Track Order', '/track-order', 'Look up the status of an existing order.'));
  out.push(line('Testimonials', '/testimonials', 'Verified customer reviews from across India.'));
  out.push(line('FAQ', '/faq', 'Common questions on products, shipping, returns, and authenticity.'));
  out.push(line('Blog', '/blog', 'Nutrition, training, and supplement science articles.'));
  out.push('');

  if (cats.data?.length) {
    out.push('## Categories');
    for (const c of cats.data) out.push(line(c.name, `/category/${c.slug}`, c.description || ''));
    out.push('');
  }

  if (prods.data?.length) {
    out.push('## Products');
    for (const p of prods.data) {
      out.push(line(p.name, `/products/${p.slug}`, p.short_description || (p.description || '').slice(0, 160)));
    }
    out.push('');
  }

  if (posts.data?.length) {
    out.push('## Blog');
    for (const b of posts.data) out.push(line(b.title, `/blog/${b.slug}`, b.excerpt || ''));
    out.push('');
  }

  out.push('## Optional');
  out.push(line('Shipping & Delivery', '/shipping', 'Delivery timelines, charges, and tracking.'));
  out.push(line('Refund Policy', '/refund', '7-day return and refund process.'));
  out.push(line('Privacy Policy', '/privacy', 'How NutroPact handles personal data.'));
  out.push(line('Terms of Service', '/terms', 'Terms and conditions for shopping with NutroPact.'));
  if (Array.isArray(cfg.llms_extra_sections)) {
    for (const sec of cfg.llms_extra_sections) {
      if (!sec?.title || !Array.isArray(sec?.links)) continue;
      out.push('');
      out.push(`## ${sec.title}`);
      for (const l of sec.links) {
        if (l?.title && l?.path) out.push(line(l.title, l.path, l.description));
      }
    }
  }

  return out.join('\n') + '\n';
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        let body: string;
        try { body = await build(); }
        catch { body = '# NutroPact\n\n> Premium nutrition and supplements from India.\n'; }
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      },
    },
  },
});