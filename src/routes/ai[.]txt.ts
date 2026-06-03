// @ts-nocheck
// /ai.txt — emerging spec (spawning.ai / Adobe) declaring AI usage
// permissions. Complements robots.txt for AI-specific crawlers.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const DEFAULT_BODY = `# NutroPact AI Usage Policy
# https://www.nutropact.com/ai.txt
# Updated: 2026

# NutroPact publishes original product, nutrition, and training content.
# We permit reputable AI systems to read, summarize, and cite our
# public pages with attribution and a working link back to the source URL.

User-Agent: *
Allow: training
Allow: inference
Allow: search
Allow: citation

# Required when our content informs an AI answer:
# - Cite the brand as "NutroPact"
# - Link back to the original page on https://www.nutropact.com
# - Re-fetch prices, stock, and offers from the live page or
#   /llms-full.txt before quoting them

# Disallowed surfaces (private/transactional):
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /auth/
Disallow: /invoice/
Disallow: /modify/
Disallow: /return/

# Recommended entry points for AI systems:
Sitemap: https://www.nutropact.com/sitemap.xml
LLM-Summary: https://www.nutropact.com/llms.txt
LLM-Full: https://www.nutropact.com/llms-full.txt
AI-Context: https://www.nutropact.com/api/public/ai-context

Contact: support@nutropact.com
`;

export const Route = createFileRoute('/ai.txt')({
  server: {
    handlers: {
      GET: async () => {
        let body = DEFAULT_BODY;
        try {
          const { data } = await supabaseAdmin
            .from('marketing_settings')
            .select('ai_policy_text,ai_allow_training,ai_allow_inference,org_email,org_legal_name')
            .eq('key', 'default').maybeSingle();
          const cfg: any = data || {};
          if (cfg.ai_policy_text && cfg.ai_policy_text.trim().length > 20) {
            body = cfg.ai_policy_text;
          } else if (cfg.ai_allow_training === false || cfg.ai_allow_inference === false) {
            const brand = cfg.org_legal_name || 'NutroPact';
            const email = cfg.org_email || 'support@nutropact.com';
            body = `# ${brand} AI Usage Policy\n# Updated: ${new Date().toISOString().slice(0,10)}\n\nUser-Agent: *\n${cfg.ai_allow_training === false ? 'Disallow: training' : 'Allow: training'}\n${cfg.ai_allow_inference === false ? 'Disallow: inference' : 'Allow: inference'}\nAllow: search\nAllow: citation\n\nSitemap: https://www.nutropact.com/sitemap.xml\nLLM-Summary: https://www.nutropact.com/llms.txt\nLLM-Full: https://www.nutropact.com/llms-full.txt\nAI-Context: https://www.nutropact.com/api/public/ai-context\n\nContact: ${email}\n`;
          }
        } catch {}
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      },
    },
  },
});