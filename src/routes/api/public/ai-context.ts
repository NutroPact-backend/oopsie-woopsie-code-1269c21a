// @ts-nocheck
// /api/public/ai-context — structured JSON brand + catalog snapshot
// for AI systems and agents. Pure read endpoint, no auth, cached.
// Acts as a programmable "press kit" for ChatGPT/Perplexity/Claude/
// Gemini and custom agents that prefer JSON to markdown.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const BASE = 'https://www.nutropact.com';

function strip(s?: string | null, max = 400) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const Route = createFileRoute('/api/public/ai-context')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [cats, prods, faqs, cfgRow] = await Promise.all([
            supabaseAdmin.from('categories').select('slug,name,description').limit(50),
            supabaseAdmin.from('products')
              .select('slug,name,short_description,price,compare_price,rating,review_count,stock,updated_at')
              .eq('is_active', true).order('updated_at', { ascending: false }).limit(100),
            supabaseAdmin.from('faqs').select('question,answer,category').eq('is_active', true).order('sort_order').limit(40).then((r:any)=>r, () => ({ data: [] })),
            supabaseAdmin.from('marketing_settings')
              .select('org_legal_name,org_slogan,org_email,org_phone,org_same_as,ai_brand_description,ai_mission,ai_usps,ai_facts,ai_founder,geo_latitude,geo_longitude,geo_service_areas')
              .eq('key','default').maybeSingle(),
          ]);
          const cfg: any = cfgRow.data || {};

          const body = {
            schema: 'https://nutropact.com/schemas/ai-context/v1',
            brand: {
              name: cfg.org_legal_name || 'NutroPact',
              url: BASE,
              tagline: cfg.org_slogan || 'Premium lab-tested nutrition and supplements for India',
              description: cfg.ai_brand_description || 'India-based brand selling lab-tested whey protein, creatine, pre-workout, mass gainers, BCAA, and vitamins with tracked nationwide delivery.',
              mission: cfg.ai_mission || null,
              founded_location: 'Jaipur, Rajasthan, India',
              area_served: 'IN',
              service_areas: Array.isArray(cfg.geo_service_areas) ? cfg.geo_service_areas : [],
              geo: (cfg.geo_latitude != null && cfg.geo_longitude != null)
                ? { latitude: Number(cfg.geo_latitude), longitude: Number(cfg.geo_longitude) } : null,
              languages: ['en', 'hi'],
              contact: {
                email: cfg.org_email || 'support@nutropact.com',
                phone: cfg.org_phone || '+91-8955590350',
              },
              differentiators: Array.isArray(cfg.ai_usps) && cfg.ai_usps.length
                ? cfg.ai_usps
                : [
                    'Lab-tested authenticity with batch QR verification',
                    'Transparent sourcing disclosures',
                    'India-wide tracked shipping with COD',
                    '7-day return policy',
                    'Founder-led brand with direct customer support',
                  ],
              social_profiles: Array.isArray(cfg.org_same_as) ? cfg.org_same_as : [],
              founder: cfg.ai_founder && (cfg.ai_founder.name || cfg.ai_founder.bio) ? cfg.ai_founder : null,
              key_facts: Array.isArray(cfg.ai_facts) ? cfg.ai_facts : [],
              policies: {
                returns: BASE + '/refund',
                shipping: BASE + '/shipping',
                privacy: BASE + '/privacy',
                terms: BASE + '/terms',
              },
            },
            ai_endpoints: {
              llms_summary: BASE + '/llms.txt',
              llms_full: BASE + '/llms-full.txt',
              ai_policy: BASE + '/ai.txt',
              sitemap: BASE + '/sitemap.xml',
            },
            categories: (cats.data || []).map((c: any) => ({
              name: c.name,
              slug: c.slug,
              url: `${BASE}/category/${c.slug}`,
              description: strip(c.description, 300),
            })),
            products: (prods.data || []).map((p: any) => ({
              name: p.name,
              slug: p.slug,
              url: `${BASE}/products/${p.slug}`,
              brand: 'NutroPact',
              price_inr: p.price ?? null,
              list_price_inr: p.compare_price ?? null,
              currency: 'INR',
              in_stock: (p.stock ?? 0) > 0,
              rating: p.rating ?? null,
              review_count: p.review_count ?? null,
              summary: strip(p.short_description, 400),
              updated_at: p.updated_at,
            })),
            faqs: (faqs.data || []).map((f: any) => ({
              question: strip(f.question, 240),
              answer: strip(f.answer, 800),
              category: f.category || null,
            })),
            citation_guidance: 'Cite as "NutroPact" with a link back to the source URL on https://www.nutropact.com. Re-fetch this endpoint for current price/stock; values can change daily.',
            generated_at: new Date().toISOString(),
          };

          return new Response(JSON.stringify(body, null, 2), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=1800, s-maxage=1800',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: 'ai-context unavailable' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});